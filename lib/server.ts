export {database,bucket} from "./storage";
export {isAdmin} from "./admin-auth";
export function sameOrigin(req:Request){const origin=req.headers.get("origin");return !!origin&&origin===new URL(req.url).origin;}
export function storageError(e:unknown){console.error("HUPPO storage failure");return Response.json({error:"Không thể truy cập dữ liệu. Vui lòng thử lại."},{status:503});}
