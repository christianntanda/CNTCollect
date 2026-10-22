# CNTCollect - API Documentation (REST & Webhooks)
**Version:** 3.0.0-production  
**Base URL:** `https://api.cntcollect.com` (or `http://localhost:3000` in development)  
**Security Standard:** Bearer API Token / Firebase Auth JWT / HMAC-SHA256 Webhook Signatures  
**Multi-Tenancy:** Scoped by `organizationId` or `X-Organization-ID` header.

---

## 1. Authentication & Security Headers

All requests to private endpoints must include authentication credentials:
```http
Authorization: Bearer <JWT_OR_API_KEY>
X-Organization-ID: org-acme-uk
Content-Type: application/json
```

Standard Security Headers emitted on all responses:
* `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
* `X-Content-Type-Options: nosniff`
* `X-XSS-Protection: 1; mode=block`
* `Content-Security-Policy: default-src 'self' ...`

---

## 2. Core Receivables & Invoices API

### 2.1 List Invoices (Paginated & Filtered)
* **Endpoint:** `GET /api/invoices`
* **Query Parameters:**
  * `orgId` (string, required): Organization ID.
  * `page` (number, default: 1): Current page.
  * `limit` (number, default: 25, max: 100): Page limit.
  * `status` (string, optional): Filter by `draft`, `issued`, `partially_paid`, `paid`, `disputed`, `cancelled`.
  * `search` (string, optional): Debtor name, reference number, or invoice number.
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv-1001",
      "organizationId": "org-acme-uk",
      "debtorId": "deb-apex-solutions",
      "invoiceNumber": "INV-2026-001",
      "issueDate": "2026-09-01",
      "dueDate": "2026-10-01",
      "currency": "GBP",
      "subtotal": 12500.00,
      "taxTotal": 2500.00,
      "totalAmount": 15000.00,
      "amountPaid": 5000.00,
      "amountOutstanding": 10000.00,
      "status": "partially_paid",
      "daysOverdue": 20,
      "ageingBucket": "1_30"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalCount": 84,
    "totalPages": 4
  }
}
```

### 2.2 Create Invoice Record
* **Endpoint:** `POST /api/invoices`
* **Payload:**
```json
{
  "organizationId": "org-acme-uk",
  "debtorId": "deb-apex-solutions",
  "invoiceNumber": "INV-2026-085",
  "issueDate": "2026-10-15",
  "dueDate": "2026-11-15",
  "currency": "GBP",
  "lineItems": [
    { "description": "Freight & Warehousing Oct 2026", "quantity": 1, "unitPrice": 4200.00, "taxRate": 20.0 }
  ],
  "poNumber": "PO-99104"
}
```
* **Response (201 Created):** Returns the persisted invoice object with deterministic balance calculation.

---

## 3. Payments & Allocations API

### 3.1 Record Payment
* **Endpoint:** `POST /api/payments`
* **Payload:**
```json
{
  "organizationId": "org-acme-uk",
  "debtorId": "deb-apex-solutions",
  "invoiceId": "inv-1001",
  "amount": 2500.00,
  "currency": "GBP",
  "paymentMethod": "bacs_transfer",
  "reference": "BACS-TX-88204",
  "notes": "Second installment per promise agreement"
}
```
* **Processing Guarantees:**
  * Acid transactional balance update.
  * Decreases `amountOutstanding` deterministically.
  * Automatic cancellation of pending future dunning reminders if balance reaches zero.
  * Appends immutable entry to `audit_trail`.

---

## 4. Payment Reminders & Dunning API

### 4.1 Trigger Automated Dunning Cycle
* **Endpoint:** `POST /api/dunning/run-cycle`
* **Payload:** `{ "organizationId": "org-acme-uk", "dryRun": false }`
* **Response (200 OK):**
```json
{
  "success": true,
  "evaluatedCount": 38,
  "remindersSent": 4,
  "remindersSuppressed": 12,
  "failedCount": 0
}
```

### 4.2 Preview Reminder Draft (Deterministic or AI-Assisted)
* **Endpoint:** `POST /api/dunning/generate-draft`
* **Payload:**
```json
{
  "invoiceId": "inv-1001",
  "channel": "email",
  "tone": "polite"
}
```

---

## 5. Webhooks & Inbound Event Ingestion

### 5.1 Stripe / Bank Provider Webhook
* **Endpoint:** `POST /api/webhooks/stripe`
* **Headers:** `Stripe-Signature: t=1729510000,v1=abcdef...`
* **Supported Events:**
  * `payment_intent.succeeded` -> Allocates payment to invoice.
  * `customer.subscription.updated` -> Updates SaaS tier limits.
  * `charge.refunded` -> Reverses payment allocation and recalculates outstanding balance.

### 5.2 Twilio / WhatsApp Delivery Receipt Webhook
* **Endpoint:** `POST /api/webhooks/whatsapp`
* **Headers:** `X-Twilio-Signature: ...`
* **Supported Statuses:** `delivered`, `read`, `failed`, `undelivered`.

---

## 6. SRE, Health & Observability Endpoints

### 6.1 SRE Health Probe
* **Endpoint:** `GET /api/health`
* **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-21T06:17:00.000Z",
  "version": "3.0.0-production",
  "environment": "production",
  "uptimeSeconds": 14205,
  "subsystems": {
    "database": { "status": "healthy", "latencyMs": 4 },
    "auth": { "status": "healthy" },
    "storage": { "status": "healthy" },
    "jobs": { "status": "healthy", "pendingCount": 0 }
  }
}
```

### 6.2 Observability Dashboard
* **Endpoint:** `GET /api/observability/dashboard?orgId=org-acme-uk`
* **Response:** Returns aggregated metrics, failure tracking across 9 subsystems, and active incident catalog.

### 6.3 Safe Incident Retry
* **Endpoint:** `POST /api/observability/incidents/:id/retry`
* **Response:** Idempotent re-execution of failed reminder delivery, webhook, or sync event.
