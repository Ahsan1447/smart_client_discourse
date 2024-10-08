import ArrayProxy from "@ember/array/proxy";
import { ajax } from "discourse/lib/ajax";
import { number } from "discourse/lib/formatter";
import PreloadStore from "discourse/lib/preload-store";
import Site from "discourse/models/site";
import Topic from "discourse/models/topic";
import deprecated from "discourse-common/lib/deprecated";
import { bind } from "discourse-common/utils/decorators";
import I18n from "discourse-i18n";

export default class CategoryList extends ArrayProxy {
  static categoriesFrom(store, result, parentCategory = null) {
    const { category_list: { categories: listCategories }, topic_list: { topics: topicList } } = result;
    const excludeNames = ["Test Forum", "Staff", "General", "Community Support", "SmartClient Support", "Site Feedback"];

    let listedCategories = listCategories;
    let filteredTopics = topicList;

    if (Discourse.SiteSettings.enable_admin_settings) {
      const unlistedCategories = listCategories.filter(category => excludeNames.includes(category.name));
      listedCategories = listCategories.filter(category => !excludeNames.includes(category.name));

      // Get the IDs of excluded categories
      const excludedCategoryIds = new Set(unlistedCategories.map(category => category.id));

      // Filter out topics that belong to excluded categories
      filteredTopics = topicList.filter(topic => !excludedCategoryIds.has(topic.category_id));

      // Sort categories by name if the setting is enabled
      // listedCategories.sort((a, b) => a.name.localeCompare(b.name));

        const customOrder = [
          "Installation",
          "Smart GWT Technical Q&A",
          "Technical Q&A",
          "Wishlist",
          "Addendums"
      ];

      listedCategories.sort((a, b) => {
          const indexA = customOrder.indexOf(a.name);
          const indexB = customOrder.indexOf(b.name);

          if (indexA !== -1 && indexB !== -1) {
              return indexA - indexB;
          }
          if (indexA !== -1) {
              return -1;
          }
          if (indexB !== -1) {
              return 1;
          }
          return a.name.localeCompare(b.name);
      });

    }

    // Update the result's topic list with filtered topics
    result.topic_list.topics = filteredTopics;

    // Find the period that is most relevant
    const statPeriod =
        ["week", "month"].find(
          (period) =>
            listedCategories.filter(
              (c) => c[`topics_${period}`] > 0
            ).length >= listedCategories.length * 0.66
        ) || "all";

    // Update global category list to make sure that `findById` works as
    // expected later
    listedCategories.forEach((c) =>
      Site.current().updateCategory(c)
    );

    const categories = CategoryList.create({ store });
    listedCategories.forEach((c) => {
      c = this._buildCategoryResult(c, statPeriod);
      if (
        (parentCategory && c.parent_category_id === parentCategory.id) ||
        (!parentCategory && !c.parent_category_id)
      ) {
        categories.pushObject(c);
      }
    });
    return categories;
  }

  static _buildCategoryResult(c, statPeriod) {
    if (c.topics) {
      c.topics = c.topics.map((t) => Topic.create(t));
    }

    const stat = c[`topics_${statPeriod}`];
    if ((statPeriod === "week" || statPeriod === "month") && stat > 0) {
      const unit = I18n.t(`categories.topic_stat_unit.${statPeriod}`);

      c.stat = I18n.t("categories.topic_stat", {
        count: stat, // only used to correctly pluralize the string
        number: `<span class="value">${number(stat)}</span>`,
        unit: `<span class="unit">${unit}</span>`,
      });

      c.statTitle = I18n.t(`categories.topic_stat_sentence_${statPeriod}`, {
        count: stat,
      });

      c.pickAll = false;
    } else {
      c.stat = `<span class="value">${number(c.topics_all_time)}</span>`;
      c.statTitle = I18n.t("categories.topic_sentence", {
        count: c.topics_all_time,
      });
      c.pickAll = true;
    }

    if (Site.current().mobileView) {
      c.statTotal = I18n.t("categories.topic_stat_all_time", {
        count: c.topics_all_time,
        number: `<span class="value">${number(c.topics_all_time)}</span>`,
      });
    }

    const record = Site.current().updateCategory(c);
    record.setupGroupsAndPermissions();
    return record;
  }

  static listForParent(store, category) {
    deprecated(
      "The listForParent method of CategoryList is deprecated. Use list instead",
      { id: "discourse.category-list.listForParent" }
    );

    return CategoryList.list(store, category);
  }

  static list(store, parentCategory = null) {
    return PreloadStore.getAndRemove("categories_list", () => {
      const data = {};
      if (parentCategory) {
        data.parent_category_id = parentCategory?.id;
      }
      return ajax("/categories.json", { data });
    }).then((result) => {
      return CategoryList.create({
        store,
        categories: this.categoriesFrom(store, result, parentCategory),
        parentCategory,
        can_create_category: result.category_list.can_create_category,
        can_create_topic: result.category_list.can_create_topic,
      });
    });
  }

  init() {
    this.set("content", this.categories || []);
    super.init(...arguments);
    this.set("page", 1);
    this.set("fetchedLastPage", false);
  }

  @bind
  async loadMore() {
    if (this.isLoading || this.fetchedLastPage) {
      return;
    }

    this.set("isLoading", true);

    const data = { page: this.page + 1 };
    if (this.parentCategory) {
      data.parent_category_id = this.parentCategory.id;
    }
    const result = await ajax("/categories.json", { data });

    this.set("page", data.page);
    if (result.category_list.categories.length === 0) {
      this.set("fetchedLastPage", true);
    }
    this.set("isLoading", false);

    CategoryList.categoriesFrom(
      this.store,
      result,
      this.parentCategory
    ).forEach((c) => this.categories.pushObject(c));
  }
}