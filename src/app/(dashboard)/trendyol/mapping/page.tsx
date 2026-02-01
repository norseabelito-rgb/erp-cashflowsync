"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FolderTree, RefreshCw, Search, Check, X, ChevronRight, ChevronDown,
  AlertCircle, Settings, Link2, Unlink, Package, Save, Loader2
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  name: string;
  nameOriginal: string;
  fullPath: string;
  fullPathOriginal: string;
  parentId?: number;
}

interface TrendyolAttribute {
  id: number;
  name: string;
  required: boolean;
  allowCustom: boolean;
  varianter?: boolean;
  attributeValues: Array<{
    id: number;
    name: string;
  }>;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  trendyolCategoryId?: number;
  trendyolAttributeValues?: Record<string, { attributeValueId?: number; customValue?: string }>;
  category?: {
    id: string;
    name: string;
    trendyolCategoryId?: number;
    trendyolCategoryName?: string;
  };
}

// Component for attribute selection
function AttributeSelector({
  attribute,
  value,
  onChange,
}: {
  attribute: TrendyolAttribute;
  value: { attributeValueId?: number; customValue?: string } | undefined;
  onChange: (val: { attributeValueId?: number; customValue?: string }) => void;
}) {
  const [useCustom, setUseCustom] = useState(!!value?.customValue && !value?.attributeValueId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {attribute.name}
          {attribute.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {attribute.allowCustom && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              setUseCustom(!useCustom);
              onChange({}); // Reset value when switching
            }}
          >
            {useCustom ? "Alege din lista" : "Valoare custom"}
          </Button>
        )}
      </div>

      {useCustom ? (
        <Input
          placeholder={`Introdu valoare pentru ${attribute.name}...`}
          value={value?.customValue || ""}
          onChange={(e) => onChange({ customValue: e.target.value })}
          className="h-9"
        />
      ) : (
        <Select
          value={value?.attributeValueId?.toString() || ""}
          onValueChange={(val) => onChange({ attributeValueId: parseInt(val) })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Selecteaza ${attribute.name}...`} />
          </SelectTrigger>
          <SelectContent>
            {attribute.attributeValues.map((av) => (
              <SelectItem key={av.id} value={av.id.toString()}>
                {av.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// Component for product attribute mapping
function ProductAttributeMapping({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [attributeValues, setAttributeValues] = useState<Record<string, { attributeValueId?: number; customValue?: string }>>(
    product.trendyolAttributeValues || {}
  );

  // Fetch attributes for this product's category
  const { data: attrData, isLoading } = useQuery({
    queryKey: ["product-attributes", product.id],
    queryFn: async () => {
      const res = await fetch(`/api/trendyol/attributes?productId=${product.id}`);
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trendyol/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          attributeValues,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products-need-attributes"] });
        toast({
          title: "Atribute salvate",
          description: data.allRequiredFilled
            ? "Toate atributele obligatorii sunt completate."
            : `Atribute salvate. Lipsesc: ${data.missingRequired?.join(", ")}`,
        });
        onClose();
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-au putut salva atributele",
          variant: "destructive",
        });
      }
    },
  });

  const attributes: TrendyolAttribute[] = attrData?.attributes || [];
  const requiredAttributes = attributes.filter((a) => a.required);
  const optionalAttributes = attributes.filter((a) => !a.required);

  const filledRequired = requiredAttributes.filter((attr) => {
    const val = attributeValues[attr.id.toString()];
    return val?.attributeValueId || val?.customValue;
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!attrData?.categoryId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Produsul nu are o categorie Trendyol mapata.</p>
        <p className="text-sm">Mapeaza mai intai categoria produsului.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {filledRequired === requiredAttributes.length ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-500" />
        )}
        <span className="text-sm">
          {filledRequired} / {requiredAttributes.length} atribute obligatorii completate
        </span>
      </div>

      {/* Required attributes */}
      {requiredAttributes.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Atribute Obligatorii
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredAttributes.map((attr) => (
              <AttributeSelector
                key={attr.id}
                attribute={attr}
                value={attributeValues[attr.id.toString()]}
                onChange={(val) => setAttributeValues({
                  ...attributeValues,
                  [attr.id.toString()]: val,
                })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional attributes (collapsible) */}
      {optionalAttributes.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                Atribute Optionale ({optionalAttributes.length})
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optionalAttributes.map((attr) => (
                <AttributeSelector
                  key={attr.id}
                  attribute={attr}
                  value={attributeValues[attr.id.toString()]}
                  onChange={(val) => setAttributeValues({
                    ...attributeValues,
                    [attr.id.toString()]: val,
                  })}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Save button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Anuleaza
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salveaza Atribute
        </Button>
      </div>
    </div>
  );
}

export default function TrendyolMappingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [trendyolSearchTerm, setTrendyolSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");

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

  // Fetch products that need attribute configuration
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-need-attributes", productSearchTerm],
    queryFn: async () => {
      // Fetch products that have a Trendyol category but may need attributes
      const params = new URLSearchParams();
      params.set("hasTrendyolCategory", "true");
      params.set("limit", "50");
      if (productSearchTerm) {
        params.set("search", productSearchTerm);
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      return res.json();
    },
  });

  const categories: Category[] = categoriesData?.categories || [];
  const trendyolCategories: TrendyolCategory[] = trendyolCategoriesData?.flatCategories || [];
  const products: Product[] = productsData?.products || [];

  // Filter products to those with mapped categories
  const productsWithCategory = products.filter(
    (p) => p.trendyolCategoryId || p.category?.trendyolCategoryId
  );

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
        title: "Mapping salvat",
        description: "Categoria a fost mapata cu succes la Trendyol.",
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
        title: "Mapping sters",
        description: "Categoria nu mai este mapata la Trendyol.",
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
  }).slice(0, 50);

  const mappedCount = categories.filter(c => c.trendyolCategoryId).length;
  const unmappedCount = categories.filter(c => !c.trendyolCategoryId).length;

  // Count products needing attributes
  const productsNeedingAttrs = productsWithCategory.filter((p) => {
    const attrs = p.trendyolAttributeValues || {};
    return Object.keys(attrs).length === 0;
  }).length;

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
            Conecteaza categoriile ERP la categoriile Trendyol pentru a putea publica produse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchTrendyol()} disabled={trendyolLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${trendyolLoading ? 'animate-spin' : ''}`} />
            Reincarca Trendyol
          </Button>
          <Link href="/trendyol">
            <Button variant="outline">
              Produse Trendyol
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produse fara atribute</p>
                <p className="text-2xl font-bold text-amber-500">{productsNeedingAttrs}</p>
              </div>
              <Package className="h-8 w-8 text-amber-500" />
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
              placeholder="Cauta categorie ERP..."
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
              <p className="text-muted-foreground">Nu au fost gasite categorii</p>
              <Link href="/categories" className="mt-4">
                <Button variant="outline">Creeaza Categorii</Button>
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
                  <TableHead className="text-right">Actiuni</TableHead>
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
                          {category.trendyolCategoryId ? "Schimba" : "Mapeaza"}
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

      {/* Product Attribute Mapping Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Atribute Produse
          </CardTitle>
          <CardDescription>
            Configureaza atributele obligatorii pentru produsele cu categorii Trendyol mapate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Product Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cauta produs dupa SKU sau titlu..."
                className="pl-9"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
              />
            </div>

            {/* Products Table */}
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : productsWithCategory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nu exista produse cu categorii Trendyol mapate.</p>
                <p className="text-sm">Mapeaza mai intai categoriile de mai sus.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produs</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categorie Trendyol</TableHead>
                    <TableHead>Status Atribute</TableHead>
                    <TableHead className="text-right">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsWithCategory.slice(0, 20).map((product) => {
                    const hasAttrs = product.trendyolAttributeValues &&
                      Object.keys(product.trendyolAttributeValues).length > 0;
                    const categoryName = product.category?.trendyolCategoryName || "Din produs";

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-xs" title={product.title}>
                            {product.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {product.sku}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                            {categoryName.split(' > ').pop()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {hasAttrs ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              <Check className="h-3 w-3 mr-1" />
                              Configurat
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Necesita configurare
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setAttributeDialogOpen(true);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            {hasAttrs ? "Editeaza" : "Configureaza"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {productsWithCategory.length > 20 && (
              <p className="text-sm text-muted-foreground text-center">
                Se afiseaza primele 20 de produse. Foloseste cautarea pentru a gasi produse specifice.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Mapeaza "{selectedCategory?.name}" la Trendyol
            </DialogTitle>
            <DialogDescription>
              Cauta si selecteaza categoria Trendyol corespunzatoare.
              Categoriile sunt traduse automat din turca in romana.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cauta in romana sau turca (ex: rochie, elbise, pantaloni)..."
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
                    {trendyolSearchTerm ? "Nu s-au gasit categorii" : "Introdu un termen de cautare"}
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
                              trendyolCategoryName: cat.fullPath,
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
              Anuleaza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Attribute Dialog */}
      <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configureaza Atribute Trendyol
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.title} ({selectedProduct?.sku})
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <ProductAttributeMapping
              product={selectedProduct}
              onClose={() => {
                setAttributeDialogOpen(false);
                setSelectedProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
