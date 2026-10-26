path = r'C:\Users\LEGION\OneDrive\Desktop\Traders-Journal\tools\promo\build.cjs'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace hardcoded 60s and 120s with dynamic totalDur
target = """ await Promise.all([0,1].map(i=>run(electron,['tools/promo/render.cjs','video',path.join(work,`part-${i}.mp4`),String(i*60),String((i+1)*60),'30'])));
 fs.writeFileSync(path.join(work,'concat.txt'),"file 'part-0.mp4'\\nfile 'part-1.mp4'\\n");
 const story=JSON.parse(fs.readFileSync(path.join(media,'promo-audio/timeline.json'),'utf8'));"""

replacement = """ const story=JSON.parse(fs.readFileSync(path.join(media,'promo-audio/timeline.json'),'utf8'));
 const totalDur = story.duration || 128;
 const mid = Math.round(totalDur / 2);
 await Promise.all([
  run(electron,['tools/promo/render.cjs','video',path.join(work,'part-0.mp4'),'0',String(mid),'30']),
  run(electron,['tools/promo/render.cjs','video',path.join(work,'part-1.mp4'),String(mid),String(totalDur),'30'])
 ]);
 fs.writeFileSync(path.join(work,'concat.txt'),"file 'part-0.mp4'\\nfile 'part-1.mp4'\\n");"""

if target in c:
    c = c.replace(target, replacement)
    c = c.replace("'-t','120'", "'-t',String(totalDur)")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("build.cjs updated successfully!")
else:
    # Try normalized newlines
    c_norm = c.replace('\r\n', '\n')
    target_norm = target.replace('\r\n', '\n')
    if target_norm in c_norm:
        c_norm = c_norm.replace(target_norm, replacement)
        c_norm = c_norm.replace("'-t','120'", "'-t',String(totalDur)")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c_norm)
        print("build.cjs updated (normalized) successfully!")
    else:
        print("Target not found in build.cjs")
