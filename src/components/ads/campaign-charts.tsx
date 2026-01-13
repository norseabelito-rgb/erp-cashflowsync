"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CampaignChartsProps {
  campaignId: string;
  currency?: string;
}

const DATE_PRESETS = [
  { value: "last_7d", label: "Ultimele 7 zile" },
  { value: "last_14d", label: "Ultimele 14 zile" },
  { value: "last_30d", label: "Ultimele 30 zile" },
  { value: "this_month", label: "Luna curentă" },
  { value: "last_month", label: "Luna trecută" },
];

const COMPARE_PRESETS = [
  { value: "vs_previous_7d", label: "7 zile vs 7 zile anterioare" },
  { value: "vs_previous_14d", label: "14 zile vs 14 zile anterioare" },
  { value: "vs_previous_30d", label: "30 zile vs 30 zile anterioare" },
  { value: "this_week_vs_last", label: "Săpt. curentă vs anterioară" },
  { value: "this_month_vs_last", label: "Luna curentă vs anterioară" },
];

function formatCurrency(value: number, currency: string = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function ChangeIndicator({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-muted-foreground">N/A</span>;
  
  const isPositive = inverse ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 1;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-sm font-medium",
      isNeutral ? "text-muted-foreground" : isPositive ? "text-status-success" : "text-status-error"
    )}>
      {isNeutral ? (
        <Minus className="h-4 w-4" />
      ) : isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      {formatPercent(value)}
    </span>
  );
}

export function CampaignPerformanceCharts({ campaignId, currency = "RON" }: CampaignChartsProps) {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [comparePreset, setComparePreset] = useState("vs_previous_7d");
  const [selectedMetric, setSelectedMetric] = useState<"spend" | "roas" | "conversions">("spend");

  // Fetch insights data
  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ["campaign-insights", campaignId, datePreset],
    queryFn: async () => {
      const res = await fetch(`/api/ads/campaigns/${campaignId}/insights?preset=${datePreset}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
  });

  // Fetch comparison data
  const { data: compareData, isLoading: compareLoading, refetch: refetchCompare } = useQuery({
    queryKey: ["campaign-compare", campaignId, comparePreset],
    queryFn: async () => {
      const res = await fetch(`/api/ads/campaigns/${campaignId}/compare?preset=${comparePreset}`);
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!insightsData?.data) return [];
    return insightsData.data.map((d: any) => ({
      ...d,
      dateLabel: new Date(d.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }),
    }));
  }, [insightsData]);

  const isLoading = insightsLoading || compareLoading;

  const handleRefresh = () => {
    refetchInsights();
    refetchCompare();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Perioadă" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* KPI Summary Cards */}
      {insightsData?.totals && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Spend Total</div>
              <div className="text-2xl font-bold">{formatCurrency(insightsData.totals.spend, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Impressions</div>
              <div className="text-2xl font-bold">{formatNumber(insightsData.totals.impressions)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Clicks</div>
              <div className="text-2xl font-bold">{formatNumber(insightsData.totals.clicks)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Conversions</div>
              <div className="text-2xl font-bold">{insightsData.totals.conversions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">ROAS</div>
              <div className="text-2xl font-bold">
                {insightsData.totals.roas ? `${insightsData.totals.roas.toFixed(2)}x` : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance zilnic</CardTitle>
              <CardDescription>
                {insightsData?.dateRange?.start} - {insightsData?.dateRange?.end}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {["spend", "roas", "conversions"].map((metric) => (
                <Badge
                  key={metric}
                  variant={selectedMetric === metric ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedMetric(metric as any)}
                >
                  {metric === "spend" ? "Spend" : metric === "roas" ? "ROAS" : "Conversii"}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                "Nu sunt date disponibile"
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRoas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateLabel" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => 
                    selectedMetric === "spend" 
                      ? formatCurrency(value, currency) 
                      : selectedMetric === "roas"
                      ? `${value}x`
                      : value.toString()
                  }
                />
                <Tooltip
                  formatter={(value: number) => 
                    selectedMetric === "spend" 
                      ? formatCurrency(value, currency) 
                      : selectedMetric === "roas"
                      ? `${value?.toFixed(2)}x`
                      : value
                  }
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetric === "spend" ? "#3b82f6" : selectedMetric === "roas" ? "#22c55e" : "#f59e0b"}
                  fill={`url(#color${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Multi-metric Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spend vs Revenue</CardTitle>
          <CardDescription>Comparație zilnică</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nu sunt date disponibile
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Legend />
                <Bar dataKey="spend" name="Spend" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparație perioade</CardTitle>
              <CardDescription>Compară performanța între două perioade</CardDescription>
            </div>
            <Select value={comparePreset} onValueChange={setComparePreset}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selectează comparație" />
              </SelectTrigger>
              <SelectContent>
                {COMPARE_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {compareLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : compareData?.comparison ? (
            <div className="space-y-4">
              {/* Period Labels */}
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {compareData.comparison.period1.start} - {compareData.comparison.period1.end}
                </span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-foreground">
                  {compareData.comparison.period2.start} - {compareData.comparison.period2.end}
                </span>
              </div>

              {/* Comparison Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground mb-1">Spend</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">
                          {formatCurrency(compareData.comparison.period1.spend, currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          vs {formatCurrency(compareData.comparison.period2.spend, currency)}
                        </div>
                      </div>
                      <ChangeIndicator value={compareData.comparison.changes.spend} inverse />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground mb-1">Conversii</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">
                          {compareData.comparison.period1.conversions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          vs {compareData.comparison.period2.conversions}
                        </div>
                      </div>
                      <ChangeIndicator value={compareData.comparison.changes.conversions} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground mb-1">ROAS</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">
                          {compareData.comparison.period1.roas?.toFixed(2) || "N/A"}x
                        </div>
                        <div className="text-sm text-muted-foreground">
                          vs {compareData.comparison.period2.roas?.toFixed(2) || "N/A"}x
                        </div>
                      </div>
                      <ChangeIndicator value={compareData.comparison.changes.roas} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              {compareData.summary && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  {compareData.summary.roasChange}
                </div>
              )}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              Nu sunt date disponibile pentru comparație
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
