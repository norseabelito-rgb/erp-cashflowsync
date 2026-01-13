"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Use client-side redirect to allow health checks to pass (returns 200 OK)
// Server-side redirect returns 307/308 which health checkers see as errors
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
