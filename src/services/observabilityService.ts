// ============================================================================
// CNTCollect Observability & Error Handling Engine
// Part 32: Secure Diagnostic Logging, Sanitization, Health Checks & Safe Retries
// ============================================================================

import {
  ErrorCategory,
  ErrorSeverity,
  ObservabilityIncident,
  SubsystemHealth,
  OperationalAlert,
  ObservabilityDashboardState
} from '../types';

// Standardized Error Catalog for 11 Mandated Failure Types (Part 32)
export interface ErrorCatalogDefinition {
  category: ErrorCategory;
  errorCode: string;
  defaultSeverity: ErrorSeverity;
  userFriendlyMessage: string;
  internalDiagnosticSample: string;
  isRetryable: boolean;
  remediationAdvice: string;
}

export const ERROR_CATALOG: Record<string, ErrorCatalogDefinition> = {
  validation: {
    category: 'validation',
    errorCode: 'ERR_VALIDATION_FAILED',
    defaultSeverity: 'medium',
    userFriendlyMessage: 'The submitted form contains invalid values or missing required fields. Please review highlighted items and submit again.',
    internalDiagnosticSample: 'ZodSchemaValidationError: Field "invoiceLines[2].unitPrice" expected positive decimal, received -45.00. Tenant org-acme-uk.',
    isRetryable: false,
    remediationAdvice: 'Correct the invalid payload fields according to the schema rules.'
  },
  auth: {
    category: 'auth',
    errorCode: 'ERR_AUTH_EXPIRED',
    defaultSeverity: 'high',
    userFriendlyMessage: 'Your security session has expired or the token is invalid. Please sign in again to resume your work.',
    internalDiagnosticSample: 'FirebaseAuthTokenExpired: Token expired at 2026-10-21T01:50:00Z. Verification failed with code auth/id-token-expired.',
    isRetryable: false,
    remediationAdvice: 'Re-authenticate with Google/Firebase to obtain a fresh cryptographic bearer token.'
  },
  permission: {
    category: 'permission',
    errorCode: 'ERR_PERMISSION_DENIED',
    defaultSeverity: 'high',
    userFriendlyMessage: 'You do not have sufficient permissions to execute this financial mutation. Please contact your Credit Control Administrator.',
    internalDiagnosticSample: 'RBACForbiddenException: User usr-collector (Role: collector) attempted POST /api/invoices/inv-001/credit-note. Required roles: [admin, finance_manager].',
    isRetryable: false,
    remediationAdvice: 'Request administrative role elevation or dual-control signoff from Finance Manager.'
  },
  import: {
    category: 'import',
    errorCode: 'ERR_IMPORT_PARSE_FAILED',
    defaultSeverity: 'medium',
    userFriendlyMessage: 'The uploaded spreadsheet contains corrupted rows or unrecognized column headers. Valid rows have been preserved.',
    internalDiagnosticSample: 'CsvParserException: Malformed row #42. Unexpected unescaped quotation mark at byte offset 4912. Row isolated into import_errors.',
    isRetryable: true,
    remediationAdvice: 'Download error log, correct malformed row formatting in Excel, and re-upload.'
  },
  integration: {
    category: 'integration',
    errorCode: 'ERR_INTEGRATION_UNAVAILABLE',
    defaultSeverity: 'high',
    userFriendlyMessage: 'The external banking/ERP gateway is temporarily unreachable. Outbound transactions are queued in our resilient worker buffer.',
    internalDiagnosticSample: 'GatewayHttpException: 503 Service Unavailable returned from https://api.xero.com/api.xro/2.0/Invoices. Latency: 10420ms.',
    isRetryable: true,
    remediationAdvice: 'Worker queue will execute automated exponential backoff retry. Manual retry available.'
  },
  ai: {
    category: 'ai',
    errorCode: 'ERR_AI_INFERENCE_TIMEOUT',
    defaultSeverity: 'medium',
    userFriendlyMessage: 'AI reminder draft generation timed out. A grounded compliant standard reminder template has been pre-populated for your review.',
    internalDiagnosticSample: 'GeminiApiTimeout: models/gemini-3.8-flash did not respond within 8000ms deadline. Fallback to GroundedTemplateEngine triggered.',
    isRetryable: true,
    remediationAdvice: 'Retry AI generation or proceed with the pre-populated grounded standard template.'
  },
  payment: {
    category: 'payment',
    errorCode: 'ERR_PAYMENT_GATEWAY_DECLINE',
    defaultSeverity: 'high',
    userFriendlyMessage: 'The payment could not be processed by the payment network. Please verify card credentials or choose an alternative settlement method.',
    internalDiagnosticSample: 'StripeCardError: Card declined with code "do_not_honor". Gateway transaction id ch_99214 failed for customer deb-1. PAN sanitized: **** **** **** 4242.',
    isRetryable: true,
    remediationAdvice: 'Contact issuing bank or offer customer BACS bank transfer / direct debit option.'
  },
  reminder: {
    category: 'reminder',
    errorCode: 'ERR_REMINDER_DELIVERY_BOUNCED',
    defaultSeverity: 'high',
    userFriendlyMessage: 'The automated reminder could not be delivered to the recipient. Please check debtor email and telephone contact records.',
    internalDiagnosticSample: 'SmtpMailboxUnavailable: 550 5.1.1 User unknown for debtor contact accounts@apex-retail-invalid.co.uk. Communication marked failed_bounce.',
    isRetryable: true,
    remediationAdvice: 'Update debtor contact email in Customer Profile and click "Safe Re-dispatch".'
  },
  network: {
    category: 'network',
    errorCode: 'ERR_NETWORK_DISCONNECTED',
    defaultSeverity: 'medium',
    userFriendlyMessage: 'A network interruption was detected. Your ledger changes are cached safely in your browser and will synchronize automatically upon reconnection.',
    internalDiagnosticSample: 'FetchNetworkError: Failed to fetch /api/invoices/inv-001. ERR_INTERNET_DISCONNECTED. Request queued in IndexedDB offline cache.',
    isRetryable: true,
    remediationAdvice: 'Check internet connectivity. Cached requests will replay automatically.'
  },
  rate_limit: {
    category: 'rate_limit',
    errorCode: 'ERR_RATE_LIMIT_EXCEEDED',
    defaultSeverity: 'medium',
    userFriendlyMessage: 'Too many requests have been submitted in a short interval. Please pause for a moment; request processing will resume shortly.',
    internalDiagnosticSample: 'TokenBucketRateLimitExceeded: IP 192.168.1.104 exhausted 100 tokens within 60s sliding window. Retry-After header: 14s.',
    isRetryable: true,
    remediationAdvice: 'Throttle automated webhook clients or wait for the 60s token bucket window reset.'
  },
  database: {
    category: 'database',
    errorCode: 'ERR_DB_CONCURRENCY_CONFLICT',
    defaultSeverity: 'high',
    userFriendlyMessage: 'This invoice was modified by another collector or settlement job. The latest ledger balance has been refreshed to prevent double-allocation.',
    internalDiagnosticSample: 'PostgresOptimisticLockException: Row version mismatch on table "invoices" id="inv-001". Expected version=3, found version=4. Transaction aborted.',
    isRetryable: true,
    remediationAdvice: 'Refresh invoice view to review current state and re-apply settlement allocation.'
  }
};

