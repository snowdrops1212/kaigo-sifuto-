(function(root){
 'use strict';
 const shifts={A:{label:'勤務A',time:'7:00–16:30',hours:null,cls:'a'},B:{label:'日勤',time:'8:30–17:30',hours:8,cls:'b'},C:{label:'遅番',time:'10:30–19:30',hours:8,cls:'c'},D:{label:'夜勤入り',time:'16:30–翌10:30',hours:8,cls:'night'},d:{label:'夜勤明け',time:'夜勤の翌日',hours:8,cls:'night'},E:{label:'休日',time:'',hours:0,cls:'off'},F:{label:'有休',time:'',hours:8,cls:'paid'},G:{label:'短時間',time:'9:00–15:00',hours:6,cls:'short'},I:{label:'日勤・7時間',time:'9:00–17:00',hours:7,cls:'short'},'/B':{label:'午後日勤',time:'13:30–17:30',hours:4,cls:'short'},'/C':{label:'午後遅番',time:'15:30–19:30',hours:4,cls:'short'}};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const days=m=>new Date(+m.slice(0,4),+m.slice(5),0).getDate();
 const iso=(m,d)=>`${m}-${String(d).padStart(2,'0')}`;
 const weekday=(m,d)=>new Date(+m.slice(0,4),+m.slice(5)-1,d).getDay();
 const prevMonth=m=>{let y=+m.slice(0,4),n=+m.slice(5)-1;if(!n){n=12;y--;}return `${y}-${String(n).padStart(2,'0')}`;};
 const key=(id,d)=>`${id}:${d}`;
 const active=(p,m,d)=>(!p.start||p.start<=iso(m,d))&&(!p.end||p.end>=iso(m,d));
 const works=c=>!!c&&c!=='E'&&c!=='F';
 function fresh(){return {version:1,members:Array.from({length:12},(_,i)=>({id:'s'+(i+1),name:['管理者（サンプル）','看護職員（サンプル）',...Array.from({length:10},(_,j)=>`介護職員${String(j+1).padStart(2,'0')}（サンプル）`)][i],role:i===0?'管理者':i===1?'看護職員':'介護職員',night:i>=2&&i<=6,nightMax:7,weekdays:[0,1,2,3,4,5,6],start:'',end:'',target:0})),users:[],months:{}};}
 function month(state,m){if(!state.months[m])state.months[m]={requests:{},schedule:{},locks:{},previous:{},targets:{},daily:{},meetings:[],rules:{B:0,C:2,D:1,maxRun:5,off:9},generated:false};return state.months[m];}
 // B/C use the facility policy even when legacy monthly or daily settings are loaded.
 const staffingNeed=(mo,d,code)=>code==='B'?0:code==='C'?2:(mo.daily[d]?.[code]??mo.rules[code]);
 function meetingDays(state,m){return [...new Set(month(state,m).meetings||[])].sort((a,b)=>a-b);}
 function meetingConflicts(state,m){const mo=month(state,m),issues=[];const add=(text,id,d)=>issues.push({type:'meeting',text,id,d});
  for(const d of meetingDays(state,m)){
   const managers=state.members.filter(p=>p.role==='管理者'&&active(p,m,d));
   if(!managers.length){add(`${d}日：会議日に在籍する管理者が未登録です`,null,d);continue;}
   for(const p of managers){const k=key(p.id,d),b=prior(state,m,p),lockedBefore=mo.locks[key(p.id,d-1)]?mo.schedule[key(p.id,d-1)]:'',lockedTwoBefore=mo.locks[key(p.id,d-2)]?mo.schedule[key(p.id,d-2)]:'';
    if(mo.requests[k])add(`${p.name} ${d}日：会議日のB勤務と${mo.requests[k]==='F'?'有給':'希望休'}が重なっています`,p.id,d);
    if(mo.locks[k]&&mo.schedule[k]!=='B')add(`${p.name} ${d}日：会議日のB勤務と固定勤務が重なっています`,p.id,d);
    if(!p.weekdays.includes(weekday(m,d)))add(`${p.name} ${d}日：会議日が勤務不可の曜日です`,p.id,d);
    if((d===1&&['D','d'].includes(b))||(d===2&&b==='D')||['D','d'].includes(lockedBefore)||lockedTwoBefore==='D')add(`${p.name} ${d}日：会議日のB勤務と夜勤明け・翌日の休みが重なっています`,p.id,d);
   }
  }return issues;
 }
 function prior(state,m,p){const prev=state.months[prevMonth(m)];return prev?.generated?(prev.schedule[key(p.id,days(prevMonth(m)))]||''):month(state,m).previous[p.id]||'';}
 const target=(p,mo,n)=>Object.hasOwn(mo.targets,p.id)?mo.targets[p.id]:(p.target||Math.max(0,n-mo.rules.off)*8);
 const equivalentCodes=['B','C','D','d','G','I'];
 const equivalentTenths=c=>equivalentCodes.includes(c)?Math.floor(shifts[c].hours*10/8):0;
 const equivalentStatus=tenths=>tenths>=70?'pass':tenths>=60?'near':'low';
 function dailyEquivalent(state,m){const mo=month(state,m);return Array.from({length:days(m)},(_,i)=>{const day=i+1;const tenths=state.members.reduce((sum,p)=>sum+(active(p,m,day)?equivalentTenths(mo.schedule[key(p.id,day)]):0),0);return {day,tenths,value:(tenths/10).toFixed(1),status:equivalentStatus(tenths)};});}
 function validate(state,m){const mo=month(state,m),n=days(m),issues=meetingConflicts(state,m); const add=(type,text,id,d)=>issues.push({type,text,id,d});
  for(const d of meetingDays(state,m))for(const p of state.members)if(p.role==='管理者'&&active(p,m,d)&&mo.schedule[key(p.id,d)]!=='B')add('meeting',`${p.name} ${d}日：会議日はB（日勤）が必要です`,p.id,d);
  for(let d=1;d<=n;d++)for(const c of ['C','D']){const need=staffingNeed(mo,d,c),num=state.members.filter(p=>active(p,m,d)&&mo.schedule[key(p.id,d)]===c).length;if(num<need)add('coverage',`${d}日 ${c}が${need-num}人不足${c==='C'?'（毎日ちょうど2人）':''}`,null,d);if(c==='C'&&num>need)add('coverage',`${d}日 Cが${num-need}人超過（${num}人／毎日ちょうど2人）`,null,d);}
  for(const r of dailyEquivalent(state,m))if(r.tenths<70)add('equivalent',`${r.day}日：8時間換算 ${r.value}（施設基準7.0未満）`,null,r.day);
  for(const p of state.members){let run=0,hours=0,night=0; for(let d=1;d<=n;d++){const k=key(p.id,d),c=mo.schedule[k]||'',r=mo.requests[k];const before=d===1?prior(state,m,p):mo.schedule[key(p.id,d-1)];
   if(c==='A')add('hoursUnknown',`${p.name} ${d}日：A（7:00〜16:30）の休憩時間未確認・時間合計は未確定`,p.id,d);
   if(r&&r!==c)add('request',`${p.name} ${d}日：${r==='E'?'希望休':'有休希望'}と不一致`,p.id,d);
   if(!active(p,m,d)){if(works(c)||c==='F')add('inactive',`${p.name} ${d}日：在籍期間外`,p.id,d);continue;}
   if(works(c)&&!p.weekdays.includes(weekday(m,d)))add('availability',`${p.name} ${d}日：勤務不可の曜日`,p.id,d);
   if(c==='D'){night++;if(!p.night)add('night',`${p.name} ${d}日：夜勤不可`,p.id,d);if(d<n&&mo.schedule[key(p.id,d+1)]!=='d')add('sequence',`${p.name} ${d}日：翌日の明けが必要`,p.id,d);}
   if(before==='D'&&c!=='d')add('sequence',`${p.name} ${d}日：前日の夜勤に対する明けが必要`,p.id,d);
   if(c==='d'&&before!=='D')add('sequence',`${p.name} ${d}日：前日の夜勤を確認`,p.id,d);
   if(before==='d'&&works(c))add('sequence',`${p.name} ${d}日：明けの翌日に勤務`,p.id,d);
   run=works(c)?run+1:0;if(run===mo.rules.maxRun+1)add('run',`${p.name} ${d}日：連勤上限${mo.rules.maxRun}日を超過`,p.id,d);
   hours+=shifts[c]?.hours||0;
  }if(night>p.nightMax)add('night',`${p.name}：夜勤${night}回（上限${p.nightMax}回）`,p.id,null);
   if(hours>target(p,mo,n))add('hours',`${p.name}：${hours}時間（目安${target(p,mo,n)}時間）`,p.id,null);
  }return issues;
 }
 function generate(state,m){const mo=month(state,m),n=days(m);const meetingErrors=meetingConflicts(state,m);if(meetingErrors.length)throw Error(meetingErrors[0].text+'。会議日または該当の条件を調整してください。');for(const [k,c] of Object.entries(mo.requests))if(mo.locks[k]&&mo.schedule[k]!==c)throw Error('希望休と固定勤務が重なっています。該当セルの固定を解除するか、希望休に変更してください。');for(let d=1;d<=n;d++){const fixedC=state.members.filter(p=>active(p,m,d)&&mo.locks[key(p.id,d)]&&mo.schedule[key(p.id,d)]==='C').length;if(fixedC>2)throw Error(`${d}日：Cの固定勤務が${fixedC}人あります。Cは毎日ちょうど2人のため、固定を解除するか勤務を変更してください。`);}let best=null,bestScore=Infinity;
  for(let attempt=0;attempt<60;attempt++){const sc={},protectedKeys=new Set(),reserved=new Set();
   for(const p of state.members)for(let d=1;d<=n;d++){const k=key(p.id,d);sc[k]=active(p,m,d)?'E':'';if(mo.requests[k]){sc[k]=mo.requests[k];protectedKeys.add(k);}if(mo.locks[k]){sc[k]=mo.schedule[k]||'';protectedKeys.add(k);}}
   for(const d of meetingDays(state,m))for(const p of state.members)if(p.role==='管理者'&&active(p,m,d)){const k=key(p.id,d);sc[k]='B';protectedKeys.add(k);}
   const can=(p,d,c)=>{if(d>n)return !p.end||p.end>=iso(m,d);const k=key(p.id,d);return active(p,m,d)&&(!works(c)||p.weekdays.includes(weekday(m,d)))&&(!protectedKeys.has(k)||sc[k]===c)&&(!reserved.has(k)||sc[k]===c);};
   const assign=(p,d,c)=>{if(d<=n&&can(p,d,c)){sc[key(p.id,d)]=c;reserved.add(key(p.id,d));}};
   for(const p of state.members){const b=prior(state,m,p);if(b==='D'){assign(p,1,'d');assign(p,2,'E');}if(b==='d')assign(p,1,'E');for(let d=1;d<=n;d++)if(sc[key(p.id,d)]==='D'){reserved.add(key(p.id,d));assign(p,d+1,'d');assign(p,d+2,'E');}}
   const count=(p,c)=>Array.from({length:n},(_,i)=>sc[key(p.id,i+1)]).filter(x=>x===c).length;
   const hrs=p=>Array.from({length:n},(_,i)=>shifts[sc[key(p.id,i+1)]]?.hours||0).reduce((a,b)=>a+b,0);
   const runOK=(p,d,extra=1)=>{let a=0,b=0;for(let x=d-1;x>=1&&works(sc[key(p.id,x)]);x--)a++;for(let x=d+extra;x<=n&&works(sc[key(p.id,x)]);x++)b++;return a+b+extra<=mo.rules.maxRun;};
   for(let d=1;d<=n;d++){let need=(mo.daily[d]?.D??mo.rules.D)-state.members.filter(p=>sc[key(p.id,d)]==='D').length;
    while(need-->0){const pool=state.members.filter(p=>p.night&&count(p,'D')<p.nightMax&&[0,1,2].every((v)=>can(p,d+v,['D','d','E'][v]))&&sc[key(p.id,d)]==='E'&&(d===1?prior(state,m,p):sc[key(p.id,d-1)])!=='D'&&(d===1?prior(state,m,p):sc[key(p.id,d-1)])!=='d'&&runOK(p,d,2)).map(p=>({p,score:count(p,'D')*10+Math.random()*9})).sort((a,b)=>a.score-b.score);if(!pool.length)break;const p=pool[0].p;assign(p,d,'D');assign(p,d+1,'d');assign(p,d+2,'E');}
   }
   // Scarce days first. Requests, manually fixed shifts, and night/rest blocks stay protected.
   const order=Array.from({length:n},(_,i)=>i+1).sort((a,b)=>state.members.filter(p=>can(p,a,'C')).length-state.members.filter(p=>can(p,b,'C')).length);
   for(const d of order)for(const c of ['C']){let need=staffingNeed(mo,d,c)-state.members.filter(p=>sc[key(p.id,d)]===c).length;
    while(need-->0){const pool=state.members.filter(p=>!reserved.has(key(p.id,d))&&!protectedKeys.has(key(p.id,d))&&sc[key(p.id,d)]==='E'&&can(p,d,c)&&runOK(p,d)&&hrs(p)+8<=target(p,mo,n)).map(p=>({p,score:hrs(p)/Math.max(1,target(p,mo,n))+Math.random()*.2})).sort((a,b)=>a.score-b.score);if(!pool.length)break;sc[key(pool[0].p.id,d)]=c;}
   }
   for(const p of state.members){const eligible=Array.from({length:n},(_,i)=>i+1).sort(()=>Math.random()-.5);for(const d of eligible){const k=key(p.id,d);if(hrs(p)+8>target(p,mo,n))break;if(sc[k]==='E'&&!protectedKeys.has(k)&&!reserved.has(k)&&can(p,d,'B')&&runOK(p,d))sc[k]='B';}}
   const temp={...state,months:{...state.months,[m]:{...mo,schedule:sc}}};const issues=validate(temp,m);const score=issues.reduce((v,x)=>v+(x.type==='coverage'?100:x.type==='request'?1000:50),0)+state.members.reduce((v,p)=>v+Math.abs(hrs(p)-target(p,mo,n))*.05,0);if(score<bestScore){bestScore=score;best=sc;}
  }mo.schedule=best;mo.generated=true;return validate(state,m);
 }

 function annualPaidLeave(state,m,id,basis='combined'){
  const year=Number(m.slice(0,4))-(Number(m.slice(5))<4?1:0),p=state.members.find(p=>p.id===id),byMonth=[];
  for(let offset=0;offset<12;offset++){
   const monthNumber=(offset+3)%12+1,y=year+(offset>=9?1:0),monthKey=y+'-'+String(monthNumber).padStart(2,'0'),record=state.months[monthKey],values=record?.[basis]||{};
   let count=0;for(let day=1;day<=days(monthKey);day++)if(p&&active(p,monthKey,day)&&(values[key(id,day)]==='F'||(basis==='combined'&&(record?.requests?.[key(id,day)]==='F'||record?.schedule?.[key(id,day)]==='F'))))count++;
   byMonth.push({month:monthKey,count,hasData:!!record&&(basis==='requests'?Object.keys(record.requests||{}).length>0:basis==='combined'?Object.keys(record.requests||{}).length>0||record.generated||Object.keys(record.schedule||{}).length>0:record.generated||Object.keys(record.schedule||{}).length>0)});
  }
  return {year,start:year+'-04',end:(year+1)+'-03',total:byMonth.reduce((s,r)=>s+r.count,0),byMonth};
 }

 function checkData(x){if(!x||x.version!==1||!Array.isArray(x.members)||x.members.length>100||!Array.isArray(x.users)||x.users.length>500||!x.months||typeof x.months!=='object')throw Error('このアプリで保存したデータを選んでください。');const ids=new Set();for(const p of x.members){if(typeof p.id!=='string'||!/^[\w-]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!Array.isArray(p.weekdays)||!Number.isFinite(p.nightMax)||!Number.isFinite(p.target))throw Error('職員情報の形式が正しくありません。');ids.add(p.id);}for(const [m,v] of Object.entries(x.months)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||!v.rules||!v.requests||!v.schedule||!v.locks||!v.daily||!v.previous||!v.targets)throw Error('月の情報が正しくありません。');if(v.meetings!==undefined&&(!Array.isArray(v.meetings)||v.meetings.length>31||new Set(v.meetings).size!==v.meetings.length||v.meetings.some(d=>!Number.isInteger(d)||d<1||d>days(m))))throw Error('会議日の情報が正しくありません。');for(const field of ['conditionPrompt','appliedConditionPrompt'])if(v[field]!==undefined&&(typeof v[field]!=='string'||v[field].length>20000))throw Error('条件の文章は20,000文字以内で保存してください。');for(const c of Object.values(v.schedule))if(c&&!shifts[c])throw Error('未対応の勤務記号です。');for(const c of Object.values(v.requests))if(!['E','F'].includes(c))throw Error('希望休の情報が正しくありません。');for(const k of ['B','C','D','maxRun','off'])if(!Number.isFinite(v.rules[k])||v.rules[k]<0||v.rules[k]>100)throw Error('配置条件の数値が正しくありません。');}return x;}
 function dailyCounts(state,m){const mo=month(state,m);return Array.from({length:days(m)},(_,i)=>{const d=i+1,counts=Object.fromEntries([...Object.keys(shifts),'blank'].map(c=>[c,0]));for(const p of state.members){if(!active(p,m,d))continue;const c=mo.schedule[key(p.id,d)]||'blank';if(Object.hasOwn(counts,c))counts[c]++;}return {day:d,counts};});}
 function memberRemovalSummary(state,id){
  const person=state.members.find(p=>p.id===id);if(!person)return null;
  const prefix=id+':',result={person,months:0,requests:0,schedule:0,locks:0,settings:0};
  for(const record of Object.values(state.months)){
   let touched=false;
   for(const field of ['requests','schedule','locks']){const keys=Object.keys(record[field]||{}).filter(k=>k.startsWith(prefix));result[field]+=field==='locks'?keys.filter(k=>record[field][k]).length:keys.length;if(keys.length)touched=true;}
   for(const field of ['previous','targets'])if(Object.hasOwn(record[field]||{},id)){result.settings++;touched=true;}
   if(touched)result.months++;
  }return result;
 }
 function removeMember(state,id){
  const index=state.members.findIndex(p=>p.id===id);if(index<0)return false;
  const prefix=id+':';state.members.splice(index,1);
  for(const record of Object.values(state.months)){
   for(const field of ['requests','schedule','locks'])for(const k of Object.keys(record[field]||{}))if(k.startsWith(prefix))delete record[field][k];
   for(const field of ['previous','targets'])if(record[field])delete record[field][id];
  }return true;
 }
 root.ShiftEngine={staffingNeed,memberRemovalSummary,removeMember,meetingDays,meetingConflicts,annualPaidLeave,shifts,dailyCounts,equivalentCodes,equivalentTenths,equivalentStatus,dailyEquivalent,copy,days,iso,weekday,prevMonth,key,active,works,fresh,month,prior,target,validate,generate,checkData};if(typeof module!=='undefined')module.exports=root.ShiftEngine;
})(typeof window!=='undefined'?window:globalThis);
