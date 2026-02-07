"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const { data: session } = useSession();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPINStatus();
  }, []);

  async function checkPINStatus() {
    try {
      const res = await fetch("/api/settings/pin");
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.configured);
      }
    } catch (err) {
      console.error("Error checking PIN status:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate new PIN
    if (!/^\d{6}$/.test(newPin)) {
      setError("PIN must be exactly 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PIN confirmation does not match");
      return;
    }

    // If already configured, require current PIN
    if (isConfigured && !currentPin) {
      setError("Current PIN is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/settings/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPin,
          currentPin: isConfigured ? currentPin : undefined
        })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to set PIN");
        return;
      }

      toast.success(isConfigured ? "PIN schimbat cu succes" : "PIN setat cu succes");

      // Reset form
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setIsConfigured(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error setting PIN";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Setari Securitate"
        description="Configurare PIN pentru aprobari exceptii"
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            PIN Aprobare Exceptii
          </CardTitle>
          <CardDescription>
            PIN-ul de 6 cifre este necesar pentru a aproba operatiuni manuale
            (stornare/incasare) care nu sunt bazate pe manifest curier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConfigured === null ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="mb-4">
                {isConfigured ? (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      PIN configurat. Pentru a schimba, introduceti PIN-ul curent.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      PIN nu este configurat. Setati un PIN pentru a activa aprobari exceptii.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isConfigured && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPin">PIN Curent</Label>
                    <div className="relative">
                      <Input
                        id="currentPin"
                        type={showCurrentPin ? "text" : "password"}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        placeholder="******"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPin">{isConfigured ? "PIN Nou" : "PIN"}</Label>
                  <div className="relative">
                    <Input
                      id="newPin"
                      type={showNewPin ? "text" : "password"}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      placeholder="******"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PIN trebuie sa contina exact 6 cifre
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirmare PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="******"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading
                    ? "Se salveaza..."
                    : isConfigured
                      ? "Schimba PIN"
                      : "Seteaza PIN"
                  }
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
