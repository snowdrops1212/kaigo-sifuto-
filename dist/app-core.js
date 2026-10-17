'use strict';
// Shared application state, DOM helpers, undo/redo, and top-level rendering.
const E=ShiftEngine,$=s=>document.querySelector(s),content=$('#content'),dialog=$('#editor');
const storageKey='akari-shift-state-v1',storageBackupKey=storageKey+'-backup',storageBackup2Key=storageKey+'-backup-2',staffStorageKey='akari-shift-staff-v1',staffBackupKey=staffStorageKey+'-backup';
const protectedStaff=typeof localStorage==='undefined'?null:StaffStore.create(localStorage,E);
let staffRevision=null,storageBlocked=false,storageNotice='',stateStorageBaseline=null;
const editorLockRequired=typeof navigator!=='undefined';
const editorLockName='akari-shift-editor-v1';
let editorOwnsLock=!editorLockRequired,editorLockStatus=editorLockRequired?'pending':'owned',editorLockAttempt=false,releaseEditorLock=null;
function editorLockMessage(){return editorLockStatus==='unsupported'?'このブラウザでは複数タブの安全な編集を利用できません。対応ブラウザで開いてください。':editorLockStatus==='pending'?'編集権限を確認しています。少し待ってから操作してください。':'別のタブで編集中です。そちらのタブを閉じてから「このタブで編集」を押してください。';}
function requireEditorLock(){if(editorOwnsLock)return true;toast(editorLockMessage());return false;}
function checkedStoredState(text){if(!text)return null;return E.checkData(JSON.parse(text));}
function recoverStaffState(text){
 try{
  const raw=JSON.parse(text);if(!raw||raw.version!==1||!Array.isArray(raw.members))return null;
  const customRoles=Array.isArray(raw.customRoles)?[...new Set(raw.customRoles.filter(role=>typeof role==='string'&&role.trim()===role&&role&&role.length<=50&&role!=='__custom__'))]:[];
  const customShiftLimits=Array.isArray(raw.customShiftLimits)?[...new Set(raw.customShiftLimits.filter(value=>typeof value==='string'&&value===E.parseAllowedShift(value).value&&value))]:[];
  let recovered;
  for(const users of [Array.isArray(raw.users)?raw.users:[],[]]){try{recovered=E.checkData({version:1,customRoles:E.copy(customRoles),customShiftLimits:E.copy(customShiftLimits),planningGuideNotes:typeof raw.planningGuideNotes==='string'&&raw.planningGuideNotes.length<=5000?raw.planningGuideNotes:'',members:E.copy(raw.members),users:E.copy(users),months:{}});break;}catch{}}
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
function protectedCompleteState(){const saved=protectedStaff?.read();return saved?.fullState?E.checkData(E.copy(saved.fullState)):null;}
function sameStateWithoutStaffRevision(left,right){const a=E.copy(left),b=E.copy(right);delete a._staffRevision;delete b._staffRevision;return JSON.stringify(a)===JSON.stringify(b);}
function protectedStateConflict(saved,complete){return !!complete?._staffRevision&&saved._staffRevision!==complete._staffRevision&&!sameStateWithoutStaffRevision(saved,complete);}
function pauseRecoveredState(message){storageBlocked=true;storageNotice=message+' 元の保存データは上書きしていません。表示内容を確認し、「データを保存」でファイルを取得してから「データを開く」で明示的に復元してください。';}
function loadPersistedState(){
 if(typeof localStorage==='undefined')return E.fresh();
 stateStorageBaseline=localStorage.getItem(storageKey);
 let staff,complete;try{staff=storedStaffSnapshot();complete=protectedCompleteState();}catch(err){storageBlocked=true;storageNotice=err.message;return {...E.fresh(),members:[]};}
 const entries=[storageKey,storageBackupKey,storageBackup2Key].map(key=>({key,text:key===storageKey?stateStorageBaseline:localStorage.getItem(key)})).filter(entry=>entry.text);
 let invalidPrimary=false;
 for(const {key,text} of entries){
  let saved;try{saved=checkedStoredState(text);}catch(err){if(key===storageKey)invalidPrimary=true;console.warn('保存データ全体を読み込めませんでした。元データを保持します。',err);continue;}
  const staffMatches=!staff||JSON.stringify(protectedStaff.snapshot(saved))===JSON.stringify(protectedStaff.snapshot(staff)),newerProtected=protectedStateConflict(saved,complete);
  let restored;
  try{restored=newerProtected?complete:staffMatches?saved:complete||mergeStoredStaff(saved,staff);}catch(err){console.warn('職員情報と月データを安全に結合できませんでした。',err);continue;}
  if(complete?._staffRevision&&sameStateWithoutStaffRevision(restored,complete))restored._staffRevision=complete._staffRevision;
  if(key!==storageKey||invalidPrimary||!staffMatches||newerProtected)pauseRecoveredState(newerProtected||!staffMatches?'職員専用保存と通常保存が一致しないため、職員専用の完全な保存またはバックアップを表示しています。':'通常保存が読めないため、バックアップを表示しています。');
  return restored;
 }
 if(entries.length){
  let restored=complete;
  if(!restored)for(const {text} of entries){const recovered=recoverStaffState(text);if(!recovered)continue;try{restored=mergeStoredStaff(recovered,staff);break;}catch(err){console.warn('月データの復元に失敗しました。',err);}}
  pauseRecoveredState('保存データの一部を読み込めません。復元できた内容だけを一時表示しています。');
  return restored||staff||{...E.fresh(),members:[]};
 }
 if(complete){pauseRecoveredState('通常保存が見つからないため、職員専用の完全な保存を表示しています。');return complete;}
 return staff||E.fresh();
}
function persistState({staffEdit=false,expectedRevision=staffRevision}={}){
 if(!editorOwnsLock){storageNotice=editorLockMessage();return false;}
 if(storageBlocked)return false;
 try{
  if(typeof localStorage!=='undefined'){
   const previous=localStorage.getItem(storageKey);
   if(previous!==stateStorageBaseline)throw Error('別のタブでシフト・希望が更新されています。最新の内容を確認してから編集してください。');
   if(staffEdit){const saved=protectedStaff.commit(state,expectedRevision,{fullState:true});staffRevision=saved.revision;state._staffRevision=saved.revision;}
   else{const saved=protectedStaff.read();if(saved){if(saved.revision!==staffRevision||JSON.stringify(protectedStaff.snapshot(state))!==JSON.stringify(saved.staff))throw Error('別のタブで職員情報が更新されています。画面を更新してから編集してください。');}}
   const serialized=JSON.stringify(state);
   try{
    if(previous&&previous!==serialized){const backup=localStorage.getItem(storageBackupKey);if(backup&&backup!==previous)localStorage.setItem(storageBackup2Key,backup);localStorage.setItem(storageBackupKey,previous);}
    localStorage.setItem(storageKey,serialized);
    stateStorageBaseline=serialized;
    storageNotice='';
   }catch(err){
    if(!staffEdit)throw err;
    storageNotice='職員情報と現在のシフトは職員専用の保存先に保護しましたが、通常の自動保存には失敗しました。「データを保存」でファイルも取得してください。';
    console.warn('通常の自動保存に失敗しました。職員専用の完全な保存を保持しています。',err);
   }
  }
  return true;
 }catch(err){storageNotice=err.message;console.warn('自動保存できませんでした。',err);return false;}
}
function applyMemberConditions(data){return data.members.reduce((total,p)=>total+E.clearMemberConditionConflicts(data,p),0);}
let state=loadPersistedState(),current='2026-10',tab='schedule',undo=[],redo=[],dirty=false;
let requestPerson='',requestKind='E',requestShift='B',requestDate='',meetingDate='';
let scheduleFit=true,scheduleExpanded=false,scheduleResizeObserver,scheduleZoomFactor=1;
function initializeProtectedStaff(){if(!protectedStaff||storageBlocked||!editorOwnsLock)return;
 try{
  if(!protectedStaff.read()){
    staffRevision=protectedStaff.commit(state,null,{fullState:true}).revision;
    state._staffRevision=staffRevision;
   for(const key of [staffStorageKey,staffBackupKey,storageKey,storageBackupKey,storageBackup2Key]){const text=localStorage.getItem(key);if(text)try{protectedStaff.archiveLegacy(checkedStaffSnapshot(text));}catch{}}
  }
 }catch(err){storageBlocked=true;storageNotice=err.message;}
}
if(editorOwnsLock)initializeProtectedStaff();
function beginEditorSession(){
 if(!editorLockRequired)return;
 if(editorOwnsLock||editorLockAttempt)return;
 if(!navigator.locks?.request){editorLockStatus='unsupported';render();return;}
 editorLockAttempt=true;editorLockStatus='pending';render();
 navigator.locks.request(editorLockName,{ifAvailable:true},lock=>{
  editorLockAttempt=false;
  if(!lock){editorLockStatus='busy';render();return;}
  editorOwnsLock=true;editorLockStatus='owned';
  storageBlocked=false;storageNotice='';staffRevision=null;state=loadPersistedState();applyMemberConditions(state);undo=[];redo=[];dirty=false;
  initializeProtectedStaff();ensureFullTimeMinimum();removeLegacyNightLimits();render();
  return new Promise(resolve=>{releaseEditorLock=resolve;});
 }).catch(err=>{editorLockAttempt=false;editorOwnsLock=false;editorLockStatus='unsupported';storageNotice=err.message;render();});
}
if(editorLockRequired){
 window.addEventListener('pagehide',()=>{if(releaseEditorLock){const release=releaseEditorLock;releaseEditorLock=null;editorOwnsLock=false;release();}});
 window.addEventListener('pageshow',event=>{if(event.persisted&&!editorOwnsLock)beginEditorSession();});
}
applyMemberConditions(state);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mo=()=>E.month(state,current),n=()=>E.days(current),k=E.key,chip=c=>E.shifts[c]?.cls||'blank';
function toast(t){
  const openDialog=[document.querySelector('#confirm'),document.querySelector('#editor')].find(node=>node?.open&&typeof node.querySelector==='function');
  const pageToast=$('#toast');
  clearTimeout(toast.timer);
  const existingAlert=openDialog?.querySelector('.dialog-alert');
  const modalAlert=existingAlert||openDialog&&document.createElement('div');
  if(openDialog&&modalAlert&&typeof modalAlert.querySelector==='function'&&typeof openDialog.prepend==='function'){
    pageToast.style.display='none';
    if(!existingAlert){
      modalAlert.className='dialog-alert';
      modalAlert.setAttribute('role','alert');
      modalAlert.innerHTML='<span class="dialog-alert-message"></span><button type="button" class="dialog-alert-close" aria-label="警告を閉じる">×</button>';
      modalAlert.querySelector('button').onclick=()=>modalAlert.remove();
      openDialog.prepend(modalAlert);
    }
    modalAlert.querySelector('.dialog-alert-message').textContent=t;
    return;
  }
  pageToast.textContent=t;
  pageToast.style.display='block';
  toast.timer=setTimeout(()=>pageToast.style.display='none',3500);
}
function change(fn,staffEdit=false,expectedRevision=staffRevision){
 if(!requireEditorLock())return false;
 if(storageBlocked){toast(storageNotice);return false;}
 try{if(staffEdit&&protectedStaff&&(protectedStaff.read()?.revision||null)!==expectedRevision){toast('別のタブで職員情報が更新されています。編集画面を開き直してください。');return false;}}catch(err){toast(err.message);return false;}
 const before=E.copy(state);fn();dirty=true;
 if(!persistState({staffEdit,expectedRevision})){state=before;toast(storageNotice||'自動保存に失敗しました。「データを保存」でバックアップしてください。');return false;}
 undo.push(before);if(undo.length>40)undo.shift();redo=[];render();return true;
}
function ensureFullTimeMinimum(){
 if(storageBlocked||!state.members.some(p=>p.employmentType==='full'&&p.targetMode!=='min'))return !storageBlocked;
 return change(()=>{for(const person of state.members)if(person.employmentType==='full')person.targetMode='min';},true);
}
function removeLegacyNightLimits(){
 if(storageBlocked||!protectedStaff)return false;
 try{
  const saved=protectedStaff.read();
  if(!saved?.staff.members.some(person=>Object.hasOwn(person,'nightMax')))return true;
  return persistState({staffEdit:true});
 }catch(err){storageNotice=err.message;console.warn('古い夜勤上限の保存値を除去できませんでした。',err);return false;}
}
function revert(forward){
 const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;
  const before=E.copy(state),restored=E.copy(from[from.length-1]);
  for(const person of restored.members)if(person.employmentType==='full')person.targetMode='min';
  const staffEdit=JSON.stringify(protectedStaff?.snapshot(restored))!==JSON.stringify(protectedStaff?.snapshot(state));
  state=restored;
 if(!persistState({staffEdit})){state=before;toast(storageNotice);return;}
 from.pop();to.push(before);dirty=true;render();toast('変更を戻しました');
}
function close(){dialog.close();}
function importSavedState(incoming){
 if(!requireEditorLock())return false;
 incoming=E.copy(incoming);for(const person of incoming.members)if(person.employmentType==='full')person.targetMode='min';
 if(!storageBlocked)return change(()=>{state=incoming;},true);
 const beforeState=state,beforeRevision=staffRevision;
 let previousProtectedRaw,previousBackupRaw,recovered,recoveryWroteProtected=true;
 try{
  if(localStorage.getItem(storageKey)!==stateStorageBaseline)throw Error('別のタブで保存データが更新されています。復元前に画面を更新して内容を確認してください。');
  previousProtectedRaw=localStorage.getItem(StaffStore.primary);
  previousBackupRaw=localStorage.getItem(StaffStore.backup);
  recovered=protectedStaff.recover(incoming,staffRevision);
  recoveryWroteProtected=localStorage.getItem(StaffStore.primary)!==previousProtectedRaw;
  staffRevision=recovered.revision;state=incoming;state._staffRevision=staffRevision;storageBlocked=false;storageNotice='';
  if(!persistState({staffEdit:true}))throw Error(storageNotice||'復元したデータを保存できませんでした。');
 }catch(err){
  if(recovered){
   let restored=false;
   try{restored=!recoveryWroteProtected||protectedStaff.restoreFailedRecovery(recovered,previousProtectedRaw,previousBackupRaw);}catch(rollbackError){console.warn('失敗した復元の取り消しにも失敗しました。',rollbackError);}
   state=beforeState;staffRevision=beforeRevision;storageBlocked=true;
   storageNotice=restored?'復元を取り消しました。'+err.message:'復元後に別の保存が更新されたか、取り消しに失敗しました。データを上書きせず、画面を更新して内容を確認してください。';
   render();
  }
  toast(recovered?storageNotice:err.message);return false;
 }
 render();return true;
}
function ask(title,text,action){const d=$('#confirm');d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="dialog-bottom"><button id="no">戻る</button><button class="primary" id="yes">実行する</button></div>`;d.showModal();$('#no').onclick=()=>d.close();$('#yes').onclick=()=>{d.close();action();};}
function options(vals,selected){return vals.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');}
function range(){return Array.from({length:n()},(_,i)=>i+1);}
function weekHeaders(days=n()){return Array.from({length:Math.ceil(days/7)},(_,i)=>{const start=i*7+1,end=Math.min(days,start+6);return `<th class="week-group" colspan="${end-start+1}" scope="colgroup">${i+1}週目</th>`;}).join('');}
function headerDays(){return range().map(d=>{const w=E.weekday(current,d);return `<th class="${w===0?'sunday':w===6?'saturday':''}">${d}<small>${'日月火水木金土'[w]}</small></th>`;}).join('');}
function bottomCalendarRows(){return '<tr class="bottom-day-row"><th class="schedule-staff-heading" rowspan="2" scope="rowgroup">職員</th>'+headerDays()+'<th rowspan="2">合計時間 / 目安</th><th rowspan="2">夜勤</th><th rowspan="2">休日</th></tr><tr class="bottom-week-row">'+weekHeaders()+'</tr>';}
function staffRow(p,paid=false){const limit=E.memberConditions(p).onlyShifts;return `<th${paid?' class="paid-person"':''}><span class="person-heading"><span class="person-identity"><span class="person-name" title="${esc(p.name+'／'+p.role)}">${esc(p.name)}</span><span class="person-role">${esc(p.role)}</span>${limit.length?'<small class="member-work-limit">勤務：'+esc(limit.join('・'))+'のみ</small>':''}</span>${paid?paidBadge(p):''}</span></th>`;}
function undoBar(){return `<button id="undo" ${undo.length?'':'disabled'}>↶ 元に戻す</button><button id="redo" ${redo.length?'':'disabled'}>↷ やり直す</button>`;}
function render(){mo();scheduleResizeObserver?.disconnect();if(tab!=='schedule'||!mo().generated)scheduleExpanded=false;document.body?.classList.toggle('schedule-expanded',scheduleExpanded);document.querySelectorAll('nav button').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});if(tab==='members')renderMembers();else if(tab==='planning')renderPlanning();else renderSchedule();if($('#undo'))$('#undo').onclick=()=>revert(false);if($('#redo'))$('#redo').onclick=()=>revert(true);if(storageNotice)content.insertAdjacentHTML('afterbegin','<div class="note" role="alert">'+esc(storageNotice)+'</div>');content.inert=!editorOwnsLock;for(const selector of ['#save','#load']){const button=$(selector);if(button)button.disabled=!editorOwnsLock;}let banner=$('#editor-lock-banner');if(!banner&&typeof document.createElement==='function'&&typeof content.before==='function'){banner=document.createElement('div');banner.id='editor-lock-banner';banner.className='editor-lock-banner';banner.setAttribute('role','alert');content.before(banner);}if(banner){banner.hidden=editorOwnsLock;banner.innerHTML=editorOwnsLock?'':'<span>'+esc(editorLockMessage())+'</span>'+(editorLockStatus==='busy'?' <button type="button" id="take-editor-lock">このタブで編集</button>':'');const take=$('#take-editor-lock');if(take)take.onclick=beginEditorSession;}}
function syncPersistedState(event){
 if(![storageKey,StaffStore.primary].includes(event.key)||!event.newValue||event.storageArea&&event.storageArea!==localStorage)return;
  if(editorLockRequired&&editorOwnsLock){
   storageBlocked=true;
   storageNotice='編集中に別のタブが保存データを書き換えました。現在の画面は変更せず保持しています。古いタブを閉じ、表示内容を確認して「データを保存」でファイルを取得してください。';
   render();toast(storageNotice);return;
  }
 try{
  const savedStaff=protectedStaff.read(),complete=protectedCompleteState(),base=event.key===storageKey?checkedStoredState(event.newValue):state;
   const mismatch=savedStaff&&JSON.stringify(protectedStaff.snapshot(base))!==JSON.stringify(savedStaff.staff),newerProtected=protectedStateConflict(base,complete);
   const incoming=mismatch||newerProtected?complete:base;
   if(!incoming){pauseRecoveredState('別の画面の職員情報と月データが一致しません。');render();return;}
   if(complete?._staffRevision&&sameStateWithoutStaffRevision(incoming,complete))incoming._staffRevision=complete._staffRevision;
   if(event.key===storageKey){stateStorageBaseline=event.newValue;if(newerProtected)pauseRecoveredState('別の画面の通常保存が職員専用の完全な保存より古い状態です。');}
  if(savedStaff)staffRevision=savedStaff.revision;
    if(JSON.stringify(incoming)===JSON.stringify(state)){if(newerProtected||storageBlocked)render();return;}
   state=incoming;applyMemberConditions(state);undo=[];redo=[];dirty=false;requestPerson='';render();toast(storageBlocked?storageNotice:'保存済みの最新の職員情報を反映しました');
 }catch(err){console.warn('別の画面の保存データを反映できませんでした。',err);}
}
window.addEventListener('storage',syncPersistedState);
// Changes are saved at the editing action. Closing or hiding a stale tab never writes staff.
function equivalentNote(){return '<div class="equivalent-note"><strong>8時間換算：B・C・C\'・D・d・G・J・L・M・/C\'・I・T</strong><span>1人ずつ勤務時間÷8を小数第1位まで切り捨てて合計（8時間＝1.0、6時間＝0.7、7時間＝0.8）。時間指定勤務は実働時間を使用。E・F・/B・/C・空欄は対象外。</span><span>必要な合計は平日・土曜7.0以上、日曜6.0以上。未達の日は赤で表示します。</span></div>';}
function equivalentFooter(extra){const pending=!['day','all'].includes(mo().generationStage);return '<tfoot><tr class="equivalent-row"><th scope="row">8時間換算 合計<small>B C C\' D d G J L M /C\' I</small></th>'+E.dailyEquivalent(state,current).map(r=>{const minimum=E.weekday(current,r.day)===0?60:70,failed=!pending&&r.tenths<minimum,status=pending?'人数調整前':failed?'基準未満':'基準クリア';return '<td class="'+(pending?'fte-pending':failed?'metric-issue':'fte-pass')+'" data-equivalent-day="'+r.day+'" aria-label="'+r.day+'日 8時間換算 '+r.value+' '+status+'" title="'+(pending?status:failed?'必要な'+(minimum/10).toFixed(1)+'未満':status)+'">'+r.value+'</td>';}).join('')+'<td colspan="'+extra+'">—</td></tr>'+bottomCalendarRows()+'</tfoot>';}
function countsRows(){const rows=E.dailyCounts(state,current),codes=[...Object.keys(E.shifts),'blank'];return '<tbody class="daily-count-rows" id="daily-counts" aria-label="日別・勤務記号別の人数"><tr class="counts-heading"><th scope="row">勤務記号別 人数</th><td colspan="'+n()+'">各日の人数（人）</td><td colspan="3">月計（延べ）</td></tr>'+codes.map(c=>'<tr><th scope="row"><span class="chip '+chip(c)+'">'+(c==='blank'?'未入力':c+' '+E.shifts[c].label)+'</span></th>'+rows.map(r=>'<td data-count-code="'+c+'" data-count-day="'+r.day+'">'+r.counts[c]+'</td>').join('')+'<td class="count-total" colspan="3" data-count-total-code="'+c+'">'+rows.reduce((sum,r)=>sum+r.counts[c],0)+'</td></tr>').join('')+'</tbody>';}
