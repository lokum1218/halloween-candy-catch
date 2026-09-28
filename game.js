import {createGame,STEP,ENGINE_VERSION} from './engine.js';
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startPanel = document.getElementById('start-panel');
  const endPanel = document.getElementById('end-panel');
  const form = document.getElementById('start-form');
  const nameInput = document.getElementById('nickname');
  const playerEl = document.getElementById('player-name');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const missesEl = document.getElementById('misses');
  const finalScoreEl = document.getElementById('final-score');
  const summaryEl = document.getElementById('end-summary');
  const againButton = document.getElementById('again-button');
  const keys = { left: false, right: false };
  const stars = Array.from({ length: 45 }, (_, i) => ({
    x: ((i * 283 + 47) % 1000) / 1000,
    y: ((i * 173 + 71) % 790) / 1000,
    r: i % 7 === 0 ? 2 : 1,
  }));
  const candyIcons = ['🍬', '🍭', '🍬', '🍫'];
  let W = 900, H = 520, last = 0;
  const API = 'https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api';
  let engine = null, session = null, trace = [], accumulator = 0, pending = null;
  const saveStatus = document.getElementById('save-status');
  const retryButton = document.getElementById('retry-save');
  const startStatus = document.getElementById('start-status');
  const startButton = form.querySelector('button');
  let state = 'ready';
  let player = '';
  let score = 0, misses = 0, remaining = 60, elapsed = 0, spawnClock = 0;
  let basketX = W / 2, targetX = null;
  let drops = [], particles = [], floaters = [];

  function resize() {
    const rect=canvas.getBoundingClientRect();
    if(state!=='playing') {W=Math.round(rect.width)||900;H=Math.round(rect.height)||520;basketX=W/2;}
    const ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
    ctx.setTransform(ratio*rect.width/W,0,0,ratio*rect.height/H,0,0);
  }
  async function api(path,payload) {
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'기록 서버에 연결할 수 없습니다.');return data;
    } finally {clearTimeout(timer);}
  }
  function basketWidth() { return Math.max(64, Math.min(88, W * .13)); }
  function clampX(x) { return Math.max(basketWidth() / 2 + 5, Math.min(W - basketWidth() / 2 - 5, x)); }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(3, '0');
    timeEl.innerHTML = `${Math.ceil(remaining)}<span class="unit">초</span>`;
    missesEl.innerHTML = `${misses}<span class="unit"> / 5</span>`;
  }
  async function startGame(nickname) {
    if(state==='loading'||state==='saving'||pending)return;
    const clean=String(nickname).trim().slice(0,16);
    if(!clean)throw new Error('밴드 닉네임을 입력해 주세요.');
    state='loading';startButton.disabled=true;againButton.disabled=true;
    startStatus.textContent='기록 서버에 연결 중…';
    try {
      resize();
      session=await api('/sessions',{nickname:clean,width:W,height:H});
      if(session.version!==ENGINE_VERSION)throw new Error('게임이 업데이트됐습니다. 새로고침해 주세요.');
      W=session.width;H=session.height;engine=createGame(session.seed,W,H);trace=[];accumulator=0;
      player=session.nickname;playerEl.textContent=player;
      score=0;misses=0;remaining=60;elapsed=0;basketX=W/2;targetX=null;drops=[];particles=[];floaters=[];
      state='playing';resize();startPanel.classList.add('hidden');endPanel.classList.add('hidden');
      startStatus.textContent='';keys.left=keys.right=false;updateHud();
    } catch(error) {
      state='ready';endPanel.classList.add('hidden');startPanel.classList.remove('hidden');
      startStatus.textContent=error.message==='Failed to fetch'?'기록 서버에 연결하지 못했습니다. 다시 시도해 주세요.':error.message;
    } finally {startButton.disabled=false;againButton.disabled=false;}
  }
  async function saveRecord() {
    if(!pending)return;
    state='saving';saveStatus.textContent='점수 확인 및 기록 저장 중…';retryButton.hidden=true;againButton.disabled=true;
    try {
      const data=await api('/records',{sessionId:pending.sessionId,trace:pending.trace});
      finalScoreEl.textContent=data.record.score;
      saveStatus.textContent=`저장 완료 · 기록 번호 #${data.record.id}`;
      pending=null;try{sessionStorage.removeItem('candy-pending-record');}catch{}
      state='ended';againButton.disabled=false;
    } catch(error) {
      state='ended';saveStatus.textContent='아직 저장되지 않았어요. '+(error.message==='Failed to fetch'?'연결을 확인하고 다시 저장해 주세요.':error.message);
      retryButton.hidden=false;
    }
  }
  function finish() {
    state='ended';endPanel.classList.remove('hidden');finalScoreEl.textContent=score;
    summaryEl.textContent=misses>=5?`${player}님, 사탕을 5개 놓쳤어요. 다음엔 더 빠르게!`:`${player}님, 60초를 버텼어요. 꽤 매서운 밤이었죠?`;
    pending={sessionId:session.sessionId,trace,nickname:player,score};
    try{sessionStorage.setItem('candy-pending-record',JSON.stringify(pending));}catch{}
    saveRecord();
  }
  function burst(x, y, color, label) {
    floaters.push({ x, y, text: label, life: .85, color });
    for (let i = 0; i < 9; i++) particles.push({ x, y, vx: (Math.random() - .5) * 170,
      vy: -Math.random() * 120, life: .55 + Math.random() * .35, color });
  }
  function tick(dt) {
    if(state!=='playing')return;
    accumulator+=dt;
    while(accumulator>=STEP&&state==='playing') {
      accumulator-=STEP;
      const speed=Math.max(280,Math.min(490,W*.58));
      let target=targetX===null?engine.x:targetX;
      if(keys.left||keys.right)target=engine.x+((keys.right?1:0)-(keys.left?1:0))*speed*STEP;
      target=Math.round(Math.max(0,Math.min(W,target)));
      trace.push(target);
      const events=engine.step(target);
      score=engine.score;misses=engine.misses;elapsed=engine.tick*STEP;remaining=Math.max(0,60-elapsed);basketX=engine.x;drops=engine.drops;
      events.forEach(e=>burst(e.x,e.y,e.type==='catch'?'#ffd477':'#fb7c9b',e.type==='catch'?'+10':e.type==='bomb'?'−15':'MISS'));
      if(engine.ended)finish();
    }
    particles=particles.filter(p=>(p.life-=dt)>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;});
    floaters=floaters.filter(f=>(f.life-=dt)>0);floaters.forEach(f=>f.y-=28*dt);
    updateHud();
  }
  function roundRect(x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }
  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#160f29'); sky.addColorStop(.58, '#382344'); sky.addColorStop(1, '#492b43');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => { ctx.globalAlpha = .35 + .28 * Math.sin(elapsed * 2 + s.x * 20);
      ctx.fillStyle = '#fbd5aa'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const groundY = H - Math.max(32, H * .073);
    ctx.fillStyle = '#20152d'; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#80536c'; ctx.fillRect(0, groundY, W, 2);
    for (let x = 0; x < W; x += 36) { ctx.fillStyle = '#5b3e59'; ctx.fillRect(x + 5, groundY + 18, 9, 2); }
    if (state !== 'playing' && drops.length === 0) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.max(30, Math.min(42, W * .055))}px sans-serif`;
      ['🍬','🍭','🍫','🍬'].forEach((icon, i) => ctx.fillText(icon, W * (.12 + i * .25), H * (.22 + (i % 2) * .17)));
    }
    drops.forEach(d => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${d.size}px sans-serif`;
      ctx.shadowColor = d.bomb ? '#ed6c91' : '#ffc070'; ctx.shadowBlur = 16;
      ctx.fillText(d.icon, d.x, d.y); ctx.shadowBlur = 0;
    });
    const bw = basketWidth(), bh = Math.max(35, Math.min(48, H * .085));
    const bx = basketX - bw / 2, by = groundY - bh + 10;
    ctx.shadowColor = '#ff934b'; ctx.shadowBlur = 21;
    roundRect(bx - 4, by - 8, bw + 8, 13, 7, '#ffcd79'); ctx.shadowBlur = 0;
    ctx.fillStyle = '#d8672f'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw * .82, by + bh); ctx.quadraticCurveTo(basketX, by + bh + 7, bx + bw * .18, by + bh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffae57'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#41233a'; ctx.beginPath(); ctx.moveTo(basketX - bw * .2, by + bh * .38);
    ctx.lineTo(basketX - bw * .06, by + bh * .38); ctx.lineTo(basketX - bw * .11, by + bh * .61); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(basketX + bw * .2, by + bh * .38);
    ctx.lineTo(basketX + bw * .06, by + bh * .38); ctx.lineTo(basketX + bw * .11, by + bh * .61); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(basketX, by + bh * .61, bw * .16, 0, Math.PI); ctx.fill();
    particles.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 1.6); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });
    ctx.globalAlpha = 1;
    floaters.forEach(f => { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.color; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(f.text, f.x, f.y); });
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    tick(dt); draw(); requestAnimationFrame(frame);
  }
  form.addEventListener('submit', async event => { event.preventDefault(); try { await startGame(nameInput.value); } catch (error) { nameInput.setCustomValidity(error.message); nameInput.reportValidity(); } });
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  againButton.addEventListener('click', () => startGame(player));
  retryButton.addEventListener('click',saveRecord);
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { keys.left = true; targetX = null; if (state === 'playing') event.preventDefault(); }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { keys.right = true; targetX = null; if (state === 'playing') event.preventDefault(); }
  });
  window.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });
  canvas.addEventListener('pointerdown', event => { if (state === 'playing') { canvas.setPointerCapture(event.pointerId); targetX = clampX((event.clientX - canvas.getBoundingClientRect().left) * W / canvas.getBoundingClientRect().width); } });
  canvas.addEventListener('pointermove', event => { if (state === 'playing' && (event.buttons || event.pointerType === 'mouse')) targetX = clampX((event.clientX - canvas.getBoundingClientRect().left) * W / canvas.getBoundingClientRect().width); });
  ['left', 'right'].forEach(direction => {
    const button = document.getElementById(`${direction}-button`);
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys[direction] = true; targetX = null; });
    button.addEventListener('pointerup', () => keys[direction] = false);
    button.addEventListener('pointercancel', () => keys[direction] = false);
    button.addEventListener('lostpointercapture', () => keys[direction] = false);
  });
  if (document.modelContext?.registerTool) {
    try { Promise.resolve(document.modelContext.registerTool({
      name: 'start_candy_game', title: '사탕 사냥 시작',
      description: '밴드 닉네임을 정하고 60초 사탕 받기 게임을 시작합니다.',
      inputSchema: { type: 'object', properties: { nickname: { type: 'string', minLength: 1, maxLength: 16 } }, required: ['nickname'], additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute(input) { if (!input || typeof input.nickname !== 'string' || !input.nickname.trim() || input.nickname.length > 16) throw new Error('1~16자의 닉네임이 필요합니다.'); nameInput.value = input.nickname; return startGame(input.nickname); }
    })).catch(() => {}); } catch (_) { /* Unsupported WebMCP environments use the form. */ }
  }
  new ResizeObserver(resize).observe(canvas);
  resize(); updateHud(); requestAnimationFrame(frame);
  try {
    const saved=JSON.parse(sessionStorage.getItem('candy-pending-record')||'null');
    if(saved&&typeof saved.sessionId==='string'&&Array.isArray(saved.trace)) {
      pending=saved;player=saved.nickname;startPanel.classList.add('hidden');endPanel.classList.remove('hidden');
      finalScoreEl.textContent=saved.score;summaryEl.textContent='이전에 저장하지 못한 기록을 다시 전송합니다.';saveRecord();
    }
  }catch{}

})();
