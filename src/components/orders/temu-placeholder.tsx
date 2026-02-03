"use client";

import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function TemuPlaceholder() {
  return (
    <Card className="mt-4">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Construction className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Integrare Temu
        </h3>
        <p className="text-muted-foreground max-w-md">
          Urmeaza sa fie implementat. Comenzile din Temu vor fi sincronizate automat dupa finalizarea integrarii.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Aceasta functionalitate este planificata pentru o versiune viitoare.
        </p>
      </CardContent>
    </Card>
  );
}
