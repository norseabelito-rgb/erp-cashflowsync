"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Store } from "lucide-react";

interface StoreOption {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  stores: StoreOption[];
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  // Week starts Monday (day 1), Sunday is 0
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function DashboardFilters({ stores }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current filter state from URL
  const today = getToday();
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || startDate;
  const storeId = searchParams.get("store") || "all";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === "store") {
      if (value === "all") {
        params.delete("store");
      } else {
        params.set("store", value);
      }
    } else if (key === "startDate") {
      if (value === today && endDate === today) {
        // Default state - remove params
        params.delete("startDate");
        params.delete("endDate");
      } else {
        params.set("startDate", value);
        // If new start date is after end date, update end date too
        if (value > endDate) {
          params.set("endDate", value);
        }
      }
    } else if (key === "endDate") {
      if (startDate === today && value === today) {
        // Default state - remove params
        params.delete("startDate");
        params.delete("endDate");
      } else {
        params.set("endDate", value);
        // If new end date is before start date, update start date too
        if (value < startDate) {
          params.set("startDate", value);
        }
      }
    }

    router.push(`/dashboard?${params.toString()}`);
  };

  const handleQuickDate = (preset: "today" | "week" | "month") => {
    const params = new URLSearchParams(searchParams.toString());

    if (preset === "today") {
      params.delete("startDate");
      params.delete("endDate");
    } else if (preset === "week") {
      params.set("startDate", getWeekStart());
      params.set("endDate", today);
    } else if (preset === "month") {
      params.set("startDate", getMonthStart());
      params.set("endDate", today);
    }

    router.push(`/dashboard?${params.toString()}`);
  };

  // Determine which quick button is active
  const isToday = startDate === today && endDate === today;
  const isWeek = startDate === getWeekStart() && endDate === today;
  const isMonth = startDate === getMonthStart() && endDate === today;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-xs text-muted-foreground mb-1">
              De la
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-xs text-muted-foreground mb-1">
              Pana la
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>
      </div>

      {/* Quick Date Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={isToday ? "default" : "outline"}
          size="sm"
          onClick={() => handleQuickDate("today")}
          className="text-xs"
        >
          Azi
        </Button>
        <Button
          variant={isWeek ? "default" : "outline"}
          size="sm"
          onClick={() => handleQuickDate("week")}
          className="text-xs"
        >
          Saptamana aceasta
        </Button>
        <Button
          variant={isMonth ? "default" : "outline"}
          size="sm"
          onClick={() => handleQuickDate("month")}
          className="text-xs"
        >
          Luna aceasta
        </Button>
      </div>

      {/* Store Filter */}
      <div className="flex items-center gap-2 ml-auto">
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground mb-1">
            Magazin
          </label>
          <Select
            value={storeId}
            onValueChange={(value) => handleFilterChange("store", value)}
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
  );
}
