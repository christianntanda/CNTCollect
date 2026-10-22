# CNTCollect - Environment Separation Matrix & Policy
**Requirement:** Section 33.2 Environment Separation  
**Standard:** Strict Non-Overlap of Credentials, Storage, and Infrastructure  

---

## 1. Environment Topology

CNTCollect defines four isolated operational tiers:

```
+------------------------------------------------------------------------------------+
|  1. LOCAL DEV         2. AUTOMATED TEST         3. STAGING         4. PRODUCTION    |
|  - SQLite/Mock DB     - In-Memory SQLite        - Cloud SQL (Stage)- Cloud SQL (HA) |
|  - Test API Keys      - Mocked Adapters         - Sandbox APIs     - Production Key |
|  - Local Vite HMR     - Jest / Vitest Runner    - Cloud Run Stage  - Cloud Run Prod |
|  - Local File Storage - Ephemeral Temp Dir      - GCS Staging      - GCS Multi-Reg  |
+------------------------------------------------------------------------------------+
```

---

## 2. Configuration & Parameter Matrix

| Parameter / Feature | Local Development (`development`) | Automated Testing (`test`) | Staging (`staging`) | Production (`production`) |
| :--- | :--- | :--- | :--- | :--- |
| **Node Environment** | `NODE_ENV=development` | `NODE_ENV=test` | `NODE_ENV=staging` | `NODE_ENV=production` |
| **Database Engine** | Local JSON / SQLite file | Ephemeral in-memory SQLite | Cloud SQL PostgreSQL (db-f1-micro) | Cloud SQL PostgreSQL (db-custom-2-7680 HA) |
| **Database Migrations** | Auto-seeded on boot | Auto-applied per test suite | Applied via CI/CD deployment | Applied via blue/green migration gate |
| **Payment Gateway** | Stripe Mock / Simulator | In-memory Mock Service | Stripe Test Mode (`sk_test_...`) | Stripe Live Mode (`sk_live_...`) |
| **Email Dispatch** | Console logger / MailHog | Memory mock (zero outgoing) | SendGrid Test Mode | SendGrid Live TLS (`api.sendgrid.com`) |
| **WhatsApp Provider** | Local mock webhook receiver | Mocked stub | Twilio Sandbox Number | Twilio Approved Brand Sender ID |
| **AI Engine (Gemini)** | Mock fallback / Dev Key | Mocked deterministic vector | Gemini Flash 2.5 (Quota capped) | Gemini 2.5 Flash / Pro (Enterprise Tier)|
| **Document Vault** | Local `./data/documents` | Temp in-memory buffer | GCS Bucket `cntcollect-stage-vault` | GCS Bucket `cntcollect-prod-vault` (CMEK) |
| **Authentication** | Demo auth / Dev bypass | Headless simulated tokens | Firebase Staging Tenant | Firebase Production Tenant (MFA Enforced)|
| **Secret Storage** | `.env.local` (Git ignored) | CI Pipeline env injection | Google Cloud Secret Manager | Google Cloud Secret Manager (Dual Approval) |

---

## 3. Strict Non-Reuse Invariant

1. **Zero Secret Sharing:** Production API keys (`sk_live_...`, SendGrid live tokens, production PostgreSQL credentials) MUST NEVER be placed in local `.env`, test suites, or staging environments.
2. **Real Money Guard:** Automated testing and staging must strictly reject live credit card numbers, live IBANs, or production webhook secrets.
3. **Data Scrubbing:** Staging databases populated from production backups must undergo automated PII masking and redaction prior to ingestion.
