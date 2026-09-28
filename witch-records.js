(() => {
const API='https://halloween-candy-catch.kcnwhydynd.chatgpt.site/api/witch/records';
const rows=document.getElementById('rows'),status=document.getElementById('record-status'),more=document.getElementById('more'),csv=document.getElementById('csv');
const login=document.getElementById('admin-login'),panel=document.getElementById('admin-content'),password=document.getElementById('admin-password'),loginStatus=document.getElementById('login-status');
let adminKey='',loading=false,nextOffset=null,shown=0;
function lock(){adminKey='';rows.replaceChildren();panel.hidden=true;login.hidden=false;password.value='';}
async function get(offset=0){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(API+'?view=latest&offset='+offset,{signal:controller.signal,headers:{Authorization:'Bearer '+adminKey}});const d=await r.json();if(r.status===401)lock();if(!r.ok)throw new Error(d.error||'기록을 불러오지 못했습니다.');return d;}finally{clearTimeout(timer);}}
async function load(append=false){
 if(loading)return;loading=true;status.textContent='기록을 불러오는 중…';more.disabled=true;
 try{const d=await get(append?nextOffset||0:0);if(!append){rows.replaceChildren();shown=0;}
  for(const r of d.records){const tr=document.createElement('tr');for(const value of [r.nickname,r.throws+'개',(r.ticks/30).toFixed(1)+'초']){const td=document.createElement('td');td.textContent=value;tr.append(td);}rows.append(tr);}
  shown+=d.records.length;nextOffset=d.nextOffset;more.hidden=nextOffset===null;
  status.textContent=shown?`${shown}명의 최신 도전 기록을 표시합니다.`:'아직 저장된 참가 기록이 없습니다.';
 }catch(e){status.textContent='조회 실패: '+e.message+' 새로고침해 주세요.';}finally{loading=false;more.disabled=false;}
}
document.getElementById('refresh').onclick=()=>load();more.onclick=()=>load(true);
csv.onclick=async()=>{csv.disabled=true;const old=csv.textContent;csv.textContent='내려받는 중…';
 try{let offset=0,records=[];do{const d=await get(offset);records.push(...d.records);offset=d.nextOffset;}while(offset!==null);
  const escape=v=>'"'+String(v).replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')+'"';
  const lines=[['밴드 닉네임','던진 쿠키 수','버틴 시간(초)'],...records.map(r=>[r.nickname,r.throws,(r.ticks/30).toFixed(1)])];
  const blob=new Blob(['\uFEFF'+lines.map(line=>line.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='witch-latest-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`${records.length}명의 기록을 내려받았습니다.`;
 }catch(e){status.textContent='내려받기 실패: '+e.message;}finally{csv.disabled=false;csv.textContent=old;}
};
login.onsubmit=async event=>{event.preventDefault();adminKey=password.value.trim();loginStatus.textContent='확인 중…';const button=login.querySelector('button');button.disabled=true;try{await get();password.value='';login.hidden=true;panel.hidden=false;loginStatus.textContent='';await load();}catch(e){lock();loginStatus.textContent=e.message;}finally{button.disabled=false;}};
document.getElementById('logout').onclick=()=>{lock();loginStatus.textContent='기록실을 잠갔습니다.';};
window.addEventListener('pagehide',lock);
})();
