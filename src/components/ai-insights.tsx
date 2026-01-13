"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Play,
  Pause,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Loader2,
  ArrowRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import { cn, formatDate } from "@/lib/utils";

interface AIInsight {
  id: string;
  type: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  currentValue: string;
  suggestedValue: string;
  title: string;
  reasoning: string;
  confidence: number;
  estimatedImpact?: string;
  status: string;
  createdAt: string;
}

interface AIInsightsProps {
  filterType?: string; // Filter displayed results by type (e.g., "AD_BUDGET,AD_STATUS,AD_BID")
  analyzeType?: string; // What to analyze: "ads", "products", or "all"
  targetId?: string; // Filter by specific target
  showAnalyzeButton?: boolean;
  compact?: boolean;
  maxItems?: number;
}

export function AIInsights({
  filterType,
  analyzeType = "all",
  targetId,
  showAnalyzeButton = true,
  compact = false,
  maxItems = 5,
}: AIInsightsProps) {
  const queryClient = useQueryClient();
  const { startLoading, stopLoading } = useGlobalLoading();
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);

  // Fetch insights
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ai-insights", filterType, targetId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", "PENDING");
      if (filterType) params.set("type", filterType);
      params.set("limit", maxItems.toString());
      
      const res = await fetch(`/api/ai/analyze?${params}`);
      return res.json();
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la analiză");
      }
      return res.json();
    },
    onMutate: () => {
      startLoading("Se analizează datele cu AI...", {
        canCancel: false,
      });
    },
    onSuccess: (data) => {
      stopLoading();
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
      toast({
        title: "Analiză completă",
        description: `${data.insightsGenerated} recomandări generate.`,
      });
    },
    onError: (error: Error) => {
      stopLoading();
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply insight mutation
  const applyMutation = useMutation({
    mutationFn: async ({ id, newValue }: { id: string; newValue?: string }) => {
      const res = await fetch(`/api/ai/insights/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", newValue }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la aplicare");
      }
      return res.json();
    },
    onMutate: () => {
      startLoading("Se aplică modificarea...");
    },
    onSuccess: (data) => {
      stopLoading();
      setShowApplyDialog(false);
      setSelectedInsight(null);
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
      
      if (data.requiresManualAction) {
        toast({
          title: "Atenție",
          description: data.error,
          variant: "warning",
        });
      } else {
        toast({
          title: "Succes",
          description: "Modificarea a fost aplicată cu succes!",
        });
      }
    },
    onError: (error: Error) => {
      stopLoading();
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dismiss insight mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/insights/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowDismissDialog(false);
      setSelectedInsight(null);
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
      toast({
        title: "Respins",
        description: "Recomandarea a fost ignorată.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const insights: AIInsight[] = data?.insights || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "AD_BUDGET":
        return <DollarSign className="h-4 w-4" />;
      case "AD_STATUS":
        return <Play className="h-4 w-4" />;
      case "PRODUCT_PRICE":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "AD_BUDGET":
        return "bg-status-info/10 text-status-info border-status-info/20";
      case "AD_STATUS":
        return "bg-primary/10 text-primary border-primary/20";
      case "PRODUCT_PRICE":
        return "bg-status-success/10 text-status-success border-status-success/20";
      default:
        return "bg-status-neutral/10 text-status-neutral border-status-neutral/20";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-status-success";
    if (confidence >= 60) return "text-status-warning";
    return "text-status-error";
  };

  if (isLoading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (compact && insights.length === 0 && !showAnalyzeButton) {
    return null;
  }

  return (
    <>
      <Card className={cn(
        "overflow-hidden",
        compact && "border-primary/20 bg-gradient-to-br from-primary/5 to-status-info/5"
      )}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Insights</CardTitle>
                {!compact && (
                  <CardDescription>
                    Recomandări inteligente bazate pe analiza datelor
                  </CardDescription>
                )}
              </div>
            </div>
            {showAnalyzeButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeMutation.mutate(analyzeType)}
                disabled={analyzeMutation.isPending}
              >
                <Brain className="h-4 w-4 mr-2" />
                Analizează
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={compact ? "pt-2" : ""}>
          {insights.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nu există recomandări noi</p>
              {showAnalyzeButton && (
                <p className="text-xs mt-1">
                  Apasă "Analizează" pentru a genera recomandări
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedInsight(insight);
                    setShowApplyDialog(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        getTypeColor(insight.type)
                      )}>
                        {getTypeIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {insight.title}
                        </h4>
                        {insight.targetName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {insight.targetName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs line-through text-muted-foreground">
                            {insight.currentValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-status-success">
                            {insight.suggestedValue}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        <span className={getConfidenceColor(Number(insight.confidence))}>
                          {Number(insight.confidence).toFixed(0)}%
                        </span>
                      </Badge>
                      {insight.estimatedImpact && (
                        <span className="text-xs text-status-success font-medium">
                          {insight.estimatedImpact}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Aplică recomandarea AI
            </DialogTitle>
            <DialogDescription>
              Verifică modificarea propusă și confirmă aplicarea
            </DialogDescription>
          </DialogHeader>
          
          {selectedInsight && (
            <div className="space-y-4">
              {/* Target Info */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{selectedInsight.title}</p>
                {selectedInsight.targetName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedInsight.targetName}
                  </p>
                )}
              </div>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-status-error/5 border-status-error/20">
                  <p className="text-xs text-muted-foreground mb-1">Valoare curentă</p>
                  <p className="font-mono font-bold text-lg">
                    {selectedInsight.currentValue}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-status-success/5 border-status-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Valoare sugerată</p>
                  <p className="font-mono font-bold text-lg text-status-success">
                    {selectedInsight.suggestedValue}
                  </p>
                </div>
              </div>

              {/* Confidence & Impact */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Încredere:</span>
                  <span className={cn(
                    "font-medium",
                    getConfidenceColor(Number(selectedInsight.confidence))
                  )}>
                    {Number(selectedInsight.confidence).toFixed(0)}%
                  </span>
                </div>
                {selectedInsight.estimatedImpact && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Impact estimat:</span>
                    <span className="font-medium text-status-success">
                      {selectedInsight.estimatedImpact}
                    </span>
                  </div>
                )}
              </div>

              {/* Reasoning */}
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Raționament AI
                </p>
                <p className="text-sm">{selectedInsight.reasoning}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowApplyDialog(false);
                setShowDismissDialog(true);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Respinge
            </Button>
            <Button
              onClick={() => {
                if (selectedInsight) {
                  applyMutation.mutate({ id: selectedInsight.id });
                }
              }}
              disabled={applyMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Aplică modificarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Confirmation */}
      <AlertDialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Respinge recomandarea</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să respingi această recomandare? 
              AI-ul va lua în considerare această decizie pentru recomandările viitoare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDismissDialog(false);
              setShowApplyDialog(true);
            }}>
              Înapoi
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInsight) {
                  dismissMutation.mutate(selectedInsight.id);
                }
              }}
            >
              Da, respinge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Mini version for sidebar or quick access
export function AIInsightsBadge() {
  const { data } = useQuery({
    queryKey: ["ai-insights-count"],
    queryFn: async () => {
      const res = await fetch("/api/ai/analyze?status=PENDING&limit=100");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const count = data?.insights?.length || 0;

  if (count === 0) return null;

  return (
    <Badge 
      variant="secondary" 
      className="bg-purple-500/10 text-primary border-purple-500/20"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      {count}
    </Badge>
  );
}
