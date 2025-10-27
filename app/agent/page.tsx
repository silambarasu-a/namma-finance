import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { AgentLoansTable } from "@/components/AgentLoansTable";
import {
  Users,
  ClipboardCheck,
  AlertCircle,
  UserCheck,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";

export default async function AgentDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  // Fetch agent's assigned customers and their loans
  const [
    myCustomers,
    myCollectionsCount,
    myCollections,
    recentLoans,
    allMyLoans,
    overdueLoans,
    upcomingEmis,
  ] = await Promise.all([
    // My customers count
    prisma.customer.count({
      where: {
        agentAssignments: {
          some: {
            agentId: user.id,
            isActive: true,
          },
        },
      },
    }),
    // Collections made count
    prisma.collection.count({
      where: {
        agentId: user.id,
      },
    }),
    // Total collections amount
    prisma.collection.aggregate({
      where: {
        agentId: user.id,
      },
      _sum: {
        amount: true,
      },
    }),
    // Recent active loans
    prisma.loan.findMany({
      where: {
        customer: {
          agentAssignments: {
            some: {
              agentId: user.id,
              isActive: true,
            },
          },
        },
        status: "ACTIVE",
      },
      include: {
        customer: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // All my loans for calculations
    prisma.loan.findMany({
      where: {
        customer: {
          agentAssignments: {
            some: {
              agentId: user.id,
              isActive: true,
            },
          },
        },
        status: "ACTIVE",
      },
      select: {
        outstandingPrincipal: true,
        outstandingInterest: true,
      },
    }),
    // Overdue loans
    prisma.loan.count({
      where: {
        customer: {
          agentAssignments: {
            some: {
              agentId: user.id,
              isActive: true,
            },
          },
        },
        status: "ACTIVE",
        emiSchedule: {
          some: {
            isPaid: false,
            dueDate: { lt: new Date() },
          },
        },
      },
    }),
    // Upcoming EMIs in next 7 days
    prisma.eMISchedule.count({
      where: {
        loan: {
          customer: {
            agentAssignments: {
              some: {
                agentId: user.id,
                isActive: true,
              },
            },
          },
          status: "ACTIVE",
        },
        isPaid: false,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Calculate total outstanding for agent's customers
  const totalOutstanding = allMyLoans.reduce(
    (sum, loan) =>
      sum
        .plus(new Decimal(loan.outstandingPrincipal || 0))
        .plus(new Decimal(loan.outstandingInterest || 0)),
    new Decimal(0)
  );

  // Total collections made
  const totalCollected = new Decimal(myCollections._sum.amount || 0);

  // Convert loans data to plain objects for client component
  const loansData = recentLoans.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    customerName: loan.customer.user.name,
    customerEmail: loan.customer.user.email,
    customerPhone: loan.customer.user.phone,
    outstandingPrincipal: loan.outstandingPrincipal.toString(),
  }));

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Agent Dashboard
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            Welcome back, {user.name}
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My Customers"
            value={myCustomers}
            subtitle="Assigned to me"
            icon={Users}
            variant="primary"
          />

          <StatCard
            title="Total Collected"
            value={<Money amount={totalCollected} />}
            subtitle={`${myCollectionsCount} collections`}
            icon={TrendingUp}
            variant="success"
          />

          <StatCard
            title="Total Outstanding"
            value={<Money amount={totalOutstanding} />}
            subtitle={`${recentLoans.length} active loans`}
            icon={AlertCircle}
            variant="warning"
          />

          <StatCard
            title="Overdue Loans"
            value={overdueLoans}
            subtitle="Need attention"
            icon={Target}
            variant="danger"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="Upcoming EMIs"
            value={upcomingEmis}
            subtitle="Due in next 7 days"
            icon={Calendar}
            variant="default"
          />

          <StatCard
            title="Active Loans"
            value={allMyLoans.length}
            subtitle="Under my management"
            icon={ClipboardCheck}
            variant="primary"
          />
        </div>

        {/* Active Loans Table */}
        <AgentLoansTable
          loans={loansData}
          showViewAll={true}
          viewAllHref="/agent/customers"
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/agent/customers"
            className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-blue-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-blue-600 p-3 text-white">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">
                  My Customers
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  View customers assigned to you
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/agent/collections"
            className="group relative overflow-hidden rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all duration-300 hover:border-green-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-green-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-green-600 p-3 text-white">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900">
                  Record Collection
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Record EMI payments
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
