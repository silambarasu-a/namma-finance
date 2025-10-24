# Namma Finance - Production-Ready Financing Management System

A comprehensive, production-ready financing management system built with Next.js 15, TypeScript, PostgreSQL, and Redis. Designed for microfinance institutions, NBFCs, and lending businesses.

## 🚀 Features

### Core Functionality
- **Loan Management**: Create and manage loans with flexible repayment frequencies (daily, weekly, monthly, quarterly, half-yearly, yearly, custom)
- **Collection Tracking**: Record and track EMI collections with automatic allocation to principal and interest
- **Multi-Role Access Control**: Role-based dashboards for Admin, Manager, Agent, and Customer
- **Borrowing Management**: Track capital borrowed from third parties
- **EMI Scheduling**: Automated EMI schedule generation with background workers
- **Preclosure Calculation**: Calculate preclosure amounts with configurable penalties

### Technical Highlights
- **Precise Decimal Arithmetic**: Uses `decimal.js` to avoid floating-point errors in money calculations
- **Transactional Integrity**: All money operations wrapped in database transactions
- **Audit Logging**: Complete audit trail for compliance and debugging
- **Background Jobs**: Redis-based queue (BullMQ) for async operations
- **Caching Layer**: Redis caching for frequently accessed data
- **Rate Limiting**: API rate limiting to prevent abuse
- **Comprehensive Testing**: Unit and integration tests with Jest
- **Type Safety**: Full TypeScript coverage with strict mode

## 📁 Project Structure

```
namma-finance/
├── app/                      # Next.js 15 App Router
│   ├── (auth)/              # Authentication routes
│   ├── admin/               # Admin dashboard
│   ├── manager/             # Manager dashboard
│   ├── agent/               # Agent dashboard
│   ├── customer/            # Customer dashboard
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── loans/          # Loan management
│   │   └── collections/    # Collection recording
│   └── globals.css         # Global styles
├── components/              # Reusable React components
│   ├── ui/                 # shadcn/ui components
│   └── Money.tsx           # Currency display component
├── lib/                     # Core business logic
│   ├── prisma.ts           # Prisma client singleton
│   ├── auth.ts             # Authentication & authorization
│   ├── payments.ts         # EMI calculations (CRITICAL)
│   ├── cache.ts            # Redis caching utilities
│   ├── queue.ts            # Background job queue
│   └── audit.ts            # Audit logging
├── hooks/                   # React hooks
│   ├── useApi.ts           # SWR-based API fetching
│   └── useAuth.ts          # Authentication hook
├── prisma/                  # Database
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeding
├── __tests__/              # Test files
│   └── lib/
│       └── payments.test.ts # Payment calculation tests
├── docker-compose.yml      # Docker setup
├── Dockerfile              # Multi-stage Docker build
└── .github/workflows/      # CI/CD pipeline
```

## 🛠️ Technology Stack

### Core
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: PostgreSQL 16 (with Prisma ORM)
- **Cache/Queue**: Redis 7
- **Authentication**: JWT with refresh tokens (jose)

### Libraries
- **Money Calculations**: decimal.js
- **Background Jobs**: BullMQ
- **Validation**: Zod
- **Testing**: Jest + React Testing Library
- **UI**: Tailwind CSS + shadcn/ui
- **Data Fetching**: SWR

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (recommended)
- PostgreSQL 16+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd namma-finance
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env.local
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate dev
   ```

5. **Seed the database**
   ```bash
   docker-compose exec app npm run db:seed
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Login with seed credentials (see below)

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database and Redis URLs
   ```

3. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker for services only
   docker-compose up postgres redis -d
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

6. **Seed the database**
   ```bash
   npm run db:seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

8. **Start background worker** (in a separate terminal)
   ```bash
   npm run worker:dev
   ```

## 🔐 Test Credentials

After seeding, use these credentials to login:

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@example.com      | password123 |
| Manager  | manager@example.com    | password123 |
| Agent    | agent1@example.com     | password123 |
| Customer | ramesh@example.com     | password123 |

## 📊 Database Schema

### Key Models

#### User
- Multi-role support (Admin, Manager, Agent, Customer)
- Secure password hashing with bcrypt

#### Customer
- Links to User
- KYC status tracking
- ID proof storage

#### Loan
- Principal, interest rate, tenure
- Flexible frequency (daily to yearly)
- Status tracking (Pending, Active, Closed, Defaulted, Preclosed)
- Outstanding principal and interest tracking

#### Collection
- Links to Loan and Agent
- Automatic principal/interest allocation
- Receipt number generation
- Payment method tracking

#### EMISchedule
- Generated asynchronously via background jobs
- Tracks expected vs. actual payments
- Due dates for each installment

#### AuditLog
- Complete audit trail for compliance
- Tracks before/after states
- IP address and user agent logging

### Indexes

