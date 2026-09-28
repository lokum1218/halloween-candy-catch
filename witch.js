import {createWitchGame,TICK_RATE,MAX_TICKS} from './witch-engine.js?v=3';
const API='https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api/witch';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const witchSprite=new Image(),playerSprite=new Image();witchSprite.src='./witch-pixel-v1.png';playerSprite.src='./player-pixel-v1.png';
let game=null,session=null,trace=[],desiredLane=1,desiredHide=false,queuedThrow=false,acc=0,last=0,active=false,pointer=null,pending=null;
const seconds=t=>(t/TICK_RATE).toFixed(1)+'초';
function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function sprite(img,cx,bottom,maxW,maxH){if(!img.complete||!img.naturalWidth)return;const ratio=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,cx-w/2,bottom-h,w,h);}
function draw(){
 const w=960,h=590,s=game,phase=s?s.phase:0,look=s&&phase>=30&&phase<200,lane=s?s.witchLane:1;
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#182825');bg.addColorStop(.55,'#314d43');bg.addColorStop(1,'#131c27');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#dff19e';ctx.beginPath();ctx.arc(780,95,44,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20332e';ctx.beginPath();ctx.arc(798,78,42,0,Math.PI*2);ctx.fill();
 for(let i=0;i<14;i++){ctx.fillStyle=i%2?'#d7ef9d':'#a6c9ac';ctx.beginPath();ctx.arc((i*173+55)%960,(i*73+41)%310,2,0,7);ctx.fill();}
 ctx.fillStyle='#13201f';ctx.beginPath();ctx.moveTo(0,350);for(let x=0;x<=960;x+=32)ctx.lineTo(x,342+Math.sin(x*.017)*24);ctx.lineTo(960,590);ctx.lineTo(0,590);ctx.fill();
 ctx.textAlign='center';ctx.font='bold 16px sans-serif';ctx.fillStyle='#d8eaaa';ctx.fillText('마녀의 시선',480,40);
 if(s&&!s.ended){ctx.fillStyle=look?'#d3f174':'#a9c9a9';ctx.fillText(look?'마녀가 돌아봤다! · 5초 안에 피하세요':'마녀의 뒤통수를 살피세요',480,66);}
 ctx.save();if(!look){ctx.filter='brightness(.4) saturate(.45)';}else{ctx.shadowColor='#cbf978';ctx.shadowBlur=25;}sprite(witchSprite,480,353,230,260);ctx.restore();
 const xs=[190,480,770];for(let i=0;i<3;i++){
  if(s&&!s.ended&&i===lane){rounded(xs[i]-126,331,252,227,25,look?'#d5f46765':'#172a2855');}
  if(s&&i===s.lane){sprite(playerSprite,xs[i],s.hidden?570:459,150,170);}
  rounded(xs[i]-119,418,238,137,18,'#13231e');rounded(xs[i]-109,429,218,116,15,i===1?'#3f5b4a':'#385147');rounded(xs[i]-94,447,188,74,10,'#6d8970');
  ctx.fillStyle='#edffda';ctx.font='bold 19px sans-serif';ctx.fillText(['왼쪽','가운데','오른쪽'][i],xs[i],494);
 }
 ctx.fillStyle='#c5dcb4';ctx.font='bold 16px sans-serif';ctx.fillText('엄폐물 뒤를 톡 클릭하면 숨습니다 · 아래로 당기면 과자를 던집니다',480,577);
}
async function api(path,data){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'기록 서버에 연결할 수 없습니다.');return d;}
function hud(){if(!game)return;$('time').textContent=seconds(game.tick);$('throws').textContent=game.throws+'개';$('gaze').textContent=game.phase>=30&&game.phase<200?'뒤돌아봄!':'뒤돌아 있음';}
async function save(){if(!pending)return;$('save-status').textContent='기록 저장 중…';$('retry').hidden=true;try{const d=await api('/records',pending);pending=null;$('save-status').textContent='저장 완료 · 기록 번호 '+d.record.id;$('again').disabled=false;}catch(e){$('save-status').textContent='저장 실패: '+e.message;$('retry').hidden=false;}}
function finish(){active=false;$('end-title').textContent=game.reason==='끝까지 버팀'?'마녀를 끝까지 따돌렸어요!':game.reason==='과자를 던지지 않음'?'과자를 던져야 해요!':'마녀에게 들켰어요!';$('end-detail').textContent='던진 과자 '+game.throws+'개 · '+(game.reason==='끝까지 버팀'?'90초 생존 성공':'다음에는 마녀의 시선을 보고 숨으세요.');$('final-time').textContent=seconds(game.tick);$('end').classList.toggle('caught',game.reason==='들킴');$('end').classList.remove('hidden');$('again').disabled=true;
 pending={sessionId:session.sessionId,trace:[...trace]};save();}
function frame(now){if(active){if(!last)last=now;acc+=Math.min(100,now-last);last=now;while(acc>=1000/TICK_RATE&&active){const command=desiredLane|(desiredHide?4:0)|(queuedThrow?8:0);queuedThrow=false;try{game.step(command);trace.push(command);}catch(e){desiredLane=game.lane;desiredHide=false;queuedThrow=false;game.step(game.lane);trace.push(game.lane);}desiredHide=game.hidden;acc-=1000/TICK_RATE;if(game.ended)finish();}hud();}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
$('start-form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;$('start-status').textContent='게임 준비 중…';try{session=await api('/sessions',{nickname:$('nickname').value});game=createWitchGame(session.seed);$('name').textContent=session.nickname;trace=[];desiredLane=1;desiredHide=false;queuedThrow=false;acc=0;last=0;active=true;$('start').classList.add('hidden');$('start-status').textContent='';}catch(err){$('start-status').textContent=err.message;}finally{b.disabled=false;}};
$('retry').onclick=save;$('again').onclick=()=>{$('end').classList.add('hidden');$('start').classList.remove('hidden');$('save-status').textContent='';};
canvas.addEventListener('pointerdown',e=>{if(!active)return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!active||!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){desiredLane=Math.max(0,Math.min(2,game.lane+(dx>0?1:-1)));desiredHide=false;}else if(dy>35){desiredHide=false;queuedThrow=true;}else if(Math.abs(dx)<30&&Math.abs(dy)<30){desiredHide=!game.hidden;} });
canvas.addEventListener('pointercancel',()=>pointer=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){last=0;acc=0;}});
