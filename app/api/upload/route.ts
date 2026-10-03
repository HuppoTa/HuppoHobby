import {bucket,isAdmin,sameOrigin,storageError} from "@/lib/server";
import {readLimitedBody,PayloadTooLarge} from "@/lib/request-body";
import {inspectImage} from "@/lib/image-validation";
export async function POST(req:Request) {
 try {
  if(!await isAdmin()||!sameOrigin(req))return Response.json({error:"Bạn không có quyền tải ảnh."},{status:403});
  const bytes=await readLimitedBody(req,6*1024*1024);
  let data:FormData;
  try {data=await new Response(bytes as BodyInit,{headers:{"Content-Type":req.headers.get("content-type")||""}}).formData();}
  catch{return Response.json({error:"Dữ liệu tải ảnh không hợp lệ."},{status:400});}
  const file=data.get("file");
  if(!(file instanceof File)||file.size>5*1024*1024||file.size===0)return Response.json({error:"Chọn ảnh tối đa 5 MB."},{status:400});
  const content=new Uint8Array(await file.arrayBuffer()),format=inspectImage(content);
  if(!format)return Response.json({error:"Chọn ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 8192 px mỗi chiều và 24 megapixel."},{status:400});
  const key=crypto.randomUUID()+"."+format.ext;
  await bucket().put(key,content,{httpMetadata:{contentType:format.type}});
  return Response.json({url:"/api/images/"+key},{headers:{"Cache-Control":"no-store"}});
 }catch(e){if(e instanceof PayloadTooLarge)return Response.json({error:"Ảnh tối đa 5 MB."},{status:413});return storageError(e);}
}
