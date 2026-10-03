import {integer,sqliteTable,text,uniqueIndex} from "drizzle-orm/sqlite-core";
import {sql} from "drizzle-orm";
export const products=sqliteTable("products",{id:text("id").primaryKey(),updatedAt:integer("updated_at").notNull().default(0),sku:text("sku").notNull().default(""),name:text("name").notNull(),brand:text("brand").notNull(),description:text("description").notNull().default(""),image:text("image").notNull().default(""),price:integer("price"),stock:integer("stock"),visible:integer("visible",{mode:"boolean"}).notNull().default(true)},table=>[uniqueIndex("products_sku_unique").on(sql`upper(${table.sku})`)]);
export const adminChallenges=sqliteTable("admin_challenges",{
 email:text("email").primaryKey(),userId:text("user_id").notNull(),challenge:text("challenge").notNull(),codeHash:text("code_hash").notNull(),
 expiresAt:integer("expires_at").notNull(),attempts:integer("attempts").notNull().default(0),consumed:integer("consumed").notNull().default(0),
 nextSendAt:integer("next_send_at").notNull(),windowStart:integer("window_start").notNull(),sendCount:integer("send_count").notNull(),
});
export const adminSessions=sqliteTable("admin_sessions",{
 tokenHash:text("token_hash").primaryKey(),email:text("email").notNull(),userId:text("user_id").notNull(),expiresAt:integer("expires_at").notNull(),
});
