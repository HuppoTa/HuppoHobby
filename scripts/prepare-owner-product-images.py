"""Approved CR-005 manual alpha masks; use existing isolated Pillow environment.
Run from repository root. Originals are never overwritten; no network or DB access.
"""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops
rows=json.loads(Path('data/product-photo-masks.json').read_text())
report=[]
for row in rows:
 source=Path('public'+row['source'])
 assert hashlib.sha256(source.read_bytes()).hexdigest()==row['source_sha256']
 original=Image.open(source).convert('RGB')
 assert original.size==tuple(row['reference_size']), (row['id'],original.size)
 mask=Image.new('L',original.size,0)
 ImageDraw.Draw(mask).polygon([tuple(p) for p in row['polygon']],fill=255)
 cutout=original.convert('RGBA');cutout.putalpha(mask)
 assert ImageChops.difference(cutout.convert('RGB'),original).getbbox() is None
 crop=cutout.crop(mask.getbbox());height=819;width=round(crop.width*height/crop.height)
 resized=crop.resize((width,height),Image.Resampling.LANCZOS)
 final=Image.new('RGBA',(1024,1024),(0,0,0,0))
 final.paste(resized,((1024-width)//2,(1024-height)//2))
 target=Path('public/products/display')/(row['id']+'-consistent-v1.png')
 final.save(target,optimize=True)
 report.append(dict(id=row['id'],source=row['source'],target='/products/display/'+target.name,bytes=target.stat().st_size,pre_resize_rgb_unchanged=True))
Path('outputs/catalog-cr005/manual-results.json').write_text(json.dumps(report,indent=2))
print('Rendered',len(report),'manual cutouts; original RGB unchanged before resize')
