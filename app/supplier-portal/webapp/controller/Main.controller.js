sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/ValueState"
], function (Controller, MessageBox, MessageToast, ValueState) {
  "use strict";

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  return Controller.extend("codeup.supplier.portal.controller.Main", {
    onInit: function () {
      this._supplierId = null;
      this._certificateFile = null;
      const supplier = this._viewModel().getProperty("/supplier") || {};
      const editableFields = (supplier.editableFields || "").split(",").map((field) => field.trim()).filter(Boolean);
      this._applyRejectionEditRules(editableFields, supplier.status === "Rejected");
    },

    _model: function () { return this.getOwnerComponent().getModel(); },
    _viewModel: function () { return this.getOwnerComponent().getModel("view"); },

    onLogin: async function () {
      const vm = this._viewModel();
      const email = vm.getProperty("/authEmail") || "";
      const password = vm.getProperty("/authPassword") || "";
      if (!EMAIL_PATTERN.test(email)) return MessageBox.error("Enter a valid email address.");
      if (!password) return MessageBox.error("Enter your password.");
      await this._loadSupplier(email);
      this.getOwnerComponent().getRouter().navTo("ApplicationForm");
    },

    onRegister: function () {
      const vm = this._viewModel();
      const email = vm.getProperty("/authEmail") || "";
      const password = vm.getProperty("/authPassword") || "";
      if (!EMAIL_PATTERN.test(email)) return MessageBox.error("Enter a valid email address.");
      if (!PASSWORD_PATTERN.test(password)) return MessageBox.error("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      if (password !== vm.getProperty("/confirmPassword")) return MessageBox.error("Passwords do not match.");
      vm.setProperty("/supplier/email", email);
      this.getOwnerComponent().getRouter().navTo("ApplicationForm");
    },

    _loadSupplier: async function (email) {
      const model = this._model();
      const list = model.bindList("/Suppliers", undefined, undefined, undefined, {
        $filter: `email eq '${email.replace(/'/g, "''")}'`,
        $top: 1
      });
      const contexts = await list.requestContexts(0, 1);
      const supplier = contexts.length ? contexts[0].getObject() : {};
      this._supplierId = supplier.ID || null;
      this._setSupplierState(supplier);
    },

    _setSupplierState: function (supplier) {
      const vm = this._viewModel();
      const editableFields = (supplier.editableFields || "").split(",").map((field) => field.trim()).filter(Boolean);
      vm.setProperty("/supplier", supplier);
      vm.setProperty("/editableFields", editableFields);
      vm.setProperty("/isRejected", supplier.status === "Rejected");
      vm.setProperty("/rejectionMessage", supplier.status === "Rejected"
        ? `Application rejected: ${supplier.rejectReason || "Please review the requested changes."} Only marked fields can be edited for resubmission.`
        : "");
      vm.setProperty("/statusState", supplier.status === "Approved" ? ValueState.Success : supplier.status === "Rejected" ? ValueState.Error : ValueState.Information);
      this._applyRejectionEditRules(editableFields, supplier.status === "Rejected");
    },

    _applyRejectionEditRules: function (editableFields, rejected) {
      ["companyName", "taxNumber", "contactPerson", "taxOffice", "email", "address", "country", "city", "phone", "category"].forEach((field) => {
        const control = this.byId(field);
        if (!control) return;
        const editable = !rejected || editableFields.includes(field);
        if (typeof control.setEditable === "function") control.setEditable(editable);
        else if (typeof control.setEnabled === "function") control.setEnabled(editable);
      });
    },

    onCertificateChange: function (event) {
      const file = event.getParameter("files") && event.getParameter("files")[0];
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        this._certificateFile = null;
        event.getSource().clear();
        return MessageBox.error("Upload a PDF certificate only.");
      }
      if (file.size > 10 * 1024 * 1024) {
        this._certificateFile = null;
        event.getSource().clear();
        return MessageBox.error("The certificate must be 10 MB or smaller.");
      }
      this._certificateFile = file;
    },

    _validateSupplier: function (supplier) {
      if (!supplier.companyName || !supplier.companyName.trim()) return "Company name is required.";
      if (!supplier.taxNumber || !supplier.taxNumber.trim()) return "Tax number is required.";
      if (!EMAIL_PATTERN.test(supplier.email || "")) return "Enter a valid email address.";
      return null;
    },

    onSubmit: async function () {
      const model = this._model();
      const supplier = { ...this._viewModel().getProperty("/supplier") };
      const validationError = this._validateSupplier(supplier);
      if (validationError) return MessageBox.error(validationError);
      supplier.status = "Submitted";
      supplier.rejectReason = null;
      supplier.editableFields = null;
      try {
        if (this._supplierId) {
          const context = model.bindContext(`/Suppliers(${this._supplierId})`);
          Object.keys(supplier).forEach((key) => {
            if (key !== "ID" && supplier[key] !== undefined) context.getBoundContext().setProperty(key, supplier[key]);
          });
          await model.submitBatch("$auto");
        } else {
          const list = model.bindList("/Suppliers");
          const context = list.create(supplier);
          await model.submitBatch("$auto");
          await context.created();
          this._supplierId = context.getObject().ID;
        }
        if (this._certificateFile) await this._uploadCertificate(model, this._supplierId, this._certificateFile);
        this._setSupplierState(supplier);
        MessageToast.show("Application submitted.");
        this.getOwnerComponent().getRouter().navTo("StatusTracker");
      } catch (error) {
        MessageBox.error(error.message || "Unable to submit the application.");
      }
    },

    _uploadCertificate: async function (model, supplierId, file) {
      const response = await fetch("/odata/v4/supplier/Certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_ID: supplierId, fileName: file.name, mimeType: "application/pdf", fileSize: file.size })
      });
      if (!response.ok) throw new Error("Unable to create certificate record.");
      const certificate = await response.json();
      const uploadResponse = await fetch(`/odata/v4/supplier/Certificates(${certificate.ID})/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf", "Slug": file.name },
        body: file
      });
      if (!uploadResponse.ok) throw new Error("Unable to upload the certificate PDF.");
    },

    onShowStatus: function () { this.getOwnerComponent().getRouter().navTo("StatusTracker"); },
    onEditResubmission: function () { this.getOwnerComponent().getRouter().navTo("ApplicationForm"); },
    onNavBack: function () { this.getOwnerComponent().getRouter().navTo("ApplicationForm"); }
  });
});
