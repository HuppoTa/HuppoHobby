import {Pool} from "@neondatabase/serverless";
import {put,head} from "@vercel/blob";
let pool:Pool|undefined;
function connection(){if(!process.env.DATABASE_URL)throw Error("Database unavailable");return pool??=new Pool({connectionString:process.env.DATABASE_URL});}
class Statement {
 sql:string; values:unknown[]=[];
 constructor(sql:string){let n=0;this.sql=sql.replace(/\?/g,()=>`$${++n}`).replace(/rowid DESC/g,"id DESC");}
 bind(...values:unknown[]){this.values=values;return this;}
 async first<T=Record<string,unknown>>(){return (await connection().query(this.sql,this.values)).rows[0] as T|undefined;}
 async all<T=Record<string,unknown>>(){return {results:(await connection().query(this.sql,this.values)).rows as T[]};}
 async run(){const r=await connection().query(this.sql,this.values);return {meta:{changes:r.rowCount??0}};}
}
export function database(){return {prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{
 const client=await connection().connect();
 try{await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(7420981)");const results=[];
 for(const s of statements){const r=await client.query(s.sql,s.values);results.push({meta:{changes:r.rowCount??0}});}
 await client.query("COMMIT");return results;
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
 }};}
export function bucket(){return {
 async put(key:string,content:Uint8Array,options:{httpMetadata:{contentType:string}}){await put(`huppo/${key}`,Buffer.from(content),{access:"public",addRandomSuffix:false,contentType:options.httpMetadata.contentType});},
 async get(key:string){if(!process.env.BLOB_STORE_ORIGIN)throw Error("Image storage unavailable");
 const origin=new URL(process.env.BLOB_STORE_ORIGIN);if(origin.protocol!=="https:"||!origin.hostname.endsWith(".public.blob.vercel-storage.com"))throw Error("Image storage unavailable");
 const url=new URL(`/huppo/${key}`,origin);try{const item=await head(url.href);const r=await fetch(item.url,{redirect:"error"});if(!r.ok)return null;return {body:r.body,httpMetadata:{contentType:item.contentType}};}catch{return null;}
 }
};}
