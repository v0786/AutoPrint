# AutoPrint — Master Product Specification (PRD)

**Document Version**: 2.0.0  
**Status**: Approved for Production  
**Product**: AutoPrint  
**Target Market**: Stationery Stores, Xerox / Copy Shops, University Printing Hubs, Self-Service Kiosks  

---

## 1. Product Vision & Executive Summary

AutoPrint transforms the chaotic, manual print shop experience into a streamlined, touchless, self-service workflow. Traditional print shops suffer from severe bottlenecks:
* Customers crowd the counter to email or WhatsApp files to shop staff.
* Shop staff waste hours manually opening WhatsApp, downloading files, selecting print options, calculating prices, and handling manual UPI/cash transactions.
* Finished prints get mixed up, leading to privacy breaches, duplicate prints, and customer disputes.

**AutoPrint solves this end-to-end**:
1. The shop owner places a durable **Shop QR code** on the counter.
2. The customer walks in, scans the QR code with their mobile phone (or uses an in-shop touch kiosk).
3. The customer enters their name, uploads documents, configures pages/copies/color, reviews real-time pricing, and chooses to pay online (UPI/Card) or pay cash at the counter.
4. An **8-digit Collection Code** is displayed on the customer's screen.
5. In the background, AutoPrint silently spools the document to the merchant's printer (for online paid jobs) or securely holds it in queue until cash is confirmed at the counter.
6. The customer shows their 8-digit code, collects their prints, and leaves. Original customer files are permanently purged upon pickup.

---

## 2. Core User Personas

### Persona A: The Xerox Shop Operator ("Ramesh")
* **Hardware**: Runs a Windows 7 or Windows 10 workstation connected via USB/LAN to high-speed laser printers (e.g. Canon imageRUNNER, HP LaserJet, Epson EcoTank).
* **Pain Points**: Busy morning and exam rushes; manually opening dozens of WhatsApp chats; printer paper jams; customer arguments over page counts and prices.
* **Goal**: Hands-off printing where jobs queue automatically, payments are tracked, and prints emerge ready for collection with zero manual document handling.

### Persona B: The Walk-in Customer ("Priya")
* **Device**: Android or iOS smartphone connected to shop Wi-Fi or 4G/5G mobile data.
* **Pain Points**: Reluctance to share phone number or email with strangers; long lines waiting for shopkeepers to open files; fear of private documents remaining on the shop's public desktop.
* **Goal**: Quick 30-second upload, clear price calculation, instant payment, and private, automatic printing.

---

## 3. End-to-End Product Workflows

### 3.1 Flow 1: Online Payment (Touchless Instant Print)
```text
[Customer Scans Shop QR]
         │
         ▼
[Welcome Screen — Enter Name: "Priya"]
         │
         ▼
[Upload Document: Thesis.pdf (18 pages)]
         │
         ▼
[Configure: B&W, Duplex, 1 Copy — Price: ₹18.00]
         │
         ▼
[Confirm & Select Online Payment (UPI / QR)]
         │
         ▼
[Payment Verified]
         │
         ▼
[Thank You Screen: Collection Code 84729103]
         │
         ▼
[AutoPrint Background Engine spools to Default Printer]
         │
         ▼
[Customer shows 84729103 at counter -> Receives prints]
         │
         ▼
[Merchant marks "COLLECTED" -> File Thesis.pdf permanently deleted]
```

### 3.2 Flow 2: Cash Payment at Counter
```text
[Customer uploads and configures job]
         │
         ▼
[Selects "Pay Cash at Counter"]
         │
         ▼
[Job HELD in Queue — Not printed yet]
         │
         ▼
[Thank You Screen: Collection Code 19284756]
"Please show this 8-digit code to the counter staff."
         │
         ▼
[Customer approaches counter and states code "19284756"]
         │
         ▼
[Merchant types 19284756 into Merchant Dashboard]
         │
         ▼
[Dashboard shows Customer: "Rahul", Amount: ₹45.00, 30 Pages B&W]
         │
         ▼
[Merchant accepts cash and clicks "CASH COLLECTED"]
         │
         ▼
[Job Status moves to QUEUED -> Background Engine prints immediately]
         │
         ▼
[Customer collects prints -> File deleted from disk]
```

### 3.3 Flow 3: Customer Requests Document Modification
```text
[Customer needs editing (e.g. date change or formatting fix)]
         │
         ▼
[Customer checks "MODIFICATION REQUIRED" during upload]
         │
         ▼
[Job arrives in Merchant Queue flagged as "MODIFICATION REQUIRED"]
         │
         ▼
[Merchant clicks "DOWNLOAD DOCUMENT"]
         │
         ▼
[Merchant modifies file in MS Word/Adobe and prints manually]
         │
         ▼
[Merchant marks job "COLLECTED"]
```

---

## 4. Detailed Feature Specifications

### 4.1 First-Run Setup Wizard
* **Page 1 (Business Identity)**: Business Name, Merchant Name, Country, Currency Symbol (`₹`, `$`, `€`), Primary Language (English / Hindi).
* **Page 2 (Hardware & Pricing)**: Auto-discover connected Windows/Linux printers; select Default Printer; set per-page rates for A4 B&W Single/Double, A4 Color, A3, and custom services (Scanning, Lamination, Binding).
* **Page 3 (Public Ingress / PageKite)**: Enter PageKite Kite Name and Secret Key; instant connection test with health check diagnostics.
* **Page 4 (Counter Standee Shop QR)**: Generates high-resolution counter standee QR code encoding the shop's public URL with one-click print and save options.

### 4.2 Security & Access Controls
* **Merchant Authentication**: Salted and stretched Argon2/Scrypt/bcrypt password hashing; strictly no plaintext secrets.
* **10-Minute Dashboard Inactivity Lock**: UI locks after 10 minutes of operator inactivity. Background queue processing, printer spooling, and customer uploads continue uninterrupted while locked.
* **Emergency Recovery Code**: Cryptographically secure 24-character recovery key generated during setup; required if merchant forgets password.
* **Ephemeral Document Retention**: All uploaded files are permanently deleted from `datastore/uploads/` immediately upon customer collection. Job financial and audit metadata is retained permanently.

### 4.3 Windows & Linux Compatibility
* **Windows 7 / 8 / 8.1 / 10 / 11**: Fully supported via native .NET 4.5.2 launcher (`AutoPrint.exe`), Win32 spooler API, and bundled silent SumatraPDF.
* **Linux (Ubuntu / Debian / RHEL)**: Supported via standard CUPS printing engine (`lp`, `lpstat`).

---

## 5. Non-Functional Requirements

| Metric | Target | Verification |
|---|---|---|
| **Startup Time** | $< 3.0$ seconds to tray readiness | Verified on Windows 7 & 11 |
| **Document Ingress Latency** | $< 500$ ms for files $\le 20$ MB | Express streaming upload |
| **Verification Code Collision** | Zero collisions in 100,000 active jobs | 8-digit CSPRNG with DB unique constraint |
| **Max Single File Size** | 50 MB | Enforced via Multer middleware |
| **Max Multi-file Job Size** | 100 MB | Enforced via API gateway |
| **Memory Footprint** | $< 180$ MB total (Backend + Frontends + Launcher) | Production memory audit |
| **Offline Reliability** | 100% functional without internet connectivity | Verified with WAN unplugged |
