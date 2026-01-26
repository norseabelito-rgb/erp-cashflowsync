#!/usr/bin/env node
/**
 * Force Migration Script
 *
 * Rulează toate migrațiile SQL din prisma/migrations/manual/ direct prin pg
 *
 * Folosire:
 *   node scripts/force-migration.js
 *
 * Sau cu DATABASE_URL explicit:
 *   DATABASE_URL="postgresql://..." node scripts/force-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 [force-migration] Script started at:', new Date().toISOString());
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL nu este setat!');
    console.error('');
    console.error('Folosire:');
    console.error('  DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/force-migration.js');
    console.error('');
    console.error('Sau rulează prin Railway:');
    console.error('  railway run node scripts/force-migration.js');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('🔌 Conectare la baza de date...');
    await client.connect();
    console.log('✅ Conectat!');

    // Găsește toate fișierele SQL din folderul manual
    const manualDir = path.join(__dirname, '../prisma/migrations/manual');

    if (!fs.existsSync(manualDir)) {
      console.log('⚠️  Folderul de migrații manual nu există, skip...');
      return;
    }

    const sqlFiles = fs.readdirSync(manualDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sortează alfabetic pentru ordine consistentă

    if (sqlFiles.length === 0) {
      console.log('ℹ️  Nu există fișiere SQL de migrat.');
      return;
    }

    console.log(`📁 Găsite ${sqlFiles.length} fișiere SQL de migrat:`);
    sqlFiles.forEach(f => console.log(`   - ${f}`));
    console.log('');

    // Rulează fiecare fișier SQL
    for (const sqlFile of sqlFiles) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📄 Procesare: ${sqlFile}`);
      console.log('═'.repeat(60));

      const sqlPath = path.join(manualDir, sqlFile);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      await executeSqlStatements(client, sql, sqlFile);
    }

    console.log('\n🎉 Toate migrațiile au fost procesate!');

    // Verifică dacă tabela bulk_publish_jobs există acum
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'bulk_publish_jobs'
      );
    `);
    console.log('📋 Tabela bulk_publish_jobs există:', checkTable.rows[0].exists);

  } catch (err) {
    console.error('❌ Eroare la conectare:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('');
    console.log('🔌 Conexiune închisă.');
  }
}

async function executeSqlStatements(client, sql, fileName) {
  // Împarte SQL-ul în statements individuale
  // IMPORTANT: Gestionăm blocurile DO $$ separat pentru că conțin ; interior
  const statements = [];

  // Elimină comentariile
  let cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Extrage blocurile DO $$ ... $$; ca statements complete
  const doBlockRegex = /DO\s*\$\$[\s\S]*?\$\$\s*;/gi;
  const doBlocks = cleanSql.match(doBlockRegex) || [];

  // Înlocuiește blocurile DO cu placeholder pentru a nu le sparge
  doBlocks.forEach((block, index) => {
    cleanSql = cleanSql.replace(block, `__DO_BLOCK_${index}__`);
  });

  // Split restul pe ;
  const regularStatements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Reconstruiește statements cu blocurile DO restaurate
  regularStatements.forEach(stmt => {
    const doBlockMatch = stmt.match(/__DO_BLOCK_(\d+)__/);
    if (doBlockMatch) {
      const blockIndex = parseInt(doBlockMatch[1]);
      statements.push(doBlocks[blockIndex].replace(/;\s*$/, '')); // Remove trailing ;
    } else {
      statements.push(stmt);
    }
  });

  if (statements.length === 0) {
    console.log('ℹ️  Fișierul nu conține statements SQL valide.');
    return;
  }

  console.log(`📋 Se execută ${statements.length} statements SQL...`);

  // Debug: arată primele 80 caractere din fiecare statement
  statements.forEach((s, idx) => {
    console.log(`   [${idx + 1}] ${s.substring(0, 80).replace(/\n/g, ' ')}...`);
  });
  console.log('');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

    try {
      await client.query(statement);
      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      // Ignoră erorile "already exists" sau "does not exist" (pentru DROP IF EXISTS)
      if (err.message.includes('already exists') ||
          err.message.includes('does not exist') ||
          err.message.includes('duplicate') ||
          err.code === '42701' || // duplicate column
          err.code === '42P07' || // duplicate table
          err.code === '42710' || // duplicate object
          err.code === '42703') { // column does not exist (pentru DROP COLUMN IF EXISTS)
        skipCount++;
        console.log(`⏭️  [${i + 1}/${statements.length}] Skip (deja aplicat): ${preview}...`);
      } else {
        errorCount++;
        console.error(`❌ [${i + 1}/${statements.length}] Eroare: ${err.message}`);
        console.error(`   Code: ${err.code}`);
        console.error(`   Full statement:\n${statement}\n`);
      }
    }
  }

  console.log('');
  console.log(`📊 Rezultat ${fileName}:`);
  console.log(`   ✅ Executate cu succes: ${successCount}`);
  console.log(`   ⏭️  Sărite (deja aplicate): ${skipCount}`);
  console.log(`   ❌ Erori: ${errorCount}`);

  if (errorCount > 0) {
    console.log('⚠️  Au fost erori în acest fișier.');
  }
}

runMigration();
