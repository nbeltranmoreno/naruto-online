/**
 * Migración con la configuración EXACTA de Supabase
 */

import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const password = process.env.SUPABASE_DB_PASSWORD;

// Configuración EXACTA de Supabase
const connectionString = `postgresql://postgres.xbzrtmylhsjzyiajytmp:${password}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║       🎯 MIGRACIÓN CON CONFIG OFICIAL DE SUPABASE            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 20000,
});

async function main() {
  try {
    console.log('📋 Configuración:');
    console.log('   Host: aws-0-us-west-2.pooler.supabase.com');
    console.log('   Port: 5432');
    console.log('   User: postgres.xbzrtmylhsjzyiajytmp');
    console.log('   SSL: Enabled\n');

    console.log('🔌 Conectando...');
    await client.connect();
    console.log('✅ ¡CONEXIÓN EXITOSA!\n');

    // Verificar versión
    console.log('📊 Verificando PostgreSQL...');
    const versionResult = await client.query('SELECT version();');
    console.log(`   ${versionResult.rows[0].version.substring(0, 70)}...\n`);

    // Cargar y ejecutar SQL
    console.log('📄 Cargando schema SQL...');
    const sqlFile = join(__dirname, 'supabase-schema.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    console.log(`   Archivo: supabase-schema.sql (${(sql.length / 1024).toFixed(2)} KB)\n`);

    console.log('⏳ Ejecutando SQL (10-30 segundos)...\n');

    const startTime = Date.now();
    await client.query(sql);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ ¡SQL ejecutado en ${elapsed}s!\n`);

    // Verificar tablas creadas
    console.log('🔍 Tablas creadas:\n');
    const tablesResult = await client.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = t.table_name) as columns
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name.padEnd(25)} (${row.columns} columnas)`);
    });

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           ✨ ¡BASE DE DATOS CONFIGURADA! ✨                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🚀 SIGUIENTE PASO:\n');
    console.log('   npm run dev\n');
    console.log('Y prueba la aplicación completa:\n');
    console.log('   • Pantalla de login ✨');
    console.log('   • Registro de usuarios');
    console.log('   • Login con Google');
    console.log('   • Crear/editar/eliminar hábitos');
    console.log('   • Todo se guarda en Supabase automáticamente\n');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    console.error('');

    if (error.code === 'ENOTFOUND') {
      console.log('🔍 No se puede resolver el DNS.');
      console.log('Problema de red/firewall/DNS local.\n');
    } else if (error.code === '28P01') {
      console.log('🔐 Contraseña incorrecta.');
      console.log(`Verifica que SUPABASE_DB_PASSWORD en .env sea: ${password}\n`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏱️  Timeout - firewall bloqueando.\n');
    }

    console.log('📋 ALTERNATIVA:');
    console.log('   Ejecuta el SQL manualmente:');
    console.log('   node quick-setup.js\n');

    try {
      await client.end();
    } catch {}

    process.exit(1);
  }
}

main();
