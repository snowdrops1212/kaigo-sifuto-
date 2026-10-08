(function(root){
 'use strict';
 const primary='akari-shift-staff-v2',backup=primary+'-backup',history=primary+'-history-';
 function create(storage,E){
  const snapshot=data=>({version:1,customRoles:E.copy(data.customRoles||[]),customShiftLimits:E.copy(data.customShiftLimits||[]),members:E.copy(data.members)});
  const validate=value=>{if(!value||typeof value.revision!=='string'||!Number.isFinite(value.savedAt))throw Error('職員保存データが読めません。');E.checkData({...E.copy(value.staff),users:[],months:{}});return value;};
  function read(){
   const raw=storage.getItem(primary);if(raw)try{return validate(JSON.parse(raw));}catch{}
   const candidates=[];let exists=!!raw;
   for(const key of [backup,...Array.from({length:storage.length||0},(_,i)=>storage.key(i)).filter(key=>key?.startsWith(history))]){const text=storage.getItem(key);if(!text)continue;exists=true;try{candidates.push(validate(JSON.parse(text)));}catch{}}
   if(candidates.length)return candidates.sort((a,b)=>b.savedAt-a.savedAt)[0];
   if(exists)throw Error('職員保存データを読み込めません。保存済み情報は消さず、自動保存を停止しています。');
   return null;
  }
  function commit(data,expectedRevision){
   const current=read();if((current?.revision||null)!==expectedRevision)throw Error('別のタブで職員情報が更新されています。編集画面を開き直してください。');
   const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});
   if(current&&JSON.stringify(current.staff)===JSON.stringify(staff))return current;
   const savedAt=Math.max(Date.now(),(current?.savedAt||0)+1),revision=savedAt.toString(36)+'-'+Math.random().toString(36).slice(2),next={revision,savedAt,staff},text=JSON.stringify(next);
   // History entries are append-only. Old application tabs know neither these keys nor v2.
   if(current){storage.setItem(history+current.revision,JSON.stringify(current));storage.setItem(backup,JSON.stringify(current));}
   storage.setItem(history+revision,text);storage.setItem(primary,text);return next;
  }
  function archiveLegacy(data){const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});const revision='legacy-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);storage.setItem(history+revision,JSON.stringify({revision,savedAt:0,staff}));}
  function recover(data){
   const staff=snapshot(data);E.checkData({...E.copy(staff),users:[],months:{}});
   let current;try{current=read();}catch{}
   if(current)return commit(data,current.revision);
   const savedAt=Date.now(),revision=savedAt.toString(36)+'-recovered-'+Math.random().toString(36).slice(2),record={revision,savedAt,staff};
   for(const key of [primary,backup]){const raw=storage.getItem(key);if(raw)storage.setItem(history+revision+'-unreadable-'+key,raw);}
   storage.setItem(history+revision,JSON.stringify(record));storage.setItem(primary,JSON.stringify(record));return record;
  }
  function list(){const records=[],seen=new Set();for(const key of [primary,backup,...Array.from({length:storage.length||0},(_,i)=>storage.key(i)).filter(key=>key?.startsWith(history))]){try{const record=validate(JSON.parse(storage.getItem(key)));if(!seen.has(record.revision)){records.push(record);seen.add(record.revision);}}catch{}}return records.sort((a,b)=>b.savedAt-a.savedAt);}
  return {read,commit,recover,archiveLegacy,snapshot,list};
 }
 root.StaffStore={create,primary,backup,history};if(typeof module!=='undefined')module.exports=root.StaffStore;
})(typeof window!=='undefined'?window:globalThis);
