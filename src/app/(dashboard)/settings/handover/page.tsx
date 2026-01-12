"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Clock,
  Save,
  Loader2,
  ArrowLeft,
  Settings,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";

const TIMEZONES = [
  { value: "Europe/Bucharest", label: "Europa/București (EET)" },
  { value: "Europe/London", label: "Europa/Londra (GMT)" },
  { value: "Europe/Berlin", label: "Europa/Berlin (CET)" },
];

export default function HandoverSettingsPage() {
  const queryClient = useQueryClient();
  const [closeTime, setCloseTime] = useState("20:00");
  const [timezone, setTimezone] = useState("Europe/Bucharest");

  // Fetch current settings
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  // Update local state when data loads
  useEffect(() => {
    if (data?.settings) {
      setCloseTime(data.settings.handoverAutoCloseTime || "20:00");
      setTimezone(data.settings.handoverTimezone || "Europe/Bucharest");
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoverAutoCloseTime: closeTime,
          handoverTimezone: timezone,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la salvare");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Setări salvate", description: "Configurația a fost actualizată." });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const hasChanges =
    closeTime !== (data?.settings?.handoverAutoCloseTime || "20:00") ||
    timezone !== (data?.settings?.handoverTimezone || "Europe/Bucharest");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Setări
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Setări Predare Curier
        </h1>
        <p className="text-muted-foreground">
          Configurează ora de finalizare automată a predării
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Finalizare Automată
            </CardTitle>
            <CardDescription>
              La ora configurată, toate AWB-urile nescanate vor fi marcate automat ca NEPREDATE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="closeTime">Ora finalizării</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Format 24h (ex: 20:00 = 8 PM)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fus orar</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Cum funcționează:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• La ora configurată, sistemul verifică automat AWB-urile nescanate</li>
                  <li>• AWB-urile nescanate sunt marcate ca NEPREDATE</li>
                  <li>• Se generează raportul zilei automat</li>
                  <li>• AWB-urile nepredate apar în Lista 2 pentru scanare ulterioară</li>
                </ul>
              </AlertDescription>
            </Alert>

            <RequirePermission permission="settings.handover">
              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasChanges || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvează
                </Button>
              </div>
            </RequirePermission>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
