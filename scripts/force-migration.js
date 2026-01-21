#!/usr/bin/env node
/**
 * Force Migration Script
 *
 * Rulează migrarea direct prin pg (fără Prisma client)
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

    // Citește SQL din fișier
    const sqlPath = path.join(__dirname, '../prisma/migrations/manual/add_multi_company_support.sql');

    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Fișierul SQL nu există: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Împarte SQL-ul în statements individuale
    // IMPORTANT: Eliminăm comentariile ÎNAINTE de split, altfel statements
    // precedate de comentarii (-- comment\nALTER TABLE...) ar fi filtrate greșit
    const statements = sql
      // Elimină comentariile single-line (-- comment)
      .replace(/--.*$/gm, '')
      // Elimină comentariile multi-line (/* comment */)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Split pe ;
      .split(';')
      // Trim și filtrează linii goale
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📋 Se execută ${statements.length} statements SQL...`);
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
        // Ignoră erorile "already exists"
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate') ||
            err.code === '42701' || // duplicate column
            err.code === '42P07' || // duplicate table
            err.code === '42710') { // duplicate object
          skipCount++;
          console.log(`⏭️  [${i + 1}/${statements.length}] Deja există: ${preview}...`);
        } else {
          errorCount++;
          console.error(`❌ [${i + 1}/${statements.length}] Eroare: ${err.message}`);
          console.error(`   Statement: ${preview}...`);
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Rezultat migrare:');
    console.log(`   ✅ Executate cu succes: ${successCount}`);
    console.log(`   ⏭️  Sărite (deja existau): ${skipCount}`);
    console.log(`   ❌ Erori: ${errorCount}`);
    console.log('═══════════════════════════════════════');

    if (errorCount === 0) {
      console.log('');
      console.log('🎉 Migrarea s-a finalizat cu succes!');
    } else {
      console.log('');
      console.log('⚠️  Migrarea s-a finalizat cu unele erori.');
    }

  } catch (err) {
    console.error('❌ Eroare la conectare:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('');
    console.log('🔌 Conexiune închisă.');
  }
}

runMigration();
