import {createWitchGame,TICK_RATE,MAX_TICKS} from './witch-engine.js?v=4';
const API='https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api/witch';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const witchSprite=new Image(),playerSprite=new Image();witchSprite.src='./witch-pixel-v2.png';playerSprite.src='./player-pixel-v2.png';
let game=null,session=null,trace=[],desiredLane=1,desiredHide=false,queuedThrow=false,acc=0,last=0,active=false,pointer=null,pending=null;
const seconds=t=>(t/TICK_RATE).toFixed(1)+'초';
function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function sprite(img,cx,bottom,maxW,maxH){if(!img.complete||!img.naturalWidth)return;const ratio=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,cx-w/2,bottom-h,w,h);}
function resizeScene(){const mobile=window.matchMedia('(max-width:700px)').matches;const w=mobile?480:960,h=mobile?740:590;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return {w,h,mobile};}
function cookie(x,y,r){ctx.fillStyle='#f4b281';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.fillStyle='#9c4561';for(const [dx,dy] of [[-.36,-.22],[.24,-.3],[.08,.35],[-.45,.32]])ctx.fillRect(x+dx*r,y+dy*r,Math.max(3,r*.18),Math.max(3,r*.18));}
function draw(){
 const {w,h,mobile}=resizeScene(),s=game,phase=s?s.phase:0,look=s&&phase>=30&&phase<320,lane=s?s.witchLane:1;
 ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#2a1128';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#49203f';for(let y=0;y<h;y+=24){ctx.fillRect(0,y,w,2);}ctx.fillStyle='#d974a7';for(let i=0;i<25;i++){const x=(i*137+29)%w,y=(i*79+43)%(mobile?330:310);ctx.fillRect(x,y,4,4);}
 ctx.fillStyle='#67284b';ctx.fillRect(0,mobile?365:347,w,h);ctx.fillStyle='#8c385b';ctx.fillRect(0,mobile?375:357,w,8);
 for(const [x,y,r] of (mobile?[[45,138,18],[425,160,13],[65,345,15],[414,350,17]]:[[60,92,17],[895,110,22],[113,307,14],[827,325,16]]))cookie(x,y,r);
 ctx.textAlign='center';ctx.fillStyle='#ffe4f0';ctx.font=mobile?'bold 20px monospace':'bold 19px monospace';ctx.fillText(look?'마녀가 돌아봤다!':'마녀는 뒤돌아 있음',w/2,mobile?45:38);
 if(s&&!s.ended){ctx.fillStyle='#ffadca';ctx.font=mobile?'bold 16px monospace':'bold 16px monospace';ctx.fillText(look?'8초 안에 피하세요':'조용히 과자를 던져요',w/2,mobile?72:65);}
 ctx.save();if(!look)ctx.filter='brightness(.68)';else{ctx.shadowColor='#ff8ac4';ctx.shadowBlur=24;}sprite(witchSprite,w/2,mobile?337:354,mobile?178:206,mobile?218:247);ctx.restore();
 const xs=mobile?[90,240,390]:[190,480,770],coverY=mobile?547:424,coverW=mobile?128:224,coverH=mobile?148:130;
 for(let i=0;i<3;i++){
  if(s&&!s.ended&&i===lane){ctx.fillStyle=look?'#ff7cb455':'#ff9acc22';ctx.fillRect(xs[i]-coverW/2-5,coverY-12,coverW+10,coverH+23);}
  if(s&&i===s.lane)sprite(playerSprite,xs[i],s.hidden?coverY+coverH+26:coverY+20,mobile?112:130,mobile?145:165);
  ctx.fillStyle='#3e1936';ctx.fillRect(xs[i]-coverW/2-5,coverY-8,coverW+10,coverH+16);
  ctx.fillStyle='#c65a8b';ctx.fillRect(xs[i]-coverW/2,coverY,coverW,coverH);
  ctx.fillStyle='#ee8db2';ctx.fillRect(xs[i]-coverW/2+9,coverY+10,coverW-18,coverH-27);
  ctx.fillStyle='#6b274d';ctx.fillRect(xs[i]-coverW/2+15,coverY+17,coverW-30,coverH-42);
  ctx.fillStyle='#ffe6f1';ctx.font=mobile?'bold 17px monospace':'bold 18px monospace';ctx.fillText(['왼쪽','가운데','오른쪽'][i],xs[i],coverY+coverH/2+7);
 }
 ctx.fillStyle='#f4b5cf';ctx.font=mobile?'bold 14px monospace':'bold 16px monospace';ctx.fillText(mobile?'톡 숨기 · 아래로 던지기 · 좌우 이동':'톡 숨기 · 아래로 당겨 던지기 · 좌우로 밀어 이동',w/2,h-20);
}
async function api(path,data){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'기록 서버에 연결할 수 없습니다.');return d;}
function hud(){if(!game)return;$('time').textContent=seconds(game.tick);$('throws').textContent=game.throws+'개';$('gaze').textContent=game.phase>=30&&game.phase<320?'뒤돌아봄!':'뒤돌아 있음';}
async function save(){if(!pending)return;$('save-status').textContent='기록 저장 중…';$('retry').hidden=true;try{const d=await api('/records',pending);pending=null;$('save-status').textContent='저장 완료 · 기록 번호 '+d.record.id;$('again').disabled=false;}catch(e){$('save-status').textContent='저장 실패: '+e.message;$('retry').hidden=false;}}
function finish(){active=false;$('end-title').textContent=game.reason==='끝까지 버팀'?'마녀를 끝까지 따돌렸어요!':game.reason==='과자를 던지지 않음'?'과자를 던져야 해요!':'마녀에게 들켰어요!';$('end-detail').textContent='던진 과자 '+game.throws+'개 · '+(game.reason==='끝까지 버팀'?'90초 생존 성공':'다음에는 마녀의 시선을 보고 숨으세요.');$('final-time').textContent=seconds(game.tick);$('end').classList.toggle('caught',game.reason==='들킴');$('end').classList.remove('hidden');$('again').disabled=true;
 pending={sessionId:session.sessionId,trace:[...trace]};save();}
