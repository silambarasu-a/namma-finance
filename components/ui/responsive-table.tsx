"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { TableColumn } from "@/types";

interface ResponsiveTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No data found",
  className,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop Table View */}
      <div className={cn("hidden md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} className={column.className}>
                      {column.render
                        ? column.render(row[column.accessor], row)
                        : String(row[column.accessor] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="block space-y-4 md:hidden">
        {data.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </Card>
        ) : (
          data.map((row, rowIndex) => (
            <Card key={rowIndex} className="p-4">
              <div className="space-y-3">
                {columns.map((column, colIndex) => (
                  <div key={colIndex} className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {column.mobileLabel || column.header}:
                    </span>
                    <span className={cn("text-sm text-gray-900", column.className)}>
                      {column.render
                        ? column.render(row[column.accessor], row)
                        : String(row[column.accessor] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
