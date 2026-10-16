'use strict';
const film=document.getElementById('introFilm'),enter=document.getElementById('enter'),sound=document.getElementById('sound');
let finished=false;
const finish=()=>{if(finished)return;finished=true;film.pause();window.tjIntro?.finish();};
enter.addEventListener('click',finish);
sound.addEventListener('click',()=>{film.muted=!film.muted;sound.textContent=film.muted?'Sound off':'Sound on';sound.setAttribute('aria-pressed',String(!film.muted));if(film.paused)film.play().catch(finish);});
film.addEventListener('ended',finish);
film.addEventListener('error',finish);
film.addEventListener('timeupdate',()=>{if(Number.isFinite(film.duration)&&film.duration>0)document.getElementById('progress').style.width=(100*film.currentTime/film.duration)+'%';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.key==='Enter'&&e.target!==sound)){e.preventDefault();finish();}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(reduced.matches){film.pause();document.getElementById('message').textContent='Reduced motion is enabled. Press Enter to open your journal.';setTimeout(finish,1800);}else film.play().catch(finish);
// Renderer fallback, independent of the main-process fallback.
setTimeout(finish,12000);