function frame(now){if(active){if(!last)last=now;acc+=Math.min(100,now-last);last=now;while(acc>=1000/TICK_RATE&&active){const command=desiredLane|(desiredHide?4:0)|(queuedThrow?8:0);queuedThrow=false;try{game.step(command);trace.push(command);}catch(e){desiredLane=game.lane;desiredHide=false;queuedThrow=false;game.step(game.lane);trace.push(game.lane);}desiredHide=game.hidden;acc-=1000/TICK_RATE;if(game.ended)finish();}hud();}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
$('start-form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;$('start-status').textContent='게임 준비 중…';try{session=await api('/sessions',{nickname:$('nickname').value});game=createWitchGame(session.seed);$('name').textContent=session.nickname;trace=[];desiredLane=1;desiredHide=false;queuedThrow=false;acc=0;last=0;active=true;$('start').classList.add('hidden');if(window.matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});$('start-status').textContent='';}catch(err){$('start-status').textContent=err.message;}finally{b.disabled=false;}};
$('retry').onclick=save;$('again').onclick=()=>{$('end').classList.add('hidden');$('start').classList.remove('hidden');$('save-status').textContent='';};
canvas.addEventListener('pointerdown',e=>{if(!active)return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!active||!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){desiredLane=Math.max(0,Math.min(2,game.lane+(dx>0?1:-1)));desiredHide=false;}else if(dy>35){desiredHide=false;queuedThrow=true;}else if(Math.abs(dx)<30&&Math.abs(dy)<30){desiredHide=!game.hidden;} });
canvas.addEventListener('pointercancel',()=>pointer=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){last=0;acc=0;}});
