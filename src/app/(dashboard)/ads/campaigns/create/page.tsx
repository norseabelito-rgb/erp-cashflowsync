"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  Loader2,
  DollarSign,
  Target,
  Package,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

// Platform icons
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export default function CreateCampaignPage() {
  const router = useRouter();

  // Form state
  const [accountId, setAccountId] = useState("");
  const [customName, setCustomName] = useState("");
  const [objective, setObjective] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [startActive, setStartActive] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<{ sku: string; title: string }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productPopover, setProductPopover] = useState(false);

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-create-data"],
    queryFn: async () => {
      const res = await fetch("/api/ads/campaigns/create");
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json();
    },
  });

  const accounts = data?.accounts || [];
  const products = data?.products || [];
  const objectives = data?.objectives || {};

  const selectedAccount = accounts.find((a: any) => a.id === accountId);
  const platformObjectives = selectedAccount ? objectives[selectedAccount.platform] || [] : [];

  // Generate campaign name
  const generatedName = selectedProducts.length > 0
    ? (() => {
        const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
        const year = new Date().getFullYear();
        const skuPart = selectedProducts.slice(0, 3).map(p => p.sku).join("_");
        return `CONV_SKU_${skuPart}_BROAD_${year}${quarter}`;
      })()
    : "";

  const campaignName = customName || generatedName;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ads/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          name: campaignName,
          objective,
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
          status: startActive ? "ACTIVE" : "PAUSED",
          productSkus: selectedProducts.map(p => p.sku),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "✓ Campanie creată",
        description: result.message,
      });
      router.push(`/ads/campaigns/${result.campaign.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addProduct = (product: any) => {
    if (!selectedProducts.find(p => p.sku === product.sku)) {
      setSelectedProducts([...selectedProducts, { sku: product.sku, title: product.title }]);
    }
    setProductPopover(false);
    setProductSearch("");
  };

  const removeProduct = (sku: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.sku !== sku));
  };

  const filteredProducts = products.filter((p: any) =>
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.title?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20);

  const isValid = accountId && objective && campaignName;

  return (
    <RequirePermission permission="ads.manage">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6" />
              Campanie Nouă
            </h1>
            <p className="text-muted-foreground">
              Creează o campanie pe Meta Ads sau TikTok Ads
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Niciun cont activ</AlertTitle>
            <AlertDescription>
              Trebuie să conectezi un cont de advertising înainte de a crea campanii.
              <Link href="/ads/accounts" className="ml-2 text-primary hover:underline">
                Conectează un cont →
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Account Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Selectează Contul</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {accounts.map((account: any) => (
                    <div
                      key={account.id}
                      onClick={() => {
                        setAccountId(account.id);
                        setObjective("");
                      }}
                      className={cn(
                        "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                        accountId === account.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        account.platform === "META" ? "bg-status-info/10" : "bg-gray-100"
                      )}>
                        {account.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">{account.platform}</p>
                      </div>
                      {accountId === account.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Objective */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Obiectiv Campanie</CardTitle>
              </CardHeader>
              <CardContent>
                {!accountId ? (
                  <p className="text-muted-foreground">Selectează mai întâi un cont</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {platformObjectives.map((obj: any) => (
                      <div
                        key={obj.value}
                        onClick={() => setObjective(obj.value)}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors",
                          objective === obj.value
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{obj.label}</span>
                          </div>
                          {objective === obj.value && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products & Name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Produse și Denumire</CardTitle>
                <CardDescription>
                  Asociază produse pentru a genera automat un nume conform convenției
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Selection */}
                <div>
                  <Label>Produse Promovate (opțional)</Label>
                  <div className="mt-2 space-y-2">
                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedProducts.map((product) => (
                          <Badge key={product.sku} variant="secondary" className="py-1 px-2">
                            {product.sku}
                            <button
                              onClick={() => removeProduct(product.sku)}
                              className="ml-2 hover:text-status-error"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Popover open={productPopover} onOpenChange={setProductPopover}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Package className="h-4 w-4 mr-2" />
                          {selectedProducts.length > 0
                            ? `${selectedProducts.length} produse selectate`
                            : "Adaugă produse..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Caută SKU sau nume..."
                            value={productSearch}
                            onValueChange={setProductSearch}
                          />
                          <CommandList>
                            <CommandEmpty>Niciun produs găsit</CommandEmpty>
                            <CommandGroup>
                              {filteredProducts.map((product: any) => (
                                <CommandItem
                                  key={product.id}
                                  onSelect={() => addProduct(product)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt=""
                                        className="h-8 w-8 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium">{product.sku}</p>
                                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                        {product.title}
                                      </p>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Generated Name */}
                {generatedName && (
                  <Alert className="bg-status-success/10 border-status-success/30">
                    <Sparkles className="h-4 w-4 text-status-success" />
                    <AlertTitle className="text-status-success">Nume generat automat</AlertTitle>
                    <AlertDescription className="text-status-success/80 font-mono text-sm">
                      {generatedName}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom Name */}
                <div>
                  <Label>Nume Personalizat (opțional)</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={generatedName || "Numele campaniei"}
                    className="mt-2"
                  />
                  {!generatedName && !customName && (
                    <p className="text-xs text-status-error mt-1">
                      Selectează produse sau introdu un nume personalizat
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Budget & Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. Buget și Setări</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Buget Zilnic (RON)</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="Ex: 50"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pornește Imediat</Label>
                    <p className="text-sm text-muted-foreground">
                      Campania va fi creată ca ACTIVE în loc de PAUSED
                    </p>
                  </div>
                  <Switch
                    checked={startActive}
                    onCheckedChange={setStartActive}
                  />
                </div>

                {startActive && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenție</AlertTitle>
                    <AlertDescription>
                      Campania va începe să cheltuiască imediat după creare!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!isValid || createMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Megaphone className="h-4 w-4 mr-2" />
                  )}
                  Creează Campanie
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
