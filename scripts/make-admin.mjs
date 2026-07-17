// Usage: node scripts/make-admin.mjs someone@example.com
import { createRequire } from "node:module";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");
import path from "node:path";
const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/make-admin.mjs <email>"); process.exit(1); }
const db = new DatabaseSync(process.env.DATABASE_FILE ?? path.join(process.cwd(), "dev.db"));
const user = db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
if (!user) { console.error("No user with that email."); process.exit(1); }
db.prepare("UPDATE profiles SET role='admin' WHERE user_id=?").run(user.id);
console.log("Granted admin to", email);
