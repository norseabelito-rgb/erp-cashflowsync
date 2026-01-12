"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  Globe, 
  Loader2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useDisplay } from "@/hooks/use-display";

export default function PreferencesPage() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { preferences, setCompactMode, setShowAvatars, isLoading } = useDisplay();
  const [mounted, setMounted] = useState(false);
  
  // Notificări browser
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState(true);

  // Pentru a evita hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Verifică dacă notificările browser sunt activate
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifications(Notification.permission === "granted");
    }
  }, []);

  const handleBrowserNotificationsChange = async (enabled: boolean) => {
    if (enabled) {
      if (!("Notification" in window)) {
        toast({ 
          title: "Browserul nu suportă notificări", 
          variant: "destructive" 
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setBrowserNotifications(true);
        toast({ title: "Notificări activate" });
        // Notificare de test
        new Notification("Cash Flow Grup", {
          body: "Notificările au fost activate cu succes!",
          icon: "/favicon.svg",
        });
      } else {
        toast({ 
          title: "Permisiune refuzată", 
          description: "Trebuie să permiți notificările din setările browserului",
          variant: "destructive" 
        });
      }
    } else {
      setBrowserNotifications(false);
      toast({ title: "Notificări dezactivate" });
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Preferințe</h1>
        <p className="text-muted-foreground">
          Personalizează experiența ta în aplicație
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Aspect
          </CardTitle>
          <CardDescription>
            Personalizează aspectul aplicației
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Temă</Label>
              <p className="text-sm text-muted-foreground">
                Alege tema preferată pentru interfață
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4 mr-1" />
                Deschis
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-1" />
                Întunecat
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Sistem
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Limbă</Label>
              <p className="text-sm text-muted-foreground">
                Selectează limba interfeței
              </p>
            </div>
            <Select defaultValue="ro">
              <SelectTrigger className="w-[180px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">Română</SelectItem>
                <SelectItem value="en" disabled>English (în curând)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mod compact</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spațiul dintre elemente pentru a vedea mai mult conținut
              </p>
            </div>
            <Switch
              checked={preferences.compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Afișează avatare</Label>
              <p className="text-sm text-muted-foreground">
                Arată pozele de profil ale utilizatorilor în liste
              </p>
            </div>
            <Switch
              checked={preferences.showAvatars}
              onCheckedChange={setShowAvatars}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificări
          </CardTitle>
          <CardDescription>
            Configurează cum primești notificările
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Notificări browser</Label>
                <p className="text-sm text-muted-foreground">
                  Primește notificări push în browser
                </p>
              </div>
            </div>
            <Switch
              checked={browserNotifications}
              onCheckedChange={handleBrowserNotificationsChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alerte sistem</Label>
              <p className="text-sm text-muted-foreground">
                Notificări importante despre sistem (utilizatori noi, erori, etc.)
              </p>
            </div>
            <Switch
              checked={systemAlerts}
              onCheckedChange={setSystemAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Preferințele sunt salvate automat și sincronizate pe toate dispozitivele tale.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
