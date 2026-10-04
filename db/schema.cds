namespace codeup.supplier;

using { cuid, managed } from '@sap/cds/common';

type Status : String enum {
  Submitted;
  Approved;
  Rejected;
}

entity Suppliers : cuid, managed {
  companyName    : String(100);
  taxNumber      : String(20);
  contactPerson  : String(100);
  taxOffice      : String(100);
  email          : String(100);
  address        : String(255);
  country        : String(50);
  city           : String(50);
  phone          : String(30);
  category       : String(50);
  status         : Status default 'Submitted';
  rejectReason   : String(500);
  editableFields : String(255);
  certificate    : Composition of one Certificates
                   on certificate.supplier = $self;
}

entity Certificates : cuid, managed {
  supplier   : Association to Suppliers;
  fileName   : String(255);
  mimeType   : String(100) default 'application/pdf';
  content    : LargeBinary
                 @Core.MediaType: mimeType
                 @Core.Filename: fileName;
  fileSize   : Integer;
  validUntil : Date;
  aiAnalysis : String(500);
  isExpired  : Boolean;
}
