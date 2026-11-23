const $=s=>document.querySelector(s);
const views=[...document.querySelectorAll('.view')];
function showView(id){views.forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));const names={home:'Votre espace créatif.',video:'Studio vidéo',image:'Studio image',design:'Atelier graphique',audio:'Studio audio'};$('#pageTitle').textContent=names[id]||'HEX-STUDIO';window.scrollTo(0,0)}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
let imageUrl=null,audioUrl=null;
$('#imageInput').onchange=e=>{const f=e.target.files[0];if(!f)return;if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(f);$('#imagePreview').src=imageUrl;$('#imagePreview').classList.add('ready');$('#imagePlaceholder').style.display='none';};
function updateImage(){const b=$('#brightness').value,c=$('#contrast').value,s=$('#saturate').value;$('#brightOut').value=b+'%';$('#contrastOut').value=c+'%';$('#saturateOut').value=s+'%';$('#imagePreview').style.filter=`brightness(${b}%) contrast(${c}%) saturate(${s}%)`}
['brightness','contrast','saturate'].forEach(id=>$('#'+id).oninput=updateImage);
$('#resetImage').onclick=()=>{['brightness','contrast','saturate'].forEach((id,i)=>$('#'+id).value=100);updateImage()};
$('#downloadImage').onclick=()=>{if(!imageUrl)return alert('Importez une image.');const img=$('#imagePreview'),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.filter=getComputedStyle(img).filter;ctx.drawImage(img,0,0);download(canvas.toDataURL('image/png'),'hex-image.png')};
const canvas=$('#posterCanvas'),ctx=canvas.getContext('2d');
function drawPoster(){const [w,h]=$('#posterFormat').value.split(',').map(Number);canvas.width=w;canvas.height=h;ctx.fillStyle=$('#posterColor').value;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ffffff55';ctx.lineWidth=Math.max(2,w/540);ctx.strokeRect(w*.055,h*.055,w*.89,h*.89);ctx.fillStyle=$('#posterTextColor').value;ctx.font=`700 ${Math.round(w*.075)}px Arial`;ctx.fillText('HEX-STUDIO',w*.09,h*.16);ctx.font=`700 ${Math.round(w*.095)}px Arial`;const words=$('#posterTitle').value.toUpperCase().split(' ');let lines=[],line='';words.forEach(word=>{const test=line?line+' '+word:word;if(ctx.measureText(test).width>w*.8){lines.push(line);line=word}else line=test});if(line)lines.push(line);let y=h*.48;lines.forEach(t=>{ctx.fillText(t,w*.09,y);y+=w*.115});ctx.font=`400 ${Math.round(w*.027)}px Arial`;ctx.fillText($('#posterSubtitle').value,w*.09,Math.min(h*.78,y+w*.04));ctx.font=`600 ${Math.round(w*.018)}px Arial`;ctx.fillText('A CENTRAL-HEX CREATIVE PROJECT',w*.09,h*.91)}
['posterTitle','posterSubtitle','posterColor','posterTextColor','posterFormat'].forEach(id=>$('#'+id).addEventListener('input',drawPoster));drawPoster();
$('#downloadPoster').onclick=()=>download(canvas.toDataURL('image/png'),'hex-studio-poster.png');
$('#audioInput').onchange=e=>{const f=e.target.files[0];if(!f)return;if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(f);$('#audioPreview').src=audioUrl;$('#audioName').textContent=f.name};
$('#exportProjects').onclick=()=>download(URL.createObjectURL(new Blob([JSON.stringify(projects,null,2)],{type:'application/json'})),'hex-studio-projects.json');
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000)}

