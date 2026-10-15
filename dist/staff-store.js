(function(root){
 'use strict';
 const primary='akari-shift-staff-v2',backup=primary+'-backup',history=primary+'-history-';
 function create(storage,E){
  const snapshot=data=>({version:1,customRoles:E.copy(data.customRoles||[]),customShiftLimits:E.copy(data.customShiftLimits||[]),members:E.copy(data.members)});
  const validate=value=>{if(!value||typeof value.revision!=='string'||!Number.isFinite(value.savedAt))throw Error('職員保存データが読めません。');E.checkData({...E.copy(value.staff),users:[],months:{}});if(value.fullState){const complete=E.checkData(E.copy(value.fullState));if(JSON.stringify(snapshot(complete))!==JSON.stringify(value.staff)||complete._staffRevision!==undefined&&complete._staffRevision!==value.revision)throw Error('職員保存データとシフトのバックアップが一致しません。');}return value;};
  function read(){
   const raw=storage.getItem(primary);if(raw)try{return validate(JSON.parse(raw));}catch{}
   const candidates=[];let exists=!!raw;
   for(const key of [backup,...Array.from({length:storage.length||0},(_,i)=>storage.key(i)).filter(key=>key?.startsWith(history))]){const text=storage.getItem(key);if(!text)continue;exists=true;try{candidates.push(validate(JSON.parse(text)));}catch{}}
   if(candidates.length)return candidates.sort((a,b)=>b.savedAt-a.savedAt)[0];
   if(exists)throw Error('職員保存データを読み込めません。保存済み情報は消さず、自動保存を停止しています。');
   return null;
  }
  function commit(data,expectedRevision,{fullState=false}={}){
   const current=read();if((current?.revision||null)!==expectedRevision)throw Error('別のタブで職員情報が更新されています。編集画面を開き直してください。');
   const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});
   const complete=fullState?E.checkData(E.copy(data)):null;
   if(current&&JSON.stringify(current.staff)===JSON.stringify(staff)&&(!fullState||JSON.stringify(current.fullState)===JSON.stringify(complete)))return current;
   const savedAt=Math.max(Date.now(),(current?.savedAt||0)+1),revision=savedAt.toString(36)+'-'+Math.random().toString(36).slice(2);
   if(complete)complete._staffRevision=revision;
   const next={revision,savedAt,staff,...(complete?{fullState:complete}:{})},historyEntry=({revision,savedAt,staff:oldStaff})=>({revision,savedAt,staff:oldStaff});
   // History entries are append-only. Old application tabs know neither these keys nor v2.
   if(current){const old=JSON.stringify(historyEntry(current));storage.setItem(history+current.revision,old);storage.setItem(backup,old);}
   storage.setItem(history+revision,JSON.stringify(historyEntry(next)));storage.setItem(primary,JSON.stringify(next));return next;
  }
  function archiveLegacy(data){const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});const revision='legacy-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);storage.setItem(history+revision,JSON.stringify({revision,savedAt:0,staff}));}
  function recover(data,expectedRevision){
   const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});
   let current;try{current=read();}catch{}
   if(expectedRevision!==undefined&&(current?.revision||null)!==expectedRevision)throw Error('別のタブで職員情報が更新されています。復元前に画面を更新してください。');
   if(current)return commit(data,current.revision,{fullState:true});
   const savedAt=Date.now(),revision=savedAt.toString(36)+'-recovered-'+Math.random().toString(36).slice(2),record={revision,savedAt,staff};
   for(const key of [primary,backup]){const raw=storage.getItem(key);if(raw)storage.setItem(history+revision+'-unreadable-'+key,raw);}
   storage.setItem(history+revision,JSON.stringify(record));const fullState=E.checkData(E.copy(data));fullState._staffRevision=revision;const complete={...record,fullState};storage.setItem(primary,JSON.stringify(complete));return complete;
  }
  function restoreFailedRecovery(recovered,previousRaw,previousBackupRaw){
   // Never roll back another tab's newer protected save.
   if(storage.getItem(primary)!==JSON.stringify(recovered))return false;
   const tentativeHistory=history+recovered.revision,historyRaw=storage.getItem(tentativeHistory);
   if(historyRaw&&JSON.parse(historyRaw).revision!==recovered.revision)return false;
   if(historyRaw)storage.removeItem(tentativeHistory);
   if(previousBackupRaw===null)storage.removeItem(backup);else storage.setItem(backup,previousBackupRaw);
   if(previousRaw===null)storage.removeItem(primary);else storage.setItem(primary,previousRaw);
   return true;
  }
  function list(){const records=[],seen=new Set();for(const key of [primary,backup,...Array.from({length:storage.length||0},(_,i)=>storage.key(i)).filter(key=>key?.startsWith(history))]){try{const record=validate(JSON.parse(storage.getItem(key)));if(!seen.has(record.revision)){records.push(record);seen.add(record.revision);}}catch{}}return records.sort((a,b)=>b.savedAt-a.savedAt);}
  return {read,commit,recover,restoreFailedRecovery,archiveLegacy,snapshot,list};
 }
 root.StaffStore={create,primary,backup,history};if(typeof module!=='undefined')module.exports=root.StaffStore;
})(typeof window!=='undefined'?window:globalThis);
