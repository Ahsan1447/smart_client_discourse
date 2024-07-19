import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "custom-validation",
  initialize() {
    withPluginApi("0.8.7", (api) => {
      api.modifyClass("controller:composer", {
        save() {
          let title = this.get("model.title");
          let raw = this.get("model.reply");

          if (title && title.includes("invalid")) {
            // eslint-disable-next-line no-alert
            if (confirm("Are you sure you want to make this as comment?")) {
              this.set("model.reply", `${title}\n\n${raw}`);
              this.set("model.title", "");
            }
          }
          return this._super(...arguments);
        },
      });
    });
  },
};
