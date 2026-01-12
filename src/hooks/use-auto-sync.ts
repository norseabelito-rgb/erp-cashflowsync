"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AutoSyncOptions {
  intervalMinutes?: number;
  enabled?: boolean;
}

export function useAutoSync({ intervalMinutes = 5, enabled = true }: AutoSyncOptions = {}) {
  const queryClient = useQueryClient();
  const lastSyncRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const sync = async () => {
      try {
        console.log(`[AutoSync] Sincronizare automată la ${new Date().toLocaleTimeString()}`);
        const res = await fetch("/api/sync", { method: "POST" });
        const data = await res.json();
        
        if (data.synced > 0) {
          console.log(`[AutoSync] ${data.synced} comenzi noi sincronizate`);
          // Invalidăm query-urile pentru a actualiza UI-ul
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }
        
        lastSyncRef.current = new Date();
      } catch (error) {
        console.error("[AutoSync] Eroare la sincronizare:", error);
      }
    };

    // Sincronizare inițială după 10 secunde
    const initialTimeout = setTimeout(sync, 10000);

    // Apoi la fiecare X minute
    const interval = setInterval(sync, intervalMinutes * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [intervalMinutes, enabled, queryClient]);

  return { lastSync: lastSyncRef.current };
}
