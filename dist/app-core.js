'use strict';
// Shared application state, DOM helpers, undo/redo, and top-level rendering.
const E=ShiftEngine,$=s=>document.querySelector(s),content=$('#content'),dialog=$('#editor');
const storageKey='akari-shift-state-v1',storageBackupKey=storageKey+'-backup',storageBackup2Key=storageKey+'-backup-2',staffStorageKey='akari-shift-staff-v1',staffBackupKey=staffStorageKey+'-backup';
function checkedStoredState(text){if(!text)return null;return E.checkData(JSON.parse(text));}
function recoverStaffState(text){
 try{
  const raw=JSON.parse(text);if(!raw||raw.version!==1||!Array.isArray(raw.members))return null;
  const customRoles=Array.isArray(raw.customRoles)?[...new Set(raw.customRoles.filter(role=>typeof role==='string'&&role.trim()===role&&role&&role.length<=50&&role!=='__custom__'))]:[];
  let recovered;
  for(const users of [Array.isArray(raw.users)?raw.users:[],[]]){try{recovered=E.checkData({version:1,customRoles:E.copy(customRoles),members:E.copy(raw.members),users:E.copy(users),months:{}});break;}catch{}}
  if(!recovered)return null;
  for(const [month,record]of Object.entries(raw.months&&typeof raw.months==='object'&&!Array.isArray(raw.months)?raw.months:{})){const probe=E.copy(recovered);probe.months[month]=E.copy(record);try{E.checkData(probe);recovered.months[month]=probe.months[month];}catch{}}
  return E.checkData(recovered);
 }catch{return null;}
}
function checkedStaffSnapshot(text){const raw=JSON.parse(text);return E.checkData({version:1,customRoles:E.copy(raw.customRoles||[]),members:E.copy(raw.members),users:[],months:{}});}
function storedStaffSnapshot(){if(typeof localStorage==='undefined')return null;for(const text of [localStorage.getItem(staffStorageKey),localStorage.getItem(staffBackupKey)].filter(Boolean))try{return checkedStaffSnapshot(text);}catch(err){console.warn('職員情報専用の保存データを読み込めませんでした。',err);}return null;}
function mergeStoredStaff(base,staff){if(!staff||JSON.stringify(base.members)===JSON.stringify(staff.members)&&JSON.stringify(base.customRoles||[])===JSON.stringify(staff.customRoles||[]))return base;return recoverStaffState(JSON.stringify({...base,customRoles:E.copy(staff.customRoles||[]),members:E.copy(staff.members)}))||base;}
function loadPersistedState(){
 if(typeof localStorage==='undefined')return E.fresh();
 const staff=storedStaffSnapshot();
 const saved=[localStorage.getItem(storageKey),localStorage.getItem(storageBackupKey),localStorage.getItem(storageBackup2Key)].filter(Boolean);
 for(const text of saved){try{return mergeStoredStaff(checkedStoredState(text),staff);}catch(err){console.warn('保存データ全体を読み込めませんでした。職員情報の復元を試します。',err);}const recovered=recoverStaffState(text);if(recovered){console.warn('古い月データを除外し、職員情報を復元しました。');const restored=mergeStoredStaff(recovered,staff);try{localStorage.setItem(storageBackup2Key,text);localStorage.setItem(storageKey,JSON.stringify(restored));}catch{}return restored;}}
 return staff||E.fresh();
}
function persistState(){try{if(typeof localStorage!=='undefined'){const staffSerialized=JSON.stringify({version:1,customRoles:state.customRoles||[],members:state.members}),previousStaff=localStorage.getItem(staffStorageKey);if(previousStaff&&previousStaff!==staffSerialized)localStorage.setItem(staffBackupKey,previousStaff);localStorage.setItem(staffStorageKey,staffSerialized);const serialized=JSON.stringify(state),previous=localStorage.getItem(storageKey);if(previous&&previous!==serialized){const backup=localStorage.getItem(storageBackupKey);if(backup&&backup!==previous)localStorage.setItem(storageBackup2Key,backup);localStorage.setItem(storageBackupKey,previous);}localStorage.setItem(storageKey,serialized);}return true;}catch(err){console.warn('自動保存できませんでした。',err);return false;}}
let state=loadPersistedState(),current='2026-10',tab='schedule',undo=[],redo=[],dirty=false;
let requestPerson='',requestKind='E',requestShift='B',requestDate='',meetingDate='';
let scheduleFit=true,scheduleExpanded=false,scheduleResizeObserver;
persistState();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mo=()=>E.month(state,current),n=()=>E.days(current),k=E.key,chip=c=>E.shifts[c]?.cls||'blank';
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500);}
function change(fn){undo.push(E.copy(state));if(undo.length>40)undo.shift();redo=[];fn();dirty=true;const saved=persistState();render();if(!saved)toast('ブラウザへの自動保存に失敗しました。「データを保存」でバックアップしてください。');}
function revert(forward){const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;to.push(E.copy(state));state=from.pop();dirty=true;const saved=persistState();render();toast(saved?'変更を戻しました':'変更を戻しましたが、自動保存に失敗しました。');}
function close(){dialog.close();}
function ask(title,text,action){const d=$('#confirm');d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="dialog-bottom"><button id="no">戻る</button><button class="primary" id="yes">実行する</button></div>`;d.showModal();$('#no').onclick=()=>d.close();$('#yes').onclick=()=>{d.close();action();};}
function options(vals,selected){return vals.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');}
function range(){return Array.from({length:n()},(_,i)=>i+1);}
function weekHeaders(days=n()){return Array.from({length:Math.ceil(days/7)},(_,i)=>{const start=i*7+1,end=Math.min(days,start+6);return `<th class="week-group" colspan="${end-start+1}" scope="colgroup">${i+1}週目</th>`;}).join('');}
function headerDays(){return range().map(d=>{const w=E.weekday(current,d);return `<th class="${w===0?'sunday':w===6?'saturday':''}">${d}<small>${'日月火水木金土'[w]}</small></th>`;}).join('');}
function staffRow(p,paid=false){return `<th${paid?' class="paid-person"':''}><span class="person-heading"><span class="person-identity"><span class="person-name" title="${esc(p.name+'／'+p.role)}">${esc(p.name)}</span><span class="person-role">${esc(p.role)}</span></span>${paid?paidBadge(p):''}</span></th>`;}
function undoBar(){return `<button id="undo" ${undo.length?'':'disabled'}>↶ 元に戻す</button><button id="redo" ${redo.length?'':'disabled'}>↷ やり直す</button>`;}
function render(){mo();scheduleResizeObserver?.disconnect();if(tab!=='schedule'||!mo().generated)scheduleExpanded=false;document.body?.classList.toggle('schedule-expanded',scheduleExpanded);document.querySelectorAll('nav button').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});if(tab==='members')renderMembers();else renderSchedule();if($('#undo'))$('#undo').onclick=()=>revert(false);if($('#redo'))$('#redo').onclick=()=>revert(true);}
function syncPersistedState(event){if(event.key!==storageKey||!event.newValue||event.storageArea&&event.storageArea!==localStorage)return;try{const incoming=checkedStoredState(event.newValue);if(JSON.stringify(incoming)===JSON.stringify(state))return;state=incoming;undo=[];redo=[];dirty=false;requestPerson='';render();toast('別の画面で保存した職員情報を反映しました');}catch(err){console.warn('別の画面の保存データを反映できませんでした。',err);}}
window.addEventListener('storage',syncPersistedState);
window.addEventListener('pagehide',persistState);
window.addEventListener('beforeunload',persistState);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistState();});
function equivalentNote(){return '<div class="equivalent-note"><strong>8時間換算：B・C・C\'・D・d・G・J・L・M・/C\'・I</strong><span>1人ずつ勤務時間÷8を小数第1位まで切り捨てて合計（8時間＝1.0、6時間＝0.7、7時間＝0.8）。E・F・/B・/C・空欄は対象外。</span><span><b class="fte-pass">7.0以上：基準クリア</b> ／ <b class="fte-near">6.0〜6.9：青</b> ／ <b class="fte-low">6.0未満：赤</b></span></div>';}
function equivalentFooter(extra){return '<tfoot><tr class="equivalent-row"><th scope="row">8時間換算 合計<small>B C C\' D d G J L M /C\' I</small></th>'+E.dailyEquivalent(state,current).map(r=>'<td class="fte-'+r.status+'" data-equivalent-day="'+r.day+'" aria-label="'+r.day+'日 8時間換算 '+r.value+' '+(r.status==='pass'?'基準クリア':'基準未満')+'" title="'+(r.status==='pass'?'基準クリア':'基準7.0未満')+'">'+r.value+'</td>').join('')+'<td colspan="'+extra+'">—</td></tr></tfoot>';}
function countsRows(){const rows=E.dailyCounts(state,current),codes=[...Object.keys(E.shifts),'blank'];return '<tbody class="daily-count-rows" id="daily-counts" aria-label="日別・勤務記号別の人数"><tr class="counts-heading"><th scope="row">勤務記号別 人数</th><td colspan="'+n()+'">各日の人数（人）</td><td colspan="3">月計（延べ）</td></tr>'+codes.map(c=>'<tr><th scope="row"><span class="chip '+chip(c)+'">'+(c==='blank'?'未入力':c+' '+E.shifts[c].label)+'</span></th>'+rows.map(r=>'<td data-count-code="'+c+'" data-count-day="'+r.day+'">'+r.counts[c]+'</td>').join('')+'<td class="count-total" colspan="3" data-count-total-code="'+c+'">'+rows.reduce((sum,r)=>sum+r.counts[c],0)+'</td></tr>').join('')+'</tbody>';}
