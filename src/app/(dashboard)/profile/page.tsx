"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Calendar, Shield, Crown, Camera, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la actualizare");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      toast({ title: "Profil actualizat cu succes" });
      setIsEditing(false);
      // Actualizează sesiunea
      await updateSession({ name: data.user.name });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Numele este obligatoriu", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ name: name.trim() });
  };

  const handleCancel = () => {
    setName(session?.user?.name || "");
    setIsEditing(false);
  };

  if (!session?.user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = session.user;
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profilul meu</h1>
        <p className="text-muted-foreground">
          Gestionează informațiile contului tău
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  onClick={() => toast({ title: "Funcționalitate în dezvoltare", description: "Upload-ul de avatar va fi disponibil în curând" })}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{user.name || "Utilizator"}</h2>
                  {user.isSuperAdmin && (
                    <Badge className="bg-yellow-500">
                      <Crown className="h-3 w-3 mr-1" />
                      SuperAdmin
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editează
              </Button>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-6">
          {/* Informații editabile */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nume complet</Label>
              {isEditing ? (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    placeholder="Introdu numele"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{user.name || "—"}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
                <Badge variant="outline" className="ml-auto text-xs">Verificat</Badge>
              </div>
            </div>
          </div>

          {/* Butoane editare */}
          {isEditing && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                Anulează
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Salvează
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Securitate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Securitate
          </CardTitle>
          <CardDescription>
            Opțiuni de securitate pentru contul tău
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Schimbă parola</p>
              <p className="text-sm text-muted-foreground">
                Actualizează parola contului tău
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => toast({ title: "Funcționalitate în dezvoltare" })}
            >
              Schimbă
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Autentificare în doi pași</p>
              <p className="text-sm text-muted-foreground">
                Adaugă un nivel suplimentar de securitate
              </p>
            </div>
            <Badge variant="outline">În curând</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Informații cont */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informații cont
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Tip cont</p>
              <p className="font-medium">
                {user.isSuperAdmin ? "SuperAdmin" : "Utilizator standard"}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Metodă de autentificare</p>
              <p className="font-medium">
                {user.image?.includes("google") ? "Google" : "Email & Parolă"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
