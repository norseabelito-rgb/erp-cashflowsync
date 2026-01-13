"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  Plus,
  AlertTriangle,
  Info,
  Settings,
  Loader2,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Eye,
  X,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  scopeType: string;
  scopePlatform: string | null;
  scopeSku: string | null;
  conditions: any[];
  conditionLogic: string;
  action: string;
  reducePct: number | null;
  notifyEmail: boolean;
  notifyInApp: boolean;
  cooldownHours: number;
  triggerCount: number;
  lastCheckedAt: string | null;
  _count: { alerts: number };
}

interface TriggeredAlert {
  id: string;
  status: string;
  actionTaken: string;
  metricSnapshot: any;
  conditionsMet: any[];
  createdAt: string;
  rule: { id: string; name: string; action: string };
  campaign: {
    id: string;
    name: string;
    status: string;
    account: { platform: string; name: string };
  };
}

const actionLabels: Record<string, string> = {
  NOTIFY: "Doar notificare",
  PAUSE: "Oprește campania",
  REDUCE_BUDGET: "Reduce bugetul",
};

const metricLabels: Record<string, string> = {
  spend: "Spend (RON)",
  cpa: "CPA (RON)",
  roas: "ROAS",
  ctr: "CTR (%)",
  cpm: "CPM (RON)",
  cpc: "CPC (RON)",
  frequency: "Frequency",
  conversions: "Conversii",
};

const operatorLabels: Record<string, string> = {
  ">": "mai mare decât",
  "<": "mai mic decât",
  ">=": "≥",
  "<=": "≤",
  "==": "egal cu",
};

