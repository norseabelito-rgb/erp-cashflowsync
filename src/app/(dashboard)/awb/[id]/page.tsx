"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Truck,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Package,
  MapPin,
  Phone,
  Mail,
  User,
  Store,
  Calendar,
  MessageSquare,
  Send,
  Image as ImageIcon,
  X,
  ExternalLink,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface AWBComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  images: Array<{
    id: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    size: number;
  }>;
}

interface AWBStatusEvent {
  id: string;
  status: string;
  statusDate: string;
  location: string | null;
  description: string | null;
}

// Funcție pentru a determina badge-ul de status
function getStatusBadge(status: string | null) {
  if (!status) return { variant: "outline" as const, icon: Clock, label: "Necunoscut", color: "bg-gray-100 text-gray-800" };

  const statusLower = status.toLowerCase();

  if (statusLower.includes("livrat") || statusLower.includes("delivered")) {
    return { variant: "default" as const, icon: CheckCircle2, label: status, color: "bg-emerald-100 text-emerald-800" };
  }
  if (statusLower.includes("tranzit") || statusLower.includes("transport") || statusLower.includes("livrare")) {
    return { variant: "default" as const, icon: Truck, label: status, color: "bg-blue-100 text-blue-800" };
  }
  if (statusLower.includes("retur") || statusLower.includes("refuz") || statusLower.includes("returned")) {
    return { variant: "destructive" as const, icon: AlertTriangle, label: status, color: "bg-orange-100 text-orange-800" };
  }
  if (statusLower.includes("anulat") || statusLower.includes("șters")) {
    return { variant: "destructive" as const, icon: XCircle, label: status, color: "bg-red-100 text-red-800" };
  }
  if (statusLower.includes("ridicat") || statusLower.includes("predat")) {
    return { variant: "default" as const, icon: Package, label: status, color: "bg-indigo-100 text-indigo-800" };
  }

  return { variant: "outline" as const, icon: Clock, label: status, color: "bg-gray-100 text-gray-800" };
}

export default function AWBDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const awbId = params.id as string;

  const [commentText, setCommentText] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; filename: string; storagePath: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch AWB details
  const { data: awbData, isLoading: awbLoading, refetch: refetchAWB } = useQuery({
    queryKey: ["awb", awbId],
    queryFn: async () => {
      const res = await fetch(`/api/awb/${awbId}`);
      return res.json();
    },
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = useQuery({
    queryKey: ["awb-comments", awbId],
    queryFn: async () => {
      const res = await fetch(`/api/awb/${awbId}/comments`);
      return res.json();
    },
  });

  const awb = awbData?.awb;
  const comments: AWBComment[] = commentsData?.comments || [];

  // Refresh AWB status mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/awb/${awbId}`, { method: "PATCH" });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Status actualizat", description: `Status: ${result.status}` });
        refetchAWB();
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/awb/${awbId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          imageIds: uploadedImages.map(img => img.id),
        }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setCommentText("");
        setUploadedImages([]);
        refetchComments();
        toast({ title: "Comentariu adăugat" });
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("awbId", awbId);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();

        if (result.success) {
          setUploadedImages(prev => [...prev, result.image]);
        } else {
          toast({ title: "Eroare upload", description: result.error, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Eroare upload", description: "Nu s-a putut încărca fișierul", variant: "destructive" });
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove uploaded image
  const removeUploadedImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Format helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: ro });
  };

  const formatCurrency = (amount: number | null, currency: string = "RON") => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
    }).format(amount);
  };

  if (awbLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!awb) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">AWB negăsit</h2>
          <p className="text-muted-foreground mb-4">AWB-ul solicitat nu există sau a fost șters.</p>
          <Link href="/awb">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi la lista AWB
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(awb.currentStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/awb">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 md:h-6 md:w-6" />
              AWB {awb.awbNumber || "-"}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Comandă #{awb.order?.shopifyOrderNumber}</span>
              <span>•</span>
              <Badge variant="outline">{awb.order?.store?.name || "-"}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshMutation.isPending && "animate-spin")} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={cn("border-2", statusInfo.color.includes("emerald") && "border-emerald-300", statusInfo.color.includes("blue") && "border-blue-300", statusInfo.color.includes("orange") && "border-orange-300", statusInfo.color.includes("red") && "border-red-300")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-full", statusInfo.color)}>
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-semibold">{awb.currentStatus || "Necunoscut"}</div>
                {awb.currentStatusDate && (
                  <div className="text-sm text-muted-foreground">
                    Ultima actualizare: {formatDate(awb.currentStatusDate)}
                  </div>
                )}
              </div>
            </div>
            {awb.cashOnDelivery && Number(awb.cashOnDelivery) > 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Ramburs</div>
                <div className="text-xl font-bold">{formatCurrency(Number(awb.cashOnDelivery))}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informații Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Nume</div>
                  <div className="font-medium">
                    {awb.order?.customerFirstName} {awb.order?.customerLastName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Telefon</div>
                  <div className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {awb.order?.customerPhone || "-"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Adresă livrare</div>
                  <div className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {awb.order?.shippingAddress1}, {awb.order?.shippingCity}, {awb.order?.shippingProvince}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Istoric Statusuri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {awb.statusHistory && awb.statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {awb.statusHistory.map((event: AWBStatusEvent, index: number) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                          )} />
                          {index < awb.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-muted-foreground/30 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="font-medium">{event.status}</div>
                          {event.location && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(event.statusDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nu există istoric de statusuri
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Comments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentarii ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment Form */}
              <RequirePermission permission="awb.edit">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Adaugă un comentariu..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />

                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={`/api/upload${img.storagePath.replace("/uploads", "")}`}
                            alt={img.filename}
                            className="h-16 w-16 object-cover rounded border"
                          />
                          <button
                            onClick={() => removeUploadedImage(img.id)}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addCommentMutation.mutate()}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                      className="flex-1"
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Trimite
                    </Button>
                  </div>
                </div>
              </RequirePermission>

              <Separator />

              {/* Comments List */}
              <ScrollArea className="h-[400px]">
                {commentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nu există comentarii</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={comment.user.image || undefined} />
                            <AvatarFallback>
                              {comment.user.name?.charAt(0) || comment.user.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <span className="text-sm font-medium">
                              {comment.user.name || comment.user.email}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ro })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        {comment.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {comment.images.map((img) => (
                              <a
                                key={img.id}
                                href={`/api/upload${img.storagePath.replace("/uploads", "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={`/api/upload${img.storagePath.replace("/uploads", "")}`}
                                  alt={img.filename}
                                  className="h-20 w-20 object-cover rounded border hover:border-primary transition-colors"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
