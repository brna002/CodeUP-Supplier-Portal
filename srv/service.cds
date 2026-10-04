using { codeup.supplier as supplier } from '../db/schema';

service SupplierService @(path: '/odata/v4/supplier') {
  entity Suppliers as projection on supplier.Suppliers actions {
    action approveApplication() returns Suppliers;
    action rejectApplication(reason: String, editableFields: String) returns Suppliers;
  };

  entity Certificates as projection on supplier.Certificates actions {
    action analyzeCertificateWithAI() returns Certificates;
  };
}
