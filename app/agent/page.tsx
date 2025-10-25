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
} from "lucide-react";

export default async function AgentDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  // Fetch agent's assigned customers and their loans
  const [myCustomers, myCollectionsCount, recentLoans] = await Promise.all([
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
    prisma.collection.count({
      where: {
        agentId: user.id,
      },
    }),
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
  ]);

  // Calculate total outstanding for agent's customers
  const totalOutstanding = recentLoans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.outstandingPrincipal)),
    new Decimal(0)
  );

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="My Customers"
            value={myCustomers}
            icon={Users}
            variant="primary"
          />

          <StatCard
            title="Collections Made"
            value={myCollectionsCount}
            icon={ClipboardCheck}
            variant="success"
          />

          <StatCard
            title="Total Outstanding"
            value={<Money amount={totalOutstanding} />}
            icon={AlertCircle}
            variant="danger"
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
