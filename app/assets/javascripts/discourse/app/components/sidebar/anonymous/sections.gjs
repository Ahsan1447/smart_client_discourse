import Component from "@glimmer/component";
import { service } from "@ember/service";
import CategoriesSection from "./categories-section";
import CustomSections from "./custom-sections";
import MenuSections from "./menu-sections";
import TagsSection from "./tags-section";

export default class SidebarAnonymousSections extends Component {
  @service siteSettings;

  <template>
    <div class="sidebar-sections sidebar-sections-anonymous">
      <CustomSections @collapsable={{@collapsableSections}} />
      <MenuSections @collapsable={{@collapsableSections}} />
      <CategoriesSection @collapsable={{@collapsableSections}} />

      {{#if this.siteSettings.tagging_enabled}}
        <TagsSection @collapsable={{@collapsableSections}} />
      {{/if}}
    </div>
  </template>
}
