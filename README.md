# 🏢 CodeUP - Enterprise Supplier Management & AI Governance Portal

Bu proje, kurumsal şirketlerin tedarikçi kayıt, belge doğrulama ve onay süreçlerini dijitalleştirmek amacıyla **SAP Cloud Application Programming (CAP)** modeli, **SAP UI5 / Fiori** ve **SAP HANA Cloud** teknolojileri kullanılarak geliştirilmiş uçtan uca bir kurumsal çözümdür.

---

## 🌟 Öne Çıkan Özellikler & Kurumsal UX

### 1. Yönetici Paneli & Fiori KPI Dashboard (`supplier-approvals`)
- **Interactive KPI Tiles:** Başvuruları duruma göre anlık özetleyen Fiori standartlarında KPI Header (`Total Applications`, `Pending Review`, `Approved`, `Rejected`).
- **Dinamik Filtreleme:** KPI kartlarına veya durum butonlarına tıklanarak OData listesinin anlık süzülmesi.
- **AI Tabanlı Sertifika Analizi:** Yüklenen belgelerin (ISO, vergi levhası vb.) geçerlilik sürelerini ve sahtelik/uygunluk riskini denetleyen akıllı doğrulama simülasyonu.
- **Kısmi Ret & Alan Kilitleme:** Ret verilen başvurularda tedarikçinin yalnızca yöneticinin izin verdiği alanları (`editableFields`) güncelleyebilmesini sağlayan kurumsal yönetişim akışı.

### 2. Tedarikçi Self-Servis Portalı (`supplier-portal`)
- **Kayıt ve Giriş:** Tedarikçilerin kendi başvurularını oluşturabildiği ve takip edebildiği modern kullanıcı arayüzü.
- **Dinamik Başvuru Formu & Belge Yükleme:** Şirket unvanı, vergi dairesi/numarası ve PDF sertifikalarının yüklendiği veri toplama formu.

---

## 🛠️️ Mimari & Teknolojiler

- **Backend:** Node.js, SAP Cloud Application Programming Model (`@sap/cds` v8.9)
- **Protokol:** OData v4
- **Frontend:** SAP UI5, SAP Fiori Elements & Freestyle (Responsive MVC Pattern, GenericTile, HeaderContainer)
- **Veritabanı Katmanı:**
  - **SAP HANA Cloud:** `CODEUP_SUPPLIER_SUPPLIERS` ve `CODEUP_SUPPLIER_CERTIFICATES` tabloları HANA HDI container şemasında fiziksel olarak canlı tutulmaktadır.
  - **Yerel Ortam:** SQLite In-Memory mock veritabanı ile kesintisiz test ve geliştirme.

---

## 🚀 Kurulum ve Yerel Çalıştırma

Projeyi yerel ortamda çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
npm install

# CAP sunucusunu ve mock servisleri ayağa kaldırın
cds watch
```
