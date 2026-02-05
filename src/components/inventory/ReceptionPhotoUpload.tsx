"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ImageIcon,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export interface ReceptionPhoto {
  id: string;
  category: "OVERVIEW" | "ETICHETE" | "DETERIORARI" | "FACTURA";
  filename: string;
  storagePath: string;
  mimeType: string;
}

interface ReceptionPhotoUploadProps {
  receptionReportId: string;
  photos: ReceptionPhoto[];
  onPhotosChange: () => void;
  disabled?: boolean;
}

interface PhotoCategory {
  key: "OVERVIEW" | "ETICHETE" | "DETERIORARI" | "FACTURA";
  label: string;
  required: boolean;
  description: string;
}

const PHOTO_CATEGORIES: PhotoCategory[] = [
  {
    key: "OVERVIEW",
    label: "Overview (General)",
    required: true,
    description: "Poza generala cu marfa receptionata",
  },
  {
    key: "ETICHETE",
    label: "Etichete",
    required: true,
    description: "Poza cu etichetele produselor",
  },
  {
    key: "FACTURA",
    label: "Factura",
    required: true,
    description: "Poza cu factura furnizorului",
  },
  {
    key: "DETERIORARI",
    label: "Deteriorari",
    required: false,
    description: "Poza cu eventuale deteriorari (daca exista)",
  },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ReceptionPhotoUpload({
  receptionReportId,
  photos,
  onPhotosChange,
  disabled = false,
}: ReceptionPhotoUploadProps) {
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Group photos by category
  const photosByCategory = photos.reduce((acc, photo) => {
    acc[photo.category] = photo;
    return acc;
  }, {} as Record<string, ReceptionPhoto>);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch(`/api/reception-reports/${receptionReportId}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Poza incarcata",
        description: `Poza ${getCategoryLabel(variables.category)} a fost incarcata cu succes`,
      });
      onPhotosChange();
      setUploadingCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la incarcare",
        description: error.message,
        variant: "destructive",
      });
      setUploadingCategory(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(
        `/api/reception-reports/${receptionReportId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Poza stearsa",
        description: "Poza a fost stearsa cu succes",
      });
      onPhotosChange();
      setDeletePhotoId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la stergere",
        description: error.message,
        variant: "destructive",
      });
      setDeletePhotoId(null);
    },
  });

  const getCategoryLabel = (key: string): string => {
    return PHOTO_CATEGORIES.find((c) => c.key === key)?.label || key;
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Tip de fisier nepermis. Acceptam: JPEG, PNG, WebP, HEIC";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Fisierul este prea mare. Maxim 10MB.";
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File, category: string) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "Fisier invalid",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setUploadingCategory(category);
    uploadMutation.mutate({ file, category });
  }, [uploadMutation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, category);
    }
    // Reset input
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file, category);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (!disabled) {
      setDragOverCategory(category);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDeleteClick = (photoId: string) => {
    setDeletePhotoId(photoId);
  };

  const confirmDelete = () => {
    if (deletePhotoId) {
      deleteMutation.mutate(deletePhotoId);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHOTO_CATEGORIES.map((category) => {
          const photo = photosByCategory[category.key];
          const isUploading = uploadingCategory === category.key;
          const isDragOver = dragOverCategory === category.key;
          const hasPhoto = !!photo;

          return (
            <div
              key={category.key}
              className={cn(
                "border-2 rounded-lg overflow-hidden transition-all",
                hasPhoto && "border-green-400 bg-green-50/30 dark:bg-green-950/20",
                !hasPhoto && category.required && "border-red-300",
                !hasPhoto && !category.required && "border-muted",
                isDragOver && "border-primary bg-primary/5",
                disabled && "opacity-60"
              )}
              onDrop={(e) => handleDrop(e, category.key)}
              onDragOver={(e) => handleDragOver(e, category.key)}
              onDragLeave={handleDragLeave}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
                <Badge variant={category.required ? "default" : "secondary"} className="text-xs">
                  {category.required ? "Obligatoriu" : "Optional"}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-4">
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Se incarca...</span>
                  </div>
                ) : hasPhoto ? (
                  <div className="space-y-3">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.storagePath}
                        alt={category.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback for missing images
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).classList.add("hidden");
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                      {!disabled && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteClick(photo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* File info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground truncate flex-1">
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="truncate">{photo.filename}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center py-8 cursor-pointer transition-colors",
                      !disabled && "hover:bg-muted/50"
                    )}
                    onClick={() => !disabled && fileInputRefs.current[category.key]?.click()}
                  >
                    <Upload className={cn(
                      "h-8 w-8 mb-2",
                      isDragOver ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="text-sm text-muted-foreground text-center">
                      {disabled ? "Incarcare dezactivata" : "Click sau trage fisier"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WebP, HEIC (max 10MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={(el) => { fileInputRefs.current[category.key] = el; }}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => handleInputChange(e, category.key)}
                disabled={disabled || isUploading}
              />
            </div>
          );
        })}
      </div>

      {/* Missing required photos warning */}
      {PHOTO_CATEGORIES.filter((c) => c.required && !photosByCategory[c.key]).length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Poze obligatorii lipsesc
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {PHOTO_CATEGORIES
                .filter((c) => c.required && !photosByCategory[c.key])
                .map((c) => c.label)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sterge poza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esti sigur ca vrei sa stergi aceasta poza? Actiunea nu poate fi anulata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuleaza</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se sterge...
                </>
              ) : (
                "Sterge"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
