"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Users, Search, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";

interface Customer {
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  firstOrderDate: string;
}

// Create a client for this page
const queryClient = new QueryClient();

function CustomersEmbedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-based state for store filter
  const storeFilter = searchParams.get("tab") || "all";

  // Local state for search (with debounce)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination state
  const [page, setPage] = useState(1);

  // Fetch customers
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers-embed", storeFilter, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Tab change handler - updates URL
  const handleTabChange = useCallback(
    (newTab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.push(`/customers/embed?${params.toString()}`);
      setPage(1);
    },
    [searchParams, router]
  );

  // Selected customer for detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Clienti</h1>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Store Tabs */}
            <div className="flex-1">
              <Select value={storeFilter} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Toate magazinele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate magazinele</SelectItem>
                  {data?.stores?.map((store: { id: string; name: string }) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cauta dupa nume, email, telefon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Eroare la incarcarea clientilor</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Reincearca
              </Button>
            </div>
          ) : !data?.customers?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              {debouncedSearch
                ? `Nu am gasit clienti pentru "${debouncedSearch}"`
                : "Nu exista clienti."}
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Client</th>
                  <th className="text-left p-4 font-medium text-sm">Contact</th>
                  <th className="text-right p-4 font-medium text-sm">Comenzi</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Total cheltuit
                  </th>
                  <th className="text-left p-4 font-medium text-sm">
                    Ultima comanda
                  </th>
                  <th className="text-right p-4 font-medium text-sm">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.customers.map((customer: Customer) => (
                  <tr
                    key={customer.email}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {customer.firstName || customer.lastName
                          ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                          : "(Fara nume)"}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.phone ? (
                        <div className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          (Fara telefon)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Badge variant="secondary">
                        {customer.orderCount}{" "}
                        {customer.orderCount === 1 ? "comanda" : "comenzi"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(customer.lastOrderDate)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCustomer(customer);
                        }}
                      >
                        Detalii
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Afisez {data.customers.length} din {data.pagination.total} clienti
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Inapoi
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Inainte
            </Button>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        storeId={storeFilter}
      />
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Wrap with QueryClientProvider and Suspense since this is outside the main app layout
export default function CustomersEmbedClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingFallback />}>
        <CustomersEmbedContent />
      </Suspense>
    </QueryClientProvider>
  );
}
