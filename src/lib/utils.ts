import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  short: boolean | string = false
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const currency = typeof short === "string" ? short : "RON";
  const useShort = typeof short === "boolean" ? short : false;
  
  if (useShort) {
    // Format scurt pentru grafice: 1.2K, 15K, 1.5M
    if (numAmount >= 1000000) {
      return (numAmount / 1000000).toFixed(1) + "M";
    } else if (numAmount >= 1000) {
      return (numAmount / 1000).toFixed(1) + "K";
    }
    return numAmount.toFixed(0);
  }
  
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency,
  }).format(numAmount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convertește URL-ul unei imagini Google Drive în URL-ul API-ului proxy
// Aceasta permite încărcarea imaginilor fără a fi nevoie de partajare publică
export function getDriveImageUrl(url: string): string {
  if (!url) return "";
  
  // Dacă e deja URL-ul proxy, returnează-l
  if (url.startsWith("/api/drive-image/")) {
    return url;
  }
  
  // Extrage file ID din URL-ul Google Drive
  // Format: https://drive.google.com/uc?export=view&id=FILE_ID
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) {
    return `/api/drive-image/${ucMatch[1]}`;
  }
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `/api/drive-image/${fileMatch[1]}`;
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `/api/drive-image/${openMatch[1]}`;
  }
  
  // Dacă nu e URL Google Drive, returnează-l așa cum e
  return url;
}
