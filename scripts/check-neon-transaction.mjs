import {Pool} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let client;
try{
 client=await pool.connect();await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7420981)');
 const r=await client.query('SELECT count(*)::int AS count FROM products');if(r.rows[0].count!==28)throw Error();
 await client.query(`CREATE TEMP TABLE replay_check(challenge text PRIMARY KEY,consumed integer NOT NULL)`);
 await client.query(`INSERT INTO replay_check VALUES('test',0)`);
 const first=await client.query(`UPDATE replay_check SET consumed=1 WHERE challenge='test' AND consumed=0 RETURNING challenge`);
 const replay=await client.query(`UPDATE replay_check SET consumed=1 WHERE challenge='test' AND consumed=0 RETURNING challenge`);
 if(first.rowCount!==1||replay.rowCount!==0)throw Error();await client.query('ROLLBACK');
 console.log('Neon Pool connectivity/transaction/advisory lock/conditional one-time write checks PASS; transaction rolled back.');
}catch{if(client)await client.query('ROLLBACK').catch(()=>{});console.error('Neon Pool verification failed; raw response withheld.');process.exitCode=1;}finally{client?.release();await pool.end();}
