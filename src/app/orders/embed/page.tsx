import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import OrdersEmbedClient from "./orders-embed-client";

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function OrdersEmbedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrdersEmbedClient />
    </Suspense>
  );
}