export default function AdsAlertsPage() {
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");

  // Form state for new rule
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    scopeType: "ALL",
    scopePlatform: "",
    scopeSku: "",
    conditions: [{ metric: "cpa", operator: ">", value: 50, timeframe: "24h" }],
    conditionLogic: "AND",
    action: "NOTIFY",
    reducePct: 20,
    notifyEmail: true,
    notifyInApp: true,
    cooldownHours: 24,
  });

  // Fetch rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["ads-alert-rules"],
    queryFn: async () => {
      const res = await fetch("/api/ads/alerts/rules");
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    },
  });

  // Fetch triggered alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["ads-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/ads/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const rules: AlertRule[] = rulesData?.rules || [];
  const alerts: TriggeredAlert[] = alertsData?.alerts || [];
  const alertCounts = alertsData?.counts || { new: 0, seen: 0, resolved: 0 };

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/ads/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ Regulă creată" });
      setCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["ads-alert-rules"] });
      // Reset form
      setNewRule({
        name: "",
        description: "",
        scopeType: "ALL",
        scopePlatform: "",
        scopeSku: "",
        conditions: [{ metric: "cpa", operator: ">", value: 50, timeframe: "24h" }],
        conditionLogic: "AND",
        action: "NOTIFY",
        reducePct: 20,
        notifyEmail: true,
        notifyInApp: true,
        cooldownHours: 24,
      });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Toggle rule active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch("/api/ads/alerts/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-alert-rules"] });
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ads/alerts/rules?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ Regulă ștearsă" });
      queryClient.invalidateQueries({ queryKey: ["ads-alert-rules"] });
    },
  });

  // Mark alert as seen/resolved
  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, action }: { alertId: string; action: string }) => {
      const res = await fetch("/api/ads/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-alerts"] });
    },
  });

  const addCondition = () => {
    setNewRule({
      ...newRule,
      conditions: [...newRule.conditions, { metric: "roas", operator: "<", value: 2, timeframe: "24h" }],
    });
  };

  const removeCondition = (index: number) => {
    setNewRule({
      ...newRule,
      conditions: newRule.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...newRule.conditions];
    updated[index] = { ...updated[index], [field]: value };
    setNewRule({ ...newRule, conditions: updated });
  };

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Alerte Advertising
            </h1>
            <p className="text-muted-foreground">
              Configurează reguli pentru alertare și oprire automată a campaniilor
            </p>
          </div>
          <RequirePermission permission="ads.alerts">
            <Button onClick={() => setCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Regulă Nouă
            </Button>
          </RequirePermission>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reguli Active</p>
              <p className="text-2xl font-bold">{rules.filter((r) => r.isActive).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Alerte Noi</p>
              <p className="text-2xl font-bold text-status-error">{alertCounts.new}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Văzute</p>
              <p className="text-2xl font-bold text-status-warning">{alertCounts.seen}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Rezolvate</p>
              <p className="text-2xl font-bold text-status-success">{alertCounts.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules">Reguli ({rules.length})</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerte
              {alertCounts.new > 0 && (
                <Badge variant="destructive" className="ml-2">{alertCounts.new}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            {rulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nicio regulă configurată</p>
                  <p className="text-muted-foreground mb-4">
                    Creează prima regulă pentru a monitoriza campaniile
                  </p>
                  <RequirePermission permission="ads.alerts">
                    <Button onClick={() => setCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Creează Regulă
                    </Button>
                  </RequirePermission>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{rule.name}</h3>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Activ" : "Inactiv"}
                            </Badge>
                            <Badge variant="outline">{actionLabels[rule.action]}</Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                          )}
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Condiții: </span>
                            {(rule.conditions as any[]).map((c, i) => (
                              <span key={i}>
                                {i > 0 && <span className="mx-1 text-muted-foreground">{rule.conditionLogic}</span>}
                                <code className="bg-muted px-1 rounded">
                                  {metricLabels[c.metric] || c.metric} {operatorLabels[c.operator]} {c.value}
                                </code>
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Declanșări: {rule.triggerCount} • Cooldown: {rule.cooldownHours}h
                            {rule.lastCheckedAt && ` • Ultima verificare: ${formatDate(rule.lastCheckedAt)}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
                          />
                          <RequirePermission permission="ads.alerts">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-status-error" />
                            </Button>
                          </RequirePermission>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-status-success mb-4" />
                  <p className="text-lg font-medium">Nicio alertă</p>
                  <p className="text-muted-foreground">Toate campaniile funcționează conform așteptărilor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className={alert.status === "NEW" ? "border-status-error/30 bg-status-error/10" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={alert.status === "NEW" ? "destructive" : "secondary"}>
                              {alert.status}
                            </Badge>
                            <span className="font-medium">{alert.campaign.name}</span>
                            <Badge variant="outline">{alert.campaign.account.platform}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Regulă: {alert.rule.name} • Acțiune: {alert.actionTaken}
                          </p>
                          <div className="mt-2 text-xs">
                            Metrici: {JSON.stringify(alert.metricSnapshot)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.status === "NEW" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAlertMutation.mutate({ alertId: alert.id, action: "markSeen" })}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Văzut
                            </Button>
                          )}
                          {alert.status !== "RESOLVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAlertMutation.mutate({ alertId: alert.id, action: "resolve" })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Rezolvat
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Rule Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crează Regulă de Alertă</DialogTitle>
              <DialogDescription>
                Definește condițiile și acțiunile pentru monitorizarea campaniilor
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <Label>Nume regulă *</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="ex: Stop campanii cu CPA > 50 RON"
                />
              </div>

              {/* Description */}
              <div>
                <Label>Descriere</Label>
                <Input
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Descriere opțională..."
                />
              </div>

              {/* Scope */}
              <div>
                <Label>Aplicare pe</Label>
                <Select
                  value={newRule.scopeType}
                  onValueChange={(v) => setNewRule({ ...newRule, scopeType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toate campaniile</SelectItem>
                    <SelectItem value="PLATFORM">O platformă specifică</SelectItem>
                    <SelectItem value="SKU">Un SKU specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRule.scopeType === "PLATFORM" && (
                <div>
                  <Label>Platformă</Label>
                  <Select
                    value={newRule.scopePlatform}
                    onValueChange={(v) => setNewRule({ ...newRule, scopePlatform: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="META">Meta</SelectItem>
                      <SelectItem value="TIKTOK">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newRule.scopeType === "SKU" && (
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={newRule.scopeSku}
                    onChange={(e) => setNewRule({ ...newRule, scopeSku: e.target.value })}
                    placeholder="ex: PAT001"
                  />
                </div>
              )}

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Condiții</Label>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adaugă
                  </Button>
                </div>

                {newRule.conditions.length > 1 && (
                  <div className="mb-2">
                    <Select
                      value={newRule.conditionLogic}
                      onValueChange={(v) => setNewRule({ ...newRule, conditionLogic: v })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">ȘI</SelectItem>
                        <SelectItem value="OR">SAU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  {newRule.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Select
                        value={condition.metric}
                        onValueChange={(v) => updateCondition(index, "metric", v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spend">Spend</SelectItem>
                          <SelectItem value="cpa">CPA</SelectItem>
                          <SelectItem value="roas">ROAS</SelectItem>
                          <SelectItem value="ctr">CTR</SelectItem>
                          <SelectItem value="cpm">CPM</SelectItem>
                          <SelectItem value="cpc">CPC</SelectItem>
                          <SelectItem value="frequency">Frequency</SelectItem>
                          <SelectItem value="conversions">Conversii</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(v) => updateCondition(index, "operator", v)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value=">=">&ge;</SelectItem>
                          <SelectItem value="<=">&le;</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, "value", parseFloat(e.target.value))}
                        className="w-24"
                      />

                      <Select
                        value={condition.timeframe || "24h"}
                        onValueChange={(v) => updateCondition(index, "timeframe", v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3h">3 ore</SelectItem>
                          <SelectItem value="6h">6 ore</SelectItem>
                          <SelectItem value="12h">12 ore</SelectItem>
                          <SelectItem value="24h">24 ore</SelectItem>
                          <SelectItem value="48h">48 ore</SelectItem>
                          <SelectItem value="7d">7 zile</SelectItem>
                        </SelectContent>
                      </Select>

                      {newRule.conditions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div>
                <Label>Acțiune când se îndeplinesc condițiile</Label>
                <Select
                  value={newRule.action}
                  onValueChange={(v) => setNewRule({ ...newRule, action: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTIFY">Doar notificare</SelectItem>
                    <SelectItem value="PAUSE">Oprește campania</SelectItem>
                    <SelectItem value="REDUCE_BUDGET">Reduce bugetul</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRule.action === "REDUCE_BUDGET" && (
                <div>
                  <Label>Procent reducere buget</Label>
                  <Input
                    type="number"
                    value={newRule.reducePct}
                    onChange={(e) => setNewRule({ ...newRule, reducePct: parseInt(e.target.value) })}
                    min={1}
                    max={90}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground ml-2">%</span>
                </div>
              )}

              {/* Notifications */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRule.notifyEmail}
                    onCheckedChange={(v) => setNewRule({ ...newRule, notifyEmail: v })}
                  />
                  <Label>Notificare email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRule.notifyInApp}
                    onCheckedChange={(v) => setNewRule({ ...newRule, notifyInApp: v })}
                  />
                  <Label>Notificare în app</Label>
                </div>
              </div>

              {/* Cooldown */}
              <div>
                <Label>Cooldown (nu declanșa din nou pentru aceeași campanie timp de)</Label>
                <Select
                  value={newRule.cooldownHours.toString()}
                  onValueChange={(v) => setNewRule({ ...newRule, cooldownHours: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 ore</SelectItem>
                    <SelectItem value="12">12 ore</SelectItem>
                    <SelectItem value="24">24 ore</SelectItem>
                    <SelectItem value="48">48 ore</SelectItem>
                    <SelectItem value="72">72 ore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => createMutation.mutate(newRule)}
                disabled={!newRule.name || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Creează Regulă
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
