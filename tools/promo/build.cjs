// Reproducible offline film build. FFMPEG must name an ffmpeg executable.
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'),media=path.join(root,'media');
const defaultFfmpegCandidates = [
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe'),
  process.env.FFMPEG,
  path.join(os.homedir(), 'Downloads/new/.tools/ffmpeg.exe'),
  'C:\\Program Files\\SteelSeries\\GG\\apps\\moments\\ffmpeg.exe',
  'ffmpeg'
];
const ffmpeg = defaultFfmpegCandidates.find(p => p && (fs.existsSync(p) || p === 'ffmpeg')) || 'ffmpeg';
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.TJ_VIDEO_PYTHON||(fs.existsSync(bundled)?bundled:'python');
const electron=require('electron');
const run=(exe,args)=>new Promise((resolve,reject)=>{const p=spawn(exe,args,{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,FFMPEG:ffmpeg}});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(path.basename(exe)+' exited '+c)));});
(async()=>{
 await run(ffmpeg,['-hide_banner','-version']);
 if(!process.argv.includes('--render-only')){
  await run(electron,['tools/promo/capture.cjs']);
  await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tools/promo/narrate.ps1','-Storyboard',path.join(__dirname,'storyboard.json'),'-Out',path.join(media,'promo-audio')]);
  await run(python,['tools/promo/soundtrack.py']);
 }
 const work=path.join(media,'promo-render');fs.mkdirSync(work,{recursive:true});
 // Independent native render processes; output times stay deterministic.
 const story=JSON.parse(fs.readFileSync(path.join(media,'promo-audio/timeline.json'),'utf8'));
 const totalDur = story.duration || 128;
 const mid = Math.round(totalDur / 2);
 await Promise.all([
  run(electron,['tools/promo/render.cjs','video',path.join(work,'part-0.mp4'),'0',String(mid),'30']),
  run(electron,['tools/promo/render.cjs','video',path.join(work,'part-1.mp4'),String(mid),String(totalDur),'30'])
 ]);
 fs.writeFileSync(path.join(work,'concat.txt'),"file 'part-0.mp4'\nfile 'part-1.mp4'\n");
 const meta=[';FFMETADATA1','title=Traders Journal — Full Tutorial & MT5 Connection Guide','artist=Chethiya Rathnasekara','comment=Original motion design and synthesized score by Chethiya Rathnasekara. Product screens use demonstration data.'];
 for(const s of story.scenes)meta.push('[CHAPTER]','TIMEBASE=1/1000','START='+s.start*1000,'END='+(s.start+s.duration)*1000,'title='+s.label);
 fs.writeFileSync(path.join(work,'chapters.txt'),meta.join('\n'));
 const full=path.join(media,'traders-journal-promo.mp4');
 await run(ffmpeg,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','0','-i',path.join(work,'concat.txt'),'-i',path.join(media,'promo-audio/master.wav'),'-i',path.join(media,'traders-journal-promo.srt'),'-f','ffmetadata','-i',path.join(work,'chapters.txt'),'-map','0:v:0','-map','1:a:0','-map','2:0','-map_metadata','3','-map_chapters','3','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000','-c:a','aac','-b:a','192k','-c:s','mov_text','-metadata:s:s:0','language=eng','-movflags','+faststart','-t',String(totalDur),full]);
 // The native app gets a separate ten-second identity sting, without chopped narration.
 await run(ffmpeg,['-hide_banner','-loglevel','warning','-y','-i',full,'-i',path.join(media,'promo-audio/music.wav'),'-filter_complex','[0:v]trim=start=0:end=2.5,setpts=PTS-STARTPTS[a];[0:v]trim=start=112.5:end=120,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,fps=30[v];[1:a]atrim=start=14:end=24,asetpts=PTS-STARTPTS,afade=t=in:d=0.35,afade=t=out:st=8.8:d=1.2,volume=1.6[score]','-map','[v]','-map','[score]','-map_chapters','-1','-r','30','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-metadata','title=Traders Journal — App Intro','-metadata','artist=Chethiya Rathnasekara','-movflags','+faststart',path.join(media,'traders-journal-intro.mp4')]);
 await run(ffmpeg,['-hide_banner','-loglevel','warning','-y','-ss','116.5','-i',full,'-frames:v','1','-update','1','-q:v','2',path.join(media,'traders-journal-poster.jpg')]);
 console.log('FILM BUILD COMPLETE:',full);
})().catch(e=>{console.error(e);process.exit(1);});
