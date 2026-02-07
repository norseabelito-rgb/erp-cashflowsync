"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface ManifestItem {
  id: string;
  awbNumber: string;
  originalAwb: string | null;
  status: string;
  errorMessage: string | null;
  invoice: {
    invoiceNumber: string | null;
    invoiceSeriesName: string | null;
    status: string;
    paymentStatus: string;
  } | null;
  order: {
    orderNumber: string | null;
    shopifyOrderNumber: string | null;
  } | null;
}

interface ReturnManifestTableProps {
  items: ManifestItem[];
}

export function ReturnManifestTable({ items }: ReturnManifestTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "ERROR":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <Badge variant="default" className="bg-green-100 text-green-800">Procesat</Badge>;
      case "ERROR":
        return <Badge variant="destructive">Eroare</Badge>;
      default:
        return <Badge variant="secondary">In asteptare</Badge>;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Status</TableHead>
          <TableHead>AWB Retur</TableHead>
          <TableHead>AWB Original</TableHead>
          <TableHead>Comanda</TableHead>
          <TableHead>Factura</TableHead>
          <TableHead>Status Factura</TableHead>
          <TableHead>Eroare</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{getStatusIcon(item.status)}</TableCell>
            <TableCell className="font-mono text-sm">{item.awbNumber}</TableCell>
            <TableCell className="font-mono text-sm">{item.originalAwb || "-"}</TableCell>
            <TableCell>
              {item.order?.shopifyOrderNumber || item.order?.orderNumber || "-"}
            </TableCell>
            <TableCell>
              {item.invoice ? (
                <span className="font-mono text-sm">
                  {item.invoice.invoiceSeriesName}{item.invoice.invoiceNumber}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {item.invoice ? (
                <Badge variant={item.invoice.status === "cancelled" ? "destructive" : "secondary"}>
                  {item.invoice.status === "cancelled" ? "Stornata" : item.invoice.status}
                </Badge>
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell>
              {item.errorMessage ? (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {item.errorMessage}
                </span>
              ) : (
                "-"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
