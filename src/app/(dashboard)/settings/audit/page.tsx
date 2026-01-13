"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  Loader2,
  Search,
  Calendar,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface AuditLog {
  id: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  metadata: any;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-status-success",
  update: "bg-status-info",
  delete: "bg-status-error",
  activate: "bg-status-success",
  deactivate: "bg-orange-500",
  accept: "bg-purple-500",
  cancel: "bg-gray-500",
  promote: "bg-status-warning",
  demote: "bg-orange-500",
};

const ENTITY_TYPES = [
  { value: "all", label: "Toate entitățile" },
  { value: "User", label: "Utilizatori" },
  { value: "Role", label: "Roluri" },
  { value: "Group", label: "Grupuri" },
  { value: "Invitation", label: "Invitații" },
  { value: "Order", label: "Comenzi" },
  { value: "Product", label: "Produse" },
  { value: "Invoice", label: "Facturi" },
];

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) {
      return color;
    }
  }
  return "bg-gray-500";
}

function formatAction(action: string): string {
  const parts = action.split(".");
  const actionMap: Record<string, string> = {
    "user.create": "Utilizator creat",
    "user.roles.update": "Roluri actualizate",
    "user.groups.update": "Grupuri actualizate",
    "user.storeAccess.update": "Acces store actualizat",
    "user.activate": "Utilizator activat",
    "user.deactivate": "Utilizator dezactivat",
    "user.promote.superadmin": "Promovat SuperAdmin",
    "user.demote.superadmin": "Retrogradat din SuperAdmin",
    "role.create": "Rol creat",
    "role.update": "Rol actualizat",
    "role.delete": "Rol șters",
    "group.create": "Grup creat",
    "group.update": "Grup actualizat",
    "group.delete": "Grup șters",
    "invitation.create": "Invitație creată",
    "invitation.accept": "Invitație acceptată",
    "invitation.cancel": "Invitație anulată",
  };

  return actionMap[action] || action.replace(/\./g, " → ");
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");
      if (entityType) params.set("entityType", entityType);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/rbac/audit?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea log-urilor");
      return res.json();
    },
  });

  const logs: AuditLog[] = data?.logs || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Istoric al tuturor modificărilor din sistem
          </p>
        </div>
        <Badge variant="secondary" className="text-base">
          {pagination.total} înregistrări
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută după acțiune..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={entityType || "all"}
              onValueChange={(v) => {
                setEntityType(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tip entitate" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/50">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <Avatar className="h-10 w-10">
                    {log.user ? (
                      <>
                        <AvatarImage src={log.user.image || undefined} />
                        <AvatarFallback>
                          {log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback>SYS</AvatarFallback>
                    )}
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {log.user?.name || log.user?.email || "Sistem"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`${getActionColor(log.action)} text-white`}
                      >
                        {formatAction(log.action)}
                      </Badge>
                      <Badge variant="outline">{log.entityType}</Badge>
                    </div>

                    {/* Details */}
                    <div className="mt-1 text-sm text-muted-foreground">
                      {log.newValue && typeof log.newValue === "object" && (
                        <div className="mt-1">
                          {log.newValue.name && (
                            <span>Nume: {log.newValue.name}</span>
                          )}
                          {log.newValue.email && (
                            <span>Email: {log.newValue.email}</span>
                          )}
                          {log.newValue.roleIds && (
                            <span>
                              Roluri: {log.newValue.roleIds.length} asignate
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.createdAt), "d MMMM yyyy, HH:mm:ss", {
                        locale: ro,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="p-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nu există înregistrări</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Următor
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
