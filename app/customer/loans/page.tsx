import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomerLoansPage() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    include: {
      loans: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    redirect("/login");
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "CLOSED":
        return "outline";
      default:
        return "warning";
    }
  };

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Loans</h1>
          <p className="text-gray-600">All your loan details</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Number</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.loans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-gray-500"
                      >
                        No loans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    customer.loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {loan.loanNumber}
                        </TableCell>
                        <TableCell>
                          <Money amount={new Decimal(loan.principal)} />
                        </TableCell>
                        <TableCell>{loan.interestRate.toString()}%</TableCell>
                        <TableCell>{loan.frequency}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          <Money
                            amount={new Decimal(loan.outstandingPrincipal)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(loan.status)}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {loan.startDate
                            ? new Date(loan.startDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
