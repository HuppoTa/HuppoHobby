import {env} from "cloudflare:workers";
export function database(){const db=env.DB;if(!db)throw new Error("Database unavailable");return db;}
export function bucket(){const b=env.BUCKET;if(!b)throw new Error("Image storage unavailable");return b;}
