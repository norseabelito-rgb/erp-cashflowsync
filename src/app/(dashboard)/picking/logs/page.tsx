"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Package,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Play,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import { ro } from "date-fns/locale";

const ACTION_CONFIG = {
  ITEM_PICKED: { label: "Produs ridicat", icon: Package, color: "text-green-600", bgColor: "bg-green-50" },
  ITEM_UNDO: { label: "Undo produs", icon: RotateCcw, color: "text-orange-600", bgColor: "bg-orange-50" },
  SURPLUS_ATTEMPT: { label: "Încercare surplus", icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
  LIST_STARTED: { label: "Listă preluată", icon: Play, color: "text-blue-600", bgColor: "bg-blue-50" },
  LIST_COMPLETED: { label: "Listă finalizată", icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  LIST_SAVED: { label: "Progres salvat", icon: Save, color: "text-gray-600", bgColor: "bg-gray-50" },
  QUANTITY_CHANGED: { label: "Cantitate modificată", icon: Package, color: "text-purple-600", bgColor: "bg-purple-50" },
};

interface PickingLog {
  id: string;
  pickingListId: string;
  pickingList: {
    code: string;
    name: string | null;
  };
  action: keyof typeof ACTION_CONFIG;
  userId: string | null;
  userName: string | null;
  itemId: string | null;
  itemSku: string | null;
  itemTitle: string | null;
  quantityBefore: number | null;
  quantityAfter: number | null;
  quantityAttempted: number | null;
  message: string | null;
  createdAt: string;
}

export default function PickingLogsPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["picking-logs", actionFilter, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/picking/logs?${params}`);
      return res.json();
    },
  });

  const logs: PickingLog[] = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Log-uri Picking
          </h1>
          <p className="text-muted-foreground">
            Istoricul activității pe listele de picking
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Caută după SKU, produs, utilizator..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tip acțiune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate acțiunile</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total log-uri</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Încercări surplus</p>
                <p className="text-2xl font-bold text-red-800">
                  {logs.filter(l => l.action === "SURPLUS_ATTEMPT").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Produse ridicate</p>
                <p className="text-2xl font-bold text-green-800">
                  {logs.filter(l => l.action === "ITEM_PICKED").length}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Undo-uri</p>
                <p className="text-2xl font-bold text-orange-800">
                  {logs.filter(l => l.action === "ITEM_UNDO").length}
                </p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nu există log-uri</h3>
            <p className="text-muted-foreground">
              Nu s-au găsit înregistrări pentru filtrele selectate
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.ITEM_PICKED;
            const Icon = config.icon;
            
            return (
              <Card key={log.id} className={config.bgColor}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full bg-white ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          {log.pickingList.code}
                        </Badge>
                        <span className={`font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      
                      {log.message && (
                        <p className="text-sm text-gray-700 mb-2">{log.message}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {log.userName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.userName}
                          </span>
                        )}
                        {log.itemSku && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {log.itemSku}
                          </span>
                        )}
                        {(log.quantityBefore !== null || log.quantityAfter !== null) && (
                          <span>
                            Cantitate: {log.quantityBefore ?? "?"} → {log.quantityAfter ?? "?"}
                          </span>
                        )}
                        {log.quantityAttempted !== null && (
                          <span className="text-red-600">
                            Încercat: {log.quantityAttempted}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { locale: ro, addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "dd MMM HH:mm", { locale: ro })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} din {Math.ceil(total / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  );
}
