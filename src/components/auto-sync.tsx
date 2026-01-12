"use client";

import { useAutoSync } from "@/hooks/use-auto-sync";

interface AutoSyncProviderProps {
  children: React.ReactNode;
  intervalMinutes?: number;
}

export function AutoSyncProvider({ children, intervalMinutes = 5 }: AutoSyncProviderProps) {
  // Rulează sincronizarea automată în background
  useAutoSync({ intervalMinutes, enabled: true });
  
  return <>{children}</>;
}
