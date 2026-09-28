import {createWitchGame,TICK_RATE,MAX_TICKS} from './witch-engine.js?v=5';
const API='https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api/witch';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const witchSprite=new Image(),playerSprite=new Image(),biscuitSprite=new Image(),houseSprite=new Image();witchSprite.src='./witch-pixel-v3.png';playerSprite.src='./player-pixel-v3.png';biscuitSprite.src='./biscuit-pixel-v3.png';houseSprite.src='./candy-house-v3.png';
let game=null,session=null,trace=[],desiredLane=1,desiredHide=false,queuedThrow=false,acc=0,last=0,active=false,pointer=null,pending=null;
const seconds=t=>(t/TICK_RATE).toFixed(1)+'초';
function sprite(img,cx,bottom,maxW,maxH){if(!img.complete||!img.naturalWidth)return;const scale=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,Math.round(cx-img.naturalWidth*scale/2),Math.round(bottom-img.naturalHeight*scale),Math.round(img.naturalWidth*scale),Math.round(img.naturalHeight*scale));}
function resizeScene(){const mobile=window.matchMedia('(max-width:700px)').matches;const w=mobile?480:960,h=mobile?740:590;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return {w,h,mobile};}
function house(w,h){ctx.fillStyle='#4c2141';ctx.fillRect(0,0,w,h);if(!houseSprite.complete||!houseSprite.naturalWidth)return;const iw=houseSprite.naturalWidth,ih=houseSprite.naturalHeight,aspect=w/h;let sw=iw,sh=iw/aspect,sx=0,sy=Math.max(0,(ih-sh)*.3);if(sh>ih){sh=ih;sw=ih*aspect;sx=(iw-sw)/2;sy=0;}ctx.imageSmoothingEnabled=false;ctx.drawImage(houseSprite,sx,sy,sw,sh,0,0,w,h);}
function geometry(mobile){return {xs:mobile?[90,240,390]:[190,480,770],coverY:mobile?515:397,coverW:mobile?145:225,coverH:mobile?160:160,witchBottom:mobile?358:362,witchW:mobile?175:190,witchH:mobile?230:250};}
function draw(){
 const {w,h,mobile}=resizeScene(),s=game,phase=s?s.phase:0,look=s&&phase>=30&&phase<320,g=geometry(mobile),witchLane=s?.witchLane??1;
 house(w,h);
 ctx.fillStyle='#35122b88';ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.fillStyle='#fff0da';ctx.font=mobile?'bold 20px monospace':'bold 22px monospace';ctx.fillText(look?'마녀가 돌아봤다!':'과자 집에 살금살금',w/2,mobile?44:39);
 if(s&&!s.ended){ctx.fillStyle='#ffd08d';ctx.font='bold 16px monospace';ctx.fillText(look?(phase<270?'8초 안에 숨으세요':'지금 숨으세요!'):'마녀를 눌러 과자를 던져요',w/2,mobile?68:64);}
 ctx.save();if(!look)ctx.filter='brightness(.76)';sprite(witchSprite,g.xs[witchLane],g.witchBottom,g.witchW,g.witchH);ctx.restore();
 for(let i=0;i<3;i++){
  if(s&&i===s.lane){sprite(playerSprite,g.xs[i],s.hidden?g.coverY+g.coverH+30:g.coverY+32,mobile?113:130,mobile?153:173);}
  if(s&&!s.ended&&i===s.lane){ctx.fillStyle=s.hidden?'#fff0cb88':'#ffb5cd77';ctx.fillRect(g.xs[i]-g.coverW/2+8,g.coverY+g.coverH-13,g.coverW-16,7);}
  sprite(biscuitSprite,g.xs[i],g.coverY+g.coverH,g.coverW,g.coverH);
 }
}
async function api(path,data){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'기록 서버에 연결할 수 없습니다.');return d;}
function hud(){if(!game)return;$('time').textContent=seconds(game.tick);$('throws').textContent=game.throws+'개';}
async function save(){if(!pending)return;$('save-status').textContent='기록 저장 중…';$('retry').hidden=true;try{const d=await api('/records',pending);pending=null;$('save-status').textContent='저장 완료 · 기록 번호 '+d.record.id;$('again').disabled=false;}catch(e){$('save-status').textContent='저장 실패: '+e.message;$('retry').hidden=false;}}
function finish(){active=false;$('end-title').textContent=game.reason==='끝까지 버팀'?'마녀를 끝까지 따돌렸어요!':game.reason==='과자를 던지지 않음'?'과자를 던져야 해요!':'마녀에게 들켰어요!';$('end-detail').textContent='던진 과자 '+game.throws+'개 · '+(game.reason==='끝까지 버팀'?'90초 생존 성공':'다음에는 마녀의 시선을 보고 숨으세요.');$('final-time').textContent=seconds(game.tick);$('end').classList.toggle('caught',game.reason==='들킴');$('end').classList.remove('hidden');$('again').disabled=true;
 pending={sessionId:session.sessionId,trace:[...trace]};save();}
function frame(now){if(active){if(!last)last=now;acc+=Math.min(100,now-last);last=now;while(acc>=1000/TICK_RATE&&active){const command=desiredLane|(desiredHide?4:0)|(queuedThrow?8:0);queuedThrow=false;try{game.step(command);trace.push(command);}catch(e){desiredLane=game.lane;desiredHide=false;queuedThrow=false;game.step(game.lane);trace.push(game.lane);}desiredHide=game.hidden;acc-=1000/TICK_RATE;if(game.ended)finish();}hud();}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
$('start-form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;$('start-status').textContent='게임 준비 중…';try{session=await api('/sessions',{nickname:$('nickname').value});game=createWitchGame(session.seed);trace=[];desiredLane=1;desiredHide=false;queuedThrow=false;acc=0;last=0;active=true;$('start').classList.add('hidden');if(window.matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});$('start-status').textContent='';}catch(err){$('start-status').textContent=err.message;}finally{b.disabled=false;}};
$('retry').onclick=save;$('again').onclick=()=>{$('end').classList.add('hidden');$('start').classList.remove('hidden');$('save-status').textContent='';};
canvas.addEventListener('pointerdown',e=>{if(!active)return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!active||!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){desiredLane=Math.max(0,Math.min(2,game.lane+(dx>0?1:-1)));desiredHide=false;return;}if(Math.hypot(dx,dy)>30)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height,g=geometry(canvas.width===480);const cover=g.xs.findIndex(cx=>Math.abs(x-cx)<=g.coverW/2+5&&y>=g.coverY-8&&y<=g.coverY+g.coverH+8);if(cover>=0){desiredLane=cover;desiredHide=true;queuedThrow=false;return;}const wx=g.xs[game.witchLane??1];if(Math.abs(x-wx)<=g.witchW/2+10&&y>=g.witchBottom-g.witchH-10&&y<=g.witchBottom+10){desiredHide=false;queuedThrow=true;}});
canvas.addEventListener('pointercancel',()=>pointer=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){last=0;acc=0;}});
