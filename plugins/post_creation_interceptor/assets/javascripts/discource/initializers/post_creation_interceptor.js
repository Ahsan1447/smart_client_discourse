import { withPluginApi } from "discourse/lib/plugin-api";
import loadScript from 'discourse/lib/load-script';

export default {
  name: "custom-js-injector",

  initialize() {
    withPluginApi("0.8.7", (api) => {

      api.onPageChange((url) => {
        // if (url.startsWith("/t/")) {
                // open smartlcient framework in offscreen iframe
          if (!document.querySelector("#offscreen-iframe")) {
            const iframe = document.createElement("iframe");
            iframe.src = "/assets/smartclient_iframe.html";
            iframe.width = "1px";
            iframe.height = "1px";
            iframe.style.position = "absolute";
            iframe.style.left = "-9999px";
            iframe.id = "offscreen-iframe";
  
            document.body.appendChild(iframe);

            iframe.onload = function () {
              try {
                const isc = iframe.contentWindow.isc;
                if (isc) {
                  console.log("SmartClient is available:", isc);
                  console.log("button: ", isc.IButton);
                }
              } catch (e) {
                console.error("Error accessing smartclient in iframe:", e);
              }
            };
          }
        // }
      });

      const customScriptContent = Discourse.SiteSettings.custom_js_code;
      const enableAdminSettings = Discourse.SiteSettings.enable_admin_settings;

      //custom js code execution

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

      //menu links

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

      //grey out categories

      if(enableAdminSettings){

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
      //transformation logic

      let transforms;
      const regexFilter = /\b[A-Z][a-zA-Z]*(?:\.[a-zA-Z]+)*\b/g;

 
      loadScript("/assets/javascripts/docs.js").then(() => {
        const docItems = window.docItems; 

        if (docItems) { //all doctitems (docs.js)

          transforms = createTransformations(docItems);
          console.log(transforms);
        } else {
          console.error("Failed to fetch doc items");
        }
      }).catch((error) => {
        console.error("Error loading docs.js file", error);
      });

      if (enableAdminSettings) { //if plugin is enabled

        function doc_keyword_transform(message) {
          return message.replace(regexFilter, (match) => {
            if (transforms.hasOwnProperty(match)) {
              return `<a href="${transforms[match]}" target="_blank">${match}</a>`;
            }
            return match;
          });
        }
        api.modifyClass("controller:composer", {
          save() {
            const message = this.get("model.reply");
            if (typeof regexFilter !== 'undefined' && typeof transforms !== 'undefined') {
              const updated_message = doc_keyword_transform(message);
              this.set("model.reply", updated_message);
            }
            this._super(...arguments);
          }
        });
      }
    });
  },
};

function createTransformations(docItems) {
  const transforms = {};
  const BASE_URL = "https://smartclient.com/smartclient-release/isomorphic/system/reference/?id=";
  Object.keys(docItems).forEach((key) => {
    const item = docItems[key];
    if (item.ref && key) {
      const className = key.split(":").slice(1); 
      const definingClass = item.ref.replace(":", "..");
      transforms[className] = `${BASE_URL}${definingClass}`;
    }               
  });

  return transforms;
}
