export class PayloadTooLarge extends Error {}
// Check actual streamed bytes; Content-Length alone does not bound chunked bodies.
export async function readLimitedBody(request:Request,limit:number):Promise<Uint8Array> {
 const declared=request.headers.get("content-length");
 if(declared&&Number(declared)>limit)throw new PayloadTooLarge();
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let length=0;
 try {
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
   if(length>limit){await reader.cancel().catch(()=>{});throw new PayloadTooLarge();}chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function readLimitedJson(request:Request,limit:number):Promise<unknown> {
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readLimitedBody(request,limit)));
}
