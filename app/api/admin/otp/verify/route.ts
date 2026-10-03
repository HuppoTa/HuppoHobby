import {cookies} from "next/headers";
import {allowedAdmin,authResponse,emailConfiguration,cookieValue,CHALLENGE_COOKIE,SESSION_COOKIE,ADMIN_EMAIL,SESSION_TTL} from "@/lib/admin-auth";
import {sameOrigin} from "@/lib/server";
import {database} from "@/lib/storage";
import {randomToken,digest,codeDigest} from "@/lib/otp-crypto";
import {attemptChallenge,createSession,consumeChallenge} from "@/lib/admin-auth-sql";
import {readLimitedJson,PayloadTooLarge} from "@/lib/request-body";
export const dynamic="force-dynamic";
export async function POST(req:Request) {
 if(!sameOrigin(req))return authResponse({error:"Nguồn yêu cầu không hợp lệ."},403);
 const user=await allowedAdmin();if(!user)return authResponse({error:"Bạn không có quyền quản lý."},403);
 const config=emailConfiguration();if(!config)return authResponse({error:"Gửi email chưa được cấu hình."},503);
 let code:string;
 try {const body=await readLimitedJson(req,1024) as {code?:unknown};if(typeof body.code!=="string"||!/^\d{6}$/.test(body.code))throw Error();code=body.code;}
 catch(e){return authResponse({error:e instanceof PayloadTooLarge?"Yêu cầu quá lớn.":"Nhập đúng mã gồm 6 chữ số."},e instanceof PayloadTooLarge?413:400);}
 const challenge=(await cookies()).get(CHALLENGE_COOKIE)?.value;
 const invalid=()=>authResponse({error:"Mã không đúng, đã hết hạn hoặc hết lượt thử. Hãy yêu cầu mã mới."},400);
 if(!challenge||! /^[a-f0-9]{64}$/.test(challenge))return invalid();
 try {
  const now=Math.floor(Date.now()/1000),db=database();
  const row=await db.prepare(attemptChallenge).bind(ADMIN_EMAIL,user.userId,challenge,now).first<{code_hash:string}>();
  const hash=await codeDigest(config.secret,challenge,code);
  if(!row||row.code_hash!==hash)return invalid();
  const token=randomToken();
  const predicates=[ADMIN_EMAIL,user.userId,challenge,hash,now];
  const result=await db.batch([
   db.prepare(createSession).bind(await digest(token),now+SESSION_TTL,...predicates),
   db.prepare(consumeChallenge).bind(...predicates),
  ]);
  if(result[0].meta.changes!==1||result[1].meta.changes!==1)return invalid();
  const response=authResponse({ok:true});
  response.headers.append("Set-Cookie",cookieValue(req,SESSION_COOKIE,token,SESSION_TTL));
  response.headers.append("Set-Cookie",cookieValue(req,CHALLENGE_COOKIE,"",0));return response;
 }catch{return authResponse({error:"Không thể xác nhận lúc này. Vui lòng thử lại."},503);}
}
