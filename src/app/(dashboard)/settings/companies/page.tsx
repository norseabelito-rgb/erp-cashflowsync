"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  Truck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Company {
  id: string;
  name: string;
  code: string;
  cif: string | null;
  regCom: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  country: string;
  bankName: string | null;
  bankAccount: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  vatPayer: boolean;
  defaultVatRate: number;
  intercompanyMarkup: number;
  hasFacturisCredentials?: boolean;
  hasFancourierCredentials?: boolean;
  _count?: {
    stores: number;
    orders: number;
    invoices: number;
    invoiceSeries: number;
  };
}

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [lookupCui, setLookupCui] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Form state - General
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCif, setFormCif] = useState("");
  const [formRegCom, setFormRegCom] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCounty, setFormCounty] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formCountry, setFormCountry] = useState("România");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formVatPayer, setFormVatPayer] = useState(true);
  const [formDefaultVatRate, setFormDefaultVatRate] = useState("19");
  const [formIntercompanyMarkup, setFormIntercompanyMarkup] = useState("10");

  // Form state - Facturis
  const [formFacturisApiKey, setFormFacturisApiKey] = useState("");
  const [formFacturisUsername, setFormFacturisUsername] = useState("");
  const [formFacturisPassword, setFormFacturisPassword] = useState("");
  const [formFacturisCompanyCif, setFormFacturisCompanyCif] = useState("");

  // Form state - FanCourier
  const [formFancourierClientId, setFormFancourierClientId] = useState("");
  const [formFancourierUsername, setFormFancourierUsername] = useState("");
  const [formFancourierPassword, setFormFancourierPassword] = useState("");
  const [formSenderName, setFormSenderName] = useState("");
  const [formSenderPhone, setFormSenderPhone] = useState("");
  const [formSenderEmail, setFormSenderEmail] = useState("");
  const [formSenderCounty, setFormSenderCounty] = useState("");
  const [formSenderCity, setFormSenderCity] = useState("");
  const [formSenderStreet, setFormSenderStreet] = useState("");
  const [formSenderNumber, setFormSenderNumber] = useState("");
  const [formSenderPostalCode, setFormSenderPostalCode] = useState("");

  // Fetch companies
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies?includeInactive=true");
      if (!res.ok) throw new Error("Eroare la încărcarea firmelor");
      return res.json();
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/companies/${data.id}` : "/api/companies";
      const res = await fetch(url, {
        method: data.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la salvare");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: editingCompany ? "Firmă actualizată" : "Firmă creată",
        description: "Modificările au fost salvate cu succes.",
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la ștergere");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Firmă ștearsă",
        description: "Firma a fost ștearsă cu succes.",
      });
      setDeleteCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test Facturis mutation - trimite credențialele din formular pentru testare live
  const testFacturisMutation = useMutation({
    mutationFn: async (companyId: string) => {
      // Trimitem credențialele din formular pentru testare live
      const credentials = {
        facturisApiKey: formFacturisApiKey || undefined,
        facturisUsername: formFacturisUsername || undefined,
        facturisPassword: formFacturisPassword || undefined,
        facturisCompanyCif: formFacturisCompanyCif || undefined,
      };

      const res = await fetch(`/api/companies/${companyId}/test-facturis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Eroare la testare");
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Conexiune reușită",
        description: data.message || "Conexiunea cu Facturis funcționează corect.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare conexiune",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test FanCourier mutation - trimite credențialele din formular pentru testare live
  const testFancourierMutation = useMutation({
    mutationFn: async (companyId: string) => {
      // Trimitem credențialele din formular pentru testare live
      const credentials = {
        fancourierClientId: formFancourierClientId || undefined,
        fancourierUsername: formFancourierUsername || undefined,
        fancourierPassword: formFancourierPassword || undefined,
      };

      const res = await fetch(`/api/companies/${companyId}/test-fancourier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Eroare la testare");
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Conexiune reușită",
        description: data.message || "Conexiunea cu FanCourier funcționează corect.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare conexiune",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormCif("");
    setFormRegCom("");
    setFormAddress("");
    setFormCity("");
    setFormCounty("");
    setFormPostalCode("");
    setFormCountry("România");
    setFormBankName("");
    setFormBankAccount("");
    setFormEmail("");
    setFormPhone("");
    setFormIsPrimary(false);
    setFormIsActive(true);
    setFormVatPayer(true);
    setFormDefaultVatRate("19");
    setFormIntercompanyMarkup("10");
    setFormFacturisApiKey("");
    setFormFacturisUsername("");
    setFormFacturisPassword("");
    setFormFacturisCompanyCif("");
    setFormFancourierClientId("");
    setFormFancourierUsername("");
    setFormFancourierPassword("");
    setFormSenderName("");
    setFormSenderPhone("");
    setFormSenderEmail("");
    setFormSenderCounty("");
    setFormSenderCity("");
    setFormSenderStreet("");
    setFormSenderNumber("");
    setFormSenderPostalCode("");
    setLookupCui("");
    setShowPasswords(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingCompany(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormCode(company.code);
    setFormCif(company.cif || "");
    setFormRegCom(company.regCom || "");
    setFormAddress(company.address || "");
    setFormCity(company.city || "");
    setFormCounty(company.county || "");
    setFormPostalCode(company.postalCode || "");
    setFormCountry(company.country || "România");
    setFormBankName(company.bankName || "");
    setFormBankAccount(company.bankAccount || "");
    setFormEmail(company.email || "");
    setFormPhone(company.phone || "");
    setFormIsPrimary(company.isPrimary);
    setFormIsActive(company.isActive);
    setFormVatPayer(company.vatPayer);
    setFormDefaultVatRate(String(company.defaultVatRate));
    setFormIntercompanyMarkup(String(company.intercompanyMarkup));
    // Credențialele nu le preîncărcăm (sunt mascate)
    setFormFacturisApiKey("");
    setFormFacturisUsername("");
    setFormFacturisPassword("");
    setFormFacturisCompanyCif("");
    setFormFancourierClientId("");
    setFormFancourierUsername("");
    setFormFancourierPassword("");
    setFormSenderName("");
    setFormSenderPhone("");
    setFormSenderEmail("");
    setFormSenderCounty("");
    setFormSenderCity("");
    setFormSenderStreet("");
    setFormSenderNumber("");
    setFormSenderPostalCode("");
    setShowPasswords(false);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingCompany(null);
    resetForm();
  };

  const handleLookupCui = async () => {
    if (!lookupCui.trim()) {
      toast({
        title: "CUI necesar",
        description: "Introdu un CUI pentru căutare.",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await fetch("/api/companies/lookup-cui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui: lookupCui }),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Eroare la căutare");
      }

      const data = result.company;
      setFormName(data.name || "");
      setFormCif(data.cif || "");
      setFormRegCom(data.regCom || "");
      setFormAddress(data.address || "");
      setFormCity(data.city || "");
      setFormCounty(data.county || "");
      setFormPostalCode(data.postalCode || "");
      setFormCountry(data.country || "România");
      setFormPhone(data.phone || "");
      setFormBankAccount(data.bankAccount || "");
      setFormVatPayer(data.vatPayer !== false);

      // Generăm un cod scurt din nume
      const codeFromName = data.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4);
      setFormCode(codeFromName);

      toast({
        title: "Date găsite",
        description: `Informații pentru ${data.name} au fost completate.`,
      });
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = () => {
    if (!formName.trim() || !formCode.trim()) {
      toast({
        title: "Date incomplete",
        description: "Numele și codul firmei sunt obligatorii.",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      id: editingCompany?.id,
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      cif: formCif.trim() || null,
      regCom: formRegCom.trim() || null,
      address: formAddress.trim() || null,
      city: formCity.trim() || null,
      county: formCounty.trim() || null,
      postalCode: formPostalCode.trim() || null,
      country: formCountry.trim() || "România",
      bankName: formBankName.trim() || null,
      bankAccount: formBankAccount.trim() || null,
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      isPrimary: formIsPrimary,
      isActive: formIsActive,
      vatPayer: formVatPayer,
      defaultVatRate: parseFloat(formDefaultVatRate) || 19,
      intercompanyMarkup: parseFloat(formIntercompanyMarkup) || 10,
    };

    // Credențiale Facturis (doar dacă sunt completate)
    if (formFacturisApiKey && formFacturisApiKey !== "********") {
      data.facturisApiKey = formFacturisApiKey;
    }
    if (formFacturisUsername) {
      data.facturisUsername = formFacturisUsername;
    }
    if (formFacturisPassword && formFacturisPassword !== "********") {
      data.facturisPassword = formFacturisPassword;
    }
    if (formFacturisCompanyCif) {
      data.facturisCompanyCif = formFacturisCompanyCif;
    }

    // Credențiale FanCourier (doar dacă sunt completate)
    if (formFancourierClientId) {
      data.fancourierClientId = formFancourierClientId;
    }
    if (formFancourierUsername) {
      data.fancourierUsername = formFancourierUsername;
    }
    if (formFancourierPassword && formFancourierPassword !== "********") {
      data.fancourierPassword = formFancourierPassword;
    }

    // Sender info
    if (formSenderName) data.senderName = formSenderName;
    if (formSenderPhone) data.senderPhone = formSenderPhone;
    if (formSenderEmail) data.senderEmail = formSenderEmail;
    if (formSenderCounty) data.senderCounty = formSenderCounty;
    if (formSenderCity) data.senderCity = formSenderCity;
    if (formSenderStreet) data.senderStreet = formSenderStreet;
    if (formSenderNumber) data.senderNumber = formSenderNumber;
    if (formSenderPostalCode) data.senderPostalCode = formSenderPostalCode;

    saveMutation.mutate(data);
  };

  const companies: Company[] = companiesData?.companies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firme</h1>
          <p className="text-muted-foreground">
            Configurează firmele pentru facturare și expediere
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Adaugă Firmă
        </Button>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nicio firmă configurată</h3>
            <p className="text-muted-foreground mb-4">
              Adaugă prima firmă pentru a începe facturarea.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Firmă
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card
              key={company.id}
              className={`relative ${!company.isActive ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{company.code}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {company.isPrimary && (
                      <Badge variant="default" className="bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Primară
                      </Badge>
                    )}
                    {!company.isActive && (
                      <Badge variant="secondary">Inactivă</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* CIF & Reg. Com */}
                {company.cif && (
                  <div className="text-sm text-muted-foreground">
                    CIF: <span className="text-foreground">{company.cif}</span>
                  </div>
                )}

                {/* Adresa */}
                {(company.city || company.county) && (
                  <div className="text-sm text-muted-foreground">
                    {[company.city, company.county].filter(Boolean).join(", ")}
                  </div>
                )}

                {/* Integration Status */}
                <div className="flex gap-2 pt-2">
                  <Badge
                    variant={company.hasFacturisCredentials ? "default" : "outline"}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Facturis
                    {company.hasFacturisCredentials ? (
                      <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 ml-1 text-red-500" />
                    )}
                  </Badge>
                  <Badge
                    variant={company.hasFancourierCredentials ? "default" : "outline"}
                    className="text-xs"
                  >
                    <Truck className="h-3 w-3 mr-1" />
                    FanCourier
                    {company.hasFancourierCredentials ? (
                      <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 ml-1 text-red-500" />
                    )}
                  </Badge>
                </div>

                {/* Stats */}
                {company._count && (
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <span>{company._count.stores} magazine</span>
                    <span>{company._count.invoices} facturi</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(company)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editează
                  </Button>
                  {!company.isPrimary && company._count?.orders === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteCompany(company)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editează Firma" : "Adaugă Firmă Nouă"}
            </DialogTitle>
            <DialogDescription>
              Configurează datele firmei pentru facturare și expediere.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Date Generale</TabsTrigger>
              <TabsTrigger value="facturis">Facturis</TabsTrigger>
              <TabsTrigger value="fancourier">FanCourier</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* ANAF Lookup */}
              {!editingCompany && (
                <div className="flex gap-2 p-4 bg-muted rounded-lg">
                  <Input
                    placeholder="Introdu CUI pentru căutare ANAF"
                    value={lookupCui}
                    onChange={(e) => setLookupCui(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleLookupCui}
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Caută în ANAF</span>
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume Firmă *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="SC Exemplu SRL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Cod Scurt *</Label>
                  <Input
                    id="code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="EX"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cif">CIF</Label>
                  <Input
                    id="cif"
                    value={formCif}
                    onChange={(e) => setFormCif(e.target.value)}
                    placeholder="RO12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regCom">Nr. Reg. Com.</Label>
                  <Input
                    id="regCom"
                    value={formRegCom}
                    onChange={(e) => setFormRegCom(e.target.value)}
                    placeholder="J40/1234/2020"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                  id="address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Str. Exemplu, Nr. 1"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Oraș</Label>
                  <Input
                    id="city"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="București"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">Județ</Label>
                  <Input
                    id="county"
                    value={formCounty}
                    onChange={(e) => setFormCounty(e.target.value)}
                    placeholder="B"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Cod Poștal</Label>
                  <Input
                    id="postalCode"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    placeholder="010101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bancă</Label>
                  <Input
                    id="bankName"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="Banca Transilvania"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">IBAN</Label>
                  <Input
                    id="bankAccount"
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                    placeholder="RO49AAAA1B31007593840000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@exemplu.ro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+40 21 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultVatRate">Cota TVA Implicită (%)</Label>
                  <Input
                    id="defaultVatRate"
                    type="number"
                    value={formDefaultVatRate}
                    onChange={(e) => setFormDefaultVatRate(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intercompanyMarkup">Adaos Intercompany (%)</Label>
                  <Input
                    id="intercompanyMarkup"
                    type="number"
                    value={formIntercompanyMarkup}
                    onChange={(e) => setFormIntercompanyMarkup(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="vatPayer"
                    checked={formVatPayer}
                    onCheckedChange={setFormVatPayer}
                  />
                  <Label htmlFor="vatPayer">Plătitor de TVA</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isPrimary"
                    checked={formIsPrimary}
                    onCheckedChange={setFormIsPrimary}
                  />
                  <Label htmlFor="isPrimary">Firmă Primară (stoc)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                  <Label htmlFor="isActive">Activă</Label>
                </div>
              </div>
            </TabsContent>

            {/* Facturis Tab */}
            <TabsContent value="facturis" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Configurează credențialele pentru emiterea facturilor prin Facturis.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Afișează parole</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facturisApiKey">API Key</Label>
                <Input
                  id="facturisApiKey"
                  type={showPasswords ? "text" : "password"}
                  value={formFacturisApiKey}
                  onChange={(e) => setFormFacturisApiKey(e.target.value)}
                  placeholder={editingCompany?.hasFacturisCredentials ? "********" : "API Key de la Facturis"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facturisUsername">Username</Label>
                  <Input
                    id="facturisUsername"
                    value={formFacturisUsername}
                    onChange={(e) => setFormFacturisUsername(e.target.value)}
                    placeholder="Username Facturis"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facturisPassword">Password</Label>
                  <Input
                    id="facturisPassword"
                    type={showPasswords ? "text" : "password"}
                    value={formFacturisPassword}
                    onChange={(e) => setFormFacturisPassword(e.target.value)}
                    placeholder={editingCompany?.hasFacturisCredentials ? "********" : "Password"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facturisCompanyCif">CIF Firmă în Facturis</Label>
                <Input
                  id="facturisCompanyCif"
                  value={formFacturisCompanyCif}
                  onChange={(e) => setFormFacturisCompanyCif(e.target.value)}
                  placeholder="CIF-ul configurat în Facturis (dacă diferă)"
                />
                <p className="text-xs text-muted-foreground">
                  Lasă gol dacă CIF-ul este același cu cel din datele generale.
                </p>
              </div>

              {editingCompany && (
                <Button
                  variant="outline"
                  onClick={() => testFacturisMutation.mutate(editingCompany.id)}
                  disabled={testFacturisMutation.isPending}
                >
                  {testFacturisMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Test Conexiune Facturis
                </Button>
              )}
            </TabsContent>

            {/* FanCourier Tab */}
            <TabsContent value="fancourier" className="space-y-4 mt-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Configurează credențialele pentru generarea AWB-urilor prin FanCourier.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Afișează parole</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fancourierClientId">Client ID</Label>
                <Input
                  id="fancourierClientId"
                  value={formFancourierClientId}
                  onChange={(e) => setFormFancourierClientId(e.target.value)}
                  placeholder="Client ID de la FanCourier"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fancourierUsername">Username</Label>
                  <Input
                    id="fancourierUsername"
                    value={formFancourierUsername}
                    onChange={(e) => setFormFancourierUsername(e.target.value)}
                    placeholder="Username FanCourier"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fancourierPassword">Password</Label>
                  <Input
                    id="fancourierPassword"
                    type={showPasswords ? "text" : "password"}
                    value={formFancourierPassword}
                    onChange={(e) => setFormFancourierPassword(e.target.value)}
                    placeholder={editingCompany?.hasFancourierCredentials ? "********" : "Password"}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Date Expeditor (Sender)</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Aceste date vor fi folosite ca expeditor pe AWB-uri.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderName">Nume Expeditor</Label>
                    <Input
                      id="senderName"
                      value={formSenderName}
                      onChange={(e) => setFormSenderName(e.target.value)}
                      placeholder="SC Exemplu SRL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderPhone">Telefon</Label>
                    <Input
                      id="senderPhone"
                      value={formSenderPhone}
                      onChange={(e) => setFormSenderPhone(e.target.value)}
                      placeholder="0721234567"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="senderEmail">Email</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={formSenderEmail}
                    onChange={(e) => setFormSenderEmail(e.target.value)}
                    placeholder="expeditie@exemplu.ro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderCounty">Județ</Label>
                    <Input
                      id="senderCounty"
                      value={formSenderCounty}
                      onChange={(e) => setFormSenderCounty(e.target.value)}
                      placeholder="Bihor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderCity">Localitate</Label>
                    <Input
                      id="senderCity"
                      value={formSenderCity}
                      onChange={(e) => setFormSenderCity(e.target.value)}
                      placeholder="Săcueni"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderStreet">Stradă</Label>
                    <Input
                      id="senderStreet"
                      value={formSenderStreet}
                      onChange={(e) => setFormSenderStreet(e.target.value)}
                      placeholder="Str. Principală"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderNumber">Număr</Label>
                    <Input
                      id="senderNumber"
                      value={formSenderNumber}
                      onChange={(e) => setFormSenderNumber(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderPostalCode">Cod Poștal</Label>
                    <Input
                      id="senderPostalCode"
                      value={formSenderPostalCode}
                      onChange={(e) => setFormSenderPostalCode(e.target.value)}
                      placeholder="417435"
                    />
                  </div>
                </div>
              </div>

              {editingCompany && (
                <Button
                  variant="outline"
                  onClick={() => testFancourierMutation.mutate(editingCompany.id)}
                  disabled={testFancourierMutation.isPending}
                >
                  {testFancourierMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Test Conexiune FanCourier
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={closeDialog}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCompany ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCompany} onOpenChange={() => setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge Firma</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi firma "{deleteCompany?.name}"?
              Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteCompany && deleteMutation.mutate(deleteCompany.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
