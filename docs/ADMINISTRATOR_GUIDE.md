# CNTCollect - Platform Administrator Guide
**Audience:** Platform Administrators, DevSecOps Engineers, and Financial Operations Managers  
**Classification:** Internal Administration  

---

## 1. System Overview & Multi-Tenant Model

CNTCollect is built on a strict multi-tenant architecture designed to maintain complete data isolation across organizations. 

### Core Tenancy Principles:
1. **Strict Organization Scoping:** Every business object (`invoices`, `debtors`, `payments`, `communications`, `documents`, `workflows`) possesses an immutable `organizationId` foreign key.
2. **Authorization Boundary:** No API endpoint or database query returns records from multiple tenants in a single tenant-facing transaction.
3. **Audit Trail Enforced:** All administrative modifications, role upgrades, threshold edits, and tenant onboarding actions are written to immutable audit logs.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Permission Capability | Platform Admin | Organization Admin | Finance Manager | Credit Controller | Read-Only Auditor | Debtor Guest |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Provision New Tenants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Billing / Plan Tier | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / Void Invoices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Issue Credit Notes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record Payments / Reversals | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Trigger Bulk Dunning Reminders| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lodge / Resolve Disputes | ✅ | ✅ | ✅ | ✅ | ❌ | Debtor Self |
| View Financial Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Execute Database Migrations | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configure Observability Alerts| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. High-Impact Action Safeguards

For sensitive financial and tenant operations, CNTCollect enforces a two-step confirmation pattern:
* **Password Re-Authentication / Confirmation Token:** Required when initiating tenant deactivation, bulk reminder dispatches (> 50 recipients), or financial ledger reversals.
* **Impact Previews:** Visual breakdown showing the exact number of debtor accounts, open balances, and outbound communications affected before execution.

---

## 4. Operational Maintenance & Background Queues

### Cloud Scheduler & Worker Crons:
1. **Daily Overdue Evaluation (`0 2 * * *`):** Evaluates all open invoices across organizations, assigns days overdue, calculates ageing buckets (`Current`, `1-30`, `31-60`, `61-90`, `90+`), and stages pending reminder drafts.
2. **Reminder Delivery Batcher (`*/15 8-17 * * 1-5`):** Dispatches queued reminders respecting debtor quiet hours, contact cadence limits, and dispute suppression.
3. **Dispute SLA Escalation (`0 * * * *`):** Flags unresolved customer queries exceeding 48 hours without collector response.
4. **Subscription Quota Reconciliation (`0 0 1 * *`):** Calculates monthly active debtor counts against SaaS subscription tiers (Starter, Professional, Enterprise).

---

## 5. Security & Key Management

* **API Keys & Webhook Secrets:** Stored exclusively in environment variables or cloud secret stores (e.g. Google Cloud Secret Manager). Never committed to Git.
* **Sensitive Data Sanitization:** PII, card PANs, and bank account numbers are masked before persisting to diagnostic logs or telemetry streams.
* **Session Lifecycle:** JWT tokens expire after 24 hours. Inactivity logout enforced after 30 minutes of idle UI time.
