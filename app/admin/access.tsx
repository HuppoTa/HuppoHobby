"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {LockKeyhole,Mail} from "lucide-react";
export default function AdminAccess({configured}:{configured:boolean}) {
 const [sent,setSent]=useState(false),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[remaining,setRemaining]=useState(0);
 useEffect(()=>{if(!remaining)return;const timer=setTimeout(()=>setRemaining(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[remaining]);
 async function requestCode() {
  setBusy(true);setMessage("");
  try {
   const response=await fetch("/api/admin/otp/send",{method:"POST"});const data=await response.json() as {error?:string;retryAfter?:number};
   if(data.retryAfter)setRemaining(data.retryAfter);
   if(!response.ok)throw Error(data.error||"Không gửi được mã.");
   setSent(true);setCode("");setMessage("Mã đã gửi. Kiểm tra hộp thư và thư rác.");
  }catch(e){setMessage(e instanceof Error?e.message:"Không kết nối được. Thử lại nhé.");}
  finally{setBusy(false);}
 }
 async function verify(event:React.FormEvent) {
  event.preventDefault();setBusy(true);setMessage("");
  try {
   const response=await fetch("/api/admin/otp/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
   const data=await response.json() as {error?:string;retryAfter?:number};if(!response.ok)throw Error(data.error||"Không xác nhận được.");
   window.location.replace("/admin");
  }catch(e){setMessage(e instanceof Error?e.message:"Không kết nối được. Thử lại nhé.");setBusy(false);}
 }
 return <main className="admin-access"><Link className="wordmark" href="/">HUPPO<span>HOBBY</span></Link><section className="admin-access-card"><LockKeyhole size={28}/><p className="section-label">QUẢN LÝ CỬA HÀNG</p><h1>Xác nhận truy cập</h1><p>Mã bảo mật sẽ được gửi đến</p><strong>taanhluan@gmail.com</strong>
 {!configured?<p className="notice" role="status">Chưa kết nối dịch vụ gửi email. Cần cấu hình Resend trước khi đăng nhập CMS.</p>:<>
 {sent&&<form onSubmit={verify}><label htmlFor="otp-code">Mã xác nhận gồm 6 chữ số</label><input id="otp-code" name="code" autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} placeholder="000000" onChange={e=>setCode(e.target.value.replace(/\D/g,""))}/><small>Mã có hiệu lực 10 phút. Phiên quản lý kéo dài 8 giờ.</small><button className="button-primary" disabled={busy||code.length!==6}>{busy?"Đang xác nhận…":"Vào CMS"}</button></form>}
 <button className={sent?"button-secondary":"button-primary"} disabled={busy||remaining>0} onClick={()=>void requestCode()}><Mail size={17}/>{remaining>0?`Gửi lại sau ${remaining} giây`:sent?"Gửi mã mới":"Gửi mã xác nhận"}</button></>}
 {message&&<p role="status" aria-live="polite" className="editor-message">{message}</p>}
 <div className="admin-access-links"><Link href="/">Về cửa hàng</Link><a href="/signout-with-chatgpt?return_to=/admin">Đổi tài khoản</a></div></section></main>;
}
