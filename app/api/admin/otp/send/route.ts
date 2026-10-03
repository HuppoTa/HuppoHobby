import {allowedAdmin,authResponse,emailConfiguration,sendOtpEmail,cookieValue,CHALLENGE_COOKIE,ADMIN_EMAIL,OTP_TTL} from "@/lib/admin-auth";
import {sameOrigin} from "@/lib/server";
import {database} from "@/lib/storage";
import {randomToken,randomCode,codeDigest} from "@/lib/otp-crypto";
import {reserveChallenge} from "@/lib/admin-auth-sql";
export const dynamic="force-dynamic";
export async function POST(req:Request) {
 if(!sameOrigin(req))return authResponse({error:"Nguồn yêu cầu không hợp lệ."},403);
 const user=await allowedAdmin();
 if(!user)return authResponse({error:"Chỉ tài khoản được cấp quyền mới nhận được OTP."},403);
 const config=emailConfiguration();
 if(!config)return authResponse({error:"Gửi email chưa được cấu hình. Cần thiết lập Resend để nhận OTP."},503);
 const now=Math.floor(Date.now()/1000),challenge=randomToken(),code=randomCode();
 try {
  const db=database();
  const reserved=await db.prepare(reserveChallenge).bind(ADMIN_EMAIL,user.userId,challenge,await codeDigest(config.secret,challenge,code),now+OTP_TTL,now+60,now,now-3600,now-3600,now,now-3600).first();
  if(!reserved) {
   const row=await db.prepare("SELECT next_send_at,window_start,send_count FROM admin_challenges WHERE email=?").bind(ADMIN_EMAIL).first<{next_send_at:number;window_start:number;send_count:number}>();
   const retryAfter=Math.max(1,(row&&row.send_count>=5&&row.window_start>now-3600?row.window_start+3600:row?.next_send_at??now+60)-now);
   const response=authResponse({error:"Đã đạt giới hạn gửi mã. Vui lòng chờ trước khi thử lại.",retryAfter},429);
   response.headers.set("Retry-After",String(retryAfter));return response;
  }
  await sendOtpEmail(config,code,challenge);
  await db.prepare("UPDATE admin_challenges SET consumed=0 WHERE email=? AND challenge=?").bind(ADMIN_EMAIL,challenge).run();
  // Opportunistic housekeeping, no timers and no runtime schema mutation.
  await db.prepare("DELETE FROM admin_sessions WHERE expires_at<=?").bind(now).run();
  const response=authResponse({message:"Mã xác nhận đã gửi tới email của bạn.",retryAfter:60,expiresIn:OTP_TTL});
  response.headers.set("Set-Cookie",cookieValue(req,CHALLENGE_COOKIE,challenge,OTP_TTL));return response;
 } catch {return authResponse({error:"Chưa gửi được mã xác nhận. Kiểm tra cấu hình Resend và thử lại sau."},503);}
}