// ─────────────────────────────────────────────────────────────────────────────
// HEX-VIDEO — éditeur multipiste local (Canvas + MediaRecorder + Web Audio)
// ─────────────────────────────────────────────────────────────────────────────
(()=>{
  const q=s=>document.querySelector(s);
  const canvas=q('#editorCanvas'), ctx=canvas.getContext('2d');
  const input=q('#mediaInput'), bin=q('#mediaBin'), scroll=q('#timelineScroll');
  const tracks=[...document.querySelectorAll('.track-row')];
  const state={media:[],clips:[],selected:null,playhead:0,zoom:70,playing:false,raf:0,previewVideos:new Map(),previewAudio:[],exporting:false};
  const trackNames=['V2','V1','A1','A2'];
  const trackKinds=['video','video','audio','audio'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=t=>{t=Math.max(0,Number(t)||0);const m=Math.floor(t/60),s=t%60;return String(m).padStart(2,'0')+':'+s.toFixed(2).padStart(5,'0')};
  const dur=c=>Math.max(0,c.out-c.in);
  const total=()=>state.clips.length?Math.max(0.1,...state.clips.map(c=>c.start+dur(c))):8;
  const px=t=>t*state.zoom;
  const timeAt=x=>Math.max(0,x/state.zoom);
  const selected=()=>state.clips.find(c=>c.id===state.selected);

  function makeMedia(file){
    const type=file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':null;
    if(!type)return;
    const url=URL.createObjectURL(file), el=document.createElement(type);
    el.preload='metadata';el.src=url;
    el.onloadedmetadata=()=>{
      const item={id:crypto.randomUUID(),file,url,type,duration:Number.isFinite(el.duration)?el.duration:0,name:file.name};
      state.media.push(item);renderBin();
      if(type==='video')q('#editorPlaceholder').style.display='none';
      addClip(item,type==='video'?1:2,0);
      el.remove();
    };
    el.onerror=()=>{URL.revokeObjectURL(url);alert('Ce média ne peut pas être lu par le navigateur.');};
  }
  input.addEventListener('change',e=>{[...e.target.files].forEach(makeMedia);input.value='';});
  function addClip(media,track,start){
    const c={id:crypto.randomUUID(),mediaId:media.id,name:media.name,type:media.type,track,start,in:0,out:media.duration};
    state.clips.push(c);state.selected=c.id;renderAll();setPlayhead(start);
  }
  function renderBin(){
    bin.innerHTML=state.media.length?state.media.map(m=>`<button class="media-bin-item" data-media="${m.id}"><span>${m.type==='video'?'▣':'♫'}</span><b title="${esc(m.name)}">${esc(m.name)}</b><small>${m.duration.toFixed(1)} s</small><i>＋</i></button>`).join(''):'<p class="muted">Aucun média importé.</p>';
    bin.querySelectorAll('[data-media]').forEach(b=>b.addEventListener('click',()=>{const m=state.media.find(x=>x.id===b.dataset.media);if(m)addClip(m,m.type==='video'?1:2,total());}));
  }
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderRuler(){
    const scale=q('#rulerScale'), width=px(total()+2);scale.style.width=width+'px';scale.innerHTML='';
    const step=state.zoom>95?1:state.zoom>48?2:5;
    for(let t=0;t<=total()+1;t+=step){const tick=document.createElement('span');tick.className='ruler-tick';tick.style.left=px(t)+'px';tick.textContent=fmt(t).slice(0,5);scale.append(tick);}
    tracks.forEach(r=>{r.querySelector('.track-lane').style.width=width+'px';});
    scroll.querySelector('.timeline-ruler').style.width=(width+132)+'px';
  }
  function renderTracks(){
    renderRuler();
    tracks.forEach((row,i)=>{
      const lane=row.querySelector('.track-lane');lane.innerHTML='';
      state.clips.filter(c=>c.track===i).forEach(c=>{
        const el=document.createElement('div');el.className='timeline-clip '+(c.type==='audio'?'audio-clip':'video-clip')+(c.id===state.selected?' selected':'');
        el.style.left=px(c.start)+'px';el.style.width=Math.max(34,px(dur(c)))+'px';el.dataset.clip=c.id;
        el.innerHTML=`<span class="clip-wave">${c.type==='audio'?'♫':'▥'}</span><b>${esc(c.name)}</b><small>${dur(c).toFixed(1)}s</small>`;
        el.draggable=true;
        el.addEventListener('click',e=>{e.stopPropagation();state.selected=c.id;renderAll();});
        el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/hex-clip',c.id);});
        lane.append(el);
      });
      lane.onclick=e=>{if(e.target===lane){state.selected=null;setPlayhead(timeAt(e.offsetX));renderAll();}};
      lane.ondragover=e=>e.preventDefault();
      lane.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/hex-clip');const c=state.clips.find(x=>x.id===id);if(c){const rect=lane.getBoundingClientRect();c.start=Math.max(0,timeAt(e.clientX-rect.left));c.track=i;if((i<2)!==(c.type==='video')){c.track=c.type==='video'?1:2;}state.selected=id;renderAll();}};
    });
    q('#clipCount').textContent=state.clips.length+' clip'+(state.clips.length>1?'s':'');
    q('#totalTime').textContent=fmt(total());
    const head=q('#playhead');head.style.left=(132+px(state.playhead))+'px';
    head.style.height=(tracks.length*66+32)+'px';
  }
  function renderInspector(){
    const c=selected(),none=!c;q('#noClip').hidden=!none;q('#clipProperties').hidden=none;
    if(!c)return;
    q('#selectedName').textContent=c.name;q('#selectedType').textContent=c.type==='video'?'Clip vidéo':'Clip audio';
    q('#clipPosition').value=c.start.toFixed(2);q('#clipIn').value=c.in.toFixed(2);q('#clipOut').value=c.out.toFixed(2);
    q('#clipTrack').value=String(c.track);q('#clipDuration').textContent=dur(c).toFixed(2)+' s';
  }
  function renderAll(){renderTracks();renderInspector();drawFrame(state.playhead);}
  function setPlayhead(t){state.playhead=clamp(t,0,total());q('#currentTime').textContent=fmt(state.playhead);q('#playhead').style.left=(132+px(state.playhead))+'px';drawFrame(state.playhead);}
  function mediaFor(c){return state.media.find(m=>m.id===c.mediaId);}
  function getVideo(c){
    if(state.previewVideos.has(c.id))return state.previewVideos.get(c.id);
    const m=mediaFor(c);if(!m)return null;
    const v=document.createElement('video');v.src=m.url;v.muted=true;v.playsInline=true;v.preload='auto';q('#mediaElements').append(v);state.previewVideos.set(c.id,v);return v;
  }
  function drawFrame(t){
    ctx.fillStyle='#080a0a';ctx.fillRect(0,0,canvas.width,canvas.height);
    const active=state.clips.filter(c=>c.type==='video'&&c.track<2&&t>=c.start&&t<c.start+dur(c)).sort((a,b)=>b.track-a.track);
    if(!active.length){ctx.fillStyle='#7b8581';ctx.textAlign='center';ctx.font='500 26px Arial';ctx.fillText('HEX-VIDEO',canvas.width/2,canvas.height/2);return;}
    active.forEach(c=>{
      const v=getVideo(c);if(!v)return;
      const target=c.in+(t-c.start);
      if(Math.abs((v.currentTime||0)-target)>.35&&!state.playing){try{v.currentTime=target}catch{}}
      if(v.readyState>=2){const scale=Math.min(canvas.width/v.videoWidth,canvas.height/v.videoHeight),w=v.videoWidth*scale,h=v.videoHeight*scale;ctx.drawImage(v,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
    });
  }
  function updateField(id,fn){q('#'+id).addEventListener('change',()=>{const c=selected();if(!c)return;fn(c,Number(q('#'+id).value));c.in=clamp(c.in,0,Math.max(0,mediaFor(c).duration-.05));c.out=clamp(c.out,c.in+.05,mediaFor(c).duration);c.start=Math.max(0,c.start);renderAll();});}
  updateField('clipPosition',(c,v)=>c.start=Math.max(0,v));
  updateField('clipIn',(c,v)=>c.in=clamp(v,0,c.out-.05));
  updateField('clipOut',(c,v)=>c.out=clamp(v,c.in+.05,mediaFor(c).duration));
  q('#clipTrack').addEventListener('change',()=>{const c=selected();if(!c)return;let n=Number(q('#clipTrack').value);if((n<2)!==(c.type==='video'))n=c.type==='video'?1:2;c.track=n;renderAll();});
  q('#duplicateClip').onclick=()=>{const c=selected();if(!c)return;const copy={...c,id:crypto.randomUUID(),start:c.start+dur(c)};state.clips.push(copy);state.selected=copy.id;renderAll();};
  q('#deleteClip').onclick=()=>{const c=selected();if(!c)return;state.clips=state.clips.filter(x=>x.id!==c.id);state.selected=null;renderAll();};
  q('#splitClip').onclick=()=>{
    const c=selected();if(!c)return alert('Sélectionnez un clip à séparer.');
    const cut=c.in+(state.playhead-c.start);if(cut<=c.in+.05||cut>=c.out-.05)return alert('Placez le curseur à l’intérieur du clip.');
    const second={...c,id:crypto.randomUUID(),start:state.playhead,in:cut};c.out=cut;state.clips.push(second);state.selected=second.id;renderAll();
  };
  q('#timelineZoom').oninput=e=>{state.zoom=Number(e.target.value);renderTracks();};
  q('#toStart').onclick=()=>setPlayhead(0);q('#toEnd').onclick=()=>setPlayhead(total());
  q('#playTimeline').onclick=()=>state.playing?stopPreview():startPreview();
  async function startPreview(){
    if(!state.clips.length)return;
    if(state.playhead>=total())setPlayhead(0);state.playing=true;q('#playTimeline').textContent='Ⅱ';
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(AudioCtx){
      try{
        state.previewContext=new AudioCtx();await state.previewContext.resume();
        for(const c of state.clips.filter(x=>x.type==='audio'||x.type==='video')){
          const m=mediaFor(c);if(!m)continue;
          try{const buffer=await state.previewContext.decodeAudioData(await m.file.arrayBuffer());const offset=c.in+Math.max(0,state.playhead-c.start);const delay=Math.max(0,c.start-state.playhead);const remain=c.out-offset;if(remain<=0)continue;const src=state.previewContext.createBufferSource();src.buffer=buffer;src.connect(state.previewContext.destination);src.start(state.previewContext.currentTime+delay,offset,remain);state.previewAudio.push(src);}catch(err){console.warn('Aperçu audio ignoré :',m.name,err);}
        }
      }catch(err){console.warn('Audio preview indisponible',err);}
    }
    let last=performance.now(),start=state.playhead;
    const tick=now=>{if(!state.playing)return;state.playhead=start+(now-last)/1000;if(state.playhead>=total()){setPlayhead(total());stopPreview();return;}
      state.clips.filter(c=>c.type==='video').forEach(c=>{const v=getVideo(c),active=state.playhead>=c.start&&state.playhead<c.start+dur(c);if(!v)return;if(active){const target=c.in+state.playhead-c.start;if(v.paused){try{v.currentTime=target;v.play()}catch{}}}else if(!v.paused)v.pause();});
      q('#currentTime').textContent=fmt(state.playhead);q('#playhead').style.left=(132+px(state.playhead))+'px';drawFrame(state.playhead);state.raf=requestAnimationFrame(tick);};
    state.raf=requestAnimationFrame(tick);
  }
  function stopPreview(){state.playing=false;cancelAnimationFrame(state.raf);q('#playTimeline').textContent='▶';state.previewVideos.forEach(v=>v.pause());state.previewAudio.forEach(n=>{try{n.stop()}catch{}});state.previewAudio=[];if(state.previewContext){state.previewContext.close().catch(()=>{});state.previewContext=null;}drawFrame(state.playhead);}
  q('#playhead').addEventListener('pointerdown',e=>{e.preventDefault();const move=ev=>{const rect=scroll.getBoundingClientRect();setPlayhead(timeAt(ev.clientX-rect.left-132+scroll.scrollLeft));};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});
  q('#rulerScale').addEventListener('click',e=>{const rect=e.currentTarget.getBoundingClientRect();setPlayhead(timeAt(e.clientX-rect.left));});
  q('#timelineRuler').addEventListener('click',e=>{if(e.target.classList.contains('ruler-label'))return;const rect=q('#rulerScale').getBoundingClientRect();setPlayhead(timeAt(e.clientX-rect.left));});
  q('#exportVideo').onclick=exportTimeline;

  async function exportTimeline(){
    if(state.exporting)return;
    const videoClips=state.clips.filter(c=>c.type==='video'&&c.track<2);
    if(!videoClips.length)return alert('Ajoutez au moins un clip vidéo pour exporter.');
    if(!window.MediaRecorder||!canvas.captureStream)return alert('L’export vidéo n’est pas pris en charge par ce navigateur. Essayez Chrome récent.');
    stopPreview();state.exporting=true;
    const end=total(),fps=30,stream=canvas.captureStream(fps),AudioCtx=window.AudioContext||window.webkitAudioContext;
    let audioCtx=null,dest=null,recorder=null,raf=0,videoNodes=[];
    try{
      if(AudioCtx){
        audioCtx=new AudioCtx();await audioCtx.resume();dest=audioCtx.createMediaStreamDestination();
        const audioClips=state.clips.filter(c=>c.type==='audio'||(c.type==='video'&&mediaFor(c)?.file));
        for(const c of audioClips){
          const m=mediaFor(c);if(!m)continue;
          try{
            const buffer=await audioCtx.decodeAudioData(await m.file.arrayBuffer());
            const src=audioCtx.createBufferSource(),gain=audioCtx.createGain();src.buffer=buffer;src.connect(gain);gain.connect(dest);
            src.start(c.start,c.in,dur(c));videoNodes.push(src);
          }catch(err){console.warn('Audio non décodé :',m.name,err);}
        }
        dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      }
      const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||'';
      const chunks=[];recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6500000}:undefined);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise(resolve=>recorder.onstop=resolve);
      recorder.start(250);
      q('#exportProgress').hidden=false;q('#exportBar').style.width='0%';
      const vids=videoClips.map(c=>({c,v:document.createElement('video'),started:false}));
      vids.forEach(x=>{x.v.src=mediaFor(x.c).url;x.v.muted=true;x.v.playsInline=true;x.v.preload='auto';});
      const startAt=performance.now();
      await Promise.all(vids.map(x=>new Promise(res=>{x.v.onloadedmetadata=res;x.v.onerror=res;})));
      const render=now=>{
        const t=(now-startAt)/1000;
        ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
        vids.filter(x=>t>=x.c.start&&t<x.c.start+dur(x.c)).sort((a,b)=>b.c.track-a.c.track).forEach(x=>{
          if(!x.started){x.started=true;try{x.v.currentTime=x.c.in;x.v.play()}catch{}}
          if(x.v.readyState>=2){const scale=Math.min(canvas.width/x.v.videoWidth,canvas.height/x.v.videoHeight),w=x.v.videoWidth*scale,h=x.v.videoHeight*scale;ctx.drawImage(x.v,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}
        });
        q('#exportPercent').textContent=Math.min(100,Math.round(t/end*100))+'%';q('#exportBar').style.width=Math.min(100,t/end*100)+'%';
        q('#exportLabel').textContent='Rendu de la timeline…';
        if(t<end){raf=requestAnimationFrame(render);}else{vids.forEach(x=>x.v.pause());recorder.stop();}
      };
      raf=requestAnimationFrame(render);
      await done;
      const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});
      const ext=blob.type.includes('mp4')?'mp4':'webm';
      const fileName=(q('#videoProjectName')?.value||'hex-video-montage').trim().replace(/[^\w-]+/g,'-')+'.'+ext;
      if(window.HexAndroid&&typeof window.HexAndroid.saveExport==='function'){
        const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
        for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
        window.HexAndroid.saveExport(fileName,btoa(binary),blob.type||'video/webm');
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
      }
      q('#exportLabel').textContent='Export terminé';q('#exportPercent').textContent='100%';q('#exportBar').style.width='100%';
    }catch(err){console.error(err);alert('L’export a échoué : '+(err.message||'erreur inconnue'));}
    finally{cancelAnimationFrame(raf);videoNodes.forEach(n=>{try{n.stop()}catch{}});if(audioCtx)await audioCtx.close();stream.getTracks().forEach(t=>t.stop());state.exporting=false;setTimeout(()=>{q('#exportProgress').hidden=true;},2200);}
  }
  renderBin();renderAll();
  window.addEventListener('beforeunload',()=>state.media.forEach(m=>URL.revokeObjectURL(m.url)));
})();
