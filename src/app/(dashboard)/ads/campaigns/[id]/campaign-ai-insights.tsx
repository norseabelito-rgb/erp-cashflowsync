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
  Loader2,
  ArrowRight,
  AlertCircle,
  Lightbulb,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import { cn } from "@/lib/utils";

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

interface CampaignAIInsightsProps {
  campaignId: string;
  campaignName: string;
}

export function CampaignAIInsights({ campaignId, campaignName }: CampaignAIInsightsProps) {
  const queryClient = useQueryClient();
  const { startLoading, stopLoading } = useGlobalLoading();
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Fetch existing insights for this campaign
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaign-ai-insights", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/campaign/${campaignId}`);
      return res.json();
    },
    enabled: hasAnalyzed,
  });

  // Analyze campaign mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ai/campaign/${campaignId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la analiză");
      }
      return res.json();
    },
    onMutate: () => {
      startLoading(`Se analizează campania "${campaignName}" cu AI...`, {
        canCancel: false,
      });
    },
    onSuccess: (data) => {
      stopLoading();
      setHasAnalyzed(true);
      queryClient.invalidateQueries({ queryKey: ["campaign-ai-insights", campaignId] });
      toast({
        title: "Analiză completă",
        description: `${data.insightsGenerated} recomandări generate pentru această campanie.`,
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
      queryClient.invalidateQueries({ queryKey: ["campaign-ai-insights", campaignId] });
      
      if (data.requiresManualAction) {
        toast({
          title: "Atenție",
          description: data.error,
          variant: "warning",
        });
      } else {
        toast({
          title: "Succes",
          description: "Modificarea a fost aplicată!",
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
      queryClient.invalidateQueries({ queryKey: ["campaign-ai-insights", campaignId] });
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
      case "AD_BID":
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
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "AD_BID":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-emerald-500";
    if (confidence >= 60) return "text-status-warning";
    return "text-status-warning";
  };

  // Initial state - no analysis yet
  if (!hasAnalyzed && insights.length === 0) {
    return (
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analiză AI pentru Campanie</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generează recomandări personalizate pentru această campanie bazate pe 
              performanța actuală, trenduri și best practices.
            </p>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analizează Campania
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Analiza va dura câteva secunde și va folosi API-ul Claude
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with re-analyze button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">AI Insights</h3>
              <p className="text-sm text-muted-foreground">
                {insights.length} recomandări pentru această campanie
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              analyzeMutation.isPending && "animate-spin"
            )} />
            Re-analizează
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* No insights */}
        {!isLoading && insights.length === 0 && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Nu au fost generate recomandări pentru această campanie. 
              Campania pare să performeze bine sau nu are suficiente date pentru analiză.
            </AlertDescription>
          </Alert>
        )}

        {/* Insights list */}
        {!isLoading && insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setSelectedInsight(insight);
                  setShowApplyDialog(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        getTypeColor(insight.type)
                      )}>
                        {getTypeIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{insight.title}</h4>
                        {insight.targetName && (
                          <p className="text-sm text-muted-foreground truncate">
                            {insight.targetName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm line-through text-muted-foreground">
                            {insight.currentValue}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-emerald-500">
                            {insight.suggestedValue}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {insight.reasoning}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">
                        <span className={getConfidenceColor(Number(insight.confidence))}>
                          {Number(insight.confidence).toFixed(0)}% încredere
                        </span>
                      </Badge>
                      {insight.estimatedImpact && (
                        <span className="text-sm font-medium text-emerald-500">
                          {insight.estimatedImpact}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
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
                <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Valoare sugerată</p>
                  <p className="font-mono font-bold text-lg text-emerald-500">
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
                    <span className="font-medium text-emerald-500">
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
