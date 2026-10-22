# CNTCollect - Production Deployment Checklist
**Specification:** Section 33.4 Production Deployment Checklist  
**Status:** Pre-Launch Audit & Verification  
**Total Criteria:** 18 Required Verification Checks  

---

## 1. Production Verification Checklist

| # | Check Item | Section | Status | Verification Detail / Command |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Database Migrations** | 33.4.1 | ✅ **PASSED** | Core relational schema (`0001`) and indexes (`0002`) verified syntactically and idempotently. Rollback scripts tested. |
| **2** | **Authentication Configured** | 33.4.2 | ✅ **PASSED** | Firebase Auth + cryptographic PBKDF2 with unique salts, session timeouts (24h), and RBAC role boundaries. |
| **3** | **Tenant Isolation Tested** | 33.4.3 | ✅ **PASSED** | Unit & integration tests in Part 31 confirm cross-tenant access to invoices, debtors, and reports is strictly blocked (HTTP 403). |
| **4** | **HTTPS Enforcement** | 33.4.4 | ✅ **PASSED** | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` and Cloud Run SSL termination active. |
| **5** | **Secrets Securely Stored** | 33.4.5 | ✅ **PASSED** | `.env.example` scrubbed of all secrets. Production deployment binds via GCP Secret Manager (`--set-secrets`). |
| **6** | **Backups Configured** | 33.4.6 | ✅ **PASSED** | Automated daily Cloud SQL backups scheduled at 02:00 UTC with 30-day retention and point-in-time recovery enabled. |
| **7** | **Restore Procedures Tested** | 33.4.7 | ✅ **PASSED** | Point-in-time database restoration drill documented and validated on staging instance `cntcollect-pg-stage`. |
| **8** | **Monitoring Enabled** | 33.4.8 | ✅ **PASSED** | SRE Health Check (`/api/health`), Cloud Monitoring metrics, latency percentiles (P95/P99), and error rate alerting active. |
| **9** | **Webhook Signatures Validated** | 33.4.9 | ✅ **PASSED** | Stripe HMAC-SHA256 (`Stripe-Signature`) and Twilio signature verification middleware enforced on all inbound hooks. |
| **10**| **Reminder Scheduling Operational** | 33.4.10 | ✅ **PASSED** | Background worker queue, quiet hours suppression, and dunning engine state transitions tested and operational. |
| **11**| **Email Delivery Verified** | 33.4.11 | ✅ **PASSED** | SendGrid integration adapter with TLS encryption, DKIM/SPF domain verification, and bounce tracking handlers. |
| **12**| **WhatsApp Provider Tested** | 33.4.12 | ✅ **PASSED** | Twilio Business API adapter with template message registration, opt-in enforcement, and delivery receipt callbacks. |
| **13**| **Payment Integration Tested** | 33.4.13 | ✅ **PASSED** | Stripe payment intent flow, partial allocations, webhook idempotent processing, and zero-balance reminder halts tested. |
| **14**| **Data Retention Policies Configured** | 33.4.14 | ✅ **PASSED** | 7-year statutory financial ledger retention, automated cold-storage archiving, and GDPR "Right to Erasure" handling. |
| **15**| **Terms & Privacy Docs Prepared** | 33.4.15 | ✅ **PASSED** | SaaS Master Service Agreement (MSA), End-User Terms of Service, Debtor Privacy Notice, and Subprocessor registers. |
| **16**| **Subscription Billing Tested** | 33.4.16 | ✅ **PASSED** | Starter, Professional, and Enterprise quota metering, seat limits, and Stripe Customer Portal integration verified. |
| **17**| **Security Testing Completed** | 33.4.17 | ✅ **PASSED** | Static code analysis (SAST), dependency vulnerability audit, CSP anti-XSS header verification, and rate limiting validated. |
| **18**| **Production Error Handling Operational** | 33.4.18 | ✅ **PASSED** | 11-class error catalog, sensitive credential sanitizer, safe idempotent retry engine, and user-friendly error codes active. |

---

## 2. Pre-Flight Blockers & Operational Items

Before cutting live traffic to public DNS (`app.cntcollect.com`), the following external actions must be completed by the infrastructure team:

1. **DNS CNAME & Apex Record Propagation:**
   * *Status:* ⏳ Pending DNS Delegation
   * *Required Action:* Configure custom domain CNAME `app.cntcollect.com` pointing to `ghs.googlehosted.com` in enterprise DNS registrar (Cloudflare / Route53).
2. **Production Secret Manager Secret Injection:**
   * *Status:* ⏳ Ready for Operator Credentials
   * *Required Action:* Replace sandbox placeholders in Google Cloud Secret Manager with production live keys (`STRIPE_SECRET_KEY=sk_live_...`, `SENDGRID_API_KEY=SG...`).
3. **WhatsApp Meta Business Template Approval:**
   * *Status:* ⏳ Meta Approval in Progress
   * *Required Action:* Twilio WhatsApp Business Profile approved; final automated overdue reminder templates submitted for 24-hour Meta review.
