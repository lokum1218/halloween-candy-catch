export const WITCH_VERSION='witch-v6';
export const TICK_RATE=30;
export const MAX_TICKS=2700;
function hash(seed,n){let x=(seed^Math.imul(n+1,0x9e3779b9))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return ((x^(x>>>16))>>>0)%3;}
function witchPosition(seed,segment){let lane=hash(seed,0);for(let n=1;n<=segment;n++)lane=(lane+1+(hash(seed,n)&1))%3;return lane;}
export function createWitchGame(seed){
 const state={seed:seed>>>0,tick:0,lane:1,hidden:false,hideTicks:0,hideCooldown:0,moveCooldown:0,throwCooldown:0,lastThrow:0,throws:0,ended:false,reason:''};
 state.step=(command)=>{
  if(state.ended)throw Error('이미 끝난 게임입니다.');
  if(!Number.isInteger(command)||command<0||command>14||(command&3)===3)throw Error('잘못된 조작 기록입니다.');
  const requestedLane=command&3,requestHide=!!(command&4),requestThrow=!!(command&8);
  if(requestedLane!==state.lane){if(state.moveCooldown)throw Error('이동 속도가 맞지 않습니다.');state.lane=requestedLane;state.moveCooldown=8;state.hidden=false;state.hideTicks=0;}
  if(state.moveCooldown)state.moveCooldown--;
  if(state.hideCooldown)state.hideCooldown--;
  if(state.throwCooldown)state.throwCooldown--;
  if(requestHide&&state.hideCooldown===0){state.hidden=true;state.hideTicks++;}else{state.hidden=false;state.hideTicks=0;}
  if(state.hideTicks>75){state.hidden=false;state.hideTicks=0;state.hideCooldown=45;}
  const phase=state.tick%330,cycle=Math.floor(state.tick/330),witchLane=witchPosition(state.seed,cycle*6+Math.min(5,Math.floor(phase/60)));
  if(requestThrow){if(state.hidden||state.throwCooldown)throw Error('과자 던지기 간격이 맞지 않습니다.');state.throwCooldown=16;state.lastThrow=state.tick;state.throws++;}
  if(phase>=150&&phase<320&&witchLane===state.lane&&!state.hidden){state.ended=true;state.reason='들킴';}
  if(!state.ended&&state.tick-state.lastThrow>270){state.ended=true;state.reason='과자를 던지지 않음';}
  state.tick++;
  if(state.tick>=MAX_TICKS&&!state.ended){state.ended=true;state.reason='끝까지 버팀';}
  state.witchLane=witchLane;state.phase=phase;
  return state;
 };
 return state;
}
export function replayWitch(seed,trace){
 if(!Array.isArray(trace)||!trace.length||trace.length>MAX_TICKS)throw Error('플레이 기록 길이를 확인해 주세요.');
 const game=createWitchGame(seed);
 for(const command of trace)game.step(command);
 if(!game.ended)throw Error('게임이 끝나지 않았습니다.');
 return {ticks:game.tick,throws:game.throws,reason:game.reason};
}
