"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChannelTab = "shopify" | "trendyol" | "temu";

export interface ChannelCounts {
  shopify: number;
  trendyol: number;
  temu: number;
}

export interface ChannelTabsProps {
  activeTab: ChannelTab;
  counts: ChannelCounts;
  onTabChange: (tab: ChannelTab) => void;
}

/**
 * ChannelTabs - Tab navigation for order channels (Shopify/Trendyol/Temu)
 *
 * Shows count badges for each channel with appropriate styling:
 * - Shopify: Default styling
 * - Trendyol: Orange accent
 * - Temu: Grayed out (placeholder)
 */
export function ChannelTabs({ activeTab, counts, onTabChange }: ChannelTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ChannelTab)}
      className="w-full"
    >
      <TabsList className="grid w-full max-w-[500px] grid-cols-3">
        {/* Shopify Tab */}
        <TabsTrigger
          value="shopify"
          className="gap-2 data-[state=active]:bg-background"
        >
          Shopify
          <Badge variant="default" className="ml-1">
            {counts.shopify}
          </Badge>
        </TabsTrigger>

        {/* Trendyol Tab */}
        <TabsTrigger
          value="trendyol"
          className="gap-2 data-[state=active]:bg-background"
        >
          Trendyol
          <Badge
            variant="secondary"
            className={cn(
              "ml-1",
              "bg-orange-100 text-orange-700",
              "dark:bg-orange-900/30 dark:text-orange-300"
            )}
          >
            {counts.trendyol}
          </Badge>
        </TabsTrigger>

        {/* Temu Tab (Placeholder) */}
        <TabsTrigger
          value="temu"
          className="gap-2 data-[state=active]:bg-background"
        >
          Temu
          <Badge
            variant="neutral"
            className="ml-1 opacity-60"
          >
            {counts.temu}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
