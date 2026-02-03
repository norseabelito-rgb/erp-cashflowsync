/**
 * Script pentru compararea schemelor între două environments
 *
 * Folosire:
 *   npx ts-node scripts/compare-schemas.ts <staging-url> <production-url>
 *
 * Exemplu:
 *   npx ts-node scripts/compare-schemas.ts \
 *     "https://staging.example.com/api/admin/schema-dump" \
 *     "https://production.example.com/api/admin/schema-dump"
 *
 * Sau salvează JSON-urile local și compară:
 *   npx ts-node scripts/compare-schemas.ts staging-schema.json production-schema.json
 */

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  columns: ColumnInfo[];
  indexes: Array<{ name: string; definition: string }>;
}

interface SchemaExport {
  exportedAt: string;
  tableCount: number;
  tables: Record<string, TableInfo>;
  enums: Record<string, string[]>;
}

async function loadSchema(source: string): Promise<SchemaExport> {
  if (source.startsWith("http")) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status}`);
    }
    return response.json();
  } else {
    // Local file
    const fs = await import("fs");
    const content = fs.readFileSync(source, "utf-8");
    return JSON.parse(content);
  }
}

function compareSchemas(staging: SchemaExport, production: SchemaExport) {
  const differences: {
    missingTablesInProd: string[];
    extraTablesInProd: string[];
    missingColumnsInProd: Array<{ table: string; column: string; details: ColumnInfo }>;
    extraColumnsInProd: Array<{ table: string; column: string }>;
    columnTypeDifferences: Array<{
      table: string;
      column: string;
      staging: string;
      production: string;
    }>;
    missingEnumsInProd: string[];
    missingEnumValuesInProd: Array<{ enum: string; values: string[] }>;
  } = {
    missingTablesInProd: [],
    extraTablesInProd: [],
    missingColumnsInProd: [],
    extraColumnsInProd: [],
    columnTypeDifferences: [],
    missingEnumsInProd: [],
    missingEnumValuesInProd: [],
  };

  const stagingTables = new Set(Object.keys(staging.tables));
  const prodTables = new Set(Object.keys(production.tables));

  // Tabele care lipsesc din producție
  for (const table of stagingTables) {
    if (!prodTables.has(table)) {
      differences.missingTablesInProd.push(table);
    }
  }

  // Tabele extra în producție (nu ar trebui să fie problematice)
  for (const table of prodTables) {
    if (!stagingTables.has(table)) {
      differences.extraTablesInProd.push(table);
    }
  }

  // Compară coloanele pentru tabelele comune
  for (const table of stagingTables) {
    if (!prodTables.has(table)) continue;

    const stagingCols = new Map(
      staging.tables[table].columns.map((c) => [c.name, c])
    );
    const prodCols = new Map(
      production.tables[table].columns.map((c) => [c.name, c])
    );

    // Coloane care lipsesc din producție
    for (const [colName, colInfo] of stagingCols) {
      if (!prodCols.has(colName)) {
        differences.missingColumnsInProd.push({
          table,
          column: colName,
          details: colInfo,
        });
      } else {
        // Verifică diferențe de tip
        const prodCol = prodCols.get(colName)!;
        if (colInfo.type !== prodCol.type) {
          differences.columnTypeDifferences.push({
            table,
            column: colName,
            staging: colInfo.type,
            production: prodCol.type,
          });
        }
      }
    }

    // Coloane extra în producție
    for (const colName of prodCols.keys()) {
      if (!stagingCols.has(colName)) {
        differences.extraColumnsInProd.push({ table, column: colName });
      }
    }
  }

  // Compară enum-urile
  const stagingEnums = new Set(Object.keys(staging.enums));
  const prodEnums = new Set(Object.keys(production.enums));

  for (const enumName of stagingEnums) {
    if (!prodEnums.has(enumName)) {
      differences.missingEnumsInProd.push(enumName);
    } else {
      // Verifică valorile enum
      const stagingValues = new Set(staging.enums[enumName]);
      const prodValues = new Set(production.enums[enumName]);
      const missingValues = [...stagingValues].filter((v) => !prodValues.has(v));
      if (missingValues.length > 0) {
        differences.missingEnumValuesInProd.push({
          enum: enumName,
          values: missingValues,
        });
      }
    }
  }

  return differences;
}

function generateMigrationSQL(differences: ReturnType<typeof compareSchemas>, staging: SchemaExport): string {
  const sql: string[] = [];
  sql.push("-- Auto-generated migration to sync production with staging");
  sql.push(`-- Generated at: ${new Date().toISOString()}`);
  sql.push("");

  // Tabele lipsă
  if (differences.missingTablesInProd.length > 0) {
    sql.push("-- ============================================");
    sql.push("-- MISSING TABLES");
    sql.push("-- ============================================");
    for (const table of differences.missingTablesInProd) {
      sql.push(`-- Table: ${table}`);
      sql.push(`-- MANUAL: Check prisma/migrations/manual/ for the CREATE TABLE statement`);
      sql.push(`-- Or run: SELECT * FROM information_schema.columns WHERE table_name = '${table}' on staging`);
      sql.push("");
    }
  }

  // Coloane lipsă
  if (differences.missingColumnsInProd.length > 0) {
    sql.push("-- ============================================");
    sql.push("-- MISSING COLUMNS");
    sql.push("-- ============================================");
    for (const { table, column, details } of differences.missingColumnsInProd) {
      const nullable = details.nullable ? "" : " NOT NULL";
      const defaultVal = details.default ? ` DEFAULT ${details.default}` : "";
      sql.push(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${details.type}${nullable}${defaultVal};`);
    }
    sql.push("");
  }

  // Enum-uri lipsă
  if (differences.missingEnumsInProd.length > 0) {
    sql.push("-- ============================================");
    sql.push("-- MISSING ENUMS");
    sql.push("-- ============================================");
    for (const enumName of differences.missingEnumsInProd) {
      const values = staging.enums[enumName].map((v) => `'${v}'`).join(", ");
      sql.push(`DO $$ BEGIN CREATE TYPE "${enumName}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    }
    sql.push("");
  }

  // Valori enum lipsă
  if (differences.missingEnumValuesInProd.length > 0) {
    sql.push("-- ============================================");
    sql.push("-- MISSING ENUM VALUES");
    sql.push("-- ============================================");
    for (const { enum: enumName, values } of differences.missingEnumValuesInProd) {
      for (const value of values) {
        sql.push(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}';`);
      }
    }
    sql.push("");
  }

  return sql.join("\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx ts-node scripts/compare-schemas.ts <staging-source> <production-source>

Sources can be:
  - URL: https://staging.example.com/api/admin/schema-dump
  - Local file: staging-schema.json

Examples:
  # Compare from URLs
  npx ts-node scripts/compare-schemas.ts \\
    "https://staging.app.com/api/admin/schema-dump" \\
    "https://prod.app.com/api/admin/schema-dump"

  # Compare from local files
  curl "https://staging.app.com/api/admin/schema-dump" > staging.json
  curl "https://prod.app.com/api/admin/schema-dump" > prod.json
  npx ts-node scripts/compare-schemas.ts staging.json prod.json
`);
    process.exit(1);
  }

  console.log("Loading staging schema...");
  const staging = await loadSchema(args[0]);
  console.log(`  → ${staging.tableCount} tables, exported at ${staging.exportedAt}`);

  console.log("Loading production schema...");
  const production = await loadSchema(args[1]);
  console.log(`  → ${production.tableCount} tables, exported at ${production.exportedAt}`);

  console.log("\nComparing schemas...\n");
  const diff = compareSchemas(staging, production);

  // Print results
  console.log("=".repeat(60));
  console.log("SCHEMA COMPARISON RESULTS");
  console.log("=".repeat(60));

  if (diff.missingTablesInProd.length > 0) {
    console.log(`\n❌ TABELE LIPSĂ ÎN PRODUCȚIE (${diff.missingTablesInProd.length}):`);
    for (const table of diff.missingTablesInProd) {
      console.log(`   - ${table}`);
    }
  }

  if (diff.missingColumnsInProd.length > 0) {
    console.log(`\n❌ COLOANE LIPSĂ ÎN PRODUCȚIE (${diff.missingColumnsInProd.length}):`);
    for (const { table, column, details } of diff.missingColumnsInProd) {
      console.log(`   - ${table}.${column} (${details.type}${details.nullable ? ", nullable" : ""})`);
    }
  }

  if (diff.columnTypeDifferences.length > 0) {
    console.log(`\n⚠️  DIFERENȚE DE TIP COLOANĂ (${diff.columnTypeDifferences.length}):`);
    for (const { table, column, staging, production } of diff.columnTypeDifferences) {
      console.log(`   - ${table}.${column}: staging=${staging}, prod=${production}`);
    }
  }

  if (diff.missingEnumsInProd.length > 0) {
    console.log(`\n❌ ENUM-URI LIPSĂ ÎN PRODUCȚIE (${diff.missingEnumsInProd.length}):`);
    for (const enumName of diff.missingEnumsInProd) {
      console.log(`   - ${enumName}`);
    }
  }

  if (diff.missingEnumValuesInProd.length > 0) {
    console.log(`\n❌ VALORI ENUM LIPSĂ ÎN PRODUCȚIE (${diff.missingEnumValuesInProd.length}):`);
    for (const { enum: enumName, values } of diff.missingEnumValuesInProd) {
      console.log(`   - ${enumName}: ${values.join(", ")}`);
    }
  }

  if (diff.extraTablesInProd.length > 0) {
    console.log(`\nℹ️  Tabele extra în producție (OK, ignoră): ${diff.extraTablesInProd.join(", ")}`);
  }

  // Summary
  const hasDifferences =
    diff.missingTablesInProd.length > 0 ||
    diff.missingColumnsInProd.length > 0 ||
    diff.missingEnumsInProd.length > 0 ||
    diff.missingEnumValuesInProd.length > 0;

  console.log("\n" + "=".repeat(60));
  if (hasDifferences) {
    console.log("⚠️  EXISTĂ DIFERENȚE - TREBUIE RULATE MIGRĂRI PE PRODUCȚIE");

    // Generate SQL
    const migrationSQL = generateMigrationSQL(diff, staging);
    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION SQL (rulează pe producție):");
    console.log("=".repeat(60));
    console.log(migrationSQL);
  } else {
    console.log("✅ SCHEMELE SUNT IDENTICE - POȚI FACE MERGE SIGUR");
  }
}

main().catch(console.error);
