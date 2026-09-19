# AutoPrint — Product Vision & Core Philosophy

**Document ID**: 00-01  
**Category**: Foundation  
**Product**: AutoPrint  

---

## 1. Executive Summary

**AutoPrint** is a high-reliability, offline-first print management application engineered specifically for stationery stores, Xerox / copy centers, college reprographic shops, and retail print counters.

The modern walk-in printing experience in small-to-medium print shops is broken:
* Customers wait in disorganised queues.
* Files are shared through WhatsApp or personal email, creating privacy risks and manual hassle.
* Shopkeepers must manually open files, inspect formats, set printer options, and calculate custom prices.
* Confusion arises during print collection: "Which printout is mine?"

AutoPrint replaces this friction with an elegant, touchless self-service workflow:
**Scan QR $\rightarrow$ Enter Name $\rightarrow$ Upload $\rightarrow$ Configure $\rightarrow$ Pay (Online / Cash) $\rightarrow$ 8-Digit Collection Code $\rightarrow$ Collect Prints.**

---

## 2. Core Philosophy & Anti-Goals

AutoPrint adheres to a philosophy of **radical simplicity and operational utility**:

### What AutoPrint IS:
* A streamlined counter appliance for printing walk-in customer documents.
* A local, offline-resilient desktop system that runs reliably on Windows 7, 8, 10, 11, and Linux.
* A frictionless customer interface requiring **zero registration, zero customer accounts, and zero passwords**.
* An automated spooler that sends documents silently to physical printers.
* A privacy-respecting system that permanently purges customer files upon pickup.

### What AutoPrint IS NOT (Strict Anti-Goals):
* **NOT a SaaS platform**: It does not force monthly subscriptions, cloud database dependencies, or remote logins.
* **NOT a social platform or CRM**: We do not collect customer phone numbers, emails, or build advertising profiles.
* **NOT a document management system**: Files are temporary transient payloads; we do not store customer archives.
* **NOT a complex graphic design editor**: Document modification is kept outside AutoPrint using standard desktop tools.

---

## 3. The 8-Digit Collection Code Paradigm

Instead of confusing customers with internal database Job IDs (e.g. `AP-9F2B81C4`), AutoPrint uses a human-friendly **8-digit numeric Collection Code** (e.g. `4829 1039`):
* Generated using a cryptographically secure pseudo-random number generator (CSPRNG).
* Displayed clearly on the customer's Thank You screen.
* Spoken or shown at the counter for instant job retrieval.
* Guaranteed unique among all active and pending jobs.

---

## 4. Privacy & Ephemeral Data Handling

Customer trust is paramount in public printing:
1. **Normal Jobs**: The merchant never needs to open or view the uploaded document; it spools directly to paper.
2. **Modification Jobs**: If and only if the customer explicitly selects "MODIFICATION REQUIRED", the merchant is provided a "Download Document" button to assist the customer.
3. **Automatic Purge**: When the merchant clicks "COLLECTED", the original document in `datastore/uploads/` is permanently wiped from the filesystem.
