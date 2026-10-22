# CNTCollect - Production Setup & Infrastructure Guide
**Target Infrastructure:** Google Cloud Platform (Google Cloud Run + Cloud SQL PostgreSQL + Secret Manager)  
**Container Engine:** Docker Multi-Stage Build  
**Process Model:** Node.js 22 LTS  

---

## 1. Prerequisites & GCP Resource Provisioning

### 1.1 GCP Project Setup
```bash
# Set GCP Project
export PROJECT_ID="cntcollect-prod"
export REGION="europe-west2"
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### 1.2 Cloud SQL Provisioning (PostgreSQL 16)
```bash
gcloud sql instances create cntcollect-pg \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-7680 \
  --region=$REGION \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery

# Create application database and user
gcloud sql databases create cntcollect_db --instance=cntcollect-pg
gcloud sql users create cntcollect_user --instance=cntcollect-pg --password="<STRONG_PASSWORD>"
```

### 1.3 Secret Manager Configuration
Store production secrets in Google Cloud Secret Manager:
```bash
echo -n "postgresql://cntcollect_user:<STRONG_PASSWORD>@127.0.0.1:5432/cntcollect_db" | \
  gcloud secrets create DATABASE_URL --data-file=-

echo -n "<STRIPE_SECRET_KEY>" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "<STRIPE_WEBHOOK_SECRET>" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
echo -n "<SENDGRID_API_KEY>" | gcloud secrets create SENDGRID_API_KEY --data-file=-
echo -n "<TWILIO_AUTH_TOKEN>" | gcloud secrets create TWILIO_AUTH_TOKEN --data-file=-
echo -n "<JWT_SECRET_KEY>" | gcloud secrets create JWT_SECRET --data-file=-
```

---

## 2. Database Migrations

Apply relational database schemas in order:
```bash
# Run core schema migration
psql $DATABASE_URL -f migrations/0001_core_relational_schema.sql

# Run performance indexes and constraints migration
psql $DATABASE_URL -f migrations/0002_indexes_and_constraints.sql
```

Verification check:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
-- Expected: organizations, debtors, invoices, line_items, payments, promises_to_pay, disputes, communications, audit_trail, etc.
```

---

## 3. Container Build & Cloud Run Deployment

Build and push the multi-stage production Docker container:
```bash
# 1. Build and Submit to Google Cloud Build
gcloud builds submit --config=cloudbuild.yaml .

# 2. Deploy to Cloud Run with Secret Manager Bindings & Cloud SQL Proxy
gcloud run deploy cntcollect \
  --image=gcr.io/$PROJECT_ID/cntcollect:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-env-vars=NODE_ENV=production,PORT=3000 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,JWT_SECRET=JWT_SECRET:latest" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:cntcollect-pg \
  --min-instances=1 \
  --max-instances=20 \
  --cpu=2 \
  --memory=2Gi
```

---

## 4. Domain & SSL Setup

1. Map custom domain `app.cntcollect.com` via Cloud Run Domain Mappings:
```bash
gcloud run domain-mappings create --service=cntcollect --domain=app.cntcollect.com --region=$REGION
```
2. Update DNS A / AAAA / CNAME records as provided in Google Cloud Console. Google Cloud automatically provisions and renews managed SSL/TLS certificates.
