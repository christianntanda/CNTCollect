# CNTCollect - End User & Collector Guide
**Audience:** Credit Controllers, AR Specialists, Finance Teams, and Customer Portal Users  
**Version:** 3.0.0-production  

---

## 1. Quick Start & Navigation

### 1.1 The Navigation Bar & Command Centre
* **Command Centre (`⌘K` or `Ctrl+K`):** Global search and AI command assistant. Instantly find invoices, debtors, payments, and run natural language queries like *"Show invoices overdue > 30 days"* or *"Prepare polite reminder for INV-1005"*.
* **Multi-Tenant Switcher:** Top-left dropdown allows authorized users to switch between operational entities (e.g. Acme Logistics UK, Nexura France).
* **Notification Centre:** Bell icon displays real-time alerts for customer disputes, promise breaches, and webhook failures.

---

## 2. Managing Invoices & Receivables

### 2.1 Invoice Lifecycle
1. **Draft:** Created manually or imported via CSV/XLSX. Can be edited or deleted.
2. **Issued / Sent:** Active receivable awaiting settlement.
3. **Partially Paid:** One or more payments recorded; remaining balance tracked automatically.
4. **Paid:** Full payment allocated. Reminders automatically cease.
5. **Disputed:** Debtor raised a contestation. Automated dunning is frozen to preserve relationship until resolution.
6. **Written Off / Cancelled:** Uncollectible bad debt or cancelled by credit note.

### 2.2 Issuing Credit Notes
* Go to **AR Calculation Engine** or **Credit Notes**.
* Select debtor and target invoice.
* Specify credit amount, reason code (e.g., pricing adjustment, damaged goods), and apply.
* The system deterministically recalculates invoice balance and posts to the audit ledger.

---

## 3. Automated Payment Reminders & Dunning

### 3.1 Workflow Steps & Quiet Hours
* Reminders escalate through deterministic workflow stages:
  * **Friendly Reminder:** 3 days before due date.
  * **Due Date Notice:** On due date.
  * **Escalation 1:** 7 days overdue.
  * **Escalation 2:** 21 days overdue (includes credit hold warning).
  * **Final Demand / Legal Notice:** 45+ days overdue.
* **Quiet Hours:** Reminders are held until 09:00 - 17:00 debtor local time.
* **Suppression Guard:** Any invoice with an open dispute or active payment promise automatically halts reminder dispatch.

---

## 4. Debtor Self-Service Portal

Debtors access a secured, branded portal without needing full CNTCollect operator credentials:
* **View Statements & Invoices:** Real-time ledger view of all open items.
* **Direct Payment:** Pay by credit card, BACS, SEPA, or bank transfer via Stripe integration.
* **Submit Payment Evidence:** Upload bank transfer slips for rapid collector verification.
* **Register Promises to Pay:** Agree on scheduled future installments.
* **Lodge Queries & Disputes:** Directly flag discrepancies with supporting notes.
