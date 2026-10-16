from pathlib import Path
from PIL import Image
import json, zipfile

root=Path(__file__).resolve().parents[2]
src=root/'media/katana-inputs'
out=root/'media/katana-transfer'
out.mkdir(parents=True,exist_ok=True)
names=['dashboard','performance','journal','edge','connect','king']
for name in names:
    im=Image.open(src/(name+'.png')).convert('RGB')
    im.thumbnail((1440,900),Image.Resampling.LANCZOS)
    im.save(out/(name+'.jpg'),quality=87,optimize=True)
with zipfile.ZipFile(out/'assets.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in names:z.write(out/(name+'.jpg'),name+'.jpg')
    z.write(out/'soundtrack.m4a','soundtrack.m4a')
print(json.dumps({'archive':str(out/'assets.zip'),'bytes':(out/'assets.zip').stat().st_size,'images':len(names)}))
