"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Search,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ArrowRight,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

interface RecipeComponent {
  id: string;
  quantity: number;
  unit?: string;
  componentItem: {
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    unit: string;
    costPrice?: number;
  };
}

interface CompositeItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  isComposite: boolean;
  recipeComponents: RecipeComponent[];
  recipeCost: number | null;
  canProduce: number | null;
  hasRecipe: boolean;
  _count?: {
    mappedProducts: number;
  };
}

export default function RecipesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filterRecipe, setFilterRecipe] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-recipes", search, filterRecipe],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterRecipe !== "all") params.set("hasRecipe", filterRecipe);

      const res = await fetch(`/api/inventory-items/recipes?${params}`);
      return res.json();
    },
  });

  const items: CompositeItem[] = data?.data?.items || [];
  const stats = data?.data?.stats || {
    totalComposite: 0,
    withRecipes: 0,
    withoutRecipes: 0,
  };

  const handleRowClick = (item: CompositeItem) => {
    router.push(`/inventory/recipes/${item.id}`);
  };

  const getRecipeStatus = (item: CompositeItem) => {
    if (!item.hasRecipe) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Fără rețetă
        </Badge>
      );
    }

    if (item.canProduce === 0) {
      return (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Stoc insuficient
        </Badge>
      );
    }

    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Definită
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="h-8 w-8" />
            Rețetar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestionează rețetele pentru produsele compuse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button variant="outline" onClick={() => router.push("/inventory")}>
            <Package className="h-4 w-4 mr-2" />
            Inventar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total produse compuse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.totalComposite}
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardHeader className="pb-2">
            <CardDescription>Cu rețetă definită</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-green-600">
              {stats.withRecipes}
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.withoutRecipes > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Fără rețetă</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${stats.withoutRecipes > 0 ? "text-red-600" : ""}`}>
              {stats.withoutRecipes}
              {stats.withoutRecipes > 0 && <AlertTriangle className="h-5 w-5" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după SKU sau nume..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRecipe} onValueChange={setFilterRecipe}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status rețetă" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="true">Cu rețetă</SelectItem>
            <SelectItem value="false">Fără rețetă</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>SKU</TableHead>
              <TableHead>Nume produs</TableHead>
              <TableHead>Status rețetă</TableHead>
              <TableHead className="text-center">Componente</TableHead>
              <TableHead className="text-right">Cost rețetă</TableHead>
              <TableHead className="text-center">Producție posibilă</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search
                      ? "Niciun produs compus găsit"
                      : "Nu există produse compuse în inventar"}
                  </p>
                  {!search && (
                    <Button variant="outline" onClick={() => router.push("/inventory/new")}>
                      Creează un articol compus
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 ${!item.hasRecipe ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getRecipeStatus(item)}</TableCell>
                  <TableCell className="text-center">
                    {item.hasRecipe ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-help">
                              {item.recipeComponents.length} ingrediente
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <ul className="text-xs space-y-1">
                              {item.recipeComponents.map((comp) => (
                                <li key={comp.id}>
                                  {comp.quantity} {comp.unit || comp.componentItem.unit} - {comp.componentItem.name}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.recipeCost !== null ? (
                      formatCurrency(item.recipeCost)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.canProduce !== null ? (
                      <Badge
                        variant={item.canProduce === 0 ? "destructive" : "secondary"}
                      >
                        {item.canProduce} {item.unit}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/inventory/recipes/${item.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {item.hasRecipe ? "Editează" : "Definește"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {items.length} produse compuse afișate
        </div>
      )}
    </div>
  );
}
