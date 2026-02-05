"use client";

import { useState, useCallback } from "react";
import { Check, AlertTriangle, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ReceptionItem {
  id: string;
  inventoryItemId: string;
  quantityExpected: number;
  quantityReceived: number | null;
  verified: boolean;
  hasDifference: boolean;
  observations: string | null;
  inventoryItem: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    costPrice?: number | null;
  };
}

interface ReceptionItemsTableProps {
  items: ReceptionItem[];
  onItemUpdate: (itemId: string, updates: Partial<{
    quantityReceived: number | null;
    verified: boolean;
    observations: string | null;
  }>) => void;
  disabled?: boolean;
}

export function ReceptionItemsTable({
  items,
  onItemUpdate,
  disabled = false,
}: ReceptionItemsTableProps) {
  // Local state for editing
  const [localItems, setLocalItems] = useState<Record<string, {
    quantityReceived: string;
    observations: string;
    verified: boolean;
  }>>(() => {
    const initial: Record<string, any> = {};
    items.forEach((item) => {
      initial[item.id] = {
        quantityReceived: item.quantityReceived?.toString() ?? "",
        observations: item.observations ?? "",
        verified: item.verified,
      };
    });
    return initial;
  });

  // Update local state when props change
  const getLocalItem = useCallback((item: ReceptionItem) => {
    return localItems[item.id] || {
      quantityReceived: item.quantityReceived?.toString() ?? "",
      observations: item.observations ?? "",
      verified: item.verified,
    };
  }, [localItems]);

  const handleQuantityChange = (itemId: string, value: string) => {
    setLocalItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantityReceived: value },
    }));

    const numValue = value === "" ? null : parseFloat(value);
    onItemUpdate(itemId, { quantityReceived: numValue });
  };

  const handleObservationsChange = (itemId: string, value: string) => {
    setLocalItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], observations: value },
    }));
    onItemUpdate(itemId, { observations: value || null });
  };

  const handleVerifiedChange = (itemId: string, checked: boolean) => {
    setLocalItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], verified: checked },
    }));
    onItemUpdate(itemId, { verified: checked });
  };

  const getDifference = (item: ReceptionItem, localQty: string): number | null => {
    if (localQty === "") return null;
    const received = parseFloat(localQty);
    if (isNaN(received)) return null;
    return received - Number(item.quantityExpected);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px]">SKU</TableHead>
            <TableHead>Denumire</TableHead>
            <TableHead className="text-center w-[100px]">Asteptat</TableHead>
            <TableHead className="text-center w-[120px]">Primit</TableHead>
            <TableHead className="text-center w-[100px]">Diferenta</TableHead>
            <TableHead className="text-center w-[80px]">Verificat</TableHead>
            <TableHead className="w-[200px]">Observatii</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nu exista articole in acest raport
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const local = getLocalItem(item);
              const difference = getDifference(item, local.quantityReceived);
              const hasDiff = difference !== null && difference !== 0;
              const needsObservation = hasDiff && !local.observations.trim();

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    local.verified && "bg-green-50/50 dark:bg-green-950/20",
                    hasDiff && !local.verified && "bg-amber-50/50 dark:bg-amber-950/20",
                    needsObservation && "bg-red-50/30 dark:bg-red-950/20"
                  )}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {item.inventoryItem.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.inventoryItem.name}</div>
                    <div className="text-xs text-muted-foreground">{item.inventoryItem.unit}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {Number(item.quantityExpected)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={local.quantityReceived}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      disabled={disabled}
                      className={cn(
                        "w-full text-center font-mono",
                        hasDiff && difference! < 0 && "border-red-400",
                        hasDiff && difference! > 0 && "border-amber-400"
                      )}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {difference === null ? (
                      <Minus className="h-4 w-4 mx-auto text-muted-foreground/50" />
                    ) : difference === 0 ? (
                      <Check className="h-4 w-4 mx-auto text-green-600" />
                    ) : (
                      <Badge
                        variant={difference < 0 ? "destructive" : "warning"}
                        className="font-mono"
                      >
                        {difference > 0 ? "+" : ""}{difference}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={local.verified}
                      onCheckedChange={(checked) => handleVerifiedChange(item.id, checked as boolean)}
                      disabled={disabled}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <Textarea
                        value={local.observations}
                        onChange={(e) => handleObservationsChange(item.id, e.target.value)}
                        disabled={disabled}
                        placeholder={hasDiff ? "Obligatoriu - explicati diferenta" : "Optional"}
                        className={cn(
                          "min-h-[60px] text-sm resize-none",
                          needsObservation && "border-red-400 bg-red-50 dark:bg-red-950/30"
                        )}
                        rows={2}
                      />
                      {needsObservation && (
                        <AlertTriangle className="h-4 w-4 text-red-500 absolute right-2 top-2" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