// Sensitive Key Sanitizer (Anti-Leak Invariant)
const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'auth', 'authorization', 'bearer',
  'cardnumber', 'cvv', 'cvc', 'pan', 'ssn', 'bankaccount', 'privatekey', 'apikey'
];

export function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));

    if (isSensitive) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// In-Memory Observability Incident Store
export const observabilityIncidentsStore: ObservabilityIncident[] = [
  {
    id: 'inc-rem-001',
    timestamp: '2026-10-21 00:30:14 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_REMINDER_DELIVERY_BOUNCED',
    category: 'reminder',
    severity: 'high',
    userFriendlyMessage: 'The automated reminder could not be delivered to the recipient. Please check debtor email and telephone contact records.',
    diagnosticDetails: 'SMTP 550 5.1.1: Recipient address accounts@apex-retail-invalid.co.uk rejected by remote MTA mail.apex-retail.co.uk [192.0.2.14].',
    sanitizedContext: {
      invoiceId: 'inv-2026-001',
      recipientEmail: 'accounts@apex-retail-invalid.co.uk',
      stage: 'stage_1_polite',
      provider: 'SendGrid SMTP Gateway',
      credentials: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 1,
    maxRetries: 3,
    status: 'active',
    traceId: 'trace-rem-991204',
    targetEntityId: 'inv-2026-001',
    targetEntityType: 'ScheduledReminder'
  },
  {
    id: 'inc-wh-002',
    timestamp: '2026-10-21 01:15:22 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_INTEGRATION_UNAVAILABLE',
    category: 'integration',
    severity: 'high',
    userFriendlyMessage: 'External banking/ERP gateway is temporarily unreachable. Outbound transactions are queued in our resilient worker buffer.',
    diagnosticDetails: 'Webhook delivery to ERP endpoint https://erp.acmelogistics.co.uk/hooks/cntcollect returned ETIMEDOUT after 10000ms. Attempt 2 of 3.',
    sanitizedContext: {
      endpoint: 'https://erp.acmelogistics.co.uk/hooks/cntcollect',
      eventType: 'invoice.payment_reconciled',
      payloadSize: 1420,
      webhookSigningSecret: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 2,
    maxRetries: 3,
    status: 'active',
    traceId: 'trace-wh-882319',
    targetEntityId: 'wh-event-0412',
    targetEntityType: 'WebhookDelivery'
  },
  {
    id: 'inc-ai-003',
    timestamp: '2026-10-21 01:40:05 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_AI_INFERENCE_TIMEOUT',
    category: 'ai',
    severity: 'medium',
    userFriendlyMessage: 'AI reminder draft generation timed out. A grounded compliant standard reminder template has been pre-populated for your review.',
    diagnosticDetails: 'GeminiApiLatencyExceeded: API response latency exceeded 8000ms SLA. Grounded fallback executed with 0 hallucination risk.',
    sanitizedContext: {
      model: 'models/gemini-3.8-flash',
      promptTokens: 412,
      targetDebtor: 'deb-1',
      apiKey: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 0,
    maxRetries: 2,
    status: 'resolved',
    resolvedAt: '2026-10-21 01:40:06 UTC',
    resolvedBy: 'AutoFallbackDaemon',
    traceId: 'trace-ai-771239',
    targetEntityId: 'draft-gen-001',
    targetEntityType: 'AIDraft'
  },
  {
    id: 'inc-app-004',
    timestamp: '2026-10-21 02:05:18 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_APPLICATION_UNHANDLED_EXCEPTION',
    category: 'system',
    severity: 'medium',
    userFriendlyMessage: 'A temporary rendering error occurred while loading financial projection charts. Data was preserved and the view reloaded safely.',
    diagnosticDetails: 'ClientErrorBoundary: TypeError: Cannot read properties of undefined (reading "closingBalance") in CashForecastCanvas. Catch boundary intercepted.',
    sanitizedContext: {
      component: 'CashForecastCanvas',
      props: { forecastDays: 90, scenario: 'conservative' },
      authToken: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 0,
    maxRetries: 2,
    status: 'resolved',
    resolvedAt: '2026-10-21 02:05:20 UTC',
    resolvedBy: 'ReactErrorBoundary',
    traceId: 'trace-app-661201',
    targetEntityId: 'view-cashforecast',
    targetEntityType: 'ApplicationView'
  },
  {
    id: 'inc-job-005',
    timestamp: '2026-10-21 02:18:44 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_BACKGROUND_JOB_FAILED',
    category: 'system',
    severity: 'high',
    userFriendlyMessage: 'A high-volume statement PDF generation job exceeded memory quota and was routed to the Dead-Letter Queue for safe re-dispatch.',
    diagnosticDetails: 'OutOfMemoryError: Buffer allocation exceeded 64MB streaming limit during bulk export. Task quarantined in Cloud Tasks DLQ dlq-job-002.',
    sanitizedContext: {
      jobId: 'dlq-job-002',
      format: 'pdf_compressed',
      recordCount: 1420,
      adminSecret: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 3,
    maxRetries: 3,
    status: 'active',
    traceId: 'trace-job-551029',
    targetEntityId: 'dlq-job-002',
    targetEntityType: 'BackgroundJob'
  },
  {
    id: 'inc-db-006',
    timestamp: '2026-10-21 02:40:11 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_DB_LOCK_TIMEOUT',
    category: 'database',
    severity: 'high',
    userFriendlyMessage: 'A database record lock timed out during high-concurrency payment reconciliation. The transaction was aborted cleanly with zero partial writes.',
    diagnosticDetails: 'PostgresLockTimeout: Lock wait timeout exceeded (5000ms) on row lock SELECT FOR UPDATE on table "debtors" id="deb-1". Transaction rolled back.',
    sanitizedContext: {
      table: 'debtors',
      rowId: 'deb-1',
      isolationLevel: 'SERIALIZABLE',
      dbUser: 'cntcollect_pooler'
    },
    isRetryable: true,
    retryCount: 1,
    maxRetries: 3,
    status: 'active',
    traceId: 'trace-db-441098',
    targetEntityId: 'deb-1',
    targetEntityType: 'DatabaseRow'
  },
  {
    id: 'inc-sub-007',
    timestamp: '2026-10-21 03:10:00 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_SUBSCRIPTION_RENEWAL_FAILED',
    category: 'payment',
    severity: 'high',
    userFriendlyMessage: 'Your organization monthly platform subscription renewal could not be processed. Your account has entered a 7-day grace period with full service access.',
    diagnosticDetails: 'StripeInvoicePaymentFailed: Invoice in_1Q2w9e payment failed with card_declined (expired_card). Organization transitioned to "grace_period" until 2026-10-28.',
    sanitizedContext: {
      subscriptionId: 'sub-tier-growth-01',
      plan: 'Growth Pro',
      amountDue: 249.00,
      cardPan: '[REDACTED_SENSITIVE_DATA]',
      stripeSecret: '[REDACTED_SENSITIVE_DATA]'
    },
    isRetryable: true,
    retryCount: 1,
    maxRetries: 3,
    status: 'active',
    traceId: 'trace-sub-331002',
    targetEntityId: 'sub-tier-growth-01',
    targetEntityType: 'OrganizationSubscription'
  },
  {
    id: 'inc-stg-008',
    timestamp: '2026-10-21 04:22:30 UTC',
    organizationId: 'org-acme-uk',
    errorCode: 'ERR_STORAGE_MALWARE_QUARANTINED',
    category: 'storage',
    severity: 'critical',
    userFriendlyMessage: 'An uploaded dispute supporting document was flagged by our automated security scanner and quarantined. Access to this file is blocked.',
    diagnosticDetails: 'ClamAVScannerDetection: File "dispute_evidence_suspicious.exe" matched Win.Trojan.Generic. Quarantined in bucket gs://cntcollect-quarantine-vault.',
    sanitizedContext: {
      fileName: 'dispute_evidence_suspicious.exe',
      uploaderIp: '198.51.100.24',
      fileSize: 42100,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    isRetryable: false,
    retryCount: 0,
    maxRetries: 0,
    status: 'resolved',
    resolvedAt: '2026-10-21 04:22:31 UTC',
    resolvedBy: 'SecurityGuardianDaemon',
    traceId: 'trace-stg-221088',
    targetEntityId: 'doc-quarantine-01',
    targetEntityType: 'StoredDocument'
  }
];

// 32.2 Nine-Point Telemetry Status Matrix
export interface NinePointTrackingStatus {
  domainKey: string;
  domainName: string;
  metricLabel: string;
  currentStatus: 'healthy' | 'degraded' | 'monitored';
  trackedCountOrValue: string;
  lastIncidentAt: string;
  autoRemediation: string;
}

export function getNinePointTracking(): NinePointTrackingStatus[] {
  return [
    {
      domainKey: 'application_errors',
      domainName: 'Application Errors',
      metricLabel: 'Zero Uncaught UI/Server Crashes',
      currentStatus: 'healthy',
      trackedCountOrValue: '99.98% Clean Run',
      lastIncidentAt: '2026-10-21 02:05 UTC (Resolved)',
      autoRemediation: 'React ErrorBoundary + Express global error middleware'
    },
    {
      domainKey: 'failed_jobs',
      domainName: 'Failed Background Jobs',
      metricLabel: 'Dead-Letter Queue Isolation',
      currentStatus: 'monitored',
      trackedCountOrValue: '2 Quarantined in DLQ',
      lastIncidentAt: '2026-10-21 02:18 UTC (Active)',
      autoRemediation: 'Automatic 3x backoff retry before DLQ quarantine'
    },
    {
      domainKey: 'api_latency',
      domainName: 'API Response Times',
      metricLabel: 'P95 / P99 Endpoint Latency',
      currentStatus: 'healthy',
      trackedCountOrValue: 'P95: 18.4ms | P99: 41.2ms',
      lastIncidentAt: 'Optimal SLA (<50ms)',
      autoRemediation: 'In-memory LRU query cache + PgBouncer pooler'
    },
    {
      domainKey: 'database_errors',
      domainName: 'Database Errors',
      metricLabel: 'Concurrency & Deadlock Guard',
      currentStatus: 'monitored',
      trackedCountOrValue: '1 Row Lock Timeout (Rolled back)',
      lastIncidentAt: '2026-10-21 02:40 UTC (Active)',
      autoRemediation: 'ACID transaction abort with zero partial state corruption'
    },
    {
      domainKey: 'reminder_failures',
      domainName: 'Reminder Delivery Failures',
      metricLabel: 'Bounces & Provider Throttling',
      currentStatus: 'degraded',
      trackedCountOrValue: '1 Bounce (accounts@apex-retail-invalid)',
      lastIncidentAt: '2026-10-21 00:30 UTC (Active)',
      autoRemediation: 'Safe re-dispatch with customer email correction'
    },
    {
      domainKey: 'ai_failures',
      domainName: 'AI Request Failures',
      metricLabel: 'Gemini Quota / SLA Timeouts',
      currentStatus: 'healthy',
      trackedCountOrValue: '1 Timeout (Grounded template active)',
      lastIncidentAt: '2026-10-21 01:40 UTC (Resolved)',
      autoRemediation: 'Automatic deterministic fallback without hallucination'
    },
    {
      domainKey: 'webhook_failures',
      domainName: 'Webhook Failures',
      metricLabel: 'Outbound ERP & Inbound Gateway',
      currentStatus: 'degraded',
      trackedCountOrValue: '1 ERP Timeout (ETIMEDOUT)',
      lastIncidentAt: '2026-10-21 01:15 UTC (Active)',
      autoRemediation: 'Queue-buffered retry with cryptographic HMAC verification'
    },
    {
      domainKey: 'billing_failures',
      domainName: 'Subscription Billing Failures',
      metricLabel: 'SaaS Card Charge & Renewal',
      currentStatus: 'monitored',
      trackedCountOrValue: '1 Past-Due (7-Day Grace Period)',
      lastIncidentAt: '2026-10-21 03:10 UTC (Active)',
      autoRemediation: 'Non-disruptive grace period with automated card update email'
    },
    {
      domainKey: 'storage_errors',
      domainName: 'Storage Errors',
      metricLabel: 'Cloud Vault & Malware Scanner',
      currentStatus: 'healthy',
      trackedCountOrValue: '1 Threat Blocked & Quarantined',
      lastIncidentAt: '2026-10-21 04:22 UTC (Resolved)',
      autoRemediation: 'Automated ClamAV quarantine and secure deletion'
    }
  ];
}

// Active Operational Alerts
export const operationalAlertsStore: OperationalAlert[] = [
  {
    id: 'alt-001',
    severity: 'medium',
    title: 'Elevated Webhook Delivery Retries',
    description: 'Outbound webhook endpoint for ERP integration (acmelogistics) has timed out twice in the past 60 minutes.',
    affectedSubsystem: 'Webhook Dispatcher & Queue',
    triggeredAt: '2026-10-21 01:15:22 UTC',
    isAcknowledged: false,
    suggestedRemediation: 'Verify firewall and inbound routing on target ERP endpoint. Queue is currently holding 1 retryable payload.'
  },
  {
    id: 'alt-002',
    severity: 'low',
    title: 'Reminder Bounced for Debtor Contact',
    description: 'Email reminder to accounts@apex-retail-invalid.co.uk bounced with SMTP 550. Debtor communications paused.',
    affectedSubsystem: 'Communication Engine',
    triggeredAt: '2026-10-21 00:30:14 UTC',
    isAcknowledged: true,
    suggestedRemediation: 'Review Debtor Profile contact info. Update email address and trigger safe re-dispatch.'
  }
];

// Subsystem Health Checks
export function getSubsystemHealth(): SubsystemHealth[] {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return [
    {
      name: 'PostgreSQL Relational Storage (Cloud SQL)',
      key: 'database',
      status: 'healthy',
      latencyMs: 1.2,
      lastCheckedAt: timestamp,
      details: 'Connection pool operating at 28% capacity (14/50 active). Average query execution: 0.8ms.'
    },
    {
      name: 'Private Document Vault (Cloud Object Storage)',
      key: 'storage',
      status: 'healthy',
      latencyMs: 4.8,
      lastCheckedAt: timestamp,
      details: 'Time-limited signed URL generator active. Zero malware threats detected in latest batch.'
    },
    {
      name: 'Gemini AI Inference Gateway',
      key: 'ai',
      status: 'healthy',
      latencyMs: 420.0,
      lastCheckedAt: timestamp,
      details: 'Gemini 3.8 Flash operational. Grounded heuristics fallback standing by.'
    },
    {
      name: 'Cloud Tasks Background Queue & DLQ',
      key: 'queues',
      status: 'healthy',
      latencyMs: 3.1,
      lastCheckedAt: timestamp,
      details: '4 worker threads active. 2 dead-letter jobs quarantined for manual inspection.'
    },
    {
      name: 'Stripe & Webhook Cryptographic Listener',
      key: 'webhooks',
      status: 'degraded',
      latencyMs: 12.4,
      lastCheckedAt: timestamp,
      details: 'Inbound Stripe webhook active. 1 outbound ERP webhook endpoint experiencing timeouts.'
    },
    {
      name: 'Multi-Tenant Auth & Token Verification',
      key: 'auth',
      status: 'healthy',
      latencyMs: 0.9,
      lastCheckedAt: timestamp,
      details: 'Firebase Auth & JWT signature verification active. Zero unauthorized cross-tenant breaches.'
    }
  ];
}

// Observability Dashboard Metrics Aggregator
export function getObservabilityState(): ObservabilityDashboardState {
  const healthChecks = getSubsystemHealth();
  const activeAlerts = operationalAlertsStore;
  const incidents = observabilityIncidentsStore;

  const failedReminders = incidents.filter(i => i.category === 'reminder' && i.status !== 'resolved').length;
  const failedWebhooks = incidents.filter(i => i.category === 'integration' && i.status !== 'resolved').length;
  const activeIncidents = incidents.filter(i => i.status === 'active').length;

  return {
    healthChecks,
    activeAlerts,
    incidents,
    ninePointTracking: getNinePointTracking(),
    metrics: {
      p50LatencyMs: 6.2,
      p95LatencyMs: 18.4,
      p99LatencyMs: 41.2,
      errorRatePercent: 0.12,
      activeIncidentsCount: activeIncidents,
      failedJobsCount: 2,
      failedRemindersCount: failedReminders,
      failedWebhooksCount: failedWebhooks
    }
  };
}
