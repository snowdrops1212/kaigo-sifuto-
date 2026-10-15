const assert=require('node:assert/strict');
const E=require('./dist/engine.js');
const month='2026-10',state=E.fresh(),record=E.month(state,month);
record.requests['s1:5']='E';
record.requests['s3:9']='E';
E.generate(state,month,{phase:'night'});
assert.equal(record.generated,true);
assert.equal(record.generationStage,'night');
assert(E.dailyCounts(state,month).every(row=>row.counts.D===1),'夜勤案は毎日Dを1人配置する');
assert(E.dailyCounts(state,month).some(row=>row.counts.blank>0),'日中は未入力のまま残す');
assert.equal(record.schedule['s1:5'],'E');
for(const person of state.members)for(let day=1;day<=E.days(month)-2;day++)if(record.schedule[E.key(person.id,day)]==='D'){
 assert.equal(record.schedule[E.key(person.id,day+1)],'d');
 assert.equal(record.schedule[E.key(person.id,day+2)],'E');
}
const day=10,owner=state.members.find(person=>record.schedule[E.key(person.id,day)]==='D');
record.locks[E.key(owner.id,day)]=true;
const protectedNight=[day,day+1,day+2].map(d=>record.schedule[E.key(owner.id,d)]);
E.generate(state,month,{phase:'day'});
assert.equal(record.generationStage,'day');
assert.deepEqual([day,day+1,day+2].map(d=>record.schedule[E.key(owner.id,d)]),protectedNight,'日中配置後も夜勤セットを保持する');
assert(E.dailyCounts(state,month).every(row=>row.counts.D===1&&row.counts.C===2),'人数調整で毎日のDとCを満たす');
assert.equal(record.schedule['s1:5'],'E');
const redo=E.fresh(),redoMonth=E.month(redo,month);
redoMonth.requests['s1:5']='E';
redoMonth.schedule['s1:5']='E';redoMonth.locks['s1:5']=true;
redoMonth.schedule['s1:2']='B';redoMonth.locks['s1:2']=true;
E.generate(redo,month,{phase:'night'});
const redoOwner=redo.members.find(person=>redoMonth.schedule[E.key(person.id,10)]==='D');
for(const offset of [0,1,2])redoMonth.locks[E.key(redoOwner.id,10+offset)]=true;
E.resetNightDraft(redo,month);
for(const offset of [0,1,2]){
 const cell=E.key(redoOwner.id,10+offset);
 assert.equal(redoMonth.schedule[cell],undefined,'以前の夜勤セットを消す');
 assert.equal(redoMonth.locks[cell],undefined,'手直しで固定した夜勤も解除する');
}
assert.equal(redoMonth.schedule['s1:5'],'E','希望休は残す');
assert.equal(redoMonth.locks['s1:5'],true,'希望休の固定は残す');
assert.equal(redoMonth.schedule['s1:2'],'B','夜勤以外の固定勤務は残す');
E.generate(redo,month,{phase:'night'});
assert(E.dailyCounts(redo,month).every(row=>row.counts.D===1),'夜勤を再作成できる');
const missing=E.fresh();assert.throws(()=>E.generate(missing,month,{phase:'day'}),/先に「夜勤案を作成」/);
const fixed=E.fresh(),fixedMonth=E.month(fixed,month);fixedMonth.schedule['s1:1']='B';fixedMonth.locks['s1:1']=true;
E.generate(fixed,month,{phase:'night'});assert.equal(fixedMonth.schedule['s1:1'],'B','夜勤案でも手直しして固定した日中勤務は保つ');
const ownerOnFirst=fixed.members.find(person=>fixedMonth.schedule[E.key(person.id,1)]==='D');
fixedMonth.schedule[E.key(ownerOnFirst.id,1)]='';
const broken=JSON.stringify(fixedMonth.schedule);assert.throws(()=>E.generate(fixed,month,{phase:'day'}),/夜勤案を先に調整/);
assert.equal(JSON.stringify(fixedMonth.schedule),broken,'夜勤が不足した人数調整では既存の案を変更しない');
const constrained=E.fresh(),constrainedMonth=E.month(constrained,month);
E.generate(constrained,month,{phase:'night'});
const firstNight=constrained.members.find(person=>constrainedMonth.schedule[E.key(person.id,1)]==='D');
const dayWorker=constrained.members.find(person=>person.id!==firstNight.id);
for(const person of constrained.members)if(person.id!==firstNight.id&&person.id!==dayWorker.id)constrainedMonth.requests[E.key(person.id,1)]='E';
const beforeConstrained=JSON.stringify(constrainedMonth.schedule),beforeStage=constrainedMonth.generationStage;
let constrainedError;try{E.generate(constrained,month,{phase:'day'});}catch(error){constrainedError=error;}
assert(constrainedError,'Cが2人に届かない人数調整は確定しない');
assert(constrainedError.issues.some(issue=>issue.type==='coverage'&&issue.d===1&&/ Cが/.test(issue.text)),'不足したCの日を具体的に返す');
assert(constrainedError.draft,'未確定案は確認用に残す');
assert.equal(JSON.stringify(constrainedMonth.schedule),beforeConstrained,'失敗時は現在のシフトを変更しない');
assert.equal(constrainedMonth.generationStage,beforeStage,'失敗時は夜勤段階のままにする');
const partial=E.fresh(),partialMonth=E.month(partial,month);
for(const person of partial.members)if(person.night)for(const day of [14,19])partialMonth.requests[E.key(person.id,day)]='E';
partialMonth.schedule['s1:2']='B';partialMonth.locks['s1:2']=true;
const partialIssues=E.generate(partial,month,{phase:'night'});
assert.equal(partialMonth.generationStage,'night','夜勤が一部不足しても案を表に反映する');
assert.equal(partialMonth.schedule['s1:2'],'B','元の固定勤務を保持する');
assert.equal(partialMonth.schedule['s3:14'],'E','希望休を保持する');
assert.equal(partialMonth.schedule['s3:19'],'E','希望休を保持する');
assert(E.dailyCounts(partial,month).filter(row=>row.counts.D===1).length>0,'組めた日のDを表に残す');
assert(partialIssues.some(issue=>issue.type==='coverage'&&/ Dが/.test(issue.text)),'未配置の日は警告として返す');
for(const person of partial.members)for(let day=1;day<=E.days(month)-2;day++)if(partialMonth.schedule[E.key(person.id,day)]==='D'){
 assert.equal(partialMonth.schedule[E.key(person.id,day+1)],'d');
 assert.equal(partialMonth.schedule[E.key(person.id,day+2)],'E');
}
const conflictingWishes=E.fresh(),conflictingMonth=E.month(conflictingWishes,month);
for(const id of ['s3','s4']){conflictingMonth.requests[E.key(id,15)]='W';conflictingMonth.workRequests[E.key(id,15)]='D';}
const wishIssues=E.generate(conflictingWishes,month,{phase:'night'});
assert.equal(conflictingMonth.generationStage,'night','希望が衝突しても調整可能な案は表示する');
assert(wishIssues.some(issue=>issue.type==='workRequest'),'満たせなかった出勤希望を警告として残す');
assert.equal(E.dailyCounts(conflictingWishes,month)[14].counts.D,1,'衝突日もDは1人だけにする');
const noNight=E.fresh(),emptyNight=E.month(noNight,month);for(const person of noNight.members)person.night=false;
assert.throws(()=>E.generate(noNight,month,{phase:'night'}),error=>{
 assert.equal(error.issues.length,E.days(month),'作成できない理由を全日分渡す');
 assert(error.issues.every(issue=>issue.type==='coverage'&&/ Dが/.test(issue.text)));
 assert(error.message.includes('ほか'+(error.issues.length-1)+'件'));
 return true;
});
assert.deepEqual(emptyNight.schedule,{},'失敗した試案で現在の表を変更しない');
const failedDay=E.fresh(),failedDayMonth=E.month(failedDay,month);
E.generate(failedDay,month,{phase:'night'});
const noNightFullTime=failedDay.members.find(person=>person.employmentType==='full'&&!person.night&&person.role!=='管理者');
assert(noNightFullTime,'日勤専従の正社員がいる');
for(let day=1;day<=10;day++){
 const cell=E.key(noNightFullTime.id,day);
 failedDayMonth.schedule[cell]='E';failedDayMonth.locks[cell]=true;
}
const beforeFailedDay=JSON.stringify(failedDayMonth.schedule);
assert.throws(()=>E.generate(failedDay,month,{phase:'day'}),error=>{
 assert(error.issues.some(issue=>issue.type==='hours'||issue.type==='holidays'),'不足条件を伝える');
 assert(error.draft&&Object.keys(error.draft).length,'未適用の試案を全職員分返す');
 assert.equal(error.draft[E.key(noNightFullTime.id,1)],'E','試案でも固定休日を守る');
 assert(Object.values(error.draft).some(code=>code==='B'||code==='C'),'他職員の配置も試案に含む');
 return true;
});
assert.equal(JSON.stringify(failedDayMonth.schedule),beforeFailedDay,'未適用の試案は現在の表を変更しない');
const originalRandom=Math.random;
let randomSeed=3;
Math.random=()=>((randomSeed=(1664525*randomSeed+1013904223)>>>0)/4294967296);
try{
 const belowFloor=E.fresh(),belowFloorMonth=E.month(belowFloor,month);
 for(const person of belowFloor.members)person.targetMode='min';
 E.generate(belowFloor,month,{phase:'night'});
 const beforeBelowFloor=JSON.stringify(belowFloorMonth.schedule);
 try{
  E.generate(belowFloor,month,{phase:'day'});
  assert(E.dailyEquivalent(belowFloor,month).every(row=>row.tenths>=60),'完成した案はどの日も6.0以上');
 }catch(error){
  assert(error.issues?.some(issue=>issue.type==='equivalent'&&issue.d===2),'6.0未満を解消できなければ日付付きで止める');
  assert.equal(JSON.stringify(belowFloorMonth.schedule),beforeBelowFloor,'基準未満の案を勝手に確定しない');
 }
 randomSeed=3;
 const impossible=E.fresh(),impossibleMonth=E.month(impossible,month);
 for(const person of impossible.members)person.targetMode='min';
 E.generate(impossible,month,{phase:'night'});
 const nightWorkers=impossible.members.filter(person=>['D','d'].includes(impossibleMonth.schedule[E.key(person.id,2)]));
 const dayWorkers=impossible.members.filter(person=>!nightWorkers.includes(person)&&E.memberShiftAllowed(person,'C')&&person.weekdays.includes(E.weekday(month,2))).slice(0,2);
 for(const person of impossible.members)if(!nightWorkers.includes(person)&&!dayWorkers.includes(person))impossibleMonth.requests[E.key(person.id,2)]='E';
 const beforeImpossible=JSON.stringify(impossibleMonth.schedule);
 assert.throws(()=>E.generate(impossible,month,{phase:'day'}),error=>{
  assert(error.issues?.some(issue=>issue.type==='equivalent'&&issue.d===2),'6.0未満が不可避な日を停止理由に含める');
  assert.equal(JSON.stringify(impossibleMonth.schedule),beforeImpossible,'基準未満の案を適用しない');
  assert.equal(impossibleMonth.generationStage,'night');
  return true;
 });
}finally{Math.random=originalRandom;}
console.log('PASS: night-only draft, editable blanks, D-d-E preservation, daytime staffing and stage order');
