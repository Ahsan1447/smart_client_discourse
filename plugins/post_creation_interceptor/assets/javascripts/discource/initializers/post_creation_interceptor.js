import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "custom-js-injector",

  initialize() {
    withPluginApi("0.8.7", (api) => {

      const customScriptContent = Discourse.SiteSettings.custom_js_code;
      const enableAdminsettings = Discourse.SiteSettings.enable_admin_settings;

      if(enableAdminsettings){

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
          if (customScriptContent && enableAdminsettings) {
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

      }

    });
  },
}; 