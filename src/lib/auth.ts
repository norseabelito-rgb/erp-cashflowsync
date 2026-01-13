import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

// Lista de email-uri autorizate (opțional - pentru restricționare acces)
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(",") || [];

// Toate permisiunile disponibile în sistem
const ALL_PERMISSIONS = [
  { code: "orders.view", name: "Vizualizare comenzi", category: "orders" },
  { code: "orders.edit", name: "Editare comenzi", category: "orders" },
  { code: "orders.process", name: "Procesare comenzi", category: "orders" },
  { code: "orders.delete", name: "Ștergere comenzi", category: "orders" },
  { code: "products.view", name: "Vizualizare produse", category: "products" },
  { code: "products.edit", name: "Editare produse", category: "products" },
  { code: "products.create", name: "Creare produse", category: "products" },
  { code: "products.delete", name: "Ștergere produse", category: "products" },
  { code: "inventory.view", name: "Vizualizare stoc", category: "inventory" },
  { code: "inventory.edit", name: "Editare stoc", category: "inventory" },
  { code: "invoices.view", name: "Vizualizare facturi", category: "invoices" },
  { code: "invoices.create", name: "Creare facturi", category: "invoices" },
  { code: "invoices.cancel", name: "Anulare facturi", category: "invoices" },
  { code: "awb.view", name: "Vizualizare AWB", category: "awb" },
  { code: "awb.create", name: "Creare AWB", category: "awb" },
  { code: "awb.print", name: "Printare AWB", category: "awb" },
  { code: "picking.view", name: "Vizualizare picking", category: "picking" },
  { code: "picking.create", name: "Creare picking", category: "picking" },
  { code: "picking.edit", name: "Editare picking", category: "picking" },
  { code: "handover.view", name: "Vizualizare predare", category: "handover" },
  { code: "handover.scan", name: "Scanare predare", category: "handover" },
  { code: "handover.finalize", name: "Finalizare predare", category: "handover" },
  { code: "settings.view", name: "Vizualizare setări", category: "settings" },
  { code: "settings.edit", name: "Editare setări", category: "settings" },
  { code: "users.view", name: "Vizualizare utilizatori", category: "users" },
  { code: "users.edit", name: "Editare utilizatori", category: "users" },
  { code: "users.create", name: "Creare utilizatori", category: "users" },
  { code: "users.delete", name: "Ștergere utilizatori", category: "users" },
  { code: "roles.view", name: "Vizualizare roluri", category: "roles" },
  { code: "roles.edit", name: "Editare roluri", category: "roles" },
  { code: "roles.create", name: "Creare roluri", category: "roles" },
  { code: "roles.delete", name: "Ștergere roluri", category: "roles" },
  { code: "stores.view", name: "Vizualizare magazine", category: "stores" },
  { code: "stores.edit", name: "Editare magazine", category: "stores" },
  { code: "stores.create", name: "Creare magazine", category: "stores" },
  { code: "stores.delete", name: "Ștergere magazine", category: "stores" },
  { code: "sync.manual", name: "Sincronizare manuală", category: "sync" },
  { code: "sync.full", name: "Sincronizare completă", category: "sync" },
  { code: "reports.view", name: "Vizualizare rapoarte", category: "reports" },
  { code: "reports.export", name: "Export rapoarte", category: "reports" },
  { code: "ads.view", name: "Vizualizare ads", category: "ads" },
  { code: "ads.edit", name: "Editare ads", category: "ads" },
  { code: "ads.create", name: "Creare ads", category: "ads" },
  { code: "ads.delete", name: "Ștergere ads", category: "ads" },
  { code: "activity.view", name: "Vizualizare activitate", category: "activity" },
];

// Funcție pentru a crea permisiunile și rolul SUPER_ADMIN
async function setupSuperAdminRole() {
  // 1. Creează permisiunile dacă nu există
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: {
        code: perm.code,
        name: perm.name,
        category: perm.category,
      },
    });
  }
  
  // 2. Creează rolul SUPER_ADMIN dacă nu există
  let role = await prisma.role.findFirst({
    where: { name: "SUPER_ADMIN" },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "SUPER_ADMIN",
        description: "Acces complet la toate funcționalitățile sistemului",
        isSystem: true,
      },
    });
      }

  // 3. Asignează toate permisiunile la rol
  const allPermissions = await prisma.permission.findMany();
  
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: perm.id,
      },
    });
  }

  return role;
}

// Funcție pentru a asigna rolul SUPER_ADMIN unui user
async function assignSuperAdminToUser(userId: string, roleId: string) {
  // Verifică dacă asignarea există deja
  const existing = await prisma.userRoleAssignment.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  if (!existing) {
    await prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId,
      },
    });
  }
}

