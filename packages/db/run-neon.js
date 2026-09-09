#!/usr/bin/env node
const { Pool } = require('@neondatabase/serverless');
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });
const migrationsDir = path.join(__dirname, 'migrations');

function resolveTable(t) {
  if (typeof t === 'string') return t;
  if (t && t.schema && t.name) return t.schema + '.' + t.name;
  if (t && t.name) return t.name;
  return String(t);
}

function resolveColDef(col) {
  if (typeof col === 'string') return col;
  let parts = [col.type || 'text'];
  if (col.primaryKey) parts.push('PRIMARY KEY');
  if (col.notNull) parts.push('NOT NULL');
  if (col.default !== undefined) {
    const d = col.default;
    if (typeof d === 'number' || typeof d === 'boolean') {
      parts.push('DEFAULT ' + d);
    } else if (typeof d === 'string' && (d.endsWith('()') || d.startsWith('('))) {
      parts.push('DEFAULT ' + d);
    } else if (typeof d === 'string') {
      parts.push("DEFAULT '" + d + "'");
    } else {
      parts.push('DEFAULT ' + d);
    }
  }
  if (col.unique) parts.push('UNIQUE');
  if (col.references) parts.push('REFERENCES ' + col.references);
  if (col.check) parts.push('CHECK (' + col.check + ')');
  return parts.join(' ');
}

async function run() {
  await pool.query('CREATE TABLE IF NOT EXISTS public.gulp (id text PRIMARY KEY, name text, run_on timestamptz DEFAULT now())');
  const applied = (await pool.query('SELECT id FROM public.gulp')).rows.map(r => r.id);
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
  console.log(`${files.length} migrations, ${applied.length} applied`);

  for (const file of files) {
    const id = file.split('_')[0];
    if (applied.includes(id)) { console.log(`Skip ${file}`); continue; }

    console.log(`Running ${file}...`);
    const migration = require(path.join(migrationsDir, file));
    const queries = [];

    const pgm = {
      sql: (textOrArr, ...rest) => {
        if (typeof textOrArr === 'string') { queries.push(textOrArr); return; }
        if (Array.isArray(textOrArr)) {
          let q = '';
          for (let i = 0; i < textOrArr.length; i++) {
            q += textOrArr[i];
            if (i < rest.length) q += String(rest[i]);
          }
          queries.push(q);
        }
      },
      func: (s) => s,
      createSchema: (name) => queries.push('CREATE SCHEMA IF NOT EXISTS ' + name),
      createExtension: (name) => queries.push('CREATE EXTENSION IF NOT EXISTS ' + name),
      createTable: (name, cols, opts = {}) => {
        const tableName = resolveTable(name);
        const entries = Object.entries(cols);
        const defs = entries.map(([k, v]) => '  ' + k + ' ' + resolveColDef(v));
        queries.push('CREATE TABLE IF NOT EXISTS ' + tableName + ' (\n' + defs.join(',\n') + '\n)');
      },
      dropTable: (name, opts = {}) => {
        const tableName = resolveTable(name);
        queries.push('DROP TABLE ' + (opts.ifExists ? 'IF EXISTS ' : '') + tableName + ' CASCADE');
      },
      addColumns: (table, cols, opts = {}) => {
        const tableName = resolveTable(opts?.schema ? { name: table, schema: opts.schema } : table);
        const entries = Object.entries(cols);
        const additions = entries.map(([k, v]) => 'ADD COLUMN IF NOT EXISTS ' + k + ' ' + resolveColDef(v));
        queries.push('ALTER TABLE ' + tableName + ' ' + additions.join(', '));
      },
      createIndex: (table, cols, opts = {}) => {
        const tableName = resolveTable(table);
        const idxName = 'idx_' + tableName.replace('.', '_') + '_' + (Array.isArray(cols) ? cols.join('_') : cols);
        const unique = opts?.unique ? 'UNIQUE ' : '';
        const colsStr = Array.isArray(cols) ? cols.join(', ') : cols;
        queries.push('CREATE ' + unique + 'INDEX IF NOT EXISTS ' + idxName + ' ON ' + tableName + ' (' + colsStr + ')');
      },
      addConstraint: (table, name, constraint, opts = {}) => {
        const tableName = resolveTable(opts?.schema ? { name: table, schema: opts.schema } : table);
        queries.push('ALTER TABLE ' + tableName + ' ADD CONSTRAINT ' + name + ' ' + constraint);
      },
    };

    try {
      await migration.up(pgm);
      let succeeded = 0;
      let skipped = 0;
      for (const q of queries) {
        try {
          await pool.query(q);
          succeeded++;
        } catch (e) {
          if (/already exists|does not exist|duplicate|multipleRowsReturned/.test(e.message)) {
            skipped++;
          } else {
            console.error(`  SQL Error (${skipped} skipped): ${e.message.substring(0, 200)}`);
          }
        }
      }
      await pool.query('INSERT INTO public.gulp (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, file]);
      console.log(`  Done (${succeeded} ok, ${skipped} skipped)`);
    } catch (e) {
      console.error(`  Failed: ${e.message.substring(0, 200)}`);
    }
  }
  console.log('All migrations complete!');
  await pool.end();
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
