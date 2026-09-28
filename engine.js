export const ENGINE_VERSION = 'candy-replay-v1';
export const STEP = 1 / 60;
export function createGame(seed, width, height) {
  let randomSeed = seed >>> 0;
  const random = () => {
    let t = randomSeed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const g = { width, height, tick: 0, score: 0, misses: 0, caught: 0, bombs: 0,
    x: width / 2, drops: [], ended: false, spawnClock: .4 };
  const bw = Math.max(64, Math.min(88, width * .13));
  g.step = (target) => {
    if (g.ended) return [];
    const events = [];
    g.tick++;
    const elapsed = g.tick * STEP;
    const speed = Math.max(280, Math.min(490, width * .58)) * 1.5;
    const delta = target - g.x;
    g.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * STEP);
    g.x = Math.max(bw / 2 + 5, Math.min(width - bw / 2 - 5, g.x));
    g.spawnClock -= STEP;
    if (g.spawnClock <= 0) {
      const bomb = random() < Math.min(.29, .18 + elapsed / 500);
      g.drops.push({x:27 + random() * (width - 54), y:-35,
        size:Math.max(25, Math.min(34, width * .052)),
        speed:height / 2.1 + random() * (height / 3.8) + elapsed * 2.2,
        drift:(random() - .5) * 45, phase:random() * 6.28,
        bomb, icon:bomb ? '💣' : ['🍬','🍭','🍬','🍫'][Math.floor(random() * 4)]});
      g.spawnClock = Math.max(.38, .85 - elapsed * .006) * (.78 + random() * .5);
    }
    const basketY = height - Math.max(47, Math.min(63, height * .12));
    for (let i = g.drops.length - 1; i >= 0; i--) {
      const d = g.drops[i];
      d.phase += STEP * 2.7;
      d.x = Math.max(18,Math.min(width - 18,d.x + (d.drift + Math.sin(d.phase) * 22) * STEP));
      d.y += d.speed * STEP;
      if(d.y + d.size * .22 >= basketY - 9 && d.y < basketY + 20 && Math.abs(d.x - g.x) < bw * .40 + d.size * .24) {
        if(d.bomb) {g.score = Math.max(0,g.score - 15); g.bombs++;}
        else {g.score += 10; g.caught++;}
        events.push({x:d.x,y:basketY,type:d.bomb?'bomb':'catch'});
        g.drops.splice(i,1);
      } else if(d.y > height + d.size) {
        if(!d.bomb){g.misses++; events.push({x:d.x,y:height-25,type:'miss'});}
        g.drops.splice(i,1);
      }
    }
    g.ended = g.misses >= 5 || g.tick >= 3600;
    return events;
  };
  return g;
}
export function replay(seed,width,height,trace) {
  if(!Array.isArray(trace)||trace.length<1||trace.length>3600) throw new Error('플레이 기록이 올바르지 않습니다.');
  const g=createGame(seed,width,height);
  for(const target of trace){
    if(g.ended||!Number.isInteger(target)||target<0||target>width) throw new Error('플레이 기록이 올바르지 않습니다.');
    g.step(target);
  }
  if(!g.ended) throw new Error('게임이 완료되지 않았습니다.');
  return {score:g.score,caught:g.caught,bombs:g.bombs,misses:g.misses,ticks:g.tick};
}
