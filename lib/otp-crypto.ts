export function randomToken() {
 return Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2,"0")).join("");
}
export function randomCode() {
 const value=new Uint32Array(1);
 do { crypto.getRandomValues(value); } while(value[0]>=4294000000);
 return String(value[0]%1000000).padStart(6,"0");
}
export async function digest(value:string) {
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
}
export async function codeDigest(secret:string,challenge:string,code:string) {
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${challenge}:${code}`));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
}
