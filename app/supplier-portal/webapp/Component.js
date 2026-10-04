sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("codeup.supplier.portal.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel({
        step: "login",
        isRejected: false,
        supplier: {},
        editableFields: []
      }), "view");
      this.getRouter().initialize();
    }
  });
});
