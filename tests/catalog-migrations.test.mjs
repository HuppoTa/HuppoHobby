import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const read=file=>readFileSync(file,'utf8');
test('catalog migrations preserve existing inventory and import each reference variant once',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec(read('drizzle/0000_light_ben_urich.sql'));
 db.prepare('INSERT INTO products (id,name,brand,description,image,price,stock,visible) VALUES (?,?,?,?,?,?,?,?)').run('civic-eg','Owner title','Hot Wheels','Owner description','/api/images/owner.jpg',120000,7,0);
 db.exec(read('drizzle/0002_magical_sauron.sql'));const before=db.prepare('SELECT * FROM products WHERE id=?').get('civic-eg');assert.equal(before.sku,'HH-HW-000001');
 db.exec(read('drizzle/0003_reference_catalog.sql'));db.exec(read('drizzle/0003_reference_catalog.sql'));
 assert.deepEqual(db.prepare('SELECT * FROM products WHERE id=?').get('civic-eg'),before);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,18);
 const imported=JSON.parse(read('data/reference-products.json'));
 assert.equal(imported.length,10);
 for(const p of imported){assert.ok(existsSync('public'+p.image));const row=db.prepare('SELECT * FROM products WHERE id=?').get(p.id);assert.equal(row.sku,p.sku);assert.equal(row.price,null);assert.equal(row.stock,null)}
 assert.equal(db.prepare('SELECT COUNT(DISTINCT upper(sku)) n FROM products').get().n,18);
 }finally{db.close()}
});
