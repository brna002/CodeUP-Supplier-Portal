sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/CheckBox",
  "sap/m/TextArea",
  "sap/m/Dialog",
  "sap/m/Label",
  "sap/m/VBox",
  "sap/m/Button",
  "sap/ui/core/CustomData"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast,
  CheckBox, TextArea, Dialog, Label, VBox, Button, CustomData) {
  "use strict";

  const EDITABLE_OPTIONS = [
    ["companyName", "Company name"], ["taxNumber", "Tax number"],
    ["taxOffice", "Tax office"], ["contactPerson", "Contact person"],
    ["phone", "Phone"], ["email", "Email"], ["address", "Address"]
  ];

  return Controller.extend("codeup.supplier.approvals.controller.Main", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        hasSelection: false,
        selected: {},
        certificate: {},
        selectedStatusState: "Warning"
      }), "view");
      this._selectedContext = null;
      this._loadEditOptions();
    },

    _loadEditOptions: function () {
      this._editableFields = EDITABLE_OPTIONS;
    },

    formatStatusState: function (status) {
      return status === "Approved" ? "Success" : status === "Rejected" ? "Error" : "Warning";
    },

    formatFileSize: function (size) {
      return size ? `${(size / 1048576).toFixed(2)} MB` : "—";
    },

    onFilterChange: function (event) {
      const key = event.getParameter("key") || event.getSource().getSelectedKey();
      const filters = key === "All" ? [] : [new Filter("status", FilterOperator.EQ, key)];
      this.byId("suppliersTable").getBinding("items").filter(filters);
    },

    onFilterKPI: function (event) {
      const tileHeader = event.getSource().getHeader();
      const table = this.byId("suppliersTable") || this.getView().findAggregatedObjects(true, function (control) {
        return control.isA && control.isA("sap.m.Table");
      })[0];
      const binding = table && table.getBinding("items");
      if (!binding) return;

      const statusByHeader = {
        "Pending Review": "Submitted",
        "Approved": "Approved",
        "Rejected": "Rejected"
      };
      const status = statusByHeader[tileHeader];
      const filters = status
        ? [new Filter("status", FilterOperator.EQ, status)]
        : [];
      binding.filter(filters);
    },

    onRefresh: function () {
      const binding = this.byId("suppliersTable").getBinding("items");
      if (binding) binding.refresh();
      if (this._selectedContext) this._selectContext(this._selectedContext);
    },

    onItemPress: function (event) {
      const context = event.getSource().getBindingContext();
      this._selectContext(context);
    },

    onSupplierSelect: function (event) {
      const item = event.getParameter("listItem");
      if (item) this._selectContext(item.getBindingContext());
    },

    _selectContext: async function (context) {
      if (!context) return;
      this._selectedContext = context;
      const supplier = await context.requestObject();
      const vm = this.getView().getModel("view");
      vm.setProperty("/selected", supplier);
      vm.setProperty("/selectedStatusState", this.formatStatusState(supplier.status));
      vm.setProperty("/hasSelection", true);
      vm.setProperty("/certificate", {});
      try {
        const certificates = await this.getView().getModel().bindList("/Certificates", undefined, undefined, [
          new Filter("supplier_ID", FilterOperator.EQ, supplier.ID)
        ]).requestContexts(0, 1);
        if (certificates.length) vm.setProperty("/certificate", await certificates[0].requestObject());
      } catch (error) {
        // Certificate may not yet have been uploaded; supplier details remain usable.
        vm.setProperty("/certificate", {});
      }
      this.byId("supplierDetailDialog").open();
    },

    _invokeBoundAction: async function (context, actionName, parameters) {
      const action = this.getView().getModel().bindContext(`SupplierService.${actionName}(...)`, context);
      Object.entries(parameters || {}).forEach(([name, value]) => action.setParameter(name, value));
      await action.execute();
      const resultContext = action.getBoundContext();
      return resultContext ? resultContext.requestObject() : context.requestObject();
    },

    onApprove: async function () {
      if (!this._selectedContext) return;
      try {
        const supplier = await this._invokeBoundAction(this._selectedContext, "approveApplication");
        this.getView().getModel("view").setProperty("/selected", supplier);
        this.getView().getModel("view").setProperty("/selectedStatusState", "Success");
        this.byId("supplierDetailDialog").close();
        this.byId("suppliersTable").getBinding("items").refresh();
        MessageToast.show("Supplier application approved.");
      } catch (error) {
        MessageBox.error(error.message || "Could not approve the application.");
      }
    },

    onOpenReject: function () {
      if (!this._selectedContext) return;
      if (!this._rejectDialog) {
        const checks = this._editableFields.map(([key, label]) => new CheckBox({
          text: label,
          selected: false,
          customData: [new CustomData({ key: "field", value: key })]
        }));
        this._reasonInput = new TextArea({ width: "100%", rows: 4, placeholder: "Explain why this application is rejected" });
        this._rejectDialog = new Dialog({
          title: "Reject Supplier Application",
          contentWidth: "34rem",
          content: [
            new Label({ text: "Rejection reason", required: true, labelFor: this._reasonInput }),
            this._reasonInput,
            new Label({ text: "Fields the supplier may edit", class: "sapUiSmallMarginTop" }),
            new VBox({ items: checks })
          ],
          beginButton: new Button({ text: "Confirm Rejection", type: "Reject", press: this.onConfirmReject.bind(this) }),
          endButton: new Button({ text: "Cancel", press: () => this._rejectDialog.close() })
        });
        this._rejectDialog.addStyleClass("sapUiContentPadding");
        this.getView().addDependent(this._rejectDialog);
        this._editableChecks = checks;
      }
      this._reasonInput.setValue("");
      this._editableChecks.forEach((check) => check.setSelected(false));
      this._rejectDialog.open();
    },

    onConfirmReject: async function () {
      const reason = this._reasonInput.getValue().trim();
      if (!reason) return MessageBox.error("Enter a rejection reason before continuing.");
      const editableFields = this._editableChecks
        .filter((check) => check.getSelected())
        .map((check) => check.data("field"))
        .join(",");
      try {
        const supplier = await this._invokeBoundAction(this._selectedContext, "rejectApplication", { reason, editableFields });
        this.getView().getModel("view").setProperty("/selected", supplier);
        this.getView().getModel("view").setProperty("/selectedStatusState", "Error");
        this._rejectDialog.close();
        this.byId("supplierDetailDialog").close();
        this.byId("suppliersTable").getBinding("items").refresh();
        MessageToast.show("Supplier application rejected.");
      } catch (error) {
        MessageBox.error(error.message || "Could not reject the application.");
      }
    },

    onAnalyzeCertificate: async function () {
      const vm = this.getView().getModel("view");
      const certificate = vm.getProperty("/certificate");
      if (!certificate.ID) return MessageBox.error("No certificate is attached to this supplier.");
      try {
        const context = this.getView().getModel().bindContext(`/Certificates(${certificate.ID})`);
        const result = await this._invokeBoundAction(context.getBoundContext(), "analyzeCertificateWithAI");
        vm.setProperty("/certificate", result);
        MessageToast.show("Certificate analysis completed.");
      } catch (error) {
        MessageBox.error(error.message || "Certificate analysis failed.");
      }
    },

    onCloseDetail: function () {
      this.byId("supplierDetailDialog").close();
    }
  });
});
