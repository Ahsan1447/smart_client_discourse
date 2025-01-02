# frozen_string_literal: true

# name: post_creation_interceptor
# about: Intercept the post creation flow using JavaScript
# version: 0.1
# authors: Your Name
# url: https://github.com/discourse/discourse/tree/main/plugins/post_creation_interceptor

enabled_site_setting :enable_admin_settings


register_asset "/smartclient_iframe.html"

 after_initialize do
    if SiteSetting.enable_admin_settings

      script = SiteSetting.custom_js_code
      # rubocop:disable Style/InvertibleUnlessCondition
      unless script.blank?
        add_to_serializer(:site, :custom_js_code) { script }
      end
      # rubocop:enable Style/InvertibleUnlessCondition
    end
end
