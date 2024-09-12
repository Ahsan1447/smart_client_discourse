import { cached } from "@glimmer/tracking";
import { array, hash } from "@ember/helper";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { hasDefaultSidebarCategories } from "discourse/lib/sidebar/helpers";
import Category from "discourse/models/category";
import i18n from "discourse-common/helpers/i18n";
import { debounce } from "discourse-common/utils/decorators";
import CommonCategoriesSection from "../common/categories-section";
import EditNavigationMenuCategoriesModal from "../edit-navigation-menu/categories-modal";
import Section from "../section";
import SectionLink from "../section-link";

export const REFRESH_COUNTS_APP_EVENT_NAME =
  "sidebar:refresh-categories-section-counts";

export default class SidebarUserCategoriesSection extends CommonCategoriesSection {
  @service appEvents;
  @service currentUser;
  @service modal;
  @service router;

  constructor() {
    super(...arguments);

    this.callbackId = this.topicTrackingState.onStateChange(() => {
      this._refreshCounts();
    });

    this.appEvents.on(REFRESH_COUNTS_APP_EVENT_NAME, this, this._refreshCounts);
  }

  willDestroy() {
    super.willDestroy(...arguments);

    this.topicTrackingState.offStateChange(this.callbackId);

    this.appEvents.off(
      REFRESH_COUNTS_APP_EVENT_NAME,
      this,
      this._refreshCounts
    );
  }

  // TopicTrackingState changes or plugins can trigger this function so we debounce to ensure we're not refreshing
  // unnecessarily.
  @debounce(300)
  _refreshCounts() {
    this.sectionLinks.forEach((sectionLink) => sectionLink.refreshCounts());
  }

  get customLinks() {
    return [
      { title: "Forums", href: "#" },
      { title: "Home Page", href: "https://smartclient.com/" },
      { title: "Overview", href: "https://smartclient.com/technology/" },
      { title: "Product", href: "https://smartclient.com/product/overview.jsp" },
      { title: "Services", href: "https://smartclient.com/services/" },
      { title: "Solutions", href: "https://smartclient.com/solutions/overview.jsp" },
      { title: "Contact", href: "https://smartclient.com/company/contact.jsp" },
      { title: "Riefy", href: "https://smartclient.com/company/" },
    ];
  }

  @cached
  get categories() {
    if (this.currentUser.sidebarCategoryIds?.length > 0) {
      return Category.findByIds(this.currentUser.sidebarCategoryIds);
    } else {
      return this.topSiteCategories;
    }
  }

  get shouldDisplayDefaultConfig() {
    return this.currentUser.admin && !this.hasDefaultSidebarCategories;
  }

  get hasDefaultSidebarCategories() {
    return hasDefaultSidebarCategories(this.siteSettings);
  }

  @action
  showModal() {
    this.modal.show(EditNavigationMenuCategoriesModal);
  }

  <template>
    <Section
      @sectionName="menu"
      @headerLinkText="Menu"
      @headerActions={{array
        (hash
          action=this.showModal
          title="Menus"
        )
      }}
      @headerActionsIcon="pencil-alt"
      @collapsable={{@collapsable}}
    >
      
    {{#each this.customLinks as |link|}}
      <li class="sidebar-section-link-wrapper">
        <a class="ember-view sidebar-section-link sidebar-row" href={{link.href}} target="_blank">
          <span class="sidebar-section-link-content-text">{{link.title}}</span>
        </a>
      </li>
    {{/each}}
    </Section>
  </template>
}
