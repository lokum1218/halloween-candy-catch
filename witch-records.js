(() => {
const API='https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api/witch/records';
const rows=document.getElementById('rows'),status=document.getElementById('record-status'),more=document.getElementById('more');
const ranking=document.getElementById('ranking'),all=document.getElementById('all'),csv=document.getElementById('csv');
let adminKey='';
const login=document.getElementById('admin-login'),panel=document.getElementById('admin-content'),password=document.getElementById('admin-password'),loginStatus=document.getElementById('login-status');
function lock(){adminKey='';rows.replaceChildren();panel.hidden=true;login.hidden=false;password.value='';}
let mode='ranking',before=null,loading=false,shown=0;
const time=value=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false});
async function get(query='') {const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(API+query,{signal:controller.signal,headers:{Authorization:"Bearer "+adminKey}});const d=await r.json();if(r.status===401)lock();if(!r.ok)throw new Error(d.error||'기록을 불러오지 못했습니다.');return d;}finally{clearTimeout(timer);}}
async function load(append=false){
 if(loading)return;loading=true;status.textContent='기록을 불러오는 중…';more.disabled=true;
 ranking.disabled=all.disabled=true;
 try{
 const d=await get(mode==='ranking'?'?view=ranking':append?'?before='+before:'');
 if(!append){rows.replaceChildren();shown=0;}
 let rank=0,lastScore=null;
 d.records.forEach((r,i)=>{if(r.ticks!==lastScore)rank=i+1;lastScore=r.ticks;const tr=document.createElement('tr');[mode==='ranking'?rank:r.id,r.nickname,(r.ticks/30).toFixed(1)+"초",time(r.created_at)].forEach(v=>{const td=document.createElement('td');td.textContent=String(v);tr.append(td);});rows.append(tr);});
 shown+=d.records.length;before=d.nextBefore||null;more.hidden=mode==='ranking'||!before;
 status.textContent=shown?`${shown}개의 ${mode==='ranking'?'최장 생존':'참가 기록'}을 표시합니다.`:'아직 저장된 참가 기록이 없습니다.';
 }catch(e){status.textContent='조회 실패: '+e.message+' 새로고침해 주세요.';}
 finally{loading=false;more.disabled=false;ranking.disabled=all.disabled=false;}
}
function switchMode(next){if(loading)return;mode=next;ranking.setAttribute('aria-pressed',String(mode==='ranking'));all.setAttribute('aria-pressed',String(mode==='all'));document.getElementById('first-heading').textContent=mode==='ranking'?'순위':'기록 번호';document.getElementById('caption').textContent=mode==='ranking'?'닉네임별 최장 생존 · 상위 200명':'모든 완료 기록 · 최신순';load();}
ranking.onclick=()=>switchMode('ranking');all.onclick=()=>switchMode('all');document.getElementById('refresh').onclick=()=>load();more.onclick=()=>load(true);
csv.onclick=async()=>{
 csv.disabled=true;const old=csv.textContent;csv.textContent='내려받는 중…';
 try{
 let cursor=null,records=[];
 do{const d=await get(cursor?'?before='+cursor:'');records.push(...d.records);cursor=d.nextBefore;}while(cursor);
 const escape=v=>'"'+String(v).replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')+'"';
 const lines=[['기록 번호','밴드 닉네임','버틴 시간(초)','던진 과자','종료 사유','기록 시각(한국)'],...records.map(r=>[r.id,r.nickname,(r.ticks/30).toFixed(1),r.throws,r.reason,time(r.created_at)])];
 const blob=new Blob(['\uFEFF'+lines.map(l=>l.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='witch-game-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`${records.length}개의 기록을 내려받았습니다.`;
 }catch(e){status.textContent='내려받기 실패: '+e.message;}finally{csv.disabled=false;csv.textContent=old;}
};
login.onsubmit=async event=>{event.preventDefault();adminKey=password.value.trim();loginStatus.textContent='확인 중…';const button=login.querySelector('button');button.disabled=true;try{await get('?view=ranking');password.value='';login.hidden=true;panel.hidden=false;loginStatus.textContent='';await load();}catch(e){lock();loginStatus.textContent=e.message;}finally{button.disabled=false;}};
document.getElementById('logout').onclick=()=>{lock();loginStatus.textContent='기록실을 잠갔습니다.';};
window.addEventListener('pagehide',lock);

})();
