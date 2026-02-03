"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Save, Trash2, RefreshCw, CheckCircle } from "lucide-react";

interface UnknownStatus {
  id: string;
  statusCode: string;
  statusName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
  sampleAwbNumber: string | null;
  mappedCategory: string | null;
  mappedName: string | null;
  notes: string | null;
}

// FanCourier status categories for mapping
const CATEGORIES = [
  { value: "pickup", label: "Ridicare" },
  { value: "transit", label: "Tranzit" },
  { value: "delivery", label: "Livrare" },
  { value: "notice", label: "Avizare" },
  { value: "problem", label: "Problema" },
  { value: "return", label: "Retur" },
  { value: "cancel", label: "Anulat" },
  { value: "other", label: "Altele" },
];

export default function AWBStatusesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UnknownStatus>>({});

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["unknown-awb-statuses"],
    queryFn: async () => {
      const res = await fetch("/api/settings/unknown-awb-statuses");
      if (!res.ok) throw new Error("Failed to fetch unknown statuses");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      mappedCategory?: string | null;
      mappedName?: string | null;
      notes?: string | null;
    }) => {
      const res = await fetch("/api/settings/unknown-awb-statuses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unknown-awb-statuses"] });
      setEditingId(null);
      setEditData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/unknown-awb-statuses?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unknown-awb-statuses"] });
    },
  });

  const unknownStatuses: UnknownStatus[] = data?.unknownStatuses || [];

  const startEditing = (status: UnknownStatus) => {
    setEditingId(status.id);
    setEditData({
      mappedCategory: status.mappedCategory || "",
      mappedName: status.mappedName || "",
      notes: status.notes || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        mappedCategory: editData.mappedCategory || null,
        mappedName: editData.mappedName || null,
        notes: editData.notes || null,
      });
    }
  };

  const handleDelete = (id: string, statusCode: string) => {
    if (window.confirm(`Sigur doriti sa stergeti statusul ${statusCode}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-4" />
          <div className="h-4 w-96 bg-muted rounded mb-6" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Statusuri AWB Necunoscute</h1>
          <p className="text-muted-foreground mt-1">
            Statusuri FanCourier care nu sunt inca mapate in sistem
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Actualizeaza
        </Button>
      </div>

      {unknownStatuses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">Toate statusurile sunt mapate</h3>
            <p className="text-muted-foreground">
              Nu exista statusuri necunoscute. Toate statusurile FanCourier primite sunt in baza de date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Statusuri Necunoscute ({unknownStatuses.length})
            </CardTitle>
            <CardDescription>
              Aceste coduri de status au fost primite de la FanCourier dar nu sunt in baza de date.
              Puteti adauga mapari manuale pentru a le categoriza corect in dashboard si tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Cod</TableHead>
                    <TableHead className="w-[150px]">Nume FanCourier</TableHead>
                    <TableHead className="w-[100px]">Vazut</TableHead>
                    <TableHead className="w-[120px]">Exemplu AWB</TableHead>
                    <TableHead className="w-[120px]">Categorie</TableHead>
                    <TableHead className="w-[150px]">Nume mapat</TableHead>
                    <TableHead className="w-[200px]">Note</TableHead>
                    <TableHead className="text-right w-[150px]">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unknownStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {status.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {status.statusName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{status.seenCount}x</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(new Date(status.lastSeenAt))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {status.sampleAwbNumber || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {editingId === status.id ? (
                          <Select
                            value={editData.mappedCategory || ""}
                            onValueChange={(v) => setEditData({ ...editData, mappedCategory: v })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Selecteaza" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : status.mappedCategory ? (
                          <Badge variant="secondary">
                            {CATEGORIES.find(c => c.value === status.mappedCategory)?.label || status.mappedCategory}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === status.id ? (
                          <Input
                            value={editData.mappedName || ""}
                            onChange={(e) => setEditData({ ...editData, mappedName: e.target.value })}
                            placeholder="Nume in romana"
                            className="w-36"
                          />
                        ) : status.mappedName ? (
                          <span className="text-sm">{status.mappedName}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === status.id ? (
                          <Textarea
                            value={editData.notes || ""}
                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                            placeholder="Note..."
                            className="min-h-[60px] w-44 text-sm"
                          />
                        ) : status.notes ? (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {status.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === status.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={updateMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={updateMutation.isPending}
                            >
                              Anuleaza
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(status)}
                            >
                              Editeaza
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(status.id, status.statusCode)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Cum functioneaza</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Cand sistemul primeste un cod de status FanCourier necunoscut, il inregistreaza automat aici.
          </p>
          <p>
            Puteti mapa manual aceste statusuri catre o categorie pentru a le include in statisticile
            din dashboard si in filtrele din pagina de tracking.
          </p>
          <p>
            Dupa ce adaugati un nou status in codul sursa (fancourier-statuses.ts), puteti sterge
            intrarea din aceasta lista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
