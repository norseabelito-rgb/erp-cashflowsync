"use client";

import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        
        <h1 className="text-4xl font-bold mb-2">403</h1>
        <h2 className="text-2xl font-semibold mb-4">Acces Interzis</h2>
        
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Nu ai permisiunea necesară pentru a accesa această pagină. 
          Dacă crezi că ar trebui să ai acces, contactează administratorul.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi
          </Button>
          <Button onClick={() => router.push("/")}>
            <Home className="h-4 w-4 mr-2" />
            Acasă
          </Button>
        </div>
      </div>
    </div>
  );
}
