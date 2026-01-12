// Modul separat pentru gestionarea state-urilor OAuth
// Necesar pentru că API routes Next.js nu pot exporta variabile non-handler

interface PendingOAuthState {
  userId: string;
  platform: string;
  appId?: string; // ID-ul aplicației din AdsApp (opțional pentru legacy)
  expiresAt: number;
}

// Folosim globalThis pentru a persista state-ul între recompilări Next.js
// În development, Next.js recompilează modulele și pierde Map-ul din memorie
const globalForOAuth = globalThis as unknown as {
  pendingOAuthStates: Map<string, PendingOAuthState> | undefined;
};

// Inițializăm Map-ul o singură dată
if (!globalForOAuth.pendingOAuthStates) {
  globalForOAuth.pendingOAuthStates = new Map<string, PendingOAuthState>();
}

const pendingStates = globalForOAuth.pendingOAuthStates;

// DEBUG: Log când se adaugă/citește state
const DEBUG_OAUTH = true; // Always enabled for now

// Cleanup expired states
export function cleanupExpiredStates() {
  const now = Date.now();
  let cleaned = 0;
  for (const [state, data] of pendingStates.entries()) {
    if (data.expiresAt < now) {
      pendingStates.delete(state);
      cleaned++;
    }
  }
  if (DEBUG_OAUTH && cleaned > 0) {
    console.log(`[OAuth State] Cleaned up ${cleaned} expired states`);
  }
}

// Adaugă un state nou
export function addPendingState(state: string, data: PendingOAuthState) {
  pendingStates.set(state, data);
  if (DEBUG_OAUTH) {
    console.log(`[OAuth State] Added state: ${state.substring(0, 8)}...`, {
      platform: data.platform,
      appId: data.appId,
      expiresAt: new Date(data.expiresAt).toISOString(),
      totalStates: pendingStates.size
    });
  }
}

// Obține și validează un state
export function getPendingState(state: string): PendingOAuthState | null {
  const pending = pendingStates.get(state);
  
  if (DEBUG_OAUTH) {
    console.log(`[OAuth State] Getting state: ${state.substring(0, 8)}...`, {
      found: !!pending,
      totalStates: pendingStates.size,
      allStates: Array.from(pendingStates.keys()).map(s => s.substring(0, 8) + '...')
    });
  }
  
  if (!pending) {
    return null;
  }
  
  if (pending.expiresAt < Date.now()) {
    pendingStates.delete(state);
    if (DEBUG_OAUTH) {
      console.log(`[OAuth State] State expired: ${state.substring(0, 8)}...`);
    }
    return null;
  }
  
  return pending;
}

// Șterge un state (după folosire)
export function removePendingState(state: string) {
  const existed = pendingStates.delete(state);
  if (DEBUG_OAUTH) {
    console.log(`[OAuth State] Removed state: ${state.substring(0, 8)}...`, { existed });
  }
}

// Verifică dacă un state există și e valid
export function isValidState(state: string): boolean {
  return getPendingState(state) !== null;
}

// Debug: listează toate state-urile active
export function listActiveStates(): { state: string; platform: string; appId?: string }[] {
  return Array.from(pendingStates.entries()).map(([state, data]) => ({
    state: state.substring(0, 8) + '...',
    platform: data.platform,
    appId: data.appId
  }));
}
