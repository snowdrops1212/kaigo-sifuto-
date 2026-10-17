'use strict';
// Application bootstrap, file import/export, keyboard shortcuts, and agent tools.
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function printSchedule(){window.print();}
$('#staff-history').onclick=showStaffHistory;
 function csvShiftCell(record,id,day){const cell=k(id,day),code=record.schedule[cell]||'',entry=record.customTimes?.[cell];return entry?.code===code?`${code} ${entry.start}〜${entry.end} 実働${E.shiftHours(record,cell,code)}時間`:code;}
function exportCSV(){
 const safe=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const equivalents=E.dailyEquivalent(state,current);
 const minimum=r=>E.weekday(current,r.day)===0?60:70;
 const pending=!['day','all'].includes(mo().generationStage);
 const rows=[
  ['氏名','職種',...range().map(d=>`${d}日`)],
   ...state.members.map(p=>[p.name,p.role,...range().map(d=>csvShiftCell(mo(),p.id,d))]),
  [],
  ['勤務別人数','',...range().map(d=>`${d}日`)],
  ...[...Object.keys(E.shifts),'blank'].map(c=>[c==='blank'?'未入力':c,'人数',...E.dailyCounts(state,current).map(r=>r.counts[c])]),
  ['8時間換算 合計',E.equivalentCodes.join('・'),...equivalents.map(r=>r.value)],
  ['必要な8時間換算','日曜6.0／その他7.0',...equivalents.map(r=>(minimum(r)/10).toFixed(1))],
  ['換算判定','',...equivalents.map(r=>pending?'人数調整前':r.tenths>=minimum(r)?'基準クリア':'基準未満')]
 ];
 download(`あかり_シフト案_${current}.csv`,'\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
$('#month').onchange=e=>switchPlanningMonth(e.target.value);$('#planning-prev-month').onclick=()=>switchPlanningMonth(offsetMonth(current,-1));$('#planning-next-month').onclick=()=>switchPlanningMonth(offsetMonth(current,1));const tabButtons=[...document.querySelectorAll('nav button')];tabButtons.forEach((b,i)=>{b.onclick=()=>{tab=b.dataset.tab;render();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const direction=e.key==='ArrowRight'?1:-1;const next=tabButtons[(i+direction+tabButtons.length)%tabButtons.length];next.focus();next.click();};});
$('#save').onclick=()=>{download(`あかり_シフトデータ_${current}.json`,JSON.stringify(state,null,2),'application/json');dirty=false;toast('保存ファイルをダウンロードしました');};$('#load').onclick=()=>{if(requireEditorLock())$('#file').click();};$('#file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5e6)return toast('ファイルが大きすぎます（上限5MB）。');let incoming;try{incoming=E.checkData(JSON.parse(await f.text()));applyMemberConditions(incoming);}catch(err){return toast(err.message);}ask('保存データを開きますか？','現在の画面を、ファイルの職員・希望休・シフトで置き換えます。',()=>{if(!importSavedState(incoming))return;toast('保存データを開きました');});};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();revert(e.shiftKey);}});
if(editorLockRequired){render();beginEditorSession();}
else{ensureFullTimeMinimum();removeLegacyNightLimits();render();}
function setShiftRequestsFromAgent(input){
 const p=state.members.find(x=>x.id===input.memberId);
 if(!p||!Array.isArray(input.days)||!input.days.length||!['E','F','W'].includes(input.type)||input.days.some(d=>!Number.isInteger(d)||d<1||d>n()||!E.active(p,current,d)))throw Error('職員・日付・希望の種類を確認してください。');
 const workShift=String(input.workShift||'');
 if(workShift&&(input.type!=='W'||!E.workRequestShiftAllowed(p,workShift)))throw Error('出勤希望勤務を確認してください。');
 for(const day of input.days){const error=requestRuleError(p,current,day,input.type,workShift);if(error)throw Error(`${day}日：${error}`);}
 if(!change(()=>{for(const day of input.days)applyRegisteredRequest(p,current,day,input.type,workShift);}))throw Error(storageNotice||'希望を保存できませんでした。');
 return {month:current,registered:input.days.length};
}
if(document.modelContext?.registerTool){
 const tools=[
  {name:'read_shift_planning_guide',title:'シフト作成の優先順を確認',description:'毎月の自動作成で使う順番と保存された追加メモを読み取ります。追加メモは自動作成へ未適用です。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({order:ShiftConditions.planningOrder,additionalNotes:state.planningGuideNotes||'',additionalNotesAutomaticallyApplied:false})},
  {name:'read_shift_requests',title:'希望休を確認',description:'選択中の月の希望休を読み取ります。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({month:current,requests:mo().requests,workRequests:mo().workRequests,members:state.members.map(p=>({id:p.id,name:p.name}))})},
  {name:'set_shift_requests',title:'希望休を登録',description:'指定職員の指定日に希望休・有給・出勤希望（W）を登録。正社員・パートとも出勤希望では勤務記号を指定できます。希望休のEは夜勤セット最後のEと重ねられます。作成済みシフトには希望休・有給を即時反映し、D・dと矛盾する夜勤セットは空欄にします。',inputSchema:{type:'object',properties:{memberId:{type:'string'},days:{type:'array',items:{type:'integer'}},type:{type:'string',enum:['E','F','W']},workShift:{type:'string',enum:['G','J','L','M','C','/C',"C'","/C'",'D','B','I','/B']}},required:['memberId','days','type'],additionalProperties:false},execute:setShiftRequestsFromAgent}
 ];
 for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}
}
