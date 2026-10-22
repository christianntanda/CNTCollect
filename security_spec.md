# CNTCollect Security Specification & Test Protocol

## 1. System Invariants & Multi-Tenant Data Isolation

1. **Strict Organization Isolation**: No user can read, list, create, update, or delete records (`debtors`, `invoices`, `payments`, `disputes`, `promises`, `workflows`, `auditLogs`) belonging to an organization unless their verified authenticated profile is explicitly linked to that `organizationId`.
2. **Immutable Financial Records**: Invoices in terminal states (`paid`, `written_off`) cannot have their amounts, invoice numbers, or organization IDs altered.
3. **Audit Log Immutability**: Audit log entries (`auditLogs`) can only be created with `request.auth.uid`, and cannot be updated or deleted under any circumstances.
4. **Debtor Risk & Exposure Bounds**: Debtor documents cannot be assigned spoofed arbitrary fields or negative credit ratings.
5. **Payment Allocation Integrity**: Payment records must contain valid amounts greater than zero and can only be authored by authenticated team members.
6. **Cross-Tenant Leakage Prevention**: Queries without matching `organizationId` path variables or attempting wildcard reads are blocked by default-deny catch-all.

---

## 2. The "Dirty Dozen" Adversarial Attack Payloads

1. **Payload 1 (Cross-Tenant Invoice Access)**: User from Org A attempting to read `/organizations/org-acme-uk/invoices/inv-101` while authenticated as a member of `org-nexura-fr`.
   *Expected Result*: `PERMISSION_DENIED`
2. **Payload 2 (Unauthenticated Global Read)**: Anonymous client attempting `get` on `/organizations/org-acme-uk/debtors/deb-1`.
   *Expected Result*: `PERMISSION_DENIED`
3. **Payload 3 (Spoofed Admin Role Injection)**: Regular viewer attempting to create `/users/attacker` with `role: "admin"`.
   *Expected Result*: `PERMISSION_DENIED`
4. **Payload 4 (Audit Log Deletion)**: Authenticated credit controller attempting `delete` on `/organizations/org-acme-uk/auditLogs/aud-1`.
   *Expected Result*: `PERMISSION_DENIED`
5. **Payload 5 (Audit Log Mutation)**: Authenticated user attempting `update` on `/organizations/org-acme-uk/auditLogs/aud-1` to scrub a record.
   *Expected Result*: `PERMISSION_DENIED`
6. **Payload 6 (Shadow Field / Ghost Property Injection)**: Attempting to insert an invoice with undocumented property `superAdminBypass: true`.
   *Expected Result*: `PERMISSION_DENIED`
7. **Payload 7 (Path Variable Poisoning)**: Malicious user supplying a 2KB garbage string for `debtorId` or invalid regex characters.
   *Expected Result*: `PERMISSION_DENIED`
8. **Payload 8 (Terminal State Tampering)**: Attempting to modify `amountDue` or `currency` on an invoice already marked `paid`.
   *Expected Result*: `PERMISSION_DENIED`
9. **Payload 9 (Negative Balance Injection)**: Attempting to record a payment with `amount: -5000`.
   *Expected Result*: `PERMISSION_DENIED`
10. **Payload 10 (Debtor Portal Token Tampering)**: Debtor attempting to modify internal credit rating or risk tier on debtor document.
    *Expected Result*: `PERMISSION_DENIED`
11. **Payload 11 (Unverified Email Write)**: Authenticated user with `email_verified: false` attempting to create new invoices.
    *Expected Result*: `PERMISSION_DENIED`
12. **Payload 12 (Cross-Tenant Payment Diversion)**: Attempting to create a payment referencing `org-acme-uk` inside `org-nexura-fr` subcollection.
    *Expected Result*: `PERMISSION_DENIED`
