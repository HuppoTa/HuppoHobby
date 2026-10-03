import {requireChatGPTUser} from "@/app/chatgpt-auth";
import {isAdmin} from "@/lib/server";
import {allowedAdmin,emailConfiguration} from "@/lib/admin-auth";
import AdminAccess from "./access";
import Admin from "./panel";
export const dynamic="force-dynamic";
export default async function Page(){await requireChatGPTUser("/admin");if(!await allowedAdmin())return <main className="wrap admin"><h1>Quản lý HUPPO HOBBY</h1><p>Chỉ tài khoản taanhluan@gmail.com được quản lý cửa hàng.</p><a className="cta" href="/signout-with-chatgpt?return_to=/admin">Đổi tài khoản</a><p><a href="/">Về cửa hàng</a></p></main>;if(!await isAdmin())return <AdminAccess configured={!!emailConfiguration()}/>;return <Admin/>}
