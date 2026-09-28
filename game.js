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
  let state = 'ready';
  let player = '';
  let score = 0, misses = 0, remaining = 60, elapsed = 0, spawnClock = 0;
  let basketX = W / 2, targetX = null;
  let drops = [], particles = [], floaters = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const oldW = W;
    W = rect.width || 900;
    H = rect.height || 520;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    basketX = oldW ? basketX / oldW * W : W / 2;
    drops.forEach(drop => { drop.x = drop.x / oldW * W; });
  }
  function basketWidth() { return Math.max(64, Math.min(88, W * .13)); }
  function clampX(x) { return Math.max(basketWidth() / 2 + 5, Math.min(W - basketWidth() / 2 - 5, x)); }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(3, '0');
    timeEl.innerHTML = `${Math.ceil(remaining)}<span class="unit">초</span>`;
    missesEl.innerHTML = `${misses}<span class="unit"> / 5</span>`;
  }
  function startGame(nickname) {
    const clean = String(nickname).trim().slice(0, 16);
    if (!clean) throw new Error('밴드 닉네임을 입력해 주세요.');
    player = clean;
    playerEl.textContent = player;
    score = 0; misses = 0; remaining = 60; elapsed = 0; spawnClock = .4;
    basketX = W / 2; targetX = null; drops = []; particles = []; floaters = [];
    state = 'playing';
    startPanel.classList.add('hidden');
    endPanel.classList.add('hidden');
    updateHud();
    canvas.focus?.();
    return { player, status: 'playing', remainingSeconds: 60 };
  }
  function finish() {
    state = 'ended';
    endPanel.classList.remove('hidden');
    finalScoreEl.textContent = score;
    summaryEl.textContent = misses >= 5
      ? `${player}님, 사탕을 5개 놓쳤어요. 다음엔 더 빠르게!`
      : `${player}님, 60초를 버텼어요. 꽤 매서운 밤이었죠?`;
    againButton.focus();
  }
  function spawn() {
    const bomb = Math.random() < Math.min(.29, .18 + elapsed / 500);
    const size = Math.max(25, Math.min(34, W * .052));
    drops.push({ x: 27 + Math.random() * (W - 54), y: -35, size,
      speed: (H / 2.1) + Math.random() * (H / 3.8) + elapsed * 2.2,
      drift: (Math.random() - .5) * 45, phase: Math.random() * 6.28,
      bomb, icon: bomb ? '💣' : candyIcons[Math.floor(Math.random() * candyIcons.length)] });
  }
  function burst(x, y, color, label) {
    floaters.push({ x, y, text: label, life: .85, color });
    for (let i = 0; i < 9; i++) particles.push({ x, y, vx: (Math.random() - .5) * 170,
      vy: -Math.random() * 120, life: .55 + Math.random() * .35, color });
  }
  function tick(dt) {
    if (state !== 'playing') return;
    elapsed += dt;
    remaining = Math.max(0, 60 - elapsed);
    const moveSpeed = Math.max(280, Math.min(490, W * .58));
    if (keys.left) basketX -= moveSpeed * dt;
    if (keys.right) basketX += moveSpeed * dt;
    if (!keys.left && !keys.right && targetX !== null) {
      const delta = targetX - basketX;
      basketX += Math.sign(delta) * Math.min(Math.abs(delta), moveSpeed * 1.5 * dt);
    }
    basketX = clampX(basketX);
    spawnClock -= dt;
    if (spawnClock <= 0) {
      spawn();
      spawnClock = Math.max(.38, .85 - elapsed * .006) * (.78 + Math.random() * .5);
    }
    const basketY = H - Math.max(47, Math.min(63, H * .12));
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.phase += dt * 2.7;
      d.x += (d.drift + Math.sin(d.phase) * 22) * dt;
      d.x = Math.max(18, Math.min(W - 18, d.x));
      d.y += d.speed * dt;
      const reach = basketWidth() * .40 + d.size * .24;
      if (d.y + d.size * .22 >= basketY - 9 && d.y < basketY + 20 && Math.abs(d.x - basketX) < reach) {
        if (d.bomb) { score = Math.max(0, score - 15); burst(d.x, basketY, '#fb7c9b', '−15'); }
        else { score += 10; burst(d.x, basketY, '#ffd477', '+10'); }
        drops.splice(i, 1);
        updateHud();
      } else if (d.y > H + d.size) {
        if (!d.bomb) { misses++; burst(d.x, H - 25, '#f39aa3', 'MISS'); updateHud(); }
        drops.splice(i, 1);
      }
    }
    particles = particles.filter(p => (p.life -= dt) > 0);
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt; });
    floaters = floaters.filter(f => (f.life -= dt) > 0);
    floaters.forEach(f => { f.y -= 28 * dt; });
    if (misses >= 5 || remaining <= 0) finish();
    else updateHud();
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
  form.addEventListener('submit', event => { event.preventDefault(); try { startGame(nameInput.value); } catch (error) { nameInput.setCustomValidity(error.message); nameInput.reportValidity(); } });
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  againButton.addEventListener('click', () => startGame(player));
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { keys.left = true; targetX = null; if (state === 'playing') event.preventDefault(); }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { keys.right = true; targetX = null; if (state === 'playing') event.preventDefault(); }
  });
  window.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });
  canvas.addEventListener('pointerdown', event => { if (state === 'playing') { canvas.setPointerCapture(event.pointerId); targetX = clampX(event.clientX - canvas.getBoundingClientRect().left); } });
  canvas.addEventListener('pointermove', event => { if (state === 'playing' && (event.buttons || event.pointerType === 'mouse')) targetX = clampX(event.clientX - canvas.getBoundingClientRect().left); });
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
})();
