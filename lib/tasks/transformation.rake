# frozen_string_literal: true

require 'execjs'

namespace :discourse do
  desc "Transform topics and replies using docs.js transformations with progress tracking and batch processing"
  task :transform_data, [:batch_size] => :environment do |_t, args|
    # Step 1: Define paths and load the JavaScript
    docs_path = Rails.root.join("plugins", "post_creation_interceptor", "assets", "javascripts", "docs.js")
    docs_content = File.read(docs_path)

    js_wrapper = <<~JS
      var window = {}; // Simulate the browser `window` object

      function loadDocItemsAndTransformations(docItemsScript, message) {
        const regexFilter = /\\b[A-Z][a-zA-Z]*(?:\\.[a-zA-Z]+)*\\b/g;
        let transforms = {};
        let docItems;

        // Simulate loading the script by evaluating the passed script content
        eval(docItemsScript);

        // Access `window.docItems` after the script is loaded
        if (typeof window !== "undefined" && window.docItems) {
          docItems = window.docItems;
          transforms = createTransformations(docItems);

          // Apply transformation to the provided message
          return doc_keyword_transform(message);
        } else {
          throw new Error("Failed to fetch doc items");
        }

        // Function to create transformations
        function createTransformations(docItems) {
          const transforms = {};
          const BASE_URL = "https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=";

          Object.keys(docItems).forEach((key) => {
            const item = docItems[key];
            if (item.ref && key) {
              const className = key.split(":").slice(1).join("");
              const definingClass = item.ref.replace(":", "..");
              transforms[className] = `${BASE_URL}${definingClass}`;
            }
          });

          return transforms;
        }

        // Function to transform the message with links
        function doc_keyword_transform(message) {
          return message.replace(regexFilter, (match) => {
            if (transforms.hasOwnProperty(match)) {
              return `<a href="${transforms[match]}" target="_blank">${match}</a>`;
            }
            return match;
          });
        }
      }
    JS

    # Step 2: Compile the JavaScript function with ExecJS
    context = ExecJS.compile(js_wrapper)

    # Step 3: Progress tracking and batch size setup
    progress_file = Rails.root.join("tmp", "transform_progress.yml")
    progress = File.exist?(progress_file) ? YAML.load_file(progress_file) : { topic_id: nil, post_id: nil }

    batch_size = args[:batch_size].to_i || 0
    processed_count = 0

    puts "Fetching topics and posts from the database..."
    topics = Topic.where("id >= ?", progress[:topic_id] || 0).limit(batch_size.positive? ? batch_size : nil).includes(:posts)

    topics.each do |topic|
      break if batch_size > 0 && processed_count >= batch_size

      # Transform the first post of each topic
      first_post = topic.first_post
      if first_post && first_post.raw.present? && (progress[:post_id].nil? || first_post.id > progress[:post_id])
        original_content = first_post.raw
        transformed_content = context.call("loadDocItemsAndTransformations", docs_content, original_content)

        if original_content != transformed_content
          first_post.update!(raw: transformed_content)
          puts "Transformed content in topic ID #{topic.id}, post ID #{first_post.id}"
        end
        processed_count += 1
        progress[:topic_id] = topic.id
        progress[:post_id] = first_post.id
        File.write(progress_file, progress.to_yaml)
      end

      break if batch_size > 0 && processed_count >= batch_size

      # Transform replies
      topic.posts.where.not(id: first_post.id).where("id > ?", progress[:post_id] || 0).find_each do |reply|
        break if batch_size > 0 && processed_count >= batch_size

        if reply.raw.present?
          original_content = reply.raw
          transformed_content = context.call("loadDocItemsAndTransformations", docs_content, original_content)

          if original_content != transformed_content
            reply.update!(raw: transformed_content)
            puts "Transformed content in topic ID #{topic.id}, reply ID #{reply.id}"
          end
          processed_count += 1
          progress[:topic_id] = topic.id
          progress[:post_id] = reply.id
          File.write(progress_file, progress.to_yaml)
        end
      end

      progress[:post_id] = nil # Reset post_id for the next topic
    end

    puts "Transformation complete! Processed #{processed_count} posts."
  end
end
