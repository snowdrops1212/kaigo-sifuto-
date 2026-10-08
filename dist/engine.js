(function(root){
 'use strict';
 const roles=['介護職員','看護職員','管理者','計画作成担当者'];
 const shifts={B:{label:'日勤',time:'8:30–17:30',hours:8,cls:'b'},C:{label:'遅番',time:'10:30–19:30',hours:8,cls:'c'},D:{label:'夜勤入り',time:'16:30–翌10:30',requestTime:'16:30–22:30',hours:8,cls:'night'},d:{label:'夜勤明け',time:'夜勤の翌日',hours:8,cls:'night'},E:{label:'休日',time:'',hours:0,cls:'off'},F:{label:'有休',time:'',hours:8,cls:'paid'},G:{label:'短時間',time:'9:00–15:00',hours:6,cls:'short'},J:{label:'短時間',time:'9:30–15:30',hours:6,cls:'short'},L:{label:'日勤',time:'9:30–17:30',hours:7,cls:'short'},M:{label:'遅番',time:'10:30–18:30',hours:7,cls:'short'},"C'":{label:'遅番',time:'10:00–19:00',hours:8,cls:'c'},"/C'":{label:'午後遅番',time:'13:00–19:00',hours:6,cls:'short'},I:{label:'パート日勤',time:'9:00–17:00',hours:7,cls:'short'},'/B':{label:'午後日勤',time:'13:30–17:30',hours:4,cls:'short'},'/C':{label:'午後遅番',time:'15:30–19:30',hours:4,cls:'short'}};
 const workRequestShifts=['G','J','L','M','C','/C',"C'","/C'",'D','B','I','/B'];
 const copy=x=>JSON.parse(JSON.stringify(x));
 const days=m=>new Date(+m.slice(0,4),+m.slice(5),0).getDate();
 const iso=(m,d)=>`${m}-${String(d).padStart(2,'0')}`;
 const weekday=(m,d)=>new Date(+m.slice(0,4),+m.slice(5)-1,d).getDay();
 const prevMonth=m=>{let y=+m.slice(0,4),n=+m.slice(5)-1;if(!n){n=12;y--;}return `${y}-${String(n).padStart(2,'0')}`;};
 const nextMonth=m=>{let y=+m.slice(0,4),n=+m.slice(5)+1;if(n===13){n=1;y++;}return `${y}-${String(n).padStart(2,'0')}`;};
 const key=(id,d)=>`${id}:${d}`;
 const active=(p,m,d)=>(!p.start||p.start<=iso(m,d))&&(!p.end||p.end>=iso(m,d));
 const works=c=>!!c&&c!=='E'&&c!=='F';
 function onlyShiftCodes(line){const symbols="BCDdEFGIJLM'/・、,";const direct=new RegExp('^(['+symbols+']+)のみ(?:勤務(?:可能)?)?$'),prefixed=new RegExp('^勤務(?:可能|区分)?:(['+symbols+']+)のみ$'),sentence=new RegExp('^勤務は(['+symbols+']+)のみ$'),match=line.match(direct)||line.match(prefixed)||line.match(sentence);if(!match)return null;const tokens=match[1].split(/[・、,]/).filter(Boolean),invalid=tokens.filter(code=>!Object.hasOwn(shifts,code)||!works(code));if(!tokens.length||invalid.length)return {codes:[],error:'「'+(invalid.join('・')||match[1])+'」は登録されている勤務記号ではありません。'};let codes=[...new Set(tokens)];if(codes.some(code=>code==='D'||code==='d'))codes=[...codes.filter(code=>code!=='D'&&code!=='d'),'D','d'];return {codes};}
 function parseMemberPrompt(text=''){
  const result={gAllowed:false,nightOnly:false,onlyShifts:[],applied:[],notes:[],errors:[]},seen=new Set();
  if(typeof text!=='string'||text.length>2000){result.errors.push('個別メモ・勤務条件は2,000文字以内で入力してください。');return result;}
  for(const raw of text.split(/\r?\n/)){
   const line=raw.trim().normalize('NFKC').replace(/[。.]$/,'').replace(/\s+/g,'');if(!line)continue;
   let kind='',value=false;
   if(['G勤務:可能','G勤務が可能','G勤務可能','Gを使えます','この人はGを使えます'].includes(line)){kind='gAllowed';value=true;}
   else if(line==='G勤務:不可'){kind='gAllowed';}
   else if(['勤務区分:夜勤専門','夜勤専門','夜勤専門です'].includes(line)){kind='nightOnly';value=true;}
   else if(line==='勤務区分:通常'){kind='nightOnly';}
   else{const only=onlyShiftCodes(line);if(!only){result.notes.push(raw);continue;}kind='onlyShifts';value=only.codes;if(only.error)result.errors.push(only.error);}
   if(seen.has(kind))result.errors.push((kind==='gAllowed'?'G勤務':kind==='onlyShifts'?'勤務可能な記号':'勤務区分')+'の指定が重複しています。1行にまとめてください。');
   seen.add(kind);result[kind]=value;result.applied.push(raw);
  }
  if(result.nightOnly&&result.gAllowed)result.errors.push('「夜勤専門」と「G勤務：可能」は併用できません。どちらかにしてください。');
  if(result.nightOnly&&result.onlyShifts.some(code=>!['D','d'].includes(code)))result.errors.push('「夜勤専門」と夜勤以外の「○のみ勤務可能」は併用できません。');
  if(result.gAllowed&&result.onlyShifts.length&&!result.onlyShifts.includes('G'))result.errors.push('「G勤務：可能」とGを含まない「○のみ勤務可能」は併用できません。');
  return result;
 }
 function memberConditionErrors(p,parsed=parseMemberPrompt(p.memberPrompt)){
  const managerInvalid=p.role==='管理者'&&(p.employmentType!=='full'||p.usesI);
  const onlyNight=parsed.onlyShifts.some(code=>['D','d'].includes(code)),onlyI=parsed.onlyShifts.includes('I'),usesIOther=p.usesI&&parsed.onlyShifts.some(code=>code!=='I');
  return [...parsed.errors,...((parsed.nightOnly||onlyNight)&&!p.night?['夜勤勤務を指定する場合は「夜勤」を「可能」にしてください。']:[]),...(onlyI&&!p.usesI?['Iのみ勤務可能の場合は「I勤務」を「使用する」にしてください。']:[]),...(usesIOther?['I勤務を使う職員は「Iのみ勤務可能」以外の限定勤務を指定できません。']:[]),...(managerInvalid?['管理者は雇用区分を「正社員」、I勤務を「使用しない」にしてください。']:[]),...(p.role!=='管理者'&&p.usesI&&p.employmentType!=='part'?['I勤務は雇用区分が「パート」の職員だけ使用できます。']:[]),...(p.usesI&&p.night?['I勤務を使うパートは「夜勤」を「不可」にしてください。']:[])];
 }
 function memberShiftAllowed(p,code,parsed=parseMemberPrompt(p.memberPrompt)){
  if(!works(code))return true;
  if(p.usesI)return code==='I';
  if(code==='I')return false;
  if(parsed.onlyShifts.length&&!parsed.onlyShifts.includes(code))return false;
  return !parsed.nightOnly||['D','d'].includes(code);
 }
 function workRequestShiftAllowed(p,code){return !!p&&workRequestShifts.includes(code)&&memberShiftAllowed(p,code)&&(code!=='D'||p.night);}
 function clearMemberConditionConflicts(state,p){let cleared=0;for(const record of Object.values(state.months||{})){for(const [cell,code] of Object.entries(record.schedule||{}))if(cell.startsWith(p.id+':')&&code&&!memberShiftAllowed(p,code)){record.schedule[cell]='';if(record.locks)delete record.locks[cell];cleared++;}for(const [cell,code] of Object.entries(record.workRequests||{}))if(cell.startsWith(p.id+':')&&!workRequestShiftAllowed(p,code))delete record.workRequests[cell];}return cleared;}
 function fresh(){return {version:1,customRoles:[],members:Array.from({length:12},(_,i)=>({id:'s'+(i+1),name:['管理者（サンプル）','看護職員（サンプル）',...Array.from({length:10},(_,j)=>`介護職員${String(j+1).padStart(2,'0')}（サンプル）`)][i],role:i===0?'管理者':i===1?'看護職員':'介護職員',employmentType:'full',usesI:false,night:i>=2&&i<=6,nightMax:7,weekdays:[0,1,2,3,4,5,6],start:'',end:'',target:0,targetMode:'max'})),users:[],months:{}};}
 function month(state,m){if(!state.months[m])state.months[m]={requests:{},workRequests:{},schedule:{},locks:{},previous:{},targets:{},daily:{},meetings:[],rules:{B:0,C:2,D:1,maxRun:5,off:9},generated:false};if(!state.months[m].workRequests)state.months[m].workRequests={};return state.months[m];}
 // B/C/D use the fixed facility policy even when legacy monthly or daily settings are loaded.
 const staffingNeed=(mo,d,code)=>code==='B'?0:code==='C'?2:code==='D'?1:(mo.daily[d]?.[code]??mo.rules[code]);
 function meetingDays(state,m){return [...new Set(month(state,m).meetings||[])].sort((a,b)=>a-b);}
 function meetingConflicts(state,m){const mo=month(state,m),issues=[];const add=(text,id,d)=>issues.push({type:'meeting',text,id,d});
  for(const d of meetingDays(state,m)){
   const managers=state.members.filter(p=>p.role==='管理者'&&active(p,m,d));
   if(!managers.length){add(`${d}日：会議日に在籍する管理者が未登録です`,null,d);continue;}
   for(const p of managers){const k=key(p.id,d),b=prior(state,m,p),lockedBefore=mo.locks[key(p.id,d-1)]?mo.schedule[key(p.id,d-1)]:'',lockedTwoBefore=mo.locks[key(p.id,d-2)]?mo.schedule[key(p.id,d-2)]:'';
    if(mo.requests[k]&&mo.requests[k]!=='W')add(`${p.name} ${d}日：会議日のB勤務と${mo.requests[k]==='F'?'有給':'希望休'}が重なっています`,p.id,d);
    if(mo.locks[k]&&mo.schedule[k]!=='B')add(`${p.name} ${d}日：会議日のB勤務と固定勤務が重なっています`,p.id,d);
    const personal=parseMemberPrompt(p.memberPrompt);if(!memberShiftAllowed(p,'B',personal))add(`${p.name} ${d}日：会議日のB勤務と個別メモの勤務条件が重なっています`,p.id,d);
    if(!p.weekdays.includes(weekday(m,d)))add(`${p.name} ${d}日：会議日が勤務不可の曜日です`,p.id,d);
    if((d===1&&['D','d'].includes(b))||(d===2&&b==='D')||['D','d'].includes(lockedBefore)||lockedTwoBefore==='D')add(`${p.name} ${d}日：会議日のB勤務と夜勤明け・翌日の休みが重なっています`,p.id,d);
   }
  }return issues;
 }
 function futureShiftConflict(state,m,p,day,code){
  const currentDays=days(m);if(day<=currentDays)return null;
  const next=nextMonth(m),nextDay=day-currentDays,record=state.months[next],date=iso(next,nextDay),cell=key(p.id,nextDay);
  if(!active(p,next,nextDay))return `${p.name}：${date}は在籍期間外のため${code}を引き継げません`;
  if(p.role==='管理者'&&(record?.meetings||[]).includes(nextDay)&&code!=='B')return `${p.name}：${date}は会議日のB勤務と月末夜勤の${code}が重なります`;
  const request=record?.requests?.[cell];
  if(request&&request!=='W'&&request!==code)return `${p.name}：${date}の希望と月末夜勤の${code}が重なります`;
  const assigned=record?.schedule?.[cell]||'';
  if(record?.locks?.[cell]&&assigned!==code)return `${p.name}：${date}の固定勤務と月末夜勤の${code}が重なります`;
  if(record?.generated&&assigned!==code)return `${p.name}：作成済みの${date}は${assigned||'未入力'}のため、月末夜勤に必要な${code}へ引き継げません`;
  return null;
 }
 function requiredShiftConflict(state,m,p,day,code){
  const currentDays=days(m);if(day>currentDays)return futureShiftConflict(state,m,p,day,code);
  const record=state.months[m],date=iso(m,day),cell=key(p.id,day);
  if(!active(p,m,day))return `${p.name}：${date}は在籍期間外のため${code}を設定できません`;
  if(p.role==='管理者'&&(record?.meetings||[]).includes(day)&&code!=='B')return `${p.name}：${date}は会議日のB勤務と夜勤後の${code}が重なります`;
  const request=record?.requests?.[cell];
  if(request&&request!=='W'&&request!==code)return `${p.name}：${date}の希望と夜勤後の${code}が重なります`;
  const assigned=record?.schedule?.[cell]||'';
  if(record?.locks?.[cell]&&assigned!==code)return `${p.name}：${date}の固定勤務と夜勤後の${code}が重なります`;
  return null;
 }
 function requiredNightShift(state,m,p,day){
  const record=state.months[m],prev=state.months[prevMonth(m)],prevDays=days(prevMonth(m));
  const code=(r,d)=>r?.schedule?.[key(p.id,d)]||'';
  if(day===1){if(code(prev,prevDays)==='D')return 'd';if(code(prev,prevDays-1)==='D')return 'E';}
  if(day===2&&code(prev,prevDays)==='D')return 'E';
  if(day>1&&code(record,day-1)==='D')return 'd';
  if(day>2&&code(record,day-2)==='D')return 'E';
  return '';
 }
 function prior(state,m,p){const previous=prevMonth(m),prev=state.months[previous],last=prev?.schedule?.[key(p.id,days(previous))]||'';return prev&&(prev.generated||['D','d'].includes(last))?last:month(state,m).previous[p.id]||'';}
 const target=(p,mo,n)=>Object.hasOwn(mo.targets,p.id)?mo.targets[p.id]:(p.target||(p.usesI?Math.max(0,n-9)*7:Math.max(0,n-mo.rules.off)*8));
 const targetMode=p=>p.targetMode==='min'?'min':'max';
 const targetModeLabel=p=>targetMode(p)==='min'?'以上':'以内';
 function projectedHours(state,m,p,changes=[]){const record=state.months[m]||{schedule:{},targets:{},rules:{off:9}},overrides=new Map(changes);let total=0;for(let d=1;d<=days(m);d++){const code=overrides.has(d)?overrides.get(d):record.schedule[key(p.id,d)]||'';total+=shifts[code]?.hours||0;}return total;}
 function targetLimitIssue(state,m,p,changes=[]){if(targetMode(p)!=='max')return '';const record=state.months[m]||{schedule:{},targets:{},rules:{off:9}},goal=target(p,record,days(m)),hours=projectedHours(state,m,p,changes);return hours>goal?`${p.name}：${m}は勤務時間目安${goal}時間以内のため、変更後の${hours}時間は設定できません。`:'';}
 const equivalentCodes=['B','C',"C'",'D','d','G','J','L','M',"/C'",'I'];
 const equivalentTenths=c=>equivalentCodes.includes(c)?Math.floor(shifts[c].hours*10/8):0;
 const equivalentStatus=tenths=>tenths>=70?'pass':tenths>=60?'near':'low';
 function dailyEquivalent(state,m){const mo=month(state,m);return Array.from({length:days(m)},(_,i)=>{const day=i+1;const tenths=state.members.reduce((sum,p)=>sum+(active(p,m,day)?equivalentTenths(mo.schedule[key(p.id,day)]):0),0);return {day,tenths,value:(tenths/10).toFixed(1),status:equivalentStatus(tenths)};});}
 function validate(state,m){const mo=month(state,m),n=days(m),issues=meetingConflicts(state,m); const add=(type,text,id,d)=>issues.push({type,text,id,d});
  for(const d of meetingDays(state,m))for(const p of state.members)if(p.role==='管理者'&&active(p,m,d)&&mo.schedule[key(p.id,d)]!=='B')add('meeting',`${p.name} ${d}日：会議日はB（日勤）が必要です`,p.id,d);
  for(let d=1;d<=n;d++)for(const c of ['C','D']){const need=staffingNeed(mo,d,c),num=state.members.filter(p=>active(p,m,d)&&mo.schedule[key(p.id,d)]===c).length,label=c==='C'?'毎日ちょうど2人':'毎日ちょうど1人';if(num<need)add('coverage',`${d}日 ${c}が${need-num}人不足（${label}）`,null,d);if(num>need)add('coverage',`${d}日 ${c}が${num-need}人超過（${num}人／${label}）`,null,d);}
  for(const r of dailyEquivalent(state,m))if(r.tenths<70)add('equivalent',`${r.day}日：8時間換算 ${r.value}（施設基準7.0未満）`,null,r.day);
  for(const p of state.members){const personal=parseMemberPrompt(p.memberPrompt);if(Array.from({length:n},(_,i)=>i+1).some(d=>active(p,m,d))){for(const error of memberConditionErrors(p,personal))add('personal',p.name+'：'+error,p.id,null);if(personal.notes.length)add('personalNote',`${p.name}：自動判定できない個別メモがあります。内容を確認してください`,p.id,null);}let run=0,hours=0,night=0,off=0; for(let d=1;d<=n;d++){const k=key(p.id,d),c=mo.schedule[k]||'',r=mo.requests[k];const before=d===1?prior(state,m,p):mo.schedule[key(p.id,d-1)];
   if(r==='F'||c==='F'){const eligibility=paidLeaveEligibility(p,iso(m,d));if(!eligibility.allowed)add('paidLeave',`${p.name} ${d}日：${eligibility.reason}`,p.id,d);}
   if(r==='W'){const desired=mo.workRequests[k];if(desired?c!==desired:!works(c))add('workRequest',`${p.name} ${d}日：出勤希望${desired?'（'+desired+' '+shifts[desired].label+'）':''}を満たしていません`,p.id,d);}
   if(r&&r!=='W'&&r!==c)add('request',`${p.name} ${d}日：${r==='E'?'希望休':'有休希望'}と不一致`,p.id,d);
   if(!active(p,m,d)){if(works(c)||c==='F')add('inactive',`${p.name} ${d}日：在籍期間外`,p.id,d);continue;}
   if(c==='E')off++;
   if(!memberShiftAllowed(p,c,personal))add('personal',`${p.name} ${d}日：職員の勤務区分では${c}勤務は対象外です`,p.id,d);
   if(works(c)&&c!=='d'&&!p.weekdays.includes(weekday(m,d)))add('availability',`${p.name} ${d}日：勤務不可の曜日`,p.id,d);
   if(c==='D'){night++;if(!p.night)add('night',`${p.name} ${d}日：夜勤不可`,p.id,d);for(const[offset,required]of [[1,'d'],[2,'E']]){if(d+offset<=n){if(mo.schedule[key(p.id,d+offset)]!==required)add('sequence',`${p.name} ${d}日：${offset===1?'翌日の明けd':'翌々日の休日E'}が必要`,p.id,d);}else{const conflict=futureShiftConflict(state,m,p,d+offset,required);if(conflict)add('sequence',conflict,p.id,d);}}}
   if(before==='D'&&c!=='d')add('sequence',`${p.name} ${d}日：前日の夜勤に対する明けが必要`,p.id,d);
   if(c==='d'&&before!=='D')add('sequence',`${p.name} ${d}日：前日の夜勤を確認`,p.id,d);
   if(before==='d'&&c!=='E')add('sequence',`${p.name} ${d}日：夜勤明けdの翌日は休日Eが必要`,p.id,d);
   run=works(c)?run+1:0;if(run===mo.rules.maxRun+1)add('run',`${p.name} ${d}日：連勤上限${mo.rules.maxRun}日を超過`,p.id,d);
   hours+=shifts[c]?.hours||0;
  }if(night>p.nightMax)add('night',`${p.name}：夜勤${night}回（上限${p.nightMax}回）`,p.id,null);
   if(p.usesI&&off<9)add('iOff',`${p.name}：I勤務を使うパートは休日Eが月9日必要です（現在${off}日）`,p.id,null);
   const goal=target(p,mo,n),mode=targetMode(p);if(mode==='min'&&hours<goal||mode==='max'&&hours>goal)add('hours',`${p.name}：${hours}時間（目安${goal}時間${targetModeLabel(p)}）`,p.id,null);
  }return issues;
 }
 function onlyShiftFill(personal,remaining,minimum){if(!personal.onlyShifts.length||remaining<=0)return null;const candidates=personal.onlyShifts.filter(code=>!['C','D','d'].includes(code)&&shifts[code]?.hours>0).sort((a,b)=>shifts[b].hours-shifts[a].hours),fitting=candidates.filter(code=>shifts[code].hours<=remaining);return fitting[0]||(minimum?candidates.at(-1)||null:null);}
 function generate(state,m){const mo=month(state,m),n=days(m),personalById=new Map(state.members.map(p=>[p.id,parseMemberPrompt(p.memberPrompt)]));
  for(const [requestKey,code] of Object.entries(mo.requests)){
   if(code!=='F')continue;
   const [id,dayText]=requestKey.split(':'),p=state.members.find(person=>person.id===id),eligibility=paidLeaveEligibility(p,iso(m,Number(dayText)));
   if(!eligibility.allowed)throw Error((p?.name||'職員')+' '+dayText+'日：'+eligibility.reason+'。職員情報の入職日を確認してください。');
  }
  for(const p of state.members){
   if(!Array.from({length:n},(_,i)=>i+1).some(d=>active(p,m,d)))continue;
   const personal=personalById.get(p.id),errors=memberConditionErrors(p,personal);
   if(errors.length)throw Error(p.name+'：'+errors[0]);
   if(personal.notes.length)throw Error(p.name+'：個別メモに自動判定できない重要事項があります。「Gのみ勤務可能」のような対応形式に直すか、内容を確認して手動で勤務を設定してください。');
   for(let d=1;d<=n;d++)if(active(p,m,d)&&mo.locks[key(p.id,d)]&&!memberShiftAllowed(p,mo.schedule[key(p.id,d)],personal))throw Error(p.name+' '+d+'日：職員の勤務区分と固定勤務が矛盾しています。固定を解除するか職員情報を変更してください。');
  }
  const meetingErrors=meetingConflicts(state,m);if(meetingErrors.length)throw Error(meetingErrors[0].text+'。会議日または該当の条件を調整してください。');
  for(const [k,c] of Object.entries(mo.requests))if(c!=='W'&&mo.locks[k]&&mo.schedule[k]!==c)throw Error('希望休と固定勤務が重なっています。該当セルの固定を解除するか、希望休に変更してください。');
  for(let d=1;d<=n;d++)for(const [code,limit] of [['C',2],['D',1]]){const fixed=state.members.filter(p=>active(p,m,d)&&mo.locks[key(p.id,d)]&&mo.schedule[key(p.id,d)]===code).length;if(fixed>limit)throw Error(`${d}日：${code}の固定勤務が${fixed}人あります。${code}は毎日ちょうど${limit}人のため、固定を解除するか勤務を変更してください。`);}
  for(const p of state.members){const before=prior(state,m,p),required=before==='D'?[[1,'d'],[2,'E']]:before==='d'?[[1,'E']]:[];for(const[day,code]of required){const conflict=requiredShiftConflict(state,m,p,day,code);if(conflict)throw Error(conflict+'。前月からのD→d→Eを優先して勤務を調整してください。');}}
  for(const p of state.members)for(let d=1;d<=n;d++)if(mo.locks[key(p.id,d)]&&mo.schedule[key(p.id,d)]==='D')for(const [offset,required]of [[1,'d'],[2,'E']]){const conflict=requiredShiftConflict(state,m,p,d+offset,required);if(conflict)throw Error(conflict+'。勤務を調整してから再作成してください。');}
  let best=null,bestScore=Infinity;
  for(let attempt=0;attempt<60;attempt++){const sc={},protectedKeys=new Set(),reserved=new Set();
   for(const p of state.members)for(let d=1;d<=n;d++){const k=key(p.id,d);sc[k]=active(p,m,d)?'E':'';if(mo.requests[k]&&mo.requests[k]!=='W'){sc[k]=mo.requests[k];protectedKeys.add(k);}if(mo.locks[k]){sc[k]=mo.schedule[k]||'';protectedKeys.add(k);}}
   for(const d of meetingDays(state,m))for(const p of state.members)if(p.role==='管理者'&&active(p,m,d)){const k=key(p.id,d);sc[k]='B';protectedKeys.add(k);}
   const can=(p,d,c)=>{if(!memberShiftAllowed(p,c,personalById.get(p.id)))return false;if(d>n)return !futureShiftConflict(state,m,p,d,c);const k=key(p.id,d);return active(p,m,d)&&(c==='d'||!works(c)||p.weekdays.includes(weekday(m,d)))&&(!protectedKeys.has(k)||sc[k]===c)&&(!reserved.has(k)||sc[k]===c);};
   const workPreferenceAllows=(p,d,c)=>d>n||mo.requests[key(p.id,d)]!=='W'||!mo.workRequests[key(p.id,d)]||mo.workRequests[key(p.id,d)]===c;
   const count=(p,c)=>Array.from({length:n},(_,i)=>sc[key(p.id,i+1)]).filter(x=>x===c).length;
   const hrs=p=>Array.from({length:n},(_,i)=>shifts[sc[key(p.id,i+1)]]?.hours||0).reduce((a,b)=>a+b,0);
   const assign=(p,d,c)=>{if(d<=n&&can(p,d,c)){sc[key(p.id,d)]=c;reserved.add(key(p.id,d));}};
   for(const p of state.members){const b=prior(state,m,p);if(b==='D'){assign(p,1,'d');assign(p,2,'E');}if(b==='d')assign(p,1,'E');for(let d=1;d<=n;d++)if(sc[key(p.id,d)]==='D'){reserved.add(key(p.id,d));assign(p,d+1,'d');assign(p,d+2,'E');}}
   for(const p of state.members)if(targetMode(p)==='max'&&hrs(p)>target(p,mo,n))throw Error(`${p.name}：固定勤務・希望・会議・前月夜勤の合計が、勤務時間目安${target(p,mo,n)}時間以内を超えています。条件を調整してください。`);
   const runOK=(p,d,extra=1)=>{let a=0,b=0;for(let x=d-1;x>=1&&works(sc[key(p.id,x)]);x--)a++;for(let x=d+extra;x<=n&&works(sc[key(p.id,x)]);x++)b++;return a+b+extra<=mo.rules.maxRun;};
   for(let d=1;d<=n;d++){let need=staffingNeed(mo,d,'D')-state.members.filter(p=>sc[key(p.id,d)]==='D').length;
    const addedNightHours=(d<=n?8:0)+(d+1<=n?8:0);while(need-->0){const pool=state.members.filter(p=>p.night&&count(p,'D')<p.nightMax&&[0,1,2].every((v)=>can(p,d+v,['D','d','E'][v])&&workPreferenceAllows(p,d+v,['D','d','E'][v]))&&sc[key(p.id,d)]==='E'&&(targetMode(p)==='min'||hrs(p)+addedNightHours<=target(p,mo,n))&&(d===1?prior(state,m,p):sc[key(p.id,d-1)])!=='D'&&(d===1?prior(state,m,p):sc[key(p.id,d-1)])!=='d'&&runOK(p,d,2)).map(p=>({p,score:count(p,'D')*10+Math.random()*9-(mo.requests[key(p.id,d)]==='W'?100:0)-(mo.requests[key(p.id,d+1)]==='W'?50:0)+(mo.requests[key(p.id,d+2)]==='W'?100:0)})).sort((a,b)=>a.score-b.score);if(!pool.length)break;const p=pool[0].p;assign(p,d,'D');assign(p,d+1,'d');assign(p,d+2,'E');}
   }
   // Scarce days first. Requests, manually fixed shifts, and night/rest blocks stay protected.
   const order=Array.from({length:n},(_,i)=>i+1).sort((a,b)=>state.members.filter(p=>can(p,a,'C')).length-state.members.filter(p=>can(p,b,'C')).length);
   for(const d of order)for(const c of ['C']){let need=staffingNeed(mo,d,c)-state.members.filter(p=>sc[key(p.id,d)]===c).length;
    while(need-->0){const pool=state.members.filter(p=>!reserved.has(key(p.id,d))&&!protectedKeys.has(key(p.id,d))&&sc[key(p.id,d)]==='E'&&can(p,d,c)&&workPreferenceAllows(p,d,c)&&runOK(p,d)&&(targetMode(p)==='min'||hrs(p)+8<=target(p,mo,n))).map(p=>({p,score:hrs(p)/Math.max(1,target(p,mo,n))+Math.random()*.2-(mo.requests[key(p.id,d)]==='W'?10:0)})).sort((a,b)=>a.score-b.score);if(!pool.length)break;sc[key(pool[0].p.id,d)]=c;}
   }
   for(const p of state.members){const personal=personalById.get(p.id);if(personal.nightOnly)continue;const eligible=Array.from({length:n},(_,i)=>i+1).map(d=>({d,score:(mo.requests[key(p.id,d)]==='W'?0:1)+Math.random()})).sort((a,b)=>a.score-b.score).map(x=>x.d);for(const d of eligible){const k=key(p.id,d),remaining=target(p,mo,n)-hrs(p),minimum=targetMode(p)==='min',desired=mo.requests[k]==='W'?mo.workRequests[k]||'':'',desiredHours=shifts[desired]?.hours||0,c=desired?(['C','D'].includes(desired)?null:minimum||desiredHours<=remaining?desired:null):p.usesI?(count(p,'I')>=Math.max(0,n-9)?null:remaining>=7?'I':null):personal.onlyShifts.length?onlyShiftFill(personal,remaining,minimum):minimum?(remaining<=0?null:remaining>=8?'B':personal.gAllowed&&remaining<=6?'G':'B'):(remaining>=8?'B':personal.gAllowed&&remaining>=6?'G':null);if(!c){if(['C','D'].includes(desired))continue;break;}if(p.usesI&&c==='I'&&count(p,'I')>=Math.max(0,n-9))continue;if(sc[k]==='E'&&!protectedKeys.has(k)&&!reserved.has(k)&&can(p,d,c)&&runOK(p,d))sc[k]=c;}}
   const temp={...state,months:{...state.months,[m]:{...mo,schedule:sc}}};const issues=validate(temp,m);const score=issues.reduce((v,x)=>v+(x.type==='coverage'?100:x.type==='request'?1000:x.type==='workRequest'?80:50),0)+state.members.reduce((v,p)=>v+Math.abs(hrs(p)-target(p,mo,n))*.05,0);if(score<bestScore){bestScore=score;best=sc;}
  }mo.schedule=best;mo.generated=true;return validate(state,m);
 }

 function validCalendarDate(value){return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)&&Number(value.slice(0,4))>=100&&Number(value.slice(8))>=1&&Number(value.slice(8))<=days(value.slice(0,7));}
 function addCalendarMonths(value,amount){
  if(!validCalendarDate(value))return null;
  const [y,m,d]=value.split('-').map(Number),total=y*12+m-1+amount,year=Math.floor(total/12);
  if(year<100||year>9999)return null;
  const monthKey=String(year).padStart(4,'0')+'-'+String(total%12+1).padStart(2,'0');
  return iso(monthKey,Math.min(d,days(monthKey)));
 }
 function paidLeavePeriod(p,asOf){
  const empty={asOf,firstStart:null,start:null,end:null};
  if(!p)return {...empty,status:'missingMember'};
  if(!p.start)return {...empty,status:'missingStart'};
  if(!validCalendarDate(p.start))return {...empty,status:'invalidStart'};
  const firstStart=addCalendarMonths(p.start,6);
  if(!firstStart||!validCalendarDate(asOf))return {...empty,status:'invalidDate'};
  let years=Math.max(0,Number(asOf.slice(0,4))-Number(firstStart.slice(0,4))),start=addCalendarMonths(firstStart,years*12);
  if(start>asOf&&years>0)start=addCalendarMonths(firstStart,--years*12);
  const next=addCalendarMonths(firstStart,(years+1)*12);
  if(!next)return {...empty,firstStart,status:'invalidDate'};
  const [y,m,d]=next.split('-').map(Number),end=new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10);
  return {asOf,firstStart,start,end,status:asOf<firstStart?'notStarted':'ready'};
 }
 function paidLeaveEligibility(p,date){
  const period=paidLeavePeriod(p,date);
  if(period.status==='ready')return {...period,allowed:true,reason:''};
  if(period.status==='notStarted')return {...period,allowed:false,reason:`有給は入職日の6か月後（${period.firstStart}）から利用できます`};
  if(period.status==='missingStart')return {...period,allowed:false,reason:'入職日が未設定のため、有給は登録できません'};
  return {...period,allowed:false,reason:'入職日を確認してください。有給期間を計算できません'};
 }
 function annualPaidLeave(state,m,id,basis='combined'){
  const p=state.members.find(p=>p.id===id),asOf=m.length===7?iso(m,days(m)):m,period=paidLeavePeriod(p,asOf),byMonth=[];
  if(period.status!=='ready')return {...period,total:period.status==='notStarted'?0:null,byMonth};
  const firstMonth=period.start.slice(0,7),lastMonth=period.end.slice(0,7);
  for(let offset=0;offset<13;offset++){
   const monthKey=addCalendarMonths(firstMonth+'-01',offset)?.slice(0,7);if(!monthKey||monthKey>lastMonth)break;
   const record=state.months[monthKey],values=record?.[basis]||{};
   let count=0;for(let day=1;day<=days(monthKey);day++){
    const date=iso(monthKey,day);if(date<period.start||date>period.end||!active(p,monthKey,day))continue;
    if(values[key(id,day)]==='F'||(basis==='combined'&&(record?.requests?.[key(id,day)]==='F'||record?.schedule?.[key(id,day)]==='F')))count++;
   }
   byMonth.push({month:monthKey,count,hasData:!!record&&(basis==='requests'?Object.keys(record.requests||{}).length>0:basis==='combined'?Object.keys(record.requests||{}).length>0||!!record.generated||Object.keys(record.schedule||{}).length>0:!!record.generated||Object.keys(record.schedule||{}).length>0)});
  }
  return {...period,total:byMonth.reduce((sum,r)=>sum+r.count,0),byMonth};
 }

 function checkData(x){
  if(!x||x.version!==1||!Array.isArray(x.members)||x.members.length>100||!Array.isArray(x.users)||x.users.length>500||!x.months||typeof x.months!=='object')throw Error('このアプリで保存したデータを選んでください。');
  if(x.customRoles===undefined)x.customRoles=[];
  if(!Array.isArray(x.customRoles)||x.customRoles.length>100||new Set(x.customRoles).size!==x.customRoles.length||x.customRoles.some(role=>typeof role!=='string'||!role.trim()||role!==role.trim()||role.length>50||role==='__custom__'))throw Error('手書き職種の情報が正しくありません。');
  const checkPeriod=(person,label)=>{
   if(person.start===undefined)person.start='';if(person.end===undefined)person.end='';
   if(typeof person.start!=='string'||person.start&&!validCalendarDate(person.start))throw Error(`${label}の開始日が正しくありません。`);
   if(typeof person.end!=='string'||person.end&&!validCalendarDate(person.end))throw Error(`${label}の終了日が正しくありません。`);
   if(person.start&&person.end&&person.start>person.end)throw Error(`${label}の終了日は開始日以降にしてください。`);
  };
  const ids=new Set();
  for(const p of x.members){
   if(typeof p.id!=='string'||!/^[\w-]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||typeof p.role!=='string'||!p.role.trim()||p.role!==p.role.trim()||p.role.length>50||p.role==='__custom__'||!Array.isArray(p.weekdays)||typeof p.night!=='boolean')throw Error('職員情報の形式が正しくありません。');
   if(!Number.isInteger(p.nightMax)||p.nightMax<0||p.nightMax>15)throw Error('職員の夜勤上限は0〜15回で指定してください。');
   if(!Number.isInteger(p.target)||p.target<0||p.target>300)throw Error('職員の勤務時間目安は0〜300時間で指定してください。');
   if(new Set(p.weekdays).size!==p.weekdays.length||p.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6))throw Error('職員の勤務可能曜日が正しくありません。');
   if(p.employmentType===undefined)p.employmentType='full';
   if(p.usesI===undefined)p.usesI=false;
   if(p.targetMode===undefined)p.targetMode='max';
   if(!['min','max'].includes(p.targetMode))throw Error('職員の勤務時間目安は「以上」または「以内」で指定してください。');
   if(!['full','part'].includes(p.employmentType)||typeof p.usesI!=='boolean'||p.usesI&&p.employmentType!=='part'||p.usesI&&p.night)throw Error('職員の雇用区分・I勤務の設定が正しくありません。');
   if(p.role==='管理者'&&(p.employmentType!=='full'||p.usesI))throw Error('管理者は正社員・I勤務なしで登録してください。');
   if(p.memberPrompt!==undefined&&(typeof p.memberPrompt!=='string'||p.memberPrompt.length>2000))throw Error('職員の個別メモ・勤務条件は2,000文字以内の文章にしてください。');
   checkPeriod(p,'職員');
   if(!roles.includes(p.role)&&!x.customRoles.includes(p.role))x.customRoles.push(p.role);
   ids.add(p.id);
  }
  const userIds=new Set();for(const u of x.users){if(!u||typeof u!=='object'||typeof u.id!=='string'||!/^[\w-]+$/.test(u.id)||userIds.has(u.id)||typeof u.name!=='string'||!['通い','泊まり','訪問'].includes(u.type)||!Array.isArray(u.weekdays)||new Set(u.weekdays).size!==u.weekdays.length||u.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6))throw Error('利用者情報の形式が正しくありません。');checkPeriod(u,'利用者');userIds.add(u.id);}
  for(const [m,v] of Object.entries(x.months)){
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||!v.rules||!v.requests||!v.schedule||!v.locks||!v.daily||!v.previous||!v.targets)throw Error('月の情報が正しくありません。');
   if(v.workRequests===undefined)v.workRequests={};
   const memberMapFields=['requests','workRequests','schedule','locks'],memberOnlyFields=['previous','targets'];
   for(const field of [...memberMapFields,...memberOnlyFields])if(!v[field]||typeof v[field]!=='object'||Array.isArray(v[field]))throw Error('月の職員別情報が正しくありません。');
   for(const field of memberMapFields)for(const cell of Object.keys(v[field])){const match=/^([\w-]+):([1-9]|[12]\d|3[01])$/.exec(cell);if(!match)throw Error('希望・勤務データの職員IDまたは日付が正しくありません。');if(!ids.has(match[1]))throw Error('保存データに登録されていない職員の希望・勤務情報があります。');if(Number(match[2])>days(m))throw Error(`${m}に存在しない日付の希望・勤務情報があります。`);}
   for(const field of memberOnlyFields)for(const id of Object.keys(v[field]))if(!ids.has(id))throw Error('保存データに登録されていない職員の個別設定があります。');
   if(v.meetings!==undefined&&(!Array.isArray(v.meetings)||v.meetings.length>31||new Set(v.meetings).size!==v.meetings.length||v.meetings.some(d=>!Number.isInteger(d)||d<1||d>days(m))))throw Error('会議日の情報が正しくありません。');
   for(const field of ['conditionPrompt','appliedConditionPrompt'])if(v[field]!==undefined&&(typeof v[field]!=='string'||v[field].length>20000))throw Error('条件の文章は20,000文字以内で保存してください。');
   for(const c of Object.values(v.schedule))if(c&&!shifts[c])throw Error('未対応の勤務記号です。');
   for(const c of Object.values(v.requests))if(!['E','F','W'].includes(c))throw Error('希望の情報が正しくありません。');
   for(const [cell,c] of Object.entries(v.workRequests)){const person=x.members.find(p=>cell.startsWith(p.id+':'));if(v.requests[cell]!=='W'||!workRequestShiftAllowed(person,c))throw Error('出勤希望勤務が正しくありません。');}
   if(Object.values(v.locks).some(value=>typeof value!=='boolean'))throw Error('固定勤務の情報が正しくありません。');
   if(Object.values(v.previous).some(value=>value&&!shifts[value]))throw Error('前月末勤務の情報が正しくありません。');
   for(const k of ['B','C','D'])if(!Number.isFinite(v.rules[k])||v.rules[k]<0||v.rules[k]>100)throw Error('配置条件の数値が正しくありません。');
   if(!Number.isInteger(v.rules.maxRun)||v.rules.maxRun<1||v.rules.maxRun>31)throw Error('連続勤務の上限は1〜31日で指定してください。');
   if(!Number.isInteger(v.rules.off)||v.rules.off<0||v.rules.off>31)throw Error('休日の目安は0〜31日で指定してください。');
   if(Object.values(v.targets).some(value=>!Number.isInteger(value)||value<0||value>300))throw Error('今月の勤務時間目安は0〜300時間で指定してください。');
  }
  return x;
 }
 function dailyCounts(state,m){const mo=month(state,m);return Array.from({length:days(m)},(_,i)=>{const d=i+1,counts=Object.fromEntries([...Object.keys(shifts),'blank'].map(c=>[c,0]));for(const p of state.members){if(!active(p,m,d))continue;const c=mo.schedule[key(p.id,d)]||'blank';if(Object.hasOwn(counts,c))counts[c]++;}return {day:d,counts};});}
 function memberRemovalSummary(state,id){
  const person=state.members.find(p=>p.id===id);if(!person)return null;
  const prefix=id+':',result={person,months:0,requests:0,schedule:0,locks:0,settings:0};
  for(const record of Object.values(state.months)){
   let touched=false;
   for(const field of ['requests','schedule','locks']){const keys=Object.keys(record[field]||{}).filter(k=>k.startsWith(prefix));result[field]+=field==='locks'?keys.filter(k=>record[field][k]).length:keys.length;if(keys.length)touched=true;}
   if(Object.keys(record.workRequests||{}).some(k=>k.startsWith(prefix)))touched=true;
   for(const field of ['previous','targets'])if(Object.hasOwn(record[field]||{},id)){result.settings++;touched=true;}
   if(touched)result.months++;
  }return result;
 }
 function removeMember(state,id){
  const index=state.members.findIndex(p=>p.id===id);if(index<0)return false;
  const prefix=id+':';state.members.splice(index,1);
  for(const record of Object.values(state.months)){
   for(const field of ['requests','workRequests','schedule','locks'])for(const k of Object.keys(record[field]||{}))if(k.startsWith(prefix))delete record[field][k];
   for(const field of ['previous','targets'])if(record[field])delete record[field][id];
  }return true;
 }
 root.ShiftEngine={validCalendarDate,addCalendarMonths,paidLeavePeriod,paidLeaveEligibility,parseMemberPrompt,memberConditionErrors,memberShiftAllowed,workRequestShiftAllowed,clearMemberConditionConflicts,staffingNeed,memberRemovalSummary,removeMember,meetingDays,meetingConflicts,futureShiftConflict,requiredShiftConflict,requiredNightShift,annualPaidLeave,roles,shifts,workRequestShifts,dailyCounts,equivalentCodes,equivalentTenths,equivalentStatus,dailyEquivalent,copy,days,iso,weekday,prevMonth,nextMonth,key,active,works,fresh,month,prior,target,targetMode,targetModeLabel,projectedHours,targetLimitIssue,validate,generate,checkData};if(typeof module!=='undefined')module.exports=root.ShiftEngine;
})(typeof window!=='undefined'?window:globalThis);
