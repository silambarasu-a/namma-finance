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

export default async function CustomerPaymentsPage() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
  });

  if (!customer) {
    redirect("/login");
  }

  // Fetch all collections for customer's loans
  const collections = await prisma.collection.findMany({
    where: {
      loan: {
        customerId: customer.id,
      },
    },
    include: {
      loan: {
        select: {
          loanNumber: true,
        },
      },
      agent: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { collectionDate: "desc" },
  });

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600">All your EMI payments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Payments</div>
              <div className="text-3xl font-bold text-gray-900">
                {collections.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Amount Paid</div>
              <div className="text-2xl font-bold text-green-600">
                <Money
                  amount={collections.reduce(
                    (sum, c) => sum.plus(new Decimal(c.amount)),
                    new Decimal(0)
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-gray-500"
                      >
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    collections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          {new Date(
                            collection.collectionDate
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {collection.receiptNumber}
                        </TableCell>
                        <TableCell>{collection.loan.loanNumber}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          <Money amount={new Decimal(collection.amount)} />
                        </TableCell>
                        <TableCell>
                          <Money
                            amount={new Decimal(collection.principalAmount)}
                          />
                        </TableCell>
                        <TableCell>
                          <Money
                            amount={new Decimal(collection.interestAmount)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {collection.paymentMethod}
                          </Badge>
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
