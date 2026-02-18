import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");

const SECTION_ORDER = [
  { dir: "arhitectura", title: "Arhitectura" },
  { dir: "pagini", title: "Pagini" },
  { dir: "api", title: "API" },
  { dir: "flowuri", title: "Flow-uri de Business" },
  { dir: "debugging", title: "Debugging" },
  { dir: "development", title: "Development" },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const file = request.nextUrl.searchParams.get("file");

    // If a specific file is requested, return its content
    if (file) {
      // Prevent directory traversal
      const normalized = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
      const fullPath = path.join(DOCS_DIR, normalized);

      if (!fullPath.startsWith(DOCS_DIR)) {
        return NextResponse.json({ error: "Cale invalida" }, { status: 400 });
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
          { error: "Fisierul nu exista" },
          { status: 404 }
        );
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      return NextResponse.json({ file: normalized, content });
    }

    // Otherwise, return the file tree structure
    const sections: {
      dir: string;
      title: string;
      files: { name: string; path: string }[];
    }[] = [];

    for (const section of SECTION_ORDER) {
      const sectionDir = path.join(DOCS_DIR, section.dir);
      if (!fs.existsSync(sectionDir)) continue;

      const mdFiles = fs
        .readdirSync(sectionDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => ({
          name: f
            .replace(".md", "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          path: `${section.dir}/${f}`,
        }));

      sections.push({ dir: section.dir, title: section.title, files: mdFiles });
    }

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Eroare la citire documentatie:", error);
    return NextResponse.json(
      { error: "Eroare la citirea documentatiei" },
      { status: 500 }
    );
  }
}
