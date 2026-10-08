'use strict';
// Application bootstrap, file import/export, keyboard shortcuts, and agent tools.
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function printSchedule(){window.print();}
function exportCSV(){const safe=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const rows=[['氏名','職種',...range().map(d=>`${d}日`)],...state.members.map(p=>[p.name,p.role,...range().map(d=>mo().schedule[k(p.id,d)]||'')]),[],['勤務別人数','',...range().map(d=>`${d}日`)],...[...Object.keys(E.shifts),'blank'].map(c=>[c==='blank'?'未入力':c,'人数',...E.dailyCounts(state,current).map(r=>r.counts[c])]),['8時間換算 合計','BCDdGI',...E.dailyEquivalent(state,current).map(r=>r.value)],['換算基準','7.0以上',...E.dailyEquivalent(state,current).map(r=>r.status==='pass'?'基準クリア':r.status==='near'?'6.0台（青）':'6.0未満（赤）')]];download(`あかり_シフト案_${current}.csv`,'\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
$('#month').onchange=e=>switchPlanningMonth(e.target.value);$('#planning-prev-month').onclick=()=>switchPlanningMonth(offsetMonth(current,-1));$('#planning-next-month').onclick=()=>switchPlanningMonth(offsetMonth(current,1));document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
$('#save').onclick=()=>{download(`あかり_シフトデータ_${current}.json`,JSON.stringify(state,null,2),'application/json');dirty=false;toast('保存ファイルをダウンロードしました');};$('#load').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5e6)return toast('ファイルが大きすぎます（上限5MB）。');let incoming;try{incoming=E.checkData(JSON.parse(await f.text()));}catch(err){return toast(err.message);}ask('保存データを開きますか？','現在の画面を、ファイルの職員・希望休・シフトで置き換えます。',()=>{change(()=>{state=incoming;});toast('保存データを開きました');});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();revert(e.shiftKey);}});
render();
function setShiftRequestsFromAgent(input){
 const p=state.members.find(x=>x.id===input.memberId);
 if(!p||!Array.isArray(input.days)||!input.days.length||!['E','F','W'].includes(input.type)||input.days.some(d=>!Number.isInteger(d)||d<1||d>n()||!E.active(p,current,d)))throw Error('職員・日付・希望の種類を確認してください。');
 if(input.type==='F')for(const day of input.days){const eligibility=E.paidLeaveEligibility(p,E.iso(current,day));if(!eligibility.allowed)throw Error(`${day}日：${eligibility.reason}。職員情報の入職日を確認してください。`);}
 change(()=>{for(const day of input.days)mo().requests[k(p.id,day)]=input.type;});
 return {month:current,registered:input.days.length};
}
if(document.modelContext?.registerTool){
 const tools=[
  {name:'read_shift_requests',title:'希望休を確認',description:'選択中の月の希望休を読み取ります。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({month:current,requests:mo().requests,members:state.members.map(p=>({id:p.id,name:p.name}))})},
  {name:'set_shift_requests',title:'希望休を登録',description:'指定職員の指定日に希望休・有給・出勤希望（W）を登録。シフト自体は変更しません。',inputSchema:{type:'object',properties:{memberId:{type:'string'},days:{type:'array',items:{type:'integer'}},type:{type:'string',enum:['E','F','W']}},required:['memberId','days','type'],additionalProperties:false},annotations:{readOnlyHint:false},execute:setShiftRequestsFromAgent}
 ];
 for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}
}
