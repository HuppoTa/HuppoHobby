import {env} from "cloudflare:workers";
import {cookies} from "next/headers";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {database} from "./storage";
import {digest} from "./otp-crypto";

export const ADMIN_EMAIL="taanhluan@gmail.com";
export const SESSION_COOKIE="huppo_admin_session";
export const CHALLENGE_COOKIE="huppo_admin_challenge";
export const OTP_TTL=600;
export const SESSION_TTL=8*60*60;
export async function allowedAdmin() {
 const user=await getChatGPTUser();
 return user?.email.toLowerCase()===ADMIN_EMAIL?user:null;
}
export function emailConfiguration() {
 const config=env as unknown as Record<string,string|undefined>;
 if(!config.RESEND_API_KEY||!config.OTP_SECRET||config.OTP_SECRET.length<32||!config.OTP_EMAIL_FROM) return null;
 return {apiKey:config.RESEND_API_KEY,secret:config.OTP_SECRET,from:config.OTP_EMAIL_FROM};
}
export async function isAdmin() {
 const user=await allowedAdmin();
 if(!user)return false;
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token||! /^[a-f0-9]{64}$/.test(token))return false;
 const session=await database().prepare("SELECT token_hash FROM admin_sessions WHERE token_hash=? AND email=? AND user_id=? AND expires_at>?")
  .bind(await digest(token),ADMIN_EMAIL,user.userId,Math.floor(Date.now()/1000)).first();
 return !!session;
}
export function cookieValue(req:Request,name:string,value:string,maxAge:number) {
 const url=new URL(req.url);
 const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname)&&url.protocol==="http:";
 return `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${local?"":"; Secure"}`;
}
export function authResponse(data:Record<string,unknown>,status=200) {
 return Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
}
export async function sendOtpEmail(config:NonNullable<ReturnType<typeof emailConfiguration>>,code:string,challenge:string) {
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"Content-Type":"application/json","Idempotency-Key":`huppo-otp-${challenge}`},
  body:JSON.stringify({from:config.from,to:[ADMIN_EMAIL],subject:"Mã xác nhận quản lý HUPPO HOBBY",text:`Mã xác nhận của bạn: ${code}\n\nMã có hiệu lực trong 10 phút và chỉ được sử dụng một lần để truy cập CMS HUPPO HOBBY. Không chia sẻ mã này với người khác.`}),
  signal:AbortSignal.timeout(10000),
 });
 // Provider responses can contain personal details; never log their bodies.
 if(!response.ok)throw new Error("Email delivery failed");
}
