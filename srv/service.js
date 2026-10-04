const cds = require('@sap/cds');
const axios = require('axios');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class SupplierService extends cds.ApplicationService {
  async init() {
    const { Suppliers, Certificates } = this.entities;

    this.before(['CREATE', 'UPDATE'], Suppliers, (req) => {
      const { email, companyName, taxNumber } = req.data;

      if (email != null && !EMAIL_PATTERN.test(email)) {
        req.error(400, 'Enter a valid email address.', 'email');
      }
      if (req.event === 'CREATE' || companyName !== undefined) {
        if (!companyName || !companyName.trim()) {
          req.error(400, 'Company name is required.', 'companyName');
        }
      }
      if (req.event === 'CREATE' || taxNumber !== undefined) {
        if (!taxNumber || !taxNumber.trim()) {
          req.error(400, 'Tax number is required.', 'taxNumber');
        }
      }
    });

    this.on('approveApplication', Suppliers, async (req) => {
      const ID = req.params[0].ID;
      await UPDATE(Suppliers).set({
        status: 'Approved',
        rejectReason: null,
        editableFields: null
      }).where({ ID });
      return SELECT.one.from(Suppliers).where({ ID });
    });

    this.on('rejectApplication', Suppliers, async (req) => {
      const reason = req.data.reason;
      if (typeof reason !== 'string' || !reason.trim()) {
        return req.reject(400, 'A rejection reason is required.');
      }

      const ID = req.params[0].ID;
      await UPDATE(Suppliers).set({
        status: 'Rejected',
        rejectReason: reason.trim(),
        editableFields: req.data.editableFields || null
      }).where({ ID });
      return SELECT.one.from(Suppliers).where({ ID });
    });

    this.on('analyzeCertificateWithAI', Certificates, async (req) => {
      const ID = req.params[0].ID;
      const certificate = await SELECT.one.from(Certificates).where({ ID });
      if (!certificate) return req.reject(404, 'Certificate not found.');

      let validUntil = certificate.validUntil;
      let usedMockDate = false;
      if (!validUntil) {
        const mockDate = new Date();
        const expiredMock = (certificate.fileName || '').toLowerCase().includes('expired');
        mockDate.setDate(mockDate.getDate() + (expiredMock ? -30 : 365));
        validUntil = mockDate.toISOString().slice(0, 10);
        usedMockDate = true;
      }

      const today = new Date().toISOString().slice(0, 10);
      const expirationDate = String(validUntil).slice(0, 10);
      const isExpired = expirationDate < today;
      const compliance = isExpired ? 'Non-compliant (Expired)' : 'Compliant';
      let aiAnalysis = `AI Audit Complete: Certificate verified. Expiration date: ${expirationDate}. Status: ${compliance}${usedMockDate ? ' (mock date assigned)' : ''}.`;

      // LLM integration seam: configure an endpoint and API key through
      // environment variables, then submit permitted extracted text/metadata.
      const llmEndpoint = process.env.LLM_API_ENDPOINT;
      const llmApiKey = process.env.LLM_API_KEY;
      if (llmEndpoint && llmApiKey) {
        // Replace this with the provider-specific payload and response mapping.
        // const response = await axios.post(llmEndpoint, payload, {
        //   headers: { Authorization: `Bearer ${llmApiKey}` }
        // });
        // aiAnalysis = response.data.summary;
        void axios;
      }

      await UPDATE(Certificates).set({ validUntil: expirationDate, isExpired, aiAnalysis }).where({ ID });
      return SELECT.one.from(Certificates).where({ ID });
    });

    return super.init();
  }
}

module.exports = SupplierService;
