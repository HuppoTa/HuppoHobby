import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const sql=neon(process.env.DATABASE_URL);
const schema=[
`CREATE TABLE IF NOT EXISTS products(id text PRIMARY KEY,sku text NOT NULL,name text NOT NULL,brand text NOT NULL,description text NOT NULL DEFAULT '',image text NOT NULL DEFAULT '',price integer,stock integer,visible integer NOT NULL DEFAULT 1,updated_at bigint NOT NULL DEFAULT 0)`,
`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(upper(sku))`,
`CREATE TABLE IF NOT EXISTS admin_challenges(email text PRIMARY KEY,user_id text NOT NULL,challenge text NOT NULL,code_hash text NOT NULL,expires_at bigint NOT NULL,attempts integer NOT NULL DEFAULT 0,consumed integer NOT NULL DEFAULT 0,next_send_at bigint NOT NULL,window_start bigint NOT NULL,send_count integer NOT NULL)`,
`CREATE TABLE IF NOT EXISTS admin_sessions(token_hash text PRIMARY KEY,email text NOT NULL,user_id text NOT NULL,expires_at bigint NOT NULL)`];
try{
 for(const q of schema)await sql.query(q,[]);
 const rows=JSON.parse(readFileSync('../catalog.json','utf8'));
 const cols=['id','sku','name','brand','description','image','price','stock','visible','updated_at'];
 await sql.transaction(rows.map(r=>sql.query(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,cols.map(c=>r[c]))));
 const count=await sql.query('SELECT count(*)::int AS count FROM products',[]);if(count[0].count!==28)throw Error('Catalog count mismatch');
 console.log('Neon schema and products-only import verified: 28 products. No old auth data copied.');
}catch{console.error('Neon initialization failed; details withheld to protect credentials.');process.exitCode=1;}
