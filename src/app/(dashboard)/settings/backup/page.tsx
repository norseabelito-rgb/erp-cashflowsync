"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Database,
  Download,
  Upload,
  Clock,
  FileJson,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ExternalLink,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface BackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  webViewLink?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackupListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);

  // Fetch backups
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await fetch("/api/backup");
      return res.json();
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: data.message || "Backup creat cu succes" });
        queryClient.invalidateQueries({ queryKey: ["backups"] });
      } else {
        toast({ title: "Eroare", description: data.error || "Eroare la creare backup", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Eroare", description: "Eroare la creare backup", variant: "destructive" });
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: data.message || "Restore efectuat cu succes" });
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
      } else {
        toast({ title: "Eroare", description: data.error || "Eroare la restore", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Eroare", description: "Eroare la restore", variant: "destructive" });
    },
  });

  const backups: BackupFile[] = data?.data || [];
  const lastBackup = data?.lastBackup;

  const handleRestoreClick = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedBackup) {
      restoreMutation.mutate(selectedBackup.id);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Backup-uri
            </h1>
            <p className="text-muted-foreground">
              Gestionare backup-uri bază de date
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Creează backup
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HardDrive className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total backup-uri</p>
                <p className="text-xl font-bold">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ultimul backup</p>
                <p className="text-lg font-bold">
                  {lastBackup
                    ? formatDate(lastBackup)
                    : "Niciodată"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileJson className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dimensiune totală</p>
                <p className="text-xl font-bold">
                  {formatFileSize(backups.reduce((sum, b) => sum + (b.size || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="py-3">
          <p className="text-sm text-orange-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <strong>Atenție:</strong> Restaurarea unui backup va suprascrie datele existente.
            Asigură-te că ai creat un backup înainte de a restaura.
          </p>
        </CardContent>
      </Card>

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista backup-uri</CardTitle>
          <CardDescription>
            Backup-uri stocate în Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                Nu există backup-uri. Creează primul backup pentru a proteja datele.
              </p>
              <Button onClick={() => createBackupMutation.mutate()}>
                <Download className="h-4 w-4 mr-2" />
                Creează primul backup
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nume fișier</TableHead>
                  <TableHead>Data creare</TableHead>
                  <TableHead className="text-right">Dimensiune</TableHead>
                  <TableHead className="w-[180px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup, index) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{backup.name}</span>
                        {index === 0 && (
                          <Badge variant="success" className="ml-2">
                            Cel mai recent
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(backup.createdTime)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatFileSize(backup.size)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {backup.webViewLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={backup.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreClick(backup)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Restaurează
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirmare restaurare
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ești sigur că vrei să restaurezi din backup-ul{" "}
                <strong className="font-mono">{selectedBackup?.name}</strong>?
              </p>
              <p className="text-orange-600">
                Această acțiune va suprascrie toate datele existente și nu poate fi anulată!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Se restaurează...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Da, restaurează
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
