import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || 'migration_001_multiuser.sql';
const sql = readFileSync(join(__dirname, file), 'utf8');
console.log(`Archivo: ${file}`);

const client = new pg.Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.bdtotsyunzgthycdaujg',
  password: 'Migr4t10n_2026_Apr!',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('Conectado a Supabase PostgreSQL');

  await client.query(sql);
  console.log('Migración ejecutada exitosamente');
} catch (err) {
  console.error('Error en migración:', err.message);
  if (err.position) {
    const lines = sql.substring(0, parseInt(err.position)).split('\n');
    console.error(`Línea aproximada: ${lines.length}`);
    console.error(`Contexto: ${lines.slice(-3).join('\n')}`);
  }
  process.exit(1);
} finally {
  await client.end();
}
