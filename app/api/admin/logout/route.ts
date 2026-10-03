import {cookies} from "next/headers";
import {authResponse,cookieValue,SESSION_COOKIE,CHALLENGE_COOKIE} from "@/lib/admin-auth";
import {database} from "@/lib/storage";
import {sameOrigin} from "@/lib/server";
import {digest} from "@/lib/otp-crypto";
export async function POST(req:Request) {
 if(!sameOrigin(req))return authResponse({error:"Nguồn yêu cầu không hợp lệ."},403);
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 try {if(token)await database().prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await digest(token)).run();}
 catch{return authResponse({error:"Chưa thể đăng xuất. Thử lại nhé."},503);}
 const response=authResponse({ok:true});
 response.headers.append("Set-Cookie",cookieValue(req,SESSION_COOKIE,"",0));
 response.headers.append("Set-Cookie",cookieValue(req,CHALLENGE_COOKIE,"",0));return response;
}
