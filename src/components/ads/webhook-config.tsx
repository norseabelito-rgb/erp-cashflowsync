"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

// Platform icons
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

interface WebhookConfig {
  platform: string;
  callbackUrl: string;
  verifyToken: string | null;
  isActive: boolean;
  isVerified: boolean;
  subscriptions: string[];
  lastEventAt: string | null;
  eventsReceived: number;
  lastError: string | null;
  lastErrorAt: string | null;
  instructions: string[];
}

interface WebhookEvent {
  id: string;
  platform: string;
  eventType: string;
  objectId: string | null;
  processed: boolean;
  processError: string | null;
  receivedAt: string;
}

export function WebhookConfigSection() {
  const queryClient = useQueryClient();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Fetch webhook configs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads-webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/ads/webhooks");
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      return res.json();
    },
  });

  const webhooks: Record<string, WebhookConfig> = data?.webhooks || {};
  const recentEvents: WebhookEvent[] = data?.recentEvents || [];

  // Generate token mutation
  const generateTokenMutation = useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch("/api/ads/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, action: "generate_token" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      toast({ title: "✓ Token generat" });
      queryClient.invalidateQueries({ queryKey: ["ads-webhooks"] });
      setExpandedPlatform(data.platform || "META");
      setShowInstructions(true);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch("/api/ads/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, action: "toggle" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      toast({ title: data.isActive ? "✓ Webhook activat" : "Webhook dezactivat" });
      queryClient.invalidateQueries({ queryKey: ["ads-webhooks"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "✓ Copiat în clipboard" });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("ro-RO");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Webhook className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Webhook-uri</CardTitle>
                <CardDescription>
                  Primește notificări în timp real când campaniile se schimbă
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meta Webhook */}
          <Collapsible 
            open={expandedPlatform === "META"}
            onOpenChange={(open) => setExpandedPlatform(open ? "META" : null)}
          >
            <div className="border rounded-lg p-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <MetaIcon />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Meta Ads</div>
                    <div className="text-sm text-muted-foreground">
                      {webhooks.META?.isVerified ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verificat
                        </span>
                      ) : webhooks.META?.verifyToken ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Info className="h-3 w-3" /> Așteaptă verificare
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Neconfigurat</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {webhooks.META?.eventsReceived > 0 && (
                    <Badge variant="outline">
                      <Zap className="h-3 w-3 mr-1" />
                      {webhooks.META.eventsReceived} evenimente
                    </Badge>
                  )}
                  {webhooks.META?.verifyToken && (
                    <Switch
                      checked={webhooks.META?.isActive}
                      onCheckedChange={() => toggleMutation.mutate("META")}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {expandedPlatform === "META" ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4 space-y-4">
                {!webhooks.META?.verifyToken ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      Generează un token pentru a configura webhook-ul în Facebook Developer Console
                    </p>
                    <Button 
                      onClick={() => generateTokenMutation.mutate("META")}
                      disabled={generateTokenMutation.isPending}
                    >
                      {generateTokenMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Generează Token
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Callback URL */}
                    <div>
                      <Label className="text-sm">Callback URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={webhooks.META?.callbackUrl} readOnly className="font-mono text-sm" />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(webhooks.META?.callbackUrl || "")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Verify Token */}
                    <div>
                      <Label className="text-sm">Verify Token</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={webhooks.META?.verifyToken || ""} readOnly className="font-mono text-sm" />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(webhooks.META?.verifyToken || "")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={webhooks.META?.isVerified ? "default" : "secondary"}>
                        {webhooks.META?.isVerified ? "Verificat" : "Neverificat"}
                      </Badge>
                    </div>

                    {webhooks.META?.lastEventAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ultimul eveniment</span>
                        <span>{formatDate(webhooks.META.lastEventAt)}</span>
                      </div>
                    )}

                    {webhooks.META?.lastError && (
                      <Alert variant="destructive">
                        <AlertDescription className="text-sm">
                          {webhooks.META.lastError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Instructions */}
                    {showInstructions && webhooks.META?.instructions && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium mb-2">Pași de configurare:</div>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            {webhooks.META.instructions.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowInstructions(!showInstructions)}
                      >
                        {showInstructions ? "Ascunde instrucțiuni" : "Arată instrucțiuni"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generateTokenMutation.mutate("META")}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerează token
                      </Button>
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evenimente recente</CardTitle>
            <CardDescription>Ultimele 10 webhook-uri primite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between text-sm p-2 border rounded"
                >
                  <div className="flex items-center gap-3">
                    {event.processed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : event.processError ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    <div>
                      <span className="font-medium">{event.eventType}</span>
                      {event.objectId && (
                        <span className="text-muted-foreground ml-2">
                          ({event.objectId})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDate(event.receivedAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
