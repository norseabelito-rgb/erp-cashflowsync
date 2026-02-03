"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Minus, X, Loader2, Info, Truck, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, cn } from "@/lib/utils";

// Types
export interface ManualOrderData {
  storeId: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress1: string;
  shippingAddress2?: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  lineItems: Array<{
    productId: string;
    sku: string;
    title: string;
    quantity: number;
    price: number;
  }>;
  note?: string;
}

export interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Array<{ id: string; name: string }>;
  onCreateOrder: (data: ManualOrderData) => void;
  isCreating: boolean;
}

interface ProductSearchResult {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
}

interface ValidationErrors {
  storeId?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress1?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingZip?: string;
  lineItems?: string;
}

// Custom debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ManualOrderDialog({
  open,
  onOpenChange,
  stores,
  onCreateOrder,
  isCreating,
}: ManualOrderDialogProps) {
  // Form state
  const [storeId, setStoreId] = useState("");
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress1, setShippingAddress1] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingProvince, setShippingProvince] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [note, setNote] = useState("");
  const [lineItems, setLineItems] = useState<ManualOrderData["lineItems"]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  const debouncedSearch = useDebouncedValue(productSearchQuery, 300);

  // Product search query
  const { data: productSearchData, isLoading: isSearchingProducts } = useQuery({
    queryKey: ["product-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { products: [] };
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}&limit=10`);
      const json = await res.json();
      return json;
    },
    enabled: debouncedSearch.length >= 2,
  });

  const searchResults: ProductSearchResult[] = (productSearchData?.products || []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    title: p.title,
    price: Number(p.price),
    stock: p.stock || 0,
  }));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset form when opening
      setStoreId("");
      setCustomerFirstName("");
      setCustomerLastName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setShippingAddress1("");
      setShippingAddress2("");
      setShippingCity("");
      setShippingProvince("");
      setShippingZip("");
      setNote("");
      setLineItems([]);
      setErrors({});
      setProductSearchQuery("");
    }
  }, [open]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!storeId) {
      newErrors.storeId = "Selecteaza un magazin";
    }

    if (!customerFirstName.trim()) {
      newErrors.customerFirstName = "Prenumele este obligatoriu";
    }

    if (!customerLastName.trim()) {
      newErrors.customerLastName = "Numele este obligatoriu";
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = "Email-ul este obligatoriu";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      newErrors.customerEmail = "Email-ul nu este valid";
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = "Telefonul este obligatoriu";
    } else if (!/^0[0-9]{9}$/.test(customerPhone.replace(/\s/g, ""))) {
      newErrors.customerPhone = "Telefonul trebuie sa aiba 10 cifre si sa inceapa cu 0";
    }

    if (!shippingAddress1.trim()) {
      newErrors.shippingAddress1 = "Adresa este obligatorie";
    }

    if (!shippingCity.trim()) {
      newErrors.shippingCity = "Orasul este obligatoriu";
    }

    if (!shippingProvince.trim()) {
      newErrors.shippingProvince = "Judetul este obligatoriu";
    }

    if (!shippingZip.trim()) {
      newErrors.shippingZip = "Codul postal este obligatoriu";
    }

    if (lineItems.length === 0) {
      newErrors.lineItems = "Adauga cel putin un produs";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [storeId, customerFirstName, customerLastName, customerEmail, customerPhone, shippingAddress1, shippingCity, shippingProvince, shippingZip, lineItems]);

  // Check if form is valid for enabling submit button
  const isFormValid = useCallback((): boolean => {
    if (!storeId) return false;
    if (!customerFirstName.trim()) return false;
    if (!customerLastName.trim()) return false;
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return false;
    if (!customerPhone.trim() || !/^0[0-9]{9}$/.test(customerPhone.replace(/\s/g, ""))) return false;
    if (!shippingAddress1.trim()) return false;
    if (!shippingCity.trim()) return false;
    if (!shippingProvince.trim()) return false;
    if (!shippingZip.trim()) return false;
    if (lineItems.length === 0) return false;
    return true;
  }, [storeId, customerFirstName, customerLastName, customerEmail, customerPhone, shippingAddress1, shippingCity, shippingProvince, shippingZip, lineItems]);

  // Handle product selection
  const handleAddProduct = (product: ProductSearchResult) => {
    // Check if product already in list
    const existingIndex = lineItems.findIndex(item => item.productId === product.id);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...lineItems];
      updated[existingIndex].quantity += 1;
      setLineItems(updated);
    } else {
      // Add new product
      setLineItems([...lineItems, {
        productId: product.id,
        sku: product.sku,
        title: product.title,
        quantity: 1,
        price: product.price,
      }]);
    }
    setProductSearchQuery("");
    setIsProductDropdownOpen(false);
    setErrors(prev => ({ ...prev, lineItems: undefined }));
  };

  // Handle quantity change
  const handleQuantityChange = (index: number, delta: number) => {
    const updated = [...lineItems];
    updated[index].quantity = Math.max(1, updated[index].quantity + delta);
    setLineItems(updated);
  };

  // Handle remove product
  const handleRemoveProduct = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculate total
  const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Handle submit
  const handleSubmit = () => {
    if (!validateForm()) return;

    onCreateOrder({
      storeId,
      customerFirstName: customerFirstName.trim(),
      customerLastName: customerLastName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.replace(/\s/g, ""),
      shippingAddress1: shippingAddress1.trim(),
      shippingAddress2: shippingAddress2.trim() || undefined,
      shippingCity: shippingCity.trim(),
      shippingProvince: shippingProvince.trim(),
      shippingZip: shippingZip.trim(),
      lineItems,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creare comanda manuala</DialogTitle>
          <DialogDescription>
            Creeaza o comanda noua pentru vanzari telefonice sau offline.
          </DialogDescription>
        </DialogHeader>

        {/* Payment & Shipping Info Banner */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span><strong>Metoda de plata:</strong> Ramburs la livrare (COD)</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" />
                <span><strong>Transport:</strong> Se calculeaza automat conform regulilor din Shopify</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-6 py-4">
          {/* Store selector */}
          <div className="space-y-2">
            <Label htmlFor="store">Magazin Shopify *</Label>
            <Select value={storeId} onValueChange={(v) => { setStoreId(v); setErrors(prev => ({ ...prev, storeId: undefined })); }}>
              <SelectTrigger className={cn(errors.storeId && "border-destructive")}>
                <SelectValue placeholder="Selecteaza magazinul" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.storeId && <p className="text-xs text-destructive">{errors.storeId}</p>}
          </div>

          {/* Product search section */}
          <div className="space-y-2">
            <Label>Produse *</Label>
            <div ref={productSearchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cauta produs dupa SKU sau nume..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setIsProductDropdownOpen(e.target.value.length >= 2);
                  }}
                  onFocus={() => {
                    if (productSearchQuery.length >= 2) {
                      setIsProductDropdownOpen(true);
                    }
                  }}
                  className="pl-10"
                />
                {isSearchingProducts && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results dropdown */}
              {isProductDropdownOpen && productSearchQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                  {isSearchingProducts ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Se cauta...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Niciun produs gasit
                    </div>
                  ) : (
                    searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        className="w-full px-4 py-2 text-left hover:bg-accent text-sm flex items-center justify-between"
                      >
                        <span>
                          <span className="font-medium">{product.sku}</span>
                          <span className="text-muted-foreground"> - {product.title}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(product.price, "RON")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.lineItems && <p className="text-xs text-destructive">{errors.lineItems}</p>}

            {/* Selected products table */}
            {lineItems.length > 0 && (
              <div className="border rounded-md mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">SKU</th>
                      <th className="p-2 text-left font-medium">Produs</th>
                      <th className="p-2 text-center font-medium">Cantitate</th>
                      <th className="p-2 text-right font-medium">Pret (RON)</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.productId} className="border-b last:border-b-0">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2">{item.title}</td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(index, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(index, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(item.price * item.quantity, "RON")}
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveProduct(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer details section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Date client</Label>

            {/* First name, Last name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenume *</Label>
                <Input
                  id="firstName"
                  value={customerFirstName}
                  onChange={(e) => { setCustomerFirstName(e.target.value); setErrors(prev => ({ ...prev, customerFirstName: undefined })); }}
                  className={cn(errors.customerFirstName && "border-destructive")}
                  placeholder="Prenume"
                />
                {errors.customerFirstName && <p className="text-xs text-destructive">{errors.customerFirstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nume *</Label>
                <Input
                  id="lastName"
                  value={customerLastName}
                  onChange={(e) => { setCustomerLastName(e.target.value); setErrors(prev => ({ ...prev, customerLastName: undefined })); }}
                  className={cn(errors.customerLastName && "border-destructive")}
                  placeholder="Nume"
                />
                {errors.customerLastName && <p className="text-xs text-destructive">{errors.customerLastName}</p>}
              </div>
            </div>

            {/* Email, Phone row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => { setCustomerEmail(e.target.value); setErrors(prev => ({ ...prev, customerEmail: undefined })); }}
                  className={cn(errors.customerEmail && "border-destructive")}
                  placeholder="email@exemplu.ro"
                />
                {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setErrors(prev => ({ ...prev, customerPhone: undefined })); }}
                  className={cn(errors.customerPhone && "border-destructive")}
                  placeholder="0712345678"
                />
                {errors.customerPhone && <p className="text-xs text-destructive">{errors.customerPhone}</p>}
              </div>
            </div>

            {/* Address 1 */}
            <div className="space-y-2">
              <Label htmlFor="address1">Adresa 1 *</Label>
              <Input
                id="address1"
                value={shippingAddress1}
                onChange={(e) => { setShippingAddress1(e.target.value); setErrors(prev => ({ ...prev, shippingAddress1: undefined })); }}
                className={cn(errors.shippingAddress1 && "border-destructive")}
                placeholder="Strada, numar, bloc, scara, apartament"
              />
              {errors.shippingAddress1 && <p className="text-xs text-destructive">{errors.shippingAddress1}</p>}
            </div>

            {/* Address 2 (optional) */}
            <div className="space-y-2">
              <Label htmlFor="address2">Adresa 2 (optional)</Label>
              <Input
                id="address2"
                value={shippingAddress2}
                onChange={(e) => setShippingAddress2(e.target.value)}
                placeholder="Informatii suplimentare"
              />
            </div>

            {/* City, Province, Zip row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Oras *</Label>
                <Input
                  id="city"
                  value={shippingCity}
                  onChange={(e) => { setShippingCity(e.target.value); setErrors(prev => ({ ...prev, shippingCity: undefined })); }}
                  className={cn(errors.shippingCity && "border-destructive")}
                  placeholder="Bucuresti"
                />
                {errors.shippingCity && <p className="text-xs text-destructive">{errors.shippingCity}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Judet *</Label>
                <Input
                  id="province"
                  value={shippingProvince}
                  onChange={(e) => { setShippingProvince(e.target.value); setErrors(prev => ({ ...prev, shippingProvince: undefined })); }}
                  className={cn(errors.shippingProvince && "border-destructive")}
                  placeholder="Ilfov"
                />
                {errors.shippingProvince && <p className="text-xs text-destructive">{errors.shippingProvince}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Cod postal *</Label>
                <Input
                  id="zip"
                  value={shippingZip}
                  onChange={(e) => { setShippingZip(e.target.value); setErrors(prev => ({ ...prev, shippingZip: undefined })); }}
                  className={cn(errors.shippingZip && "border-destructive")}
                  placeholder="012345"
                />
                {errors.shippingZip && <p className="text-xs text-destructive">{errors.shippingZip}</p>}
              </div>
            </div>
          </div>

          {/* Note section */}
          <div className="space-y-2">
            <Label htmlFor="note">Note comanda (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observatii sau instructiuni speciale..."
              rows={3}
            />
          </div>

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal produse:</span>
                <span>{formatCurrency(subtotal, "RON")}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Transport:</span>
                <span className="text-muted-foreground italic">Se calculeaza la creare</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t">
                <span>Total estimat:</span>
                <span>{formatCurrency(subtotal, "RON")} + transport</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Anuleaza
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se creeaza...
              </>
            ) : (
              "Creare comanda"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
