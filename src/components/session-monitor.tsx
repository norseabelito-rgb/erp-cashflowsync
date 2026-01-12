"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minute
const CHECK_INTERVAL = 60 * 1000; // Verifică la fiecare minut

export function SessionMonitor() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizează timestamp-ul la orice activitate
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Verifică dacă sesiunea a expirat din cauza inactivității
  const checkSessionExpiry = useCallback(async () => {
    if (status !== "authenticated") return;

    const timeSinceActivity = Date.now() - lastActivityRef.current;
    
    if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
      // Sesiune expirată din cauza inactivității
      console.log("Session expired due to inactivity");
      
      // Setează mesajul pentru pagina de login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('session_expired', 'inactivity');
      }
      
      // Sign out și redirect
      await signOut({ redirect: false });
      router.push('/login?expired=inactivity');
      return;
    }

    // Verifică și dacă sesiunea e încă validă pe server
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      
      if (!data || !data.user) {
        console.log("Session no longer valid on server");
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('session_expired', 'expired');
        }
        
        router.push('/login?expired=true');
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }, [status, router]);

  // Setup event listeners pentru activitate
  useEffect(() => {
    if (status !== "authenticated") return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Verifică periodic
    checkIntervalRef.current = setInterval(checkSessionExpiry, CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [status, updateActivity, checkSessionExpiry]);

  // Nu render nimic - e doar un monitor în background
  return null;
}
