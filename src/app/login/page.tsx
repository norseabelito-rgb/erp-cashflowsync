"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const urlError = searchParams.get("error");
  const expired = searchParams.get("expired");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Verifică dacă sesiunea a expirat
  useEffect(() => {
    if (expired === "inactivity") {
      setSessionExpiredMessage("Sesiunea ta a expirat din cauza inactivității. Te rugăm să te autentifici din nou.");
    } else if (expired === "true") {
      setSessionExpiredMessage("Sesiunea ta a expirat. Te rugăm să te autentifici din nou.");
    }
    
    // Curăță sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('session_expired');
    }
  }, [expired]);

  // Dacă e deja autentificat, redirecționează
  useEffect(() => {
    console.log("🔄 Session status:", status, "Session:", session ? "exists" : "null");
    if (status === "authenticated" && session) {
      console.log("✅ Session detected, redirecting to dashboard...");
      // Force hard refresh to ensure middleware picks up the session
      window.location.href = callbackUrl;
    }
  }, [session, status, callbackUrl]);

  useEffect(() => {
    if (urlError) {
      setError(getErrorMessage(urlError));
    }
  }, [urlError]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Eroare la autentificarea cu Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 Attempting credentials sign in for:", email);
      
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      console.log("🔐 SignIn result:", result);

      if (result?.error) {
        console.log("❌ SignIn error:", result.error);
        setError(result.error);
      } else if (result?.ok) {
        console.log("✅ SignIn OK, redirecting to:", callbackUrl);
        // Force a hard navigation instead of client-side routing
        window.location.href = callbackUrl;
      } else {
        console.log("⚠️ SignIn returned unexpected result:", result);
        setError("Eroare neașteptată la autentificare");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Eroare la autentificare");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  function getErrorMessage(error: string | null) {
    switch (error) {
      case "AccessDenied":
        return "Accesul a fost refuzat. Email-ul tău nu este autorizat.";
      case "Configuration":
        return "Eroare de configurare. Contactează administratorul.";
      case "Verification":
        return "Link-ul de verificare a expirat sau a fost deja folosit.";
      case "CredentialsSignin":
        return "Email sau parolă incorectă.";
      case "OAuthAccountNotLinked":
        return "Acest email este deja asociat unui cont. Încearcă să te autentifici cu email și parolă, sau contactează administratorul.";
      case "OAuthSignin":
        return "Eroare la autentificarea cu Google. Te rugăm să încerci din nou.";
      case "OAuthCallback":
        return "Eroare la procesarea răspunsului de la Google.";
      case "Callback":
        return "Eroare la procesarea autentificării.";
      default:
        return error || null;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Cash Flow Grup</CardTitle>
          <CardDescription className="text-base">
            Autentifică-te pentru a accesa platforma
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Session expired message */}
          {sessionExpiredMessage && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {sessionExpiredMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-12 text-base font-medium"
            variant="outline"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continuă cu Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">sau</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nume@exemplu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
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

            <Button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              Autentificare
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-sm text-center text-muted-foreground">
            Nu ai un cont?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Înregistrează-te
            </Link>
          </p>

          {/* Info text */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Prin autentificare, ești de acord cu politica de confidențialitate
            și termenii de utilizare.
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Cash Flow Grup. Toate drepturile rezervate.
      </div>
    </div>
  );
}
