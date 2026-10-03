import {database,isAdmin,sameOrigin,storageError} from "@/lib/server";
import {examples,cleanProductText,type Product} from "@/lib/catalog";
import {imageSources} from "@/lib/image-sources";
import {z} from "zod";
import {readLimitedJson,PayloadTooLarge} from "@/lib/request-body";
import {normalizeSku,newSku,skuPattern} from "@/lib/product-code";
export const dynamic="force-dynamic";
const schema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),sku:z.string().max(40).transform(normalizeSku).refine(s=>!s||skuPattern.test(s),"Mã sản phẩm không hợp lệ").default(""),name:z.string().trim().min(1).max(180),brand:z.enum(["Hot Wheels","Matchbox","Khác"]),description:z.string().max(2000),image:z.string().max(500).refine(s=>s===""||Object.hasOwn(imageSources,s)||/^\/api\/images\/[a-zA-Z0-9_.-]+$/.test(s),"Ảnh không hợp lệ"),price:z.number().int().min(0).max(100000000).nullable(),stock:z.number().int().min(0).max(100000).nullable(),visible:z.boolean()});
export async function GET(req:Request){try{const admin=new URL(req.url).searchParams.get("admin")==="1";if(admin&&!await isAdmin())return Response.json({error:"Bạn không có quyền quản lý."},{status:403});const rows=await database().prepare("SELECT * FROM products ORDER BY updated_at DESC, rowid DESC").all<Product>();const data=rows.results.length?rows.results.map(p=>cleanProductText({...p,visible:!!p.visible})):[...examples].reverse();return Response.json(admin?data:data.filter(p=>p.visible),{headers:{"Cache-Control":"no-store"}});}catch(e){return storageError(e)}}
export async function PUT(req:Request) {
 try {
  if(!await isAdmin())return Response.json({error:"Bạn không có quyền quản lý."},{status:403});
  if(!sameOrigin(req))return Response.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  let product:Product;
  try{product=cleanProductText(schema.parse(await readLimitedJson(req,16384)));if(!product.name)throw Error();}
  catch(e){return Response.json({error:e instanceof PayloadTooLarge?"Yêu cầu quá lớn.":"Thông tin không hợp lệ. Kiểm tra mã sản phẩm, tên, giá và tồn kho."},{status:e instanceof PayloadTooLarge?413:400});}
  const db=database();
  const existing=await db.prepare("SELECT COUNT(*) AS count FROM products").first<{count:number}>();
  if(existing?.count===0)await db.batch(examples.map(x=>db.prepare("INSERT OR IGNORE INTO products (id,sku,name,brand,description,image,price,stock,visible) VALUES (?,?,?,?,?,?,?,?,?)").bind(x.id,x.sku,x.name,x.brand,x.description,x.image,x.price,x.stock,x.visible?1:0)));
  const current=await db.prepare("SELECT * FROM products WHERE id=?").bind(product.id).first<Product>();
  product.sku=product.sku||current?.sku||newSku(product.brand);
  const duplicate=await db.prepare("SELECT id,sku,name FROM products WHERE upper(sku)=? AND id<>?").bind(product.sku,product.id).first<Product>();
  if(duplicate)return Response.json({error:`Mã ${duplicate.sku} đã thuộc sản phẩm ${duplicate.name}. Tìm mã này trong CMS để chỉnh sửa, không tạo thêm.`,existingId:duplicate.id},{status:409});
  if(!current){
   const sameName=await db.prepare("SELECT id,sku,name FROM products WHERE lower(trim(name))=lower(trim(?)) AND brand=?").bind(product.name,product.brand).first<Product>();
   if(sameName)return Response.json({error:`Sản phẩm đã có với mã ${sameName.sku}. Nếu là phiên bản khác, ghi rõ màu hoặc bộ sưu tập trong tên.`,existingId:sameName.id},{status:409});
  }
  const updatedAt=Date.now();
  try {
   await db.prepare("INSERT INTO products (id,sku,name,brand,description,image,price,stock,visible,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,name=excluded.name,brand=excluded.brand,description=excluded.description,image=excluded.image,price=excluded.price,stock=excluded.stock,visible=excluded.visible,updated_at=excluded.updated_at")
    .bind(product.id,product.sku,product.name,product.brand,product.description,product.image,product.price,product.stock,product.visible?1:0,updatedAt).run();
  }catch(e){if(e instanceof Error&&/unique constraint|products_sku_unique/i.test(e.message))return Response.json({error:"Mã sản phẩm vừa được dùng. Tìm mã trong CMS trước khi tạo thêm."},{status:409});throw e;}
  return Response.json({...product,updated_at:updatedAt});
 }catch(e){return storageError(e);}
}