Critical indexes for performance:
- `loan.status`, `loan.customerId`, `loan.createdById`
- `collection.loanId`, `collection.agentId`, `collection.collectionDate`
- `user.role`, `user.email`, `user.isActive`
- `agentAssignment.agentId`, `agentAssignment.customerId`

## 🧮 Payment Calculations

The `lib/payments.ts` module provides precise financial calculations:

### Key Functions

```typescript
// Calculate EMI installment amount
calculateInstallmentAmount(
  principal: Decimal,
  annualInterestPercent: Decimal,
  tenureInstallments: number,
  frequency: Frequency
): Decimal

// Calculate outstanding after k payments
outstandingAfterK(
  principal: Decimal,
  annualInterestPercent: Decimal,
  tenureInstallments: number,
  frequency: Frequency,
  k: number
): Decimal

// Generate complete EMI schedule
generateEMISchedule(
  terms: LoanTerms,
  startDate: Date
): EMIScheduleItem[]

// Calculate preclosure amount
calculatePreclosureAmount(
  terms: LoanTerms,
  paidInstallments: number,
  penaltyPercent: number
): PreclosureResult
```

### Formula Used

Standard amortization formula:
```
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)

Where:
  P = Principal loan amount
  r = Interest rate per installment period
  n = Number of installments
```

## 🔒 Security

### Authentication
- JWT access tokens (15 min expiry)
- JWT refresh tokens (7 day expiry)
- Secure HTTP-only cookies
- Password hashing with bcrypt (12 rounds)

### Authorization
- Role-based access control (RBAC)
- Agent-customer assignment validation
- API endpoint authorization checks
- Middleware protection for routes

### Best Practices
- CSRF protection for mutations
- Rate limiting on login endpoints
- Input validation with Zod
- SQL injection prevention via Prisma
- Audit logging for money operations

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

- **Payment calculations**: 95%+ coverage
- **Loan creation**: Integration tests with transaction rollback
- **Collection recording**: End-to-end workflow tests

### Critical Test Cases
- EMI calculation accuracy across frequencies
- Outstanding balance after partial payments
- Preclosure amount with/without penalties
- Collection allocation (interest first, then principal)
- Loan closure when fully paid

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Loans
- `POST /api/loans` - Create new loan (Admin/Manager)
- `GET /api/loans` - List loans (with role-based filtering)
- `GET /api/loans/:id` - Get loan details

### Collections
- `POST /api/collections` - Record collection (Agent/Manager/Admin)
- `GET /api/collections` - List collections (with filtering)

### Example: Create Loan

```bash
curl -X POST http://localhost:3000/api/loans \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "clx...",
    "principal": "100000",
    "interestRate": "12.0",
    "frequency": "MONTHLY",
    "tenureInstallments": 12,
    "charges": [
      { "type": "STAMP_DUTY", "amount": "1000" },
      { "type": "PROCESSING_FEE", "amount": "500" }
    ]
  }'
```

## 🏗️ Architecture & Design Decisions

### Server vs. Client Components
- **Server Components**: Data-heavy pages (dashboards, lists)
- **Client Components**: Interactive forms, modals, real-time updates

### Money Operations
- All stored as `Decimal` type in database
- Calculations use `decimal.js` for precision
- Transactions ensure atomicity
- Audit logs track all changes

### Caching Strategy
- Redis cache for hot reads (30s TTL)
- Cache invalidation on mutations
- SWR for client-side caching

### Background Jobs
- EMI schedule generation (async)
- Email notifications
- Daily interest accrual
- Monthly statement generation

### Database Optimization
- Strategic indexes on frequently queried columns
- Keyset pagination for large datasets
- Connection pooling (pgBouncer recommended)
- Read replicas for reports (future enhancement)

## 🚢 Deployment

### Environment Variables

Required in production:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
NEXTAUTH_SECRET=<strong-secret>
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

### Deployment Options

#### Vercel (Recommended for Next.js)
```bash
vercel deploy --prod
```

#### Docker Production
```bash
docker build -t namma-finance:latest .
docker run -p 3000:3000 namma-finance:latest
```

#### Manual Deployment
```bash
npm run build
npm run start
```

### Database Migrations
```bash
npx prisma migrate deploy
```

## 📈 Performance Optimization

### Implemented
- Database indexes on critical columns
- Redis caching layer
- Connection pooling
- Server-side rendering
- Background job processing
- Rate limiting

### Recommended (Future)
- CDN for static assets
- Database read replicas
- Horizontal scaling with load balancer
- Query optimization with EXPLAIN ANALYZE
- APM monitoring (Sentry, DataDog)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Unit tests for business logic
- Integration tests for critical workflows

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with Next.js 15, Prisma, and Redis
- UI components from shadcn/ui
- Inspired by microfinance best practices

## 📞 Support

For issues and feature requests, please open a GitHub issue.

---

**Built with ❤️ for the microfinance community**
