"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FolderTree, RefreshCw, Search, Check, X, ChevronRight,
  AlertCircle, Settings, Link2, Unlink
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Category {
  id: string;
  name: string;
  description?: string;
  trendyolCategoryId?: number;
  trendyolCategoryName?: string;
  trendyolAttributes?: any[];
  _count?: {
    products: number;
  };
}

interface TrendyolCategory {
  id: number;
  name: string;           // Numele tradus în română
  nameOriginal: string;   // Numele original în turcă
  fullPath: string;       // Calea completă tradusă
  fullPathOriginal: string; // Calea completă originală
  parentId?: number;
}

export default function TrendyolMappingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [trendyolSearchTerm, setTrendyolSearchTerm] = useState("");

  // Fetch categorii ERP
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["erp-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  // Fetch categorii Trendyol
  const { data: trendyolCategoriesData, isLoading: trendyolLoading, refetch: refetchTrendyol } = useQuery({
    queryKey: ["trendyol-categories"],
    queryFn: async () => {
      const res = await fetch("/api/trendyol?action=categories");
      return res.json();
    },
  });

  const categories: Category[] = categoriesData?.categories || [];
  const trendyolCategories: TrendyolCategory[] = trendyolCategoriesData?.flatCategories || [];

  // Mutation pentru salvare mapping
  const saveMappingMutation = useMutation({
    mutationFn: async (data: { categoryId: string; trendyolCategoryId: number; trendyolCategoryName: string }) => {
      // Fetch atributele pentru categoria Trendyol
      const attrRes = await fetch(`/api/trendyol?action=attributes&categoryId=${data.trendyolCategoryId}`);
      const attrData = await attrRes.json();
      
      const res = await fetch(`/api/categories/${data.categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendyolCategoryId: data.trendyolCategoryId,
          trendyolCategoryName: data.trendyolCategoryName,
          trendyolAttributes: attrData.attributes || [],
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-categories"] });
      toast({
        title: "✅ Mapping salvat",
        description: "Categoria a fost mapată cu succes la Trendyol.",
      });
      setMappingDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut salva mapping-ul",
        variant: "destructive",
      });
    },
  });

  // Mutation pentru ștergere mapping
  const removeMappingMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendyolCategoryId: null,
          trendyolCategoryName: null,
          trendyolAttributes: [],
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-categories"] });
      toast({
        title: "Mapping șters",
        description: "Categoria nu mai este mapată la Trendyol.",
      });
    },
  });

  // Filtrare categorii ERP
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrare categorii Trendyol - caută în traducere și original
  const filteredTrendyolCategories = trendyolCategories.filter(cat => {
    const searchLower = trendyolSearchTerm.toLowerCase();
    return (
      cat.fullPath?.toLowerCase().includes(searchLower) ||
      cat.name?.toLowerCase().includes(searchLower) ||
      cat.fullPathOriginal?.toLowerCase().includes(searchLower) ||
      cat.nameOriginal?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 50); // Limităm la 50 pentru performanță

  const mappedCount = categories.filter(c => c.trendyolCategoryId).length;
  const unmappedCount = categories.filter(c => !c.trendyolCategoryId).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="h-8 w-8" />
            Mapare Categorii Trendyol
          </h1>
          <p className="text-muted-foreground mt-1">
            Conectează categoriile ERP la categoriile Trendyol pentru a putea publica produse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchTrendyol()} disabled={trendyolLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${trendyolLoading ? 'animate-spin' : ''}`} />
            Reîncarcă Trendyol
          </Button>
          <Link href="/trendyol">
            <Button variant="outline">
              Produse Trendyol
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Categorii</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <FolderTree className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mapate</p>
                <p className="text-2xl font-bold text-status-success">{mappedCount}</p>
              </div>
              <Link2 className="h-8 w-8 text-status-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nemapate</p>
                <p className="text-2xl font-bold text-status-warning">{unmappedCount}</p>
              </div>
              <Unlink className="h-8 w-8 text-status-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Caută categorie ERP..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nu au fost găsite categorii</p>
              <Link href="/categories" className="mt-4">
                <Button variant="outline">Creează Categorii</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categorie ERP</TableHead>
                  <TableHead>Produse</TableHead>
                  <TableHead>Categorie Trendyol</TableHead>
                  <TableHead>Atribute</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {category.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {category._count?.products || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.trendyolCategoryId ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-status-success" />
                          <div className="max-w-xs">
                            <p className="text-sm font-medium truncate" title={category.trendyolCategoryName || ''}>
                              {category.trendyolCategoryName?.split(' > ').pop()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {category.trendyolCategoryId}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <X className="h-4 w-4" />
                          <span className="text-sm">Nemapat</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.trendyolAttributes && Array.isArray(category.trendyolAttributes) ? (
                        <Badge variant="outline">
                          {category.trendyolAttributes.filter((a: any) => a.required).length} obligatorii
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCategory(category);
                            setMappingDialogOpen(true);
                            setTrendyolSearchTerm("");
                          }}
                        >
                          {category.trendyolCategoryId ? "Schimbă" : "Mapează"}
                        </Button>
                        {category.trendyolCategoryId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMappingMutation.mutate(category.id)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Mapează "{selectedCategory?.name}" la Trendyol
            </DialogTitle>
            <DialogDescription>
              Caută și selectează categoria Trendyol corespunzătoare. 
              Categoriile sunt traduse automat din turcă în română.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută în română sau turcă (ex: rochie, elbise, pantaloni)..."
                className="pl-9"
                value={trendyolSearchTerm}
                onChange={(e) => setTrendyolSearchTerm(e.target.value)}
              />
            </div>

            {trendyolLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                {filteredTrendyolCategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {trendyolSearchTerm ? "Nu s-au găsit categorii" : "Introdu un termen de căutare"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTrendyolCategories.map((cat) => (
                      <button
                        key={cat.id}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                        onClick={() => {
                          if (selectedCategory) {
                            saveMappingMutation.mutate({
                              categoryId: selectedCategory.id,
                              trendyolCategoryId: cat.id,
                              trendyolCategoryName: cat.fullPath, // Salvăm traducerea
                            });
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{cat.fullPath}</p>
                            {cat.name !== cat.nameOriginal && (
                              <p className="text-xs text-muted-foreground/60 italic truncate">
                                Original: {cat.nameOriginal}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              ID: {cat.id}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
