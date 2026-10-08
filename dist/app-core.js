'use strict';
// Shared application state, DOM helpers, undo/redo, and top-level rendering.
const E=ShiftEngine,$=s=>document.querySelector(s),content=$('#content'),dialog=$('#editor');
const storageKey='akari-shift-state-v1',storageBackupKey=storageKey+'-backup',storageBackup2Key=storageKey+'-backup-2',staffStorageKey='akari-shift-staff-v1',staffBackupKey=staffStorageKey+'-backup';
const protectedStaff=typeof localStorage==='undefined'?null:StaffStore.create(localStorage,E);
let staffRevision=null,storageBlocked=false,storageNotice='';
function checkedStoredState(text){if(!text)return null;return E.checkData(JSON.parse(text));}
function recoverStaffState(text){
 try{
  const raw=JSON.parse(text);if(!raw||raw.version!==1||!Array.isArray(raw.members))return null;
  const customRoles=Array.isArray(raw.customRoles)?[...new Set(raw.customRoles.filter(role=>typeof role==='string'&&role.trim()===role&&role&&role.length<=50&&role!=='__custom__'))]:[];
  const customShiftLimits=Array.isArray(raw.customShiftLimits)?[...new Set(raw.customShiftLimits.filter(value=>typeof value==='string'&&value===E.parseAllowedShift(value).value&&value))]:[];
  let recovered;
  for(const users of [Array.isArray(raw.users)?raw.users:[],[]]){try{recovered=E.checkData({version:1,customRoles:E.copy(customRoles),customShiftLimits:E.copy(customShiftLimits),members:E.copy(raw.members),users:E.copy(users),months:{}});break;}catch{}}
  if(!recovered)return null;
  for(const [month,record]of Object.entries(raw.months&&typeof raw.months==='object'&&!Array.isArray(raw.months)?raw.months:{})){const probe=E.copy(recovered);probe.months[month]=E.copy(record);try{for(const person of probe.members)E.clearMemberConditionConflicts(probe,person);E.checkData(probe);recovered.months[month]=probe.months[month];}catch{}}
  return E.checkData(recovered);
 }catch{return null;}
}
function checkedStaffSnapshot(text){const raw=JSON.parse(text);return E.checkData({version:1,customRoles:E.copy(raw.customRoles||[]),customShiftLimits:E.copy(raw.customShiftLimits||[]),members:E.copy(raw.members),users:[],months:{}});}
function storedStaffSnapshot(){
 if(typeof localStorage==='undefined')return null;
 const protectedRecord=protectedStaff.read();
 if(protectedRecord){staffRevision=protectedRecord.revision;return checkedStaffSnapshot(JSON.stringify(protectedRecord.staff));}
 const candidates=[];
 for(const key of [staffStorageKey,staffBackupKey,storageKey,storageBackupKey,storageBackup2Key]){const text=localStorage.getItem(key);if(!text)continue;try{candidates.push(checkedStaffSnapshot(text));}catch{}}
 if(!candidates.length)return null;
 const isSample=data=>JSON.stringify(data.members)===JSON.stringify(E.checkData(E.fresh()).members)&&!(data.customShiftLimits||[]).length;
 // A default sample written by an old tab must not outrank edited staff in a backup.
 return candidates.find(data=>!isSample(data))||candidates[0];
}
function mergeStoredStaff(base,staff){if(!staff||JSON.stringify(base.members)===JSON.stringify(staff.members)&&JSON.stringify(base.customRoles||[])===JSON.stringify(staff.customRoles||[])&&JSON.stringify(base.customShiftLimits||[])===JSON.stringify(staff.customShiftLimits||[]))return base;const merged=recoverStaffState(JSON.stringify({...base,customRoles:E.copy(staff.customRoles||[]),customShiftLimits:E.copy(staff.customShiftLimits||[]),members:E.copy(staff.members)}));if(!merged)throw Error('職員情報と月データを統合できません。');return merged;}
function loadPersistedState(){
 if(typeof localStorage==='undefined')return E.fresh();
 let staff;try{staff=storedStaffSnapshot();}catch(err){storageBlocked=true;storageNotice=err.message;return {...E.fresh(),members:[]};}
 const saved=[localStorage.getItem(storageKey),localStorage.getItem(storageBackupKey),localStorage.getItem(storageBackup2Key)].filter(Boolean);
 for(const text of saved){try{return mergeStoredStaff(checkedStoredState(text),staff);}catch(err){console.warn('保存データ全体を読み込めませんでした。職員情報の復元を試します。',err);}const recovered=recoverStaffState(text);if(recovered){try{const restored=mergeStoredStaff(recovered,staff);console.warn('古い月データを除外し、職員情報を復元しました。');try{localStorage.setItem(storageBackup2Key,text);localStorage.setItem(storageKey,JSON.stringify(restored));}catch{}return restored;}catch(err){console.warn('月データの復元に失敗しました。職員専用バックアップを優先します。',err);}}}
 if(saved.length&&!staff){storageBlocked=true;storageNotice='保存済みデータを読み込めません。初期化せずに保存を停止しました。「データを開く」でバックアップを復元できます。';return {...E.fresh(),members:[]};}
 return staff||E.fresh();
}
function persistState({staffEdit=false,expectedRevision=staffRevision}={}){
 if(storageBlocked)return false;
 try{
  if(typeof localStorage!=='undefined'){
   if(staffEdit){const saved=protectedStaff.commit(state,expectedRevision);staffRevision=saved.revision;}
   else{const saved=protectedStaff.read();if(saved){state=mergeStoredStaff(state,checkedStaffSnapshot(JSON.stringify(saved.staff)));staffRevision=saved.revision;}}
   const serialized=JSON.stringify(state),previous=localStorage.getItem(storageKey);
   if(previous&&previous!==serialized){const backup=localStorage.getItem(storageBackupKey);if(backup&&backup!==previous)localStorage.setItem(storageBackup2Key,backup);localStorage.setItem(storageBackupKey,previous);}
   localStorage.setItem(storageKey,serialized);
  }
  return true;
 }catch(err){storageNotice=err.message;console.warn('自動保存できませんでした。',err);return false;}
}
function applyMemberConditions(data){return data.members.reduce((total,p)=>total+E.clearMemberConditionConflicts(data,p),0);}
let state=loadPersistedState(),current='2026-10',tab='schedule',undo=[],redo=[],dirty=false;
let requestPerson='',requestKind='E',requestShift='B',requestDate='',meetingDate='';
let scheduleFit=true,scheduleExpanded=false,scheduleResizeObserver;
if(protectedStaff&&!storageBlocked){
 try{
  if(!protectedStaff.read()){
   staffRevision=protectedStaff.commit(state,null).revision;
   for(const key of [staffStorageKey,staffBackupKey,storageKey,storageBackupKey,storageBackup2Key]){const text=localStorage.getItem(key);if(text)try{protectedStaff.archiveLegacy(checkedStaffSnapshot(text));}catch{}}
  }
 }catch(err){storageBlocked=true;storageNotice=err.message;}
}
applyMemberConditions(state);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mo=()=>E.month(state,current),n=()=>E.days(current),k=E.key,chip=c=>E.shifts[c]?.cls||'blank';
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500);}
function change(fn,staffEdit=false,expectedRevision=staffRevision){
 if(storageBlocked){toast(storageNotice);return false;}
 try{if(staffEdit&&protectedStaff&&(protectedStaff.read()?.revision||null)!==expectedRevision){toast('別のタブで職員情報が更新されています。編集画面を開き直してください。');return false;}}catch(err){toast(err.message);return false;}
 const before=E.copy(state);fn();dirty=true;
 if(!persistState({staffEdit,expectedRevision})){state=before;toast(storageNotice||'自動保存に失敗しました。「データを保存」でバックアップしてください。');return false;}
 undo.push(before);if(undo.length>40)undo.shift();redo=[];render();return true;
}
function revert(forward){
 const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;
 const before=E.copy(state),restored=from[from.length-1],staffEdit=JSON.stringify(protectedStaff?.snapshot(restored))!==JSON.stringify(protectedStaff?.snapshot(state));
 state=E.copy(restored);
 if(!persistState({staffEdit})){state=before;toast(storageNotice);return;}
 from.pop();to.push(before);dirty=true;render();toast('変更を戻しました');
}
function close(){dialog.close();}
function importSavedState(incoming){
 if(!storageBlocked)return change(()=>{state=incoming;},true);
 try{staffRevision=protectedStaff.recover(incoming).revision;state=incoming;storageBlocked=false;storageNotice='';persistState();render();return true;}catch(err){toast(err.message);return false;}
}
function ask(title,text,action){const d=$('#confirm');d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="dialog-bottom"><button id="no">戻る</button><button class="primary" id="yes">実行する</button></div>`;d.showModal();$('#no').onclick=()=>d.close();$('#yes').onclick=()=>{d.close();action();};}
function options(vals,selected){return vals.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');}
function range(){return Array.from({length:n()},(_,i)=>i+1);}
function weekHeaders(days=n()){return Array.from({length:Math.ceil(days/7)},(_,i)=>{const start=i*7+1,end=Math.min(days,start+6);return `<th class="week-group" colspan="${end-start+1}" scope="colgroup">${i+1}週目</th>`;}).join('');}
function headerDays(){return range().map(d=>{const w=E.weekday(current,d);return `<th class="${w===0?'sunday':w===6?'saturday':''}">${d}<small>${'日月火水木金土'[w]}</small></th>`;}).join('');}
function staffRow(p,paid=false){const limit=E.memberConditions(p).onlyShifts;return `<th${paid?' class="paid-person"':''}><span class="person-heading"><span class="person-identity"><span class="person-name" title="${esc(p.name+'／'+p.role)}">${esc(p.name)}</span><span class="person-role">${esc(p.role)}</span>${limit.length?'<small class="member-work-limit">勤務：'+esc(limit.join('・'))+'のみ</small>':''}</span>${paid?paidBadge(p):''}</span></th>`;}
function undoBar(){return `<button id="undo" ${undo.length?'':'disabled'}>↶ 元に戻す</button><button id="redo" ${redo.length?'':'disabled'}>↷ やり直す</button>`;}
function render(){mo();scheduleResizeObserver?.disconnect();if(tab!=='schedule'||!mo().generated)scheduleExpanded=false;document.body?.classList.toggle('schedule-expanded',scheduleExpanded);document.querySelectorAll('nav button').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});if(tab==='members')renderMembers();else renderSchedule();if($('#undo'))$('#undo').onclick=()=>revert(false);if($('#redo'))$('#redo').onclick=()=>revert(true);if(storageNotice)content.insertAdjacentHTML('afterbegin','<div class="note" role="alert">'+esc(storageNotice)+'</div>');}
function syncPersistedState(event){
 if(![storageKey,StaffStore.primary].includes(event.key)||!event.newValue||event.storageArea&&event.storageArea!==localStorage)return;
 try{
  const savedStaff=protectedStaff.read(),base=event.key===storageKey?checkedStoredState(event.newValue):state;
  const incoming=mergeStoredStaff(base,savedStaff?checkedStaffSnapshot(JSON.stringify(savedStaff.staff)):null);
  if(savedStaff)staffRevision=savedStaff.revision;
  if(JSON.stringify(incoming)===JSON.stringify(state))return;
  state=incoming;applyMemberConditions(state);undo=[];redo=[];dirty=false;requestPerson='';render();toast('保存済みの最新の職員情報を反映しました');
 }catch(err){console.warn('別の画面の保存データを反映できませんでした。',err);}
}
window.addEventListener('storage',syncPersistedState);
// Changes are saved at the editing action. Closing or hiding a stale tab never writes staff.
function equivalentNote(){return '<div class="equivalent-note"><strong>8時間換算：B・C・C\'・D・d・G・J・L・M・/C\'・I</strong><span>1人ずつ勤務時間÷8を小数第1位まで切り捨てて合計（8時間＝1.0、6時間＝0.7、7時間＝0.8）。E・F・/B・/C・空欄は対象外。</span><span><b class="fte-pass">7.0以上：基準クリア</b> ／ <b class="fte-near">6.0〜6.9：青</b> ／ <b class="fte-low">6.0未満：赤</b></span></div>';}
function equivalentFooter(extra){return '<tfoot><tr class="equivalent-row"><th scope="row">8時間換算 合計<small>B C C\' D d G J L M /C\' I</small></th>'+E.dailyEquivalent(state,current).map(r=>'<td class="fte-'+r.status+'" data-equivalent-day="'+r.day+'" aria-label="'+r.day+'日 8時間換算 '+r.value+' '+(r.status==='pass'?'基準クリア':'基準未満')+'" title="'+(r.status==='pass'?'基準クリア':'基準7.0未満')+'">'+r.value+'</td>').join('')+'<td colspan="'+extra+'">—</td></tr></tfoot>';}
function countsRows(){const rows=E.dailyCounts(state,current),codes=[...Object.keys(E.shifts),'blank'];return '<tbody class="daily-count-rows" id="daily-counts" aria-label="日別・勤務記号別の人数"><tr class="counts-heading"><th scope="row">勤務記号別 人数</th><td colspan="'+n()+'">各日の人数（人）</td><td colspan="3">月計（延べ）</td></tr>'+codes.map(c=>'<tr><th scope="row"><span class="chip '+chip(c)+'">'+(c==='blank'?'未入力':c+' '+E.shifts[c].label)+'</span></th>'+rows.map(r=>'<td data-count-code="'+c+'" data-count-day="'+r.day+'">'+r.counts[c]+'</td>').join('')+'<td class="count-total" colspan="3" data-count-total-code="'+c+'">'+rows.reduce((sum,r)=>sum+r.counts[c],0)+'</td></tr>').join('')+'</tbody>';}
