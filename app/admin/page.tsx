import {isAdmin} from "@/lib/server";
import {emailConfiguration} from "@/lib/admin-auth";
import AdminAccess from "./access";
import Admin from "./panel";
export const dynamic="force-dynamic";
export default async function Page(){if(!await isAdmin())return <AdminAccess configured={!!emailConfiguration()}/>;return <Admin/>}
