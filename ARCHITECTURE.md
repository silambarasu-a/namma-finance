# Architecture & Technical Design

## System Overview

Namma Finance is a production-ready microfinance management system built with a modern, scalable architecture. This document provides detailed insights into the technical design decisions and architectural patterns used.

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────────────────────────────────────────┐
│          Next.js 15 Application                 │
│  ┌────────────────────────────────────────┐     │
│  │  App Router (Server Components)        │     │
│  │  - Admin Dashboard                     │     │
│  │  - Manager Dashboard                   │     │
│  │  - Agent Dashboard                     │     │
│  │  - Customer Dashboard                  │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │  API Routes                            │     │
│  │  - /api/auth/*                         │     │
│  │  - /api/loans                          │     │
│  │  - /api/collections                    │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │  Business Logic Layer                  │     │
│  │  - lib/payments.ts (Critical)          │     │
│  │  - lib/auth.ts                         │     │
│  │  - lib/cache.ts                        │     │
│  │  - lib/queue.ts                        │     │
│  └────────────────────────────────────────┘     │
└──────┬───────────────────────┬──────────────────┘
       │                       │
       │                       │
┌──────▼──────┐         ┌──────▼──────┐
│  PostgreSQL │         │    Redis    │
│   Database  │         │  Cache/Queue│
│             │         │             │
│  - Users    │         │  - Cache    │
│  - Loans    │         │  - Jobs     │
│  - Collections        │  - Sessions │
│  - Audit Logs│        └─────────────┘
└─────────────┘
       ▲
       │
┌──────┴──────┐
│   Workers   │
│  (BullMQ)   │
│             │
│  - EMI Gen  │
│  - Emails   │
│  - Reports  │
└─────────────┘
```

## Technology Stack Rationale

### Next.js 15 (App Router)
**Why?**
- **Server Components**: Reduces client bundle size, improves performance
- **Built-in API Routes**: Simplifies backend development
- **TypeScript Support**: First-class type safety
- **File-based Routing**: Intuitive project structure
- **Production-Ready**: Built-in optimizations (image optimization, code splitting)

### PostgreSQL + Prisma
**Why PostgreSQL?**
- ACID compliance critical for financial data
- Excellent support for decimal/numeric types
- Advanced indexing capabilities
- Battle-tested reliability
- Strong ecosystem

**Why Prisma?**
- Type-safe database queries
- Automatic migration generation
- Excellent TypeScript integration
- Connection pooling built-in
- Preview features (read replicas, etc.)

### Redis
**Why?**
- In-memory speed for caching hot data
- Native support for queues (BullMQ)
- Simple key-value operations
- Pub/sub for real-time features
- TTL support for auto-expiration

### decimal.js
**Why?**
- JavaScript's `Number` type uses floating-point (IEEE 754)
- Floating-point arithmetic is imprecise for money
- Example: `0.1 + 0.2 = 0.30000000000000004` ❌
- `Decimal.js` provides arbitrary-precision decimal arithmetic ✅
- Essential for financial calculations

## Core Design Patterns

### 1. Repository Pattern (via Prisma)

All database access goes through Prisma ORM, providing:
- Type safety
- Centralized query logic
- Easy testing with mocks
- Transaction support

```typescript
// Example: Transactional loan creation
await prisma.$transaction(async (tx) => {
  const loan = await tx.loan.create({ ... });
  await tx.loanCharge.createMany({ ... });
  await tx.auditLog.create({ ... });
  return loan;
});
```

### 2. Service Layer Pattern

Business logic separated into focused modules:
- `lib/payments.ts`: Pure functions for calculations
- `lib/auth.ts`: Authentication & authorization
- `lib/cache.ts`: Caching strategies
- `lib/queue.ts`: Background job orchestration

### 3. CQRS-Lite (Command Query Separation)

- **Commands** (mutations): POST/PUT/DELETE API routes with transactions
- **Queries** (reads): GET routes with caching where appropriate

### 4. Background Job Pattern

Heavy operations run asynchronously:
```typescript
// Synchronous: Create loan
const loan = await prisma.loan.create({ ... });

// Asynchronous: Generate EMI schedule
await queueGenerateEMISchedule(loan.id);
```

### 5. Cache-Aside Pattern

```typescript
// 1. Check cache
const cached = await cacheGet(key);
if (cached) return cached;

// 2. Fetch from DB
const data = await prisma.loan.findMany();

// 3. Store in cache
await cacheSet(key, data, 60); // 60s TTL
return data;
```

## Data Flow: Loan Creation

```
1. Client → POST /api/loans
   ↓
2. API Route validates request (Zod)
   ↓
3. Check authorization (RBAC)
   ↓
4. Calculate loan amounts (lib/payments.ts)
   ↓
5. Start database transaction
   ├─ Create Loan record
   ├─ Create LoanCharge records
   └─ Create AuditLog entry
   ↓
6. Commit transaction
   ↓
7. Queue EMI schedule generation (async)
   ↓
8. Invalidate related caches
   ↓
9. Return success response
```

## Data Flow: Collection Recording

```
1. Agent → POST /api/collections
   ↓
2. Validate access to loan
   ↓
3. Fetch loan details
   ↓
4. Allocate collection amount
   ├─ Pay interest first
   └─ Then principal
   ↓
5. Start database transaction
   ├─ Create Collection record
   ├─ Update Loan outstanding amounts
   ├─ Update EMISchedule paid status
   ├─ Check if loan should close
   └─ Create AuditLog entry
   ↓
6. Commit transaction
   ↓
7. Invalidate caches
   ↓
8. Return allocation breakdown
```

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Verify password (bcrypt)
   ↓
3. Generate JWT access token (15 min)
   ↓
4. Generate JWT refresh token (7 days)
   ↓
5. Set HTTP-only cookies
   ↓
6. Return user info
```

### Authorization Layers

1. **Route-level**: Middleware checks authentication
2. **Role-level**: Check user role against required roles
3. **Resource-level**: Verify access to specific entities (e.g., agent can only access assigned customers)

### Token Rotation

- Access token expires in 15 minutes
- Refresh token used to obtain new access token
- Refresh tokens rotated on use (future enhancement)

## Database Schema Design

### Normalization
- 3NF (Third Normal Form) for most tables
- Denormalized fields for performance (e.g., `loan.outstandingPrincipal`)

### Indexes Strategy

**High-cardinality indexes:**
- `user.email` (unique, frequently queried)
- `loan.loanNumber` (unique, frequently queried)

**Filter indexes:**
- `user.role` (low cardinality, but frequently filtered)
- `loan.status` (frequently filtered in WHERE clauses)

**Composite indexes:**
- `(agentId, customerId)` on `agent_assignments` for unique constraint + query optimization

### Decimal Precision

All money fields use `@db.Decimal(20, 2)`:
- **20 digits total**: Supports up to 999,999,999,999,999,999.99
- **2 decimal places**: Standard for currency
- **Example**: `100000.50` (₹1 lakh and 50 paise)

## Caching Strategy

### Cache Keys
```typescript
CacheKeys = {
  user: (id) => `user:${id}`,
  loan: (id) => `loan:${id}`,
  dashboardStats: (userId) => `dashboard:${userId}`,
  // Pattern-based invalidation
  loansByCustomer: (customerId) => `loans:customer:${customerId}*`
}
```

### TTL Strategy
- **User data**: 5 minutes (changes infrequently)
- **Dashboard stats**: 30 seconds (can tolerate slight staleness)
- **Loan details**: 1 minute (balance between freshness and performance)
- **Rate limiting**: 60-300 seconds (based on endpoint)

### Invalidation
- **On mutation**: Delete specific keys + pattern-based deletion
- **Example**: When loan is updated, invalidate:
  - `loan:{id}`
  - `loans:customer:{customerId}*`
  - `dashboard:*`

## Testing Strategy

### Unit Tests
- **Target**: Pure functions (lib/payments.ts)
- **Focus**: Edge cases, boundary conditions
- **Coverage**: 95%+

### Integration Tests
- **Target**: API routes with database
- **Focus**: Transaction correctness, RBAC
- **Setup**: In-memory PostgreSQL or test database

### E2E Tests (Future)
- **Target**: Critical user flows
- **Tools**: Playwright or Cypress
- **Scenarios**: Loan creation → Collection → Closure

## Performance Optimization

### Database
1. **Indexes**: On all frequently queried columns
2. **Connection Pooling**: Prisma default (recommended: pgBouncer in production)
3. **Query Optimization**: Use `select` to fetch only needed fields
4. **Pagination**: Keyset pagination for large datasets

### Application
1. **Server Components**: Reduce client JavaScript
2. **Caching**: Redis for hot data
3. **Background Jobs**: Offload heavy operations
4. **Code Splitting**: Next.js automatic chunking

### Future Enhancements
1. **CDN**: CloudFlare/CloudFront for static assets
2. **Read Replicas**: Separate read/write database connections
3. **Horizontal Scaling**: Multiple Next.js instances behind load balancer
4. **APM**: Application Performance Monitoring (Sentry, DataDog)

## Scalability Considerations

### Current Capacity
- **Single instance**: ~1000 concurrent users
- **Database**: Limited by PostgreSQL instance size
- **Redis**: In-memory, scales with RAM

### Scaling Path

**Vertical Scaling (0-10K users):**
- Increase server resources (CPU, RAM)
- Upgrade database instance
- Enable connection pooling (pgBouncer)

**Horizontal Scaling (10K-100K users):**
- Multiple Next.js app instances
- Load balancer (nginx, ALB)
- Database read replicas
- Redis Cluster

**Microservices (100K+ users):**
- Separate services for loans, collections, etc.
- Event-driven architecture
- Dedicated job processing cluster
- Separate databases per service (if needed)

## Error Handling & Resilience

### Database Transactions
- All money operations wrapped in transactions
- Automatic rollback on error
- Prevents partial state updates

### Job Retry Strategy
- **BullMQ**: Exponential backoff (2s, 4s, 8s)
- **Max attempts**: 3
- **Dead letter queue**: For manual inspection

### Logging & Monitoring
- **Application logs**: Console in dev, structured JSON in production
- **Audit logs**: Database-backed for compliance
- **Error tracking**: Sentry integration ready

## Deployment Architecture

### Production Setup (Recommended)

```
┌─────────────┐
│  Cloudflare │  ← CDN + DDoS protection
└──────┬──────┘
       │
┌──────▼──────┐
│    nginx    │  ← Load balancer + SSL termination
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│ App │ │ App │  ← Next.js instances (horizontal scaling)
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
┌──────▼──────┐
│  pgBouncer  │  ← Connection pooling
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │  ← Primary database
│   Primary   │
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │  ← Read replicas (optional)
│   Replica   │
└─────────────┘

┌─────────────┐
│    Redis    │  ← Cache + Queue (Redis Cluster for scale)
└─────────────┘

┌─────────────┐
│   Workers   │  ← Background job processors (separate instances)
└─────────────┘
```

## Security Best Practices

### Implemented
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ JWT with short expiry (15 min)
- ✅ HTTP-only cookies
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting
- ✅ RBAC at API level
- ✅ Audit logging

### Recommended (Future)
- 🔲 CSRF tokens for mutations
- 🔲 2FA for admin accounts
- 🔲 IP whitelisting for admin panel
- 🔲 Regular security audits
- 🔲 Dependency vulnerability scanning
- 🔲 WAF (Web Application Firewall)

## Trade-offs & Design Decisions

### 1. Denormalized Outstanding Amounts

**Decision**: Store `outstandingPrincipal` and `outstandingInterest` directly in `Loan` table.

**Pros:**
- Fast queries (no need to sum collections)
- Simplified dashboard analytics

**Cons:**
- Data duplication
- Must update on every collection

**Verdict**: Worth it for performance. Always update in transactions to maintain consistency.

### 2. Async EMI Schedule Generation

**Decision**: Generate EMI schedules in background jobs, not synchronously.

**Pros:**
- Faster loan creation API response
- Doesn't block user
- Can retry on failure

**Cons:**
- Schedule not immediately available
- Slight complexity

**Verdict**: Better UX and resilience outweigh the slight delay.

### 3. Monolith vs. Microservices

**Decision**: Start with monolith, plan for microservices if needed.

**Rationale:**
- Monolith simpler to develop and deploy
- Shared database ensures consistency
- Can extract services later if bottlenecks emerge

**Migration path:**
- Extract background workers first
- Then reporting service
- Finally, domain services (loans, collections)

### 4. Client vs. Server Components

**Decision**: Use Server Components by default, Client Components only when needed.

**Rationale:**
- Smaller JavaScript bundles
- Better SEO
- Faster initial page load

**Client Components used for:**
- Forms with validation
- Interactive dashboards
- Real-time updates

## Conclusion

This architecture prioritizes:
1. **Correctness**: Financial data must be accurate (decimal precision, transactions)
2. **Security**: RBAC, audit trails, secure authentication
3. **Performance**: Caching, indexing, background jobs
4. **Scalability**: Designed to scale horizontally
5. **Maintainability**: Type safety, modular code, comprehensive tests

The system is production-ready for small to medium-scale deployments and has a clear path to scale for larger loads.
