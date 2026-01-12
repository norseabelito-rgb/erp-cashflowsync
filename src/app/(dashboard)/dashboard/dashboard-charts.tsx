"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Store } from "lucide-react";

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface StoreOption {
  id: string;
  name: string;
  ordersCount: number;
}

interface DashboardChartsProps {
  salesData: SalesData[];
  stores: StoreOption[];
  currentStoreId: string | null;
}

export function DashboardCharts({ salesData, stores, currentStoreId }: DashboardChartsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStoreChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "all") {
      params.delete("store");
    } else {
      params.set("store", value);
    }
    
    router.push(`/dashboard?${params.toString()}`);
  };

  // Formatare date pentru afișare
  const formattedData = salesData.map((item) => ({
    ...item,
    displayDate: new Date(item.date + 'T00:00:00Z').toLocaleDateString("ro-RO", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));

  // Calculăm totalul
  const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
  const avgDailySales = salesData.length > 0 ? totalSales / salesData.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Comenzi Ultimele 7 Zile
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* Store Filter */}
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <Select
                value={currentStoreId || "all"}
                onValueChange={handleStoreChange}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Toate magazinele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate magazinele</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm mt-2">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{formatCurrency(totalSales)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Media/zi: </span>
            <span className="font-semibold">{formatCurrency(avgDailySales)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Comenzi: </span>
            <span className="font-semibold">{totalOrders}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {salesData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <p>Nu există date de vânzări pentru această perioadă</p>
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, true)}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  width={80}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <p className="font-medium mb-1">{label}</p>
                          <p className="text-emerald-500">
                            Valoare: {formatCurrency(payload[0].value as number)}
                          </p>
                          {payload[0].payload?.orders !== undefined && (
                            <p className="text-blue-500">
                              Comenzi: {payload[0].payload.orders}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
