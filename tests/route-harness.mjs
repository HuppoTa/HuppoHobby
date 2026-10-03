import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {AsyncLocalStorage} from 'node:async_hooks';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {z} from 'zod';
export async function harness(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['drizzle/0000_light_ben_urich.sql','drizzle/0001_legal_sabra.sql','drizzle/0002_magical_sauron.sql','drizzle/0004_pink_sleeper.sql'])sqlite.exec(readFileSync(file,'utf8'));
 function prepare(sql,args=[]){return {bind(...values){return prepare(sql,values)},async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},sql,args};}
 const db={prepare,async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>({meta:{changes:Number(sqlite.prepare(s.sql).run(...s.args).changes)}}));sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const files=new Map(),mail=[];
 const env={DB:db,BUCKET:{async put(key,data,options){files.set(key,{data,options})},async get(key){const value=files.get(key);return value?{body:value.data,httpMetadata:value.options.httpMetadata}:null}},RESEND_API_KEY:'fixture-api-key',OTP_SECRET:'fixture-secret-at-least-32-characters-long',OTP_EMAIL_FROM:'HUPPO <security@example.test>'};
 const als=new AsyncLocalStorage(),modules=new Map(),loaded=new Map();
 const context=createContext({Request,Response,Headers,File,Blob,FormData,Uint8Array,Uint32Array,ArrayBuffer,DataView,TextEncoder,TextDecoder,URL,AbortSignal,crypto,Date,setTimeout,clearTimeout,console:{error(){}},fetch:async(url,options)=>{if(url!=='https://api.resend.com/emails')throw Error('Unexpected network');mail.push(JSON.parse(options.body));if(env.RESEND_API_KEY==='provider-failure')return Response.json({error:'fixture failure'},{status:403});return Response.json({id:'fixture-message'},{status:200})}});
 const headersModule={headers:async()=>als.getStore().headers,cookies:async()=>({get(name){const values=(als.getStore().headers.get('cookie')??'').split(';').map(v=>v.trim());const value=values.find(v=>v.startsWith(name+'='));return value?{value:value.slice(name.length+1)}:undefined}})};
 function synthetic(name,exports){const vmModule=new SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value)},{context,identifier:name});modules.set(name,vmModule);return vmModule;}
 synthetic('cloudflare:workers',{env});synthetic('next/headers',headersModule);synthetic('next/navigation',{redirect(url){throw Error('redirect '+url)}});synthetic('zod',{z});
 function load(filename){if(modules.has(filename))return modules.get(filename);if(filename.endsWith('.json'))return synthetic(filename,{default:JSON.parse(readFileSync(filename,'utf8'))});const js=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const vmModule=new SourceTextModule(js,{context,identifier:filename});modules.set(filename,vmModule);return vmModule;}
 async function route(file){const filename=path.resolve(file);if(!loaded.has(filename))loaded.set(filename,(async()=>{const vmModule=load(filename);if(vmModule.status==='unlinked')await vmModule.link((specifier,ref)=>{if(modules.has(specifier))return modules.get(specifier);const root=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):path.resolve(path.dirname(ref.identifier),specifier);return load(/\.(ts|json)$/.test(root)?root:root+'.ts')});if(vmModule.status==='linked')await vmModule.evaluate();return vmModule.namespace})());return loaded.get(filename);}
 async function call(file,method='POST',{user='owner',email='taanhluan@gmail.com',cookie='',origin='https://shop.example.test',body,headers={},params}={}){const requestHeaders=new Headers(headers);if(user){requestHeaders.set('oai-authenticated-user-id',user);requestHeaders.set('oai-authenticated-user-email',email);}if(cookie)requestHeaders.set('cookie',cookie);if(origin!==null)requestHeaders.set('origin',origin);const request=new Request('https://shop.example.test/'+file.replace('app/','').replace('/route.ts',''),{method,headers:requestHeaders,body});const vmModule=await route(file);return als.run(request,()=>vmModule[method](request,params?{params:Promise.resolve(params)}:undefined));}
 return {sqlite,env,files,mail,call,close(){sqlite.close()}};
}
