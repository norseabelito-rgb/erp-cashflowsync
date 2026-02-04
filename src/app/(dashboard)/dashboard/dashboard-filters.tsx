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

/**
 * Romania timezone for consistent date handling
 * Ensures dates match business days in Romania regardless of user's browser timezone
 */
const ROMANIA_TIMEZONE = "Europe/Bucharest";

/**
 * Get today's date in Romania timezone as YYYY-MM-DD string
 * This ensures consistency between client and server date calculations
 */
function getToday(): string {
  const now = new Date();
  // Use Intl.DateTimeFormat with en-CA locale which returns YYYY-MM-DD format
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROMANIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Get the start of the current week (Monday) in Romania timezone
 */
function getWeekStart(): string {
  const now = new Date();
  // Get current date parts in Romania timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROMANIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Get the day of week in Romania timezone (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeekFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ROMANIA_TIMEZONE,
    weekday: "short",
  });
  const dayName = dayOfWeekFormatter.format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[dayName] ?? 0;

  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? 6 : day - 1;

  // Create a new date by subtracting the difference
  const monday = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
  return formatter.format(monday);
}

/**
 * Get the first day of the current month in Romania timezone
 */
function getMonthStart(): string {
  const now = new Date();
  // Get current year and month in Romania timezone
  const yearFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ROMANIA_TIMEZONE,
    year: "numeric",
  });
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ROMANIA_TIMEZONE,
    month: "2-digit",
  });

  const year = yearFormatter.format(now);
  const month = monthFormatter.format(now);
  return `${year}-${month}-01`;
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
