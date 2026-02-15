"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";
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
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

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

interface Store {
  id: string;
  name: string;
}

interface CustomersApiResponse {
  customers: Customer[];
  stores: Store[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-based state for store filter (per 07.4-01 decision)
  const storeFilter = searchParams.get("tab") || "all";

  // Local state for search (with debounce)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms per 07.4-03 decision)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination state
  const [page, setPage] = useState(1);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, storeFilter]);

  // Fetch customers
  const { data, isLoading, isError } = useQuery<CustomersApiResponse>({
    queryKey: ["customers", storeFilter, debouncedSearch, page],
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
      router.push(`/customers?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Selected customer for detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  // Helper to format customer name
  const formatCustomerName = (customer: Customer) => {
    if (customer.firstName || customer.lastName) {
      return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    }
    return "(Fara nume)";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Clienti"
        description="Vizualizeaza toti clientii si istoricul comenzilor"
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Store Filter */}
            <div className="flex-shrink-0">
              <Select value={storeFilter} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Toate magazinele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate magazinele</SelectItem>
                  {data?.stores?.map((store) => (
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
                placeholder="Cauta dupa nume, email, telefon, numar comanda..."
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
                <SkeletonTableRow key={i} cols={6} />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Eroare la incarcarea clientilor"
              description="Nu am putut incarca lista de clienti. Incearca din nou."
              action={{
                label: "Reincearca",
                onClick: () => window.location.reload(),
              }}
            />
          ) : !data?.customers?.length ? (
            <EmptyState
              title={debouncedSearch ? "Niciun client gasit" : "Nu exista clienti"}
              description={
                debouncedSearch
                  ? `Nu am gasit clienti pentru "${debouncedSearch}"`
                  : "Clientii vor aparea aici dupa ce vei primi comenzi."
              }
            />
          ) : (
            <div className="overflow-x-auto">
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
                  {data.customers.map((customer) => (
                    <tr
                      key={customer.email}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <td className="p-4">
                        <div className="font-medium">
                          {formatCustomerName(customer)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Afisez{" "}
            {(data.pagination.page - 1) * data.pagination.limit + 1}-
            {Math.min(
              data.pagination.page * data.pagination.limit,
              data.pagination.total
            )}{" "}
            din {data.pagination.total} clienti (Pagina {data.pagination.page}{" "}
            din {data.pagination.totalPages})
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Inapoi
            </Button>
            <span className="text-sm font-medium min-w-[3ch] text-center">
              {data.pagination.page}
            </span>
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
