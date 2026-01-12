"use client";

import { AIInsights } from "@/components/ai-insights";

export function DashboardAIInsights() {
  return (
    <AIInsights
      showAnalyzeButton={true}
      compact={false}
      maxItems={100}
    />
  );
}
