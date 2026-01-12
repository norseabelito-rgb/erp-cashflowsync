"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { SessionMonitor } from "./session-monitor";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider 
      refetchInterval={60} // Revalidează sesiunea la fiecare minut
      refetchOnWindowFocus={true} // Revalidează când window-ul primește focus
    >
      <SessionMonitor />
      {children}
    </SessionProvider>
  );
}
