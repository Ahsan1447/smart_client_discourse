import { withPluginApi } from "discourse/lib/plugin-api";
import loadScript from 'discourse/lib/load-script';

export default {
  name: "custom-js-injector",

  initialize() {
    withPluginApi("0.8.7", (api) => {

      api.onPageChange((url) => {
        // if (url.startsWith("/t/")) {
          // Create iframe if not already present
          if (!document.querySelector("#offscreen-iframe")) {
            const iframe = document.createElement("iframe");
            iframe.src = "/assets/smartclient_iframe.html";
            iframe.width = "1px";
            iframe.height = "1px";
            iframe.style.position = "absolute";
            iframe.style.left = "-9999px";  // Offscreen
            iframe.id = "offscreen-iframe";
  
            document.body.appendChild(iframe);

            iframe.onload = function () {
              try {
                // Try to access the isc object directly from the iframe's contentWindow
                const isc = iframe.contentWindow.isc;
                if (isc) {
                  console.log("SmartClient is available:", isc);
                  console.log("button: ", isc.IButton);
                  // You can now interact with isc, e.g., isc.IButton
                }
              } catch (e) {
                console.error("Error accessing isc in iframe:", e);
              }
            };
  
            // Listen for communication from iframe
            // window.addEventListener("message", (event) => {
            //   if (event.data.type === "frameworkReady") {
            //     console.log("SmartClient loaded in offscreen iframe.");
            //     console.log("ss: ", event.data.framework);
            //   }
            // });
          }
        // }
      });

      const customScriptContent = Discourse.SiteSettings.custom_js_code;
      const enableAdminSettings = Discourse.SiteSettings.enable_admin_settings;

      // //custom js code execution.

      if (customScriptContent && enableAdminSettings) {
        const scriptElement = document.createElement("script");
        scriptElement.type = "text/javascript";
        scriptElement.textContent = `(function() { ${customScriptContent} })();`;
        const existingScript = document.querySelector("script[nonce]");
        if (existingScript) {
          const nonce = existingScript.getAttribute("nonce");
          scriptElement.setAttribute("nonce", nonce);
        }
        document.head.appendChild(scriptElement);
      }

      document.addEventListener("DOMContentLoaded", function () {
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

      let CLASS_NAME_LINKS;
      const GLOBAL_CLASS_NAME_REGEX = /\b[A-Z][a-zA-Z]*(?:\.[a-zA-Z]+)*\b/g;

      loadScript("/assets/javascripts/docs.js").then(() => {
        // Access the global isc.docItems object
        const docItems = window.docItems;

        if (docItems) {

          CLASS_NAME_LINKS = createClassNameLinks(docItems);
          console.log(CLASS_NAME_LINKS);
          
          // You can now use `classNameLinks` in your logic or UI
        } else {
          console.error("Failed to load isc.docItems");
        }
      }).catch((error) => {
        console.error("Error loading docs.js script:", error);
      });

      if (enableAdminSettings) {


        function replaceWithLinks(text) {
          return text.replace(GLOBAL_CLASS_NAME_REGEX, (match) => {
            if (CLASS_NAME_LINKS.hasOwnProperty(match)) {
              return `<a href="${CLASS_NAME_LINKS[match]}" target="_blank">${match}</a>`;
            }
            return match;
          });
        }
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

function createClassNameLinks(docItems) {
  const CLASS_NAME_LINKS = {};
  const BASE_URL = "https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=";
  Object.keys(docItems).forEach((key) => {
    const item = docItems[key];
    if (item.ref && key) {
      const className = key.split(":").slice(1); 
      const definingClass = item.ref.replace(":", "..");
      CLASS_NAME_LINKS[className] = `${BASE_URL}${definingClass}`;
    }
  });

  return CLASS_NAME_LINKS;
}


