# Quick Start Guide

Get Namma Finance up and running in 5 minutes!

## Prerequisites

- Docker Desktop installed
- Node.js 20+ (if running locally without Docker)

## Option 1: Docker (Fastest - Recommended)

### 1. Clone & Navigate
```bash
cd /Users/silambu/Developer/Personal/Projects/namma-finance
```

### 2. Create Environment File
```bash
cp .env.example .env.local
```

The default values in `.env.example` work with Docker Compose.

### 3. Start All Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache/queue
- Next.js application
- Background worker

### 4. Run Database Setup
```bash
# Run migrations
docker-compose exec app npx prisma migrate dev --name init

# Seed sample data
docker-compose exec app npm run db:seed
```

### 5. Access the Application
Open http://localhost:3000

### 6. Login
Use these credentials:
- **Admin**: `admin@example.com` / `password123`
- **Manager**: `manager@example.com` / `password123`
- **Agent**: `agent1@example.com` / `password123`
- **Customer**: `ramesh@example.com` / `password123`

### 7. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### 8. Stop Services
```bash
docker-compose down
```

## Option 2: Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start PostgreSQL & Redis
```bash
# Using Docker for databases only
docker-compose up postgres redis -d
```

OR install PostgreSQL and Redis locally.

### 3. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/namma_finance?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

### 4. Database Setup
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed
```

### 5. Start Development Servers
```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Background worker
npm run worker:dev
```

### 6. Access Application
Open http://localhost:3000

## Common Tasks

### View Database
```bash
# Prisma Studio - Visual database browser
npm run db:studio
```

Opens at http://localhost:5555

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Check Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

### Reset Database
```bash
# WARNING: Deletes all data!
docker-compose exec app npx prisma migrate reset

# Or locally
npm run db:migrate -- --force-reset
```

## Troubleshooting

### Port Already in Use
If port 3000, 5432, or 6379 is already in use:

**Option 1**: Stop conflicting services
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Option 2**: Change ports in `docker-compose.yml`

### Database Connection Failed
1. Ensure PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify DATABASE_URL in `.env.local`

### Redis Connection Failed
1. Ensure Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Test connection:
   ```bash
   docker-compose exec redis redis-cli ping
   # Should return: PONG
   ```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma Client Issues
```bash
# Regenerate Prisma Client
npm run db:generate
```

## Next Steps

### 1. Explore the Admin Dashboard
- View loan statistics
- See recent loans
- Access quick actions

### 2. Create a Test Loan
Navigate to "Create New Loan" from the admin dashboard (feature in progress).

### 3. Record a Collection
Use an agent account to record EMI collections for assigned customers.

### 4. View Audit Logs
Check the `audit_logs` table in Prisma Studio to see all tracked operations.

### 5. Customize
- Update environment variables for production
- Add more seed data in `prisma/seed.ts`
- Customize UI in `app/` directories

## Production Deployment

See [README.md](./README.md#-deployment) for production deployment instructions.

## Getting Help

- **Documentation**: See [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: Open a GitHub issue
- **Code**: Well-commented code throughout the project

## What's Included?

✅ Role-based authentication (Admin, Manager, Agent, Customer)
✅ Loan creation with flexible frequencies
✅ Collection tracking with automatic allocation
✅ EMI schedule generation (background jobs)
✅ Audit logging for compliance
✅ Comprehensive unit tests
✅ Docker setup for easy deployment
✅ CI/CD pipeline with GitHub Actions

## Development Workflow

1. **Feature Development**
   - Create feature branch
   - Write code with tests
   - Run `npm test` and `npm run lint`
   - Commit changes

2. **Testing**
   - Unit tests run automatically in CI
   - Manually test in development environment
   - Check Prisma Studio for database state

3. **Deployment**
   - Merge to `main` branch
   - GitHub Actions runs CI/CD
   - Deploy to production (Vercel/custom)

Happy coding! 🚀
