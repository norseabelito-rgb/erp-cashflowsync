import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const DOCS_DIR = path.join(process.cwd(), "docs");

const SECTION_ORDER = [
  { dir: "arhitectura", title: "Arhitectura" },
  { dir: "pagini", title: "Pagini" },
  { dir: "api", title: "API" },
  { dir: "flowuri", title: "Flow-uri de Business" },
  { dir: "debugging", title: "Debugging" },
  { dir: "development", title: "Development" },
];

function getMarkdownFiles(): { relativePath: string; content: string }[] {
  const files: { relativePath: string; content: string }[] = [];

  const readmePath = path.join(DOCS_DIR, "README.md");
  if (fs.existsSync(readmePath)) {
    files.push({
      relativePath: "README.md",
      content: fs.readFileSync(readmePath, "utf-8"),
    });
  }

  for (const section of SECTION_ORDER) {
    const sectionDir = path.join(DOCS_DIR, section.dir);
    if (!fs.existsSync(sectionDir)) continue;

    const mdFiles = fs.readdirSync(sectionDir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of mdFiles) {
      const fullPath = path.join(sectionDir, file);
      files.push({
        relativePath: `${section.dir}/${file}`,
        content: fs.readFileSync(fullPath, "utf-8"),
      });
    }
  }

  return files;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}

// pdfkit standard fonts (Helvetica/Courier) only support WinAnsi encoding
// Romanian ș/ț/Ș/Ț are NOT in WinAnsi - replace with ASCII equivalents
function sanitizeForPDF(text: string): string {
  return text
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}

async function generatePDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "ERP CashFlowSync - Documentatie",
        Author: "CashFlowSync Team",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const files = getMarkdownFiles();

    // Title page
    doc.fontSize(28).font("Helvetica-Bold").text("ERP CashFlowSync", { align: "center" });
    doc.moveDown();
    doc.fontSize(20).font("Helvetica").text("Documentatie Completa", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(12).text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Total fisiere: ${files.length}`, { align: "center" });

    // Table of contents
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").text("Cuprins", { align: "center" });
    doc.moveDown();

    for (const section of SECTION_ORDER) {
      const sectionFiles = files.filter((f) => f.relativePath.startsWith(section.dir + "/"));
      if (sectionFiles.length === 0) continue;

      doc.fontSize(14).font("Helvetica-Bold").text(sanitizeForPDF(section.title));
      doc.moveDown(0.3);

      for (const file of sectionFiles) {
        const name = file.relativePath.replace(`${section.dir}/`, "").replace(".md", "");
        doc.fontSize(10).font("Helvetica").text(`  - ${sanitizeForPDF(name)}`, { indent: 20 });
      }
      doc.moveDown(0.5);
    }

    // Content pages
    for (const file of files) {
      doc.addPage();

      const parts = file.relativePath.split("/");
      if (parts.length > 1) {
        const sectionName = SECTION_ORDER.find((s) => s.dir === parts[0])?.title || parts[0];
        doc.fontSize(10).font("Helvetica").fillColor("#666666").text(sanitizeForPDF(sectionName));
        doc.fillColor("#000000");
      }

      // Sanitize entire content for PDF-safe characters before processing
      const safeContent = sanitizeForPDF(file.content);
      const lines = safeContent.split("\n");
      let inCodeBlock = false;

      for (const line of lines) {
        if (doc.y > 720) {
          doc.addPage();
        }

        if (line.startsWith("```")) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock) {
          doc.fontSize(8).font("Courier").text(line || " ");
          continue;
        }

        if (line.startsWith("# ")) {
          doc.moveDown(0.5);
          doc.fontSize(18).font("Helvetica-Bold").text(line.replace(/^# /, ""));
          doc.moveDown(0.3);
        } else if (line.startsWith("## ")) {
          doc.moveDown(0.5);
          doc.fontSize(14).font("Helvetica-Bold").text(line.replace(/^## /, ""));
          doc.moveDown(0.3);
        } else if (line.startsWith("### ")) {
          doc.moveDown(0.3);
          doc.fontSize(12).font("Helvetica-Bold").text(line.replace(/^### /, ""));
          doc.moveDown(0.2);
        } else if (line.startsWith("#### ")) {
          doc.moveDown(0.2);
          doc.fontSize(11).font("Helvetica-Bold").text(line.replace(/^#### /, ""));
          doc.moveDown(0.2);
        } else if (line.startsWith("|")) {
          const cleaned = line.replace(/\|/g, "  ").replace(/[-:]+/g, "").trim();
          if (cleaned) {
            doc.fontSize(9).font("Courier").text(cleaned);
          }
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          const cleaned = stripMarkdown(line.replace(/^[-*]\s+/, ""));
          doc.fontSize(10).font("Helvetica").text(`  \u2022 ${cleaned}`, { indent: 10 });
        } else if (/^\d+\.\s/.test(line)) {
          const cleaned = stripMarkdown(line);
          doc.fontSize(10).font("Helvetica").text(`  ${cleaned}`, { indent: 10 });
        } else if (line.trim() === "") {
          doc.moveDown(0.3);
        } else {
          const cleaned = stripMarkdown(line);
          doc.fontSize(10).font("Helvetica").text(cleaned);
        }
      }
    }

    doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("ERP CashFlowSync - Documentatie", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).font("Helvetica").text(
      `Generat automat la ${new Date().toLocaleString("ro-RO")}`,
      { align: "center" }
    );

    doc.end();
  });
}

function generateCombinedMarkdown(): string {
  const files = getMarkdownFiles();
  const parts: string[] = [];

  parts.push("# ERP CashFlowSync - Documentatie Completa\n");
  parts.push(`> Generat: ${new Date().toLocaleDateString("ro-RO")}\n`);
  parts.push(`> Total sectiuni: ${files.length}\n`);
  parts.push("\n---\n");

  for (const file of files) {
    parts.push(`\n\n---\n\n<!-- Fisier: ${file.relativePath} -->\n\n`);
    parts.push(file.content);
  }

  return parts.join("");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const format = request.nextUrl.searchParams.get("format") || "md";

    if (format === "pdf") {
      const pdfBuffer = await generatePDF();
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ERP-CashFlowSync-Docs.pdf"`,
        },
      });
    } else if (format === "md") {
      const markdown = generateCombinedMarkdown();
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="ERP-CashFlowSync-Docs.md"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Format invalid. Foloseste format=pdf sau format=md" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Eroare la generare documentatie:", error);
    return NextResponse.json(
      { error: "Eroare la generarea documentatiei" },
      { status: 500 }
    );
  }
}
