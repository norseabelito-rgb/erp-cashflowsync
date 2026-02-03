import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/admin/schema-dump
 *
 * Exportă schema completă a bazei de date (tabele, coloane, tipuri)
 * Folosit pentru compararea între environments (staging vs production)
 *
 * IMPORTANT: Acest endpoint ar trebui protejat în producție!
 */
export async function GET() {
  try {
    // Obține toate tabelele
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    // Obține toate coloanele cu detalii
    const columns = await prisma.$queryRaw<Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>>`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    // Obține toate indexurile
    const indexes = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    // Obține enum-urile
    const enums = await prisma.$queryRaw<Array<{
      enum_name: string;
      enum_value: string;
    }>>`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;

    // Organizează datele pe tabele
    const schema: Record<string, {
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        default: string | null;
      }>;
      indexes: Array<{ name: string; definition: string }>;
    }> = {};

    for (const table of tables) {
      schema[table.table_name] = {
        columns: [],
        indexes: [],
      };
    }

    for (const col of columns) {
      if (schema[col.table_name]) {
        schema[col.table_name].columns.push({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === "YES",
          default: col.column_default,
        });
      }
    }

    for (const idx of indexes) {
      if (schema[idx.tablename]) {
        schema[idx.tablename].indexes.push({
          name: idx.indexname,
          definition: idx.indexdef,
        });
      }
    }

    // Organizează enum-urile
    const enumsGrouped: Record<string, string[]> = {};
    for (const e of enums) {
      if (!enumsGrouped[e.enum_name]) {
        enumsGrouped[e.enum_name] = [];
      }
      enumsGrouped[e.enum_name].push(e.enum_value);
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      tableCount: tables.length,
      tables: schema,
      enums: enumsGrouped,
    });
  } catch (error: any) {
    console.error("Schema dump error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
