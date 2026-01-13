"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, Loader2, CheckCircle, XCircle, AlertCircle, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InvitationData {
  id: string;
  email: string;
  roles: { id: string; name: string; color: string }[];
  groups: { id: string; name: string; color: string }[];
  stores: { id: string; name: string }[];
  invitedBy: { name: string; email: string };
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
}

export default function InvitePage() {
  const { token } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state pentru signup cu parolă
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Fetch invitation data
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/rbac/invitations/accept?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invitație invalidă");
        } else {
          setInvitation(data);
        }
      } catch (err) {
        setError("Eroare la încărcarea invitației");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Auto-accept when logged in with correct email
  useEffect(() => {
    async function acceptInvitation() {
      if (session?.user?.email && invitation && !invitation.isAccepted && !invitation.isExpired) {
        if (session.user.email.toLowerCase() === invitation.email.toLowerCase()) {
          setAccepting(true);
          try {
            const res = await fetch(`/api/rbac/invitations/accept`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (res.ok) {
              setSuccess(true);
              setTimeout(() => router.push("/dashboard"), 2000);
            } else {
              setError(data.error || "Eroare la acceptarea invitației");
            }
          } catch (err) {
            setError("Eroare la acceptarea invitației");
          } finally {
            setAccepting(false);
          }
        } else {
          setError(`Te-ai autentificat cu ${session.user.email}, dar invitația este pentru ${invitation.email}`);
        }
      }
    }

    if (session && invitation && !success) {
      acceptInvitation();
    }
  }, [session, invitation, token, router, success]);

  // Handle signup with password
  const handleSignupWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;

    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolele nu coincid");
      return;
    }

    setIsSigningUp(true);
    setError(null);

    try {
      // 1. Creează contul
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: invitation.email,
          password,
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        setError(signupData.error || "Eroare la crearea contului");
        setIsSigningUp(false);
        return;
      }

      // 2. Autentifică-te
      const signInResult = await signIn("credentials", {
        email: invitation.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(signInResult.error);
        setIsSigningUp(false);
        return;
      }

      // 3. Acceptă invitația
      const acceptRes = await fetch(`/api/rbac/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (acceptRes.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        const acceptData = await acceptRes.json();
        setError(acceptData.error || "Eroare la acceptarea invitației");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Eroare la procesare");
    } finally {
      setIsSigningUp(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-status-success mx-auto mb-4" />
            <CardTitle>Invitație acceptată!</CardTitle>
            <CardDescription>
              Vei fi redirecționat către dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-status-error mx-auto mb-4" />
            <CardTitle>Invitație invalidă</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Mergi la Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation?.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-status-warning mx-auto mb-4" />
            <CardTitle>Invitație expirată</CardTitle>
            <CardDescription>
              Această invitație a expirat. Contactează administratorul pentru o nouă invitație.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Mergi la Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation?.isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-status-success mx-auto mb-4" />
            <CardTitle>Invitație deja acceptată</CardTitle>
            <CardDescription>
              Această invitație a fost deja folosită.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Mergi la Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dacă utilizatorul e deja autentificat, arată mesaj de procesare
  if (session && accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Se procesează invitația...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Invitație Cash Flow Grup</CardTitle>
          <CardDescription className="text-base">
            Ai fost invitat de <strong>{invitation?.invitedBy.name || invitation?.invitedBy.email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Email:</p>
            <p className="font-medium">{invitation?.email}</p>
          </div>

          {invitation?.roles && invitation.roles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Roluri asignate:</p>
              <div className="flex flex-wrap gap-2">
                {invitation.roles.map((role) => (
                  <Badge key={role.id} style={{ backgroundColor: role.color }}>
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {invitation?.groups && invitation.groups.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Grupuri:</p>
              <div className="flex flex-wrap gap-2">
                {invitation.groups.map((group) => (
                  <Badge key={group.id} variant="outline" style={{ borderColor: group.color }}>
                    {group.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="password">Email & Parolă</TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4 mt-4">
              <Button
                onClick={() => signIn("google", { callbackUrl: `/invite/${token}` })}
                className="w-full h-12 text-base font-medium"
                variant="outline"
                disabled={isSigningUp}
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Acceptă cu Google
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Asigură-te că te autentifici cu adresa <strong>{invitation?.email}</strong>
              </p>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 mt-4">
              <form onSubmit={handleSignupWithPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Ion Popescu"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={invitation?.email || ""}
                      className="pl-10"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parolă</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minim 8 caractere"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmă parola</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repetă parola"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isSigningUp ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Creează cont și acceptă
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
