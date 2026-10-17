const assert=require('node:assert/strict'),E=require('./dist/engine.js');
const generateDraft=(state,month)=>{E.generate(state,month,{phase:'night'});E.generate(state,month,{phase:'day',allowIncomplete:true});};
const month='2026-10',s=E.fresh(),m=E.month(s,month);
assert.equal(m.rules.B,0);assert.equal(m.rules.C,2);
m.rules.B=8;m.rules.C=9;m.daily[1]={B:12,C:8,D:2};
assert.equal(E.staffingNeed(m,1,'B'),0);assert.equal(E.staffingNeed(m,1,'C'),2);assert.equal(E.staffingNeed(m,1,'D'),1);
for(const cCount of [0,1,2,3]){
 m.schedule={};for(let i=0;i<cCount;i++)m.schedule[E.key(s.members[i].id,1)]='C';
 const issues=E.validate(s,month).filter(x=>x.type==='coverage'&&x.d===1);
 assert(!issues.some(x=>/ Bが/.test(x.text)));
 assert.equal(issues.some(x=>/ Cが/.test(x.text)),cCount!==2);
 if(cCount===3)assert(issues.some(x=>x.text.includes('1人超過')));
 assert(issues.some(x=>x.text.includes('Dが1人不足')));
}
for(const p of s.members)m.schedule[E.key(p.id,1)]='B';
assert(!E.validate(s,month).some(x=>x.type==='coverage'&&/ Bが/.test(x.text)));
const g=E.fresh(),gm=E.month(g,month);gm.rules={B:9,C:7,D:0,maxRun:31,off:0};gm.daily[2]={B:50,C:8};
g.members[1].start='2025-01-01';
gm.requests['s1:5']='E';gm.requests['s2:6']='F';gm.schedule['s3:7']='C';gm.locks['s3:7']=true;
const retained=JSON.stringify({rules:gm.rules,daily:gm.daily,requests:gm.requests,locks:gm.locks});
generateDraft(g,month);
assert(E.dailyCounts(g,month).every(row=>row.counts.C===2));
assert(E.dailyCounts(g,month).every(row=>row.counts.D===1),'夜勤Dを毎日ちょうど1人にする');
assert.equal(gm.schedule['s1:5'],'E');assert.equal(gm.schedule['s2:6'],'F');assert.equal(gm.schedule['s3:7'],'C');
assert.equal(JSON.stringify({rules:gm.rules,daily:gm.daily,requests:gm.requests,locks:gm.locks}),retained);
assert(!E.validate(g,month).some(x=>x.type==='coverage'));
const tight=E.fresh();tight.members[2].night=false;generateDraft(tight,month);assert(E.dailyCounts(tight,month).every(row=>row.counts.D===1),'毎日のDを組む');assert(!E.validate(tight,month).some(issue=>issue.type==='holidays'),'休日Eは夜勤後も含めて9日ちょうどにする');
const unlimited=E.fresh();for(const member of unlimited.members)member.night=false;
for(const member of unlimited.members.slice(2,5)){member.night=true;member.employmentType='full';member.allowedShift='D';member.target=176;member.targetMode='max';}
E.generate(unlimited,month,{phase:'night'});
const nightCounts=unlimited.members.slice(2,5).map(member=>Object.entries(E.month(unlimited,month).schedule).filter(([cell,code])=>cell.startsWith(member.id+':')&&code==='D').length);
assert(nightCounts.every(count=>count>7),'夜勤のみパート以外は回数上限なしで、3人が31日分のDを分担できる');
const hoursState=E.fresh(),hoursMonth=E.month(hoursState,month),hoursPerson=hoursState.members[2];hoursPerson.employmentType='part';hoursPerson.target=16;hoursPerson.targetMode='min';hoursMonth.schedule[E.key(hoursPerson.id,1)]='B';
assert(E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id&&x.text.includes('16時間以上')));
hoursMonth.schedule[E.key(hoursPerson.id,2)]='B';assert(!E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id));
hoursMonth.schedule[E.key(hoursPerson.id,3)]='B';assert(!E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id),'以上は超過を許可する');
hoursPerson.targetMode='max';assert(E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id&&x.text.includes('16時間以内')));
assert(E.targetLimitIssue(hoursState,month,hoursPerson,[[4,'B']]).includes('設定できません'));
hoursPerson.targetMode='min';assert.equal(E.targetLimitIssue(hoursState,month,hoursPerson,[[4,'B']]),'');
const minimum=E.fresh(),minimumMonth=E.month(minimum,month),minimumPerson=minimum.members[2];minimumPerson.employmentType='part';minimumPerson.night=false;minimumPerson.target=7;minimumPerson.targetMode='min';minimumPerson.weekdays=[E.weekday(month,1)];generateDraft(minimum,month);
const minimumHours=Object.entries(minimumMonth.schedule).filter(([cell])=>cell.startsWith(minimumPerson.id+':')).reduce((sum,[,code])=>sum+(E.shifts[code]?.hours||0),0);assert(minimumHours>=7,'以上は勤務単位で目標以上まで割り当てる');
const capped=E.fresh(),cappedMonth=E.month(capped,month),cappedPerson=capped.members[2];cappedPerson.employmentType='part';cappedPerson.night=false;cappedPerson.target=8;cappedPerson.targetMode='max';generateDraft(capped,month);assert(E.projectedHours(capped,month,cappedPerson)<=8,'パートの以内設定は規定時間を超えない');
const fixedOver=E.fresh(),fixedOverMonth=E.month(fixedOver,month),fixedOverPerson=fixedOver.members[2];fixedOverPerson.employmentType='part';fixedOverPerson.target=8;fixedOverPerson.targetMode='max';fixedOverMonth.schedule[E.key(fixedOverPerson.id,1)]='D';fixedOverMonth.locks[E.key(fixedOverPerson.id,1)]=true;assert.throws(()=>E.generate(fixedOver,month),/勤務時間目安8時間以内/);
for(const id of ['s1','s2','s3']){gm.schedule[E.key(id,8)]='C';gm.locks[E.key(id,8)]=true;}
const before=JSON.stringify(g);assert.throws(()=>E.generate(g,month),/Cの固定勤務が3人/);assert.equal(JSON.stringify(g),before);
delete gm.locks['s3:8'];delete gm.schedule['s3:8'];for(const id of ['s3','s4']){gm.schedule[E.key(id,9)]='D';gm.locks[E.key(id,9)]=true;}
assert.throws(()=>E.generate(g,month),/Dの固定勤務が2人/);
const short=E.fresh();short.members=short.members.slice(0,1);const sm=E.month(short,month);sm.rules.D=0;sm.rules.maxRun=31;sm.rules.off=0;
const shortBefore=JSON.stringify(short);assert.throws(()=>E.generate(short,month),/シフトを完成できません/);assert.equal(JSON.stringify(short),shortBefore,'人数不足を完成扱いにしない');
const existing=E.fresh(),existingMonth=E.month(existing,month);generateDraft(existing,month);const originalSchedule=JSON.stringify(existingMonth.schedule);for(const person of existing.members)existingMonth.requests[E.key(person.id,5)]='E';assert.throws(()=>E.generate(existing,month),/Dが1人不足/);assert.equal(JSON.stringify(existingMonth.schedule),originalSchedule,'再作成に失敗しても保存済みのシフトを残す');assert.equal(existingMonth.generated,true);
assert.deepEqual(E.checkData(E.copy(g)),g);
for(const value of [0,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.maxRun=value;assert.throws(()=>E.checkData(invalid),/連勤警告の目安/);}
for(const value of [-1,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.off=value;assert.throws(()=>E.checkData(invalid),/休日/);}
const oldNightLimit=E.copy(g);oldNightLimit.members[2].nightMax=7;E.checkData(oldNightLimit);assert.equal(Object.hasOwn(oldNightLimit.members[2],'nightMax'),false,'旧保存データの夜勤回数上限を除去する');
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.members[2].target=value;assert.throws(()=>E.checkData(invalid),/勤務時間目安/);}
for(const value of ['',null,'minimum','MAX']){const invalid=E.copy(g);invalid.members[2].targetMode=value;assert.throws(()=>E.checkData(invalid),/以上.*以内/);}
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.months[month].targets.s3=value;assert.throws(()=>E.checkData(invalid),/今月の勤務時間目安/);}
for(const weekdays of [[0,0],[-1],[7],[1.5]]){const invalid=E.copy(g);invalid.members[2].weekdays=weekdays;assert.throws(()=>E.checkData(invalid),/勤務可能曜日/);}
for(const [monthKey,required] of [['2026-11',168],['2026-10',176]]){
 const roster=E.fresh(),person=roster.members[2],record=E.month(roster,monthKey);person.target=168;person.targetMode='min';record.targets[person.id]=168;
 assert.equal(E.target(person,record,E.days(monthKey)),required,'正社員は保存済みの168時間より月別基準を優先する');
 assert(E.validate(roster,monthKey).some(issue=>issue.type==='hours'&&issue.id===person.id&&issue.text.includes(`${required}時間以上`)));
 for(let day=1;day<=required/8;day++)record.schedule[E.key(person.id,day)]='B';
 assert(!E.validate(roster,monthKey).some(issue=>issue.type==='hours'&&issue.id===person.id),'基準ちょうどは達成扱い');
 record.schedule[E.key(person.id,required/8+1)]='B';
 assert(!E.validate(roster,monthKey).some(issue=>issue.type==='hours'&&issue.id===person.id),'基準を超えた勤務も許可する');
 assert.equal(E.targetLimitIssue(roster,monthKey,person,[[E.days(monthKey),'B']]),'','超過勤務を上限違反にしない');
}
console.log('PASS: B unrestricted, exact C2/D1 checks, legacy B/C/D overrides ignored, generation, protected requests/fixed shifts, fixed excess and shortage reporting');
