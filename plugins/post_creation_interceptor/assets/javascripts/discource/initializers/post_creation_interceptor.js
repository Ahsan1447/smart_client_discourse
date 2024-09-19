import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "custom-js-injector",

  initialize() {
    withPluginApi("0.8.7", (api) => {

      const customScriptContent = Discourse.SiteSettings.custom_js_code;
      const enableAdminSettings = Discourse.SiteSettings.enable_admin_settings;    

      document.addEventListener("DOMContentLoaded", function() {
        const menuHTML = `
          <div class="custom-menu">
              <a href="#">FORUMS</a>
              <a href="https://smartclient.com/">HOME PAGE</a>
              <a href="https://smartclient.com/technology/">OVERVIEW</a>
              <a href="https://smartclient.com/product/overview.jsp">PRODUCT</a>
              <a href="https://smartclient.com/services/">SERVICES</a>
              <a href="https://smartclient.com/solutions/overview.jsp">SOLUTIONS</a>
              <a href="https://smartclient.com/company/contact.jsp">CONTACT</a>
              <a href="https://smartclient.com/company/">RIEFY</a>
          </div>
        `;

        const targetElement = document.querySelector('.before-header-panel-outlet');
        if (targetElement) {
          targetElement.innerHTML += menuHTML;
        }
      });

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

            if (typeof CLASS_NAME_LINKS === 'undefined' || typeof GLOBAL_CLASS_NAME_REGEX === 'undefined') {
              return;
            }
          }
        });
        
 
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
            if (typeof GLOBAL_CLASS_NAME_REGEX !== 'undefined' && typeof CLASS_NAME_LINKS !== 'undefined') {

              const modifiedContent = replaceWithLinks(content);
              this.set("model.reply", modifiedContent);
            }
            this._super(...arguments);  // Call the original save function
          }
        });

        api.onPageChange((url) => {
          const composerObserver = new MutationObserver(() => {
            const categoryChooser = document.querySelector('.category-chooser');

            if (categoryChooser) {
              if (url.includes("/c/")) {
                categoryChooser.style.pointerEvents = 'none';
                categoryChooser.style.opacity = '0.5';
              } else {
                categoryChooser.style.pointerEvents = '';
                categoryChooser.style.opacity = '';
              }
            }
          });

          composerObserver.observe(document.body, { childList: true, subtree: true });

          api.onPageChange(() => {
            composerObserver.disconnect();
          });
        });
      }
    });
  },
};