"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseOrderForm } from "@/components/inventory/PurchaseOrderForm";

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/inventory/purchase-orders")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Precomanda noua
          </h1>
          <p className="text-muted-foreground">
            Creeaza o noua precomanda catre furnizor
          </p>
        </div>
      </div>

      <PurchaseOrderForm
        onSuccess={(order) => {
          router.push(`/inventory/purchase-orders/${order.id}`);
        }}
      />
    </div>
  );
}
