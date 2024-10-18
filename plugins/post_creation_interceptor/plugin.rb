# frozen_string_literal: true

# name: post_creation_interceptor
# about: Intercept the post creation flow using JavaScript
# version: 0.1
# authors: Your Name
# url: https://github.com/discourse/discourse/tree/main/plugins/post_creation_interceptor

enabled_site_setting :enable_admin_settings


register_asset "smartclientSDK/isomorphic/system/modules/ISC_Core.js"
register_asset "smartclientSDK/isomorphic/system/modules/ISC_Foundation.js"
register_asset "smartclientSDK/isomorphic/system/modules/ISC_Containers.js"
register_asset "smartclientSDK/isomorphic/system/modules/ISC_Grids.js"
register_asset "smartclientSDK/isomorphic/system/modules/ISC_Forms.js"
register_asset "smartclientSDK/isomorphic/system/modules/ISC_DataBinding.js"
register_asset "smartclientSDK/isomorphic/skins/Tahoe/load_skin.js"

 after_initialize do
    if SiteSetting.enable_admin_settings
      
      script = SiteSetting.custom_js_code
      unless script.blank?
        add_to_serializer(:site, :custom_js_code) { script }
      end
    end
end