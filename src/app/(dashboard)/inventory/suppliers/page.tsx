"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Package,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";

interface Supplier {
  id: string;
  name: string;
  code?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  country: string;
  cif?: string;
  regCom?: string;
  bankAccount?: string;
  bankName?: string;
  notes?: string;
  isActive: boolean;
  _count?: {
    items: number;
    receipts: number;
  };
}

const emptySupplier: Partial<Supplier> = {
  name: "",
  code: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  county: "",
  country: "România",
  cif: "",
  regCom: "",
  bankAccount: "",
  bankName: "",
  notes: "",
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>(emptySupplier);

  // Fetch suppliers
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/suppliers?${params}`);
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const method = data.id ? "PUT" : "POST";
      const res = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast({
          title: "Succes",
          description: selectedSupplier ? "Furnizorul a fost actualizat" : "Furnizorul a fost creat",
        });
        setDialogOpen(false);
        setSelectedSupplier(null);
        setFormData(emptySupplier);
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers?id=${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast({
          title: "Succes",
          description: data.message,
        });
        setDeleteDialogOpen(false);
        setSelectedSupplier(null);
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  const suppliers: Supplier[] = data?.data || [];

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleNew = () => {
    setSelectedSupplier(null);
    setFormData(emptySupplier);
    setDialogOpen(true);
  };

  const activeCount = suppliers.filter((s) => s.isActive).length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Furnizori"
        description="Gestionează furnizorii de materiale"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reîncarcă
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Furnizor nou
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total furnizori</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-success">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactivi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {suppliers.length - activeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după nume, CIF sau email..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Furnizor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Locație</TableHead>
              <TableHead className="text-center">Articole</TableHead>
              <TableHead className="text-center">Recepții</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search ? "Niciun furnizor găsit" : "Nu există furnizori"}
                  </p>
                  {!search && (
                    <Button variant="outline" onClick={handleNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă primul furnizor
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{supplier.name}</div>
                    {supplier.code && (
                      <div className="text-xs text-muted-foreground">
                        Cod: {supplier.code}
                      </div>
                    )}
                    {supplier.cif && (
                      <div className="text-xs text-muted-foreground">
                        CIF: {supplier.cif}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.contactPerson && (
                        <div className="text-sm">{supplier.contactPerson}</div>
                      )}
                      {supplier.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                      )}
                      {supplier.email && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(supplier.city || supplier.county) && (
                      <div className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {[supplier.city, supplier.county].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      <Package className="h-3 w-3 mr-1" />
                      {supplier._count?.items || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      <FileText className="h-3 w-3 mr-1" />
                      {supplier._count?.receipts || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "success" : "secondary"}>
                      {supplier.isActive ? "Activ" : "Inactiv"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(supplier)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Șterge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? "Editare furnizor" : "Furnizor nou"}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier
                ? "Modifică datele furnizorului"
                : "Completează datele pentru noul furnizor"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nume *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Denumire furnizor"
              />
            </div>
            <div className="space-y-2">
              <Label>Cod intern</Label>
              <Input
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Cod unic"
              />
            </div>
            <div className="space-y-2">
              <Label>Persoană contact</Label>
              <Input
                value={formData.contactPerson || ""}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Nume și prenume"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0700 000 000"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@furnizor.ro"
              />
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Adresă</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Stradă</Label>
                  <Input
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Strada, număr, bloc, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Oraș</Label>
                  <Input
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Județ</Label>
                  <Input
                    value={formData.county || ""}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Date fiscale</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CIF / CUI</Label>
                  <Input
                    value={formData.cif || ""}
                    onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                    placeholder="RO12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nr. Reg. Com.</Label>
                  <Input
                    value={formData.regCom || ""}
                    onChange={(e) => setFormData({ ...formData, regCom: e.target.value })}
                    placeholder="J40/1234/2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={formData.bankAccount || ""}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="RO00XXXX..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bancă</Label>
                  <Input
                    value={formData.bankName || ""}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Denumire bancă"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Note</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observații, termeni de plată, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? "Se salvează..."
                : selectedSupplier
                  ? "Salvează"
                  : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare ștergere</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi furnizorul{" "}
              <strong>{selectedSupplier?.name}</strong>?
              {selectedSupplier?._count &&
                (selectedSupplier._count.items > 0 ||
                  selectedSupplier._count.receipts > 0) && (
                  <span className="block mt-2 text-status-warning">
                    Furnizorul are {selectedSupplier._count.items} articole si{" "}
                    {selectedSupplier._count.receipts} receptii asociate si va fi doar
                    dezactivat.
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedSupplier && deleteMutation.mutate(selectedSupplier.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