// Funcție pentru notificarea SuperAdmin-ilor
async function notifySuperAdmins(newUser: { id: string; email: string; name: string | null }) {
  try {
    const superAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: true },
      select: { id: true },
    });

    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          userId: admin.id,
          type: "new_user",
          title: "Utilizator nou înregistrat",
          message: `${newUser.name || newUser.email} s-a înregistrat în platformă.`,
          data: { userId: newUser.id, email: newUser.email },
        })),
      });
    }
  } catch (error) {
    console.error("Error notifying superadmins:", error);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Permite linking automat pentru useri existenți
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email și parola sunt obligatorii");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
          throw new Error("Nu există un cont cu acest email");
        }

        if (!user.password) {
          throw new Error("Acest cont folosește autentificarea cu Google");
        }

        if (!user.isActive) {
          throw new Error("Contul a fost dezactivat");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Parola este incorectă");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // ACCOUNT LINKING: Dacă utilizatorul există dar nu are cont Google legat, leagă-l automat
      if (account?.provider === "google" && user.email) {
        // Verifică dacă există un utilizator cu acest email
        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });
        
        if (existingUser) {
          // Verifică dacă are deja un cont Google legat
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: existingUser.id,
              provider: "google",
            },
          });
          
          if (!existingAccount && account.providerAccountId) {
            // Leagă contul Google de utilizatorul existent
            try {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              });

              // Actualizează user.id pentru a folosi id-ul existent
              user.id = existingUser.id;
            } catch {
              // Continuă oricum - poate contul era deja legat
            }
          } else if (existingAccount) {
            // Contul e deja legat, folosește user-ul existent
            user.id = existingUser.id;
          }
        }
      }
      
      // Dacă ALLOWED_EMAILS e gol, permite oricine
      // Dacă e setat, verifică dacă email-ul e în listă SAU dacă utilizatorul există în sistem
      if (ALLOWED_EMAILS.length > 0 && user.email) {
        const isAllowed = ALLOWED_EMAILS.some(
          (email) => email.trim().toLowerCase() === user.email?.toLowerCase()
        );
        
        if (!isAllowed) {
          // Verifică dacă utilizatorul EXISTĂ în sistem (a fost creat prin invitație sau altfel)
          const existingUser = await prisma.user.findFirst({
            where: { email: { equals: user.email, mode: "insensitive" } },
          });
          
          // Sau verifică dacă are o invitație validă (pentru utilizatori noi)
          const hasInvitation = await prisma.invitation.findFirst({
            where: {
              email: { equals: user.email, mode: "insensitive" },
              expiresAt: { gte: new Date() },
            },
          });
          
          if (!existingUser && !hasInvitation) {
            return false; // Respinge autentificarea
          }
        }
      }

      // Verifică dacă utilizatorul e activ (pentru Google login)
      if (user.id && account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isActive: true, createdAt: true },
        });
        if (dbUser && !dbUser.isActive) {
          return false; // Utilizator dezactivat
        }

        // Notifică SuperAdmin-ii pentru utilizatori noi (creați în ultimele 10 secunde)
        if (dbUser && user.email) {
          const isNewUser = (Date.now() - new Date(dbUser.createdAt).getTime()) < 10000;
          if (isNewUser) {
            await notifySuperAdmins({
              id: user.id,
              email: user.email,
              name: user.name || null,
            });
          }
        }
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      // La primul login, adaugă datele user-ului în token
      if (user) {
        token.id = user.id;

        // Verifică dacă e primul utilizator - devine SuperAdmin automat
        const userCount = await prisma.user.count();

        if (userCount === 1) {
          // Primul utilizator - creează rol SUPER_ADMIN și asignează
          try {
            const superAdminRole = await setupSuperAdminRole();

            // Setează userul ca SUPER_ADMIN
            await prisma.user.update({
              where: { id: user.id },
              data: {
                isSuperAdmin: true,
                isActive: true,
              },
            });

            // Asignează rolul
            await assignSuperAdminToUser(user.id, superAdminRole.id);

            token.isSuperAdmin = true;
          } catch {
            // Silent fail - rolul va fi setat manual dacă e nevoie
          }
        } else {
          // Nu e primul - fetch datele din DB
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { isSuperAdmin: true },
          });
          token.isSuperAdmin = dbUser?.isSuperAdmin || false;
        }
      }

      // Refresh la sesiune - re-fetch isSuperAdmin
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isSuperAdmin: true },
        });
        token.isSuperAdmin = dbUser?.isSuperAdmin || false;
      }

      return token;
    },
    async session({ session, token }) {
      // Adaugă datele din token în sesiune
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean || false;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // După login, redirecționează la dashboard
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minute - timeout sesiune
    updateAge: 60, // Resetează timeout-ul la fiecare minut de activitate
  },
  // Let NextAuth handle cookies automatically based on environment
  // In production with HTTPS, it will use __Secure- prefix automatically
  debug: process.env.NODE_ENV === "development",
};

// Export funcția de notificare pentru a fi folosită în API-ul de signup
export { notifySuperAdmins };
