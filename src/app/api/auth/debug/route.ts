import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/auth/debug - Debug auth state
export async function GET(request: NextRequest) {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true, // just to check if exists
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get all accounts (OAuth links)
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Get current session
    const session = await getServerSession(authOptions);

    // Format users to hide password but show if it exists
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      hasPassword: !!u.password,
      isActive: u.isActive,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt,
    }));

    // Format accounts
    const formattedAccounts = accounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      userEmail: a.user?.email,
      provider: a.provider,
      providerAccountId: a.providerAccountId,
    }));

    // Find potential conflicts
    const conflicts: string[] = [];
    
    // Check if any Google account is linked to a user with different email
    for (const account of accounts) {
      if (account.provider === "google" && account.user?.email) {
        // This is just a note - Google providerAccountId is not the same as email
        // The conflict would be if same providerAccountId is linked to wrong user
      }
    }

    // Check for duplicate emails
    const emailCounts: Record<string, number> = {};
    for (const user of users) {
      const email = user.email.toLowerCase();
      emailCounts[email] = (emailCounts[email] || 0) + 1;
      if (emailCounts[email] > 1) {
        conflicts.push(`Duplicate email: ${email}`);
      }
    }

    return NextResponse.json({
      currentSession: session ? {
        userId: session.user?.id,
        email: session.user?.email,
        isSuperAdmin: session.user?.isSuperAdmin,
      } : null,
      users: formattedUsers,
      accounts: formattedAccounts,
      conflicts,
      summary: {
        totalUsers: users.length,
        totalAccounts: accounts.length,
        usersWithPassword: users.filter((u) => u.password).length,
        usersWithoutPassword: users.filter((u) => !u.password).length,
        googleAccounts: accounts.filter((a) => a.provider === "google").length,
      },
    });
  } catch (error: any) {
    console.error("Auth debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
