"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Bell,
  Loader2,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  Shield,
  Users,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  new_user: UserPlus,
  invitation_accepted: CheckCheck,
  role_changed: Shield,
  group_changed: Users,
  default: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  new_user: "text-green-500",
  invitation_accepted: "text-blue-500",
  role_changed: "text-purple-500",
  group_changed: "text-orange-500",
  default: "text-muted-foreground",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=50");
      if (!res.ok) throw new Error("Eroare la încărcarea notificărilor");
      return res.json();
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (params: { notificationId?: string; markAllRead?: boolean }) => {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (params: { id?: string; deleteAll?: boolean }) => {
      const url = params.deleteAll
        ? "/api/notifications?deleteAll=true"
        : `/api/notifications?id=${params.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      toast({ title: "Notificare ștearsă" });
    },
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

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
          <h1 className="text-2xl font-bold">Notificări</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Ai ${unreadCount} notificări necitite`
              : "Toate notificările sunt citite"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markReadMutation.mutate({ markAllRead: true })}
              disabled={markReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marchează toate ca citite
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Șterge toate
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nu ai notificări</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || TYPE_ICONS.default;
                const iconColor = TYPE_COLORS[notification.type] || TYPE_COLORS.default;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`mt-1 ${iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            Nou
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.createdAt), "d MMMM yyyy, HH:mm", {
                          locale: ro,
                        })}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            markReadMutation.mutate({ notificationId: notification.id })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate({ id: notification.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi toate notificările?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi toate notificările?
              Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteMutation.mutate({ deleteAll: true });
                setDeleteAllDialogOpen(false);
              }}
            >
              Șterge toate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
