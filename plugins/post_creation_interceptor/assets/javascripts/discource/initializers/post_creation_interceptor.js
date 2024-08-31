import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "custom-js-injector",

  initialize() {
    withPluginApi("0.8.7", (api) => {

      const customScriptContent = Discourse.SiteSettings.custom_js_code;
      const enableAdminSettings = Discourse.SiteSettings.enable_admin_settings;

      if (enableAdminSettings) {

        // Array of registered script paths relative to Discourse assets URL
        const scriptPaths = [
          "/assets/javascripts/isomorphic/system/modules/ISC_Core.js",
          "/assets/javascripts/isomorphic/system/modules/ISC_Foundation.js",
          "/assets/javascripts/isomorphic/system/modules/ISC_Containers.js",
          "/assets/javascripts/isomorphic/system/modules/ISC_Grids.js",
          "/assets/javascripts/isomorphic/system/modules/ISC_Forms.js",
          "/assets/javascripts/isomorphic/system/modules/ISC_DataBinding.js",
          "/assets/javascripts/isomorphic/skins/Tahoe/load_skin.js"
        ];

        // Function to dynamically load scripts in order
        function loadScriptsSequentially(scripts, callback) {
          if (scripts.length === 0) {
            callback();
            return;
          }

          const src = scripts.shift(); // Remove the first script from the array
          const scriptElement = document.createElement("script");
          scriptElement.src = src; // Directly use the URL
          scriptElement.async = false; // Ensure scripts are executed in order
          scriptElement.type = "text/javascript";
          scriptElement.setAttribute("data-no-strict", "true");

          // Set nonce if available
          const existingScript1 = document.querySelector("script[nonce]");
          if (existingScript1) {
            const nonce = existingScript1.getAttribute("nonce");
            scriptElement.setAttribute("nonce", nonce);
          }

          // Load the script and proceed with the next one once done
          scriptElement.onload = () => loadScriptsSequentially(scripts, callback);
          scriptElement.onerror = (error) => {
            console.error(`Error loading script: ${src}`, error);
            loadScriptsSequentially(scripts, callback); // Continue loading the rest even if one fails
          };
          document.head.appendChild(scriptElement);
        }

        // Load the registered scripts dynamically in sequence
        loadScriptsSequentially(scriptPaths.slice(), () => {

          // Inject custom script content if settings allow after all scripts are loaded
          if (customScriptContent && enableAdminSettings) {
            const scriptElement = document.createElement("script");
            scriptElement.type = "text/javascript";
            scriptElement.textContent = `(function() { ${customScriptContent} })();`;

            // Add nonce if available
            const existingScript = document.querySelector("script[nonce]");
            if (existingScript) {
              const nonce = existingScript.getAttribute("nonce");
              scriptElement.setAttribute("nonce", nonce);
            }

            document.head.appendChild(scriptElement);
          }
        });

        // Adding the class name link replacement functionality

        // Define a hash of class names and their corresponding links
        const CLASS_NAME_LINKS = {
          'ListGridRecord': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=object..ListGridRecord',
          'GroupNode': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=object..GroupNode',
          'HiliteRule': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..HiliteRule',
          'ColumnTree': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..ColumnTree',
          'HibernateBrowser': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..HibernateBrowser',
          'SortSpecifier': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=object..SortSpecifier',
          'WebService': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..WebService',
          'Flashlet': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..Flashlet',
          'TextSettings': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..TextSettings',
          'ActiveXControl': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..ActiveXControl',
          'ZoneCanvas': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..ZoneCanvas',
          'Timeline': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..Timeline',
          'Calendar': 'https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=class..Calendar',
          // Add more class names and links as needed
        };

        // Global regex pattern to match words that:
        // - Start with a capital letter
        // - Are surrounded by spaces or at the start/end of the text
        const GLOBAL_CLASS_NAME_REGEX = /(^|\s)([A-Z][a-zA-Z0-9]*)(?=\s|$)/g;

        function replaceWithLinks(text) {
          return text.replace(GLOBAL_CLASS_NAME_REGEX, (match, p1, className) => {
            // Check if the captured className exists in CLASS_NAME_LINKS
            if (CLASS_NAME_LINKS.hasOwnProperty(className)) {
              return `${p1}[${className}](${CLASS_NAME_LINKS[className]})`;
            }
            return match;
          });
        }

        // Use Discourse's plugin API to modify the composer save behavior
        api.modifyClass("controller:composer", {
          save() {
            const content = this.get("model.reply");
            console.log("content coming...", content);
            const modifiedContent = replaceWithLinks(content);
            this.set("model.reply", modifiedContent);

            this._super(...arguments);  // Call the original save function
          }
        });
      }

    });
  },
};