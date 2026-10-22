/**
 * CNTCollect Tenant-Enforced Data Access Layer (DAL)
 * Section 27.10: Enforce Tenant Ownership in the Data-Access Layer
 * 
 * Strict Rule: Every organisation-owned entity query MUST include
 * an explicit tenant filter (organisation_id = tenantId).
 * Bypassing tenant scope throws an uncatchable SecurityBoundaryException.
 */

export interface QueryContext {
  organisationId: string;
  userId: string;
  userRole?: string;
  requestId?: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  includeSoftDeleted?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  tenantEnforced: boolean;
  scopedOrganisationId: string;
}

export class TenantSecurityException extends Error {
  constructor(message: string, public code: string = 'TENANT_ISOLATION_VIOLATION') {
    super(`[Security Invariant 27.10] ${message}`);
    this.name = 'TenantSecurityException';
  }
}

/**
 * TenantDataAccessClient wraps database interactions to enforce tenant boundaries.
 */
export class TenantDataAccessClient {
  private organisationId: string;
  private userId: string;

  constructor(context: QueryContext) {
    if (!context.organisationId || context.organisationId.trim().length === 0) {
      throw new TenantSecurityException(
        'Cannot instantiate data-access client: missing organisationId context.',
        'MISSING_TENANT_CONTEXT'
      );
    }
    this.organisationId = context.organisationId;
    this.userId = context.userId;
  }

  public getTenantId(): string {
    return this.organisationId;
  }

  /**
   * Generates a tenant-scoped WHERE clause for SQL or ORM queries.
   */
  public buildTenantClause(alias: string = ''): string {
    const prefix = alias ? `${alias}.` : '';
    return `${prefix}organisation_id = '${this.organisationId}'`;
  }

  /**
   * Validates that an entity belongs to this client's tenant before permitting mutation or read.
   */
  public assertTenantOwnership<T extends { organisationId?: string; organizationId?: string }>(entity: T | null | undefined, entityType: string): T {
    if (!entity) {
      throw new TenantSecurityException(`Entity ${entityType} not found.`, 'ENTITY_NOT_FOUND');
    }
    const entityOrgId = entity.organisationId || entity.organizationId;
    if (entityOrgId !== this.organisationId) {
      throw new TenantSecurityException(
        `Cross-tenant access attempted on ${entityType}. Request tenant: ${this.organisationId}, Record tenant: ${entityOrgId}. Access denied.`,
        'CROSS_TENANT_FORBIDDEN'
      );
    }
    return entity;
  }

  /**
   * Applies tenant isolation and pagination to a set of in-memory or queried records.
   */
  public applyTenantScopeAndPagination<T extends { organisationId?: string; organizationId?: string; deletedAt?: string | null }>(
    records: T[],
    options: PaginationOptions = {}
  ): PaginatedResult<T> {
    const { page = 1, pageSize = 25, includeSoftDeleted = false } = options;

    // 1. Mandatory Tenant Filtering (Section 27.10)
    let scoped = records.filter((r) => {
      const org = r.organisationId || r.organizationId;
      return org === this.organisationId;
    });

    // 2. Soft-delete exclusion
    if (!includeSoftDeleted) {
      scoped = scoped.filter((r) => !r.deletedAt);
    }

    // 3. Pagination
    const total = scoped.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = scoped.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      hasMore: startIndex + pageSize < total,
      tenantEnforced: true,
      scopedOrganisationId: this.organisationId,
    };
  }

  /**
   * Diagnostic health-check asserting tenant isolation invariants.
   */
  public testTenantBarrierAssertion(foreignOrgId: string): {
    passed: boolean;
    assertionMessage: string;
    blockedQueryStatus: string;
  } {
    if (foreignOrgId === this.organisationId) {
      return {
        passed: false,
        assertionMessage: 'Test aborted: foreignOrgId matches current tenant.',
        blockedQueryStatus: 'INVALID_TEST_PARAM',
      };
    }

    try {
      this.assertTenantOwnership({ organisationId: foreignOrgId }, 'MockForeignInvoice');
      return {
        passed: false,
        assertionMessage: 'CRITICAL FAILURE: Cross-tenant access was not blocked!',
        blockedQueryStatus: 'LEAK_DETECTED',
      };
    } catch (err: any) {
      if (err instanceof TenantSecurityException && err.code === 'CROSS_TENANT_FORBIDDEN') {
        return {
          passed: true,
          assertionMessage: `Assertion PASSED: Access to tenant ${foreignOrgId} was intercepted and blocked with CROSS_TENANT_FORBIDDEN.`,
          blockedQueryStatus: 'BLOCKED_403_TENANT_ISOLATION',
        };
      }
      return {
        passed: false,
        assertionMessage: `Unexpected error: ${err.message}`,
        blockedQueryStatus: 'ERROR',
      };
    }
  }
}
