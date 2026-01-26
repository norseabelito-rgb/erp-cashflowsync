#!/usr/bin/env node
/**
 * Backfill Postal Codes Script
 *
 * Populează codurile poștale pentru comenzile existente folosind
 * nomenclatorul FanCourier.
 *
 * Folosire:
 *   node scripts/backfill-postal-codes.js
 *
 * Sau cu DATABASE_URL explicit:
 *   DATABASE_URL="postgresql://..." node scripts/backfill-postal-codes.js
 *
 * Opțiuni (variabile de mediu):
 *   LIMIT=500          - Numărul maxim de comenzi de procesat (default: 500)
 *   ONLY_MISSING=true  - Procesează doar comenzile fără cod poștal (default: true)
 */

const path = require('path');

// Setăm NODE_ENV pentru a încărca modulele corect
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL nu este setat!');
    console.error('');
    console.error('Folosire:');
    console.error('  DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/backfill-postal-codes.js');
    console.error('');
    console.error('Sau rulează prin Railway:');
    console.error('  railway run node scripts/backfill-postal-codes.js');
    process.exit(1);
  }

  const limit = parseInt(process.env.LIMIT || '500', 10);
  const onlyMissing = process.env.ONLY_MISSING !== 'false';

  console.log('');
  console.log('='.repeat(60));
  console.log('📮 BACKFILL CODURI POȘTALE - SCRIPT STANDALONE');
  console.log('='.repeat(60));
  console.log('');
  console.log(`📋 Configurare:`);
  console.log(`   - Limită comenzi: ${limit}`);
  console.log(`   - Doar fără cod poștal: ${onlyMissing ? 'DA' : 'NU'}`);
  console.log('');

  try {
    // Încărcăm modulele necesare
    // Trebuie să folosim tsx sau ts-node pentru TypeScript
    const { execSync } = require('child_process');

    // Verificăm dacă avem tsx instalat
    try {
      execSync('npx tsx --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ tsx nu este instalat. Rulează: npm install -D tsx');
      process.exit(1);
    }

    // Creăm un script temporar care folosește modulele TypeScript
    const scriptContent = `
import prisma from '../src/lib/db';
import { backfillPostalCodes } from '../src/lib/fancourier';

async function run() {
  try {
    const result = await backfillPostalCodes({
      limit: ${limit},
      onlyMissing: ${onlyMissing},
    });

    console.log('');
    console.log('📊 Rezultat final:');
    console.log(JSON.stringify(result, null, 2));

    await prisma.$disconnect();
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Eroare:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

run();
`;

    const fs = require('fs');
    const tempFile = path.join(__dirname, '_temp_backfill.ts');
    fs.writeFileSync(tempFile, scriptContent);

    try {
      // Rulăm scriptul cu tsx
      execSync(`npx tsx ${tempFile}`, {
        stdio: 'inherit',
        env: process.env,
        cwd: path.join(__dirname, '..'),
      });
    } finally {
      // Ștergem fișierul temporar
      fs.unlinkSync(tempFile);
    }

  } catch (error) {
    console.error('❌ Eroare:', error.message);
    process.exit(1);
  }
}

main();
