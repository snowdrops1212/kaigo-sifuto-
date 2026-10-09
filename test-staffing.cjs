const assert=require('node:assert/strict'),E=require('./dist/engine.js');
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
E.generate(g,month);
assert(E.dailyCounts(g,month).every(row=>row.counts.C===2));
assert(E.dailyCounts(g,month).every(row=>row.counts.D===1),'夜勤Dを毎日ちょうど1人にする');
assert.equal(gm.schedule['s1:5'],'E');assert.equal(gm.schedule['s2:6'],'F');assert.equal(gm.schedule['s3:7'],'C');
assert.equal(JSON.stringify({rules:gm.rules,daily:gm.daily,requests:gm.requests,locks:gm.locks}),retained);
assert(!E.validate(g,month).some(x=>x.type==='coverage'));
const tight=E.fresh();tight.members[2].night=false;tight.members[3].nightMax=11;E.generate(tight,month);assert(E.dailyCounts(tight,month).every(row=>row.counts.D===1),'夜勤可能者が少ない月でも上限の余裕を使って毎日Dを確保する');
const hoursState=E.fresh(),hoursMonth=E.month(hoursState,month),hoursPerson=hoursState.members[2];hoursPerson.target=16;hoursPerson.targetMode='min';hoursMonth.schedule[E.key(hoursPerson.id,1)]='B';
assert(E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id&&x.text.includes('16時間以上')));
hoursMonth.schedule[E.key(hoursPerson.id,2)]='B';assert(!E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id));
hoursMonth.schedule[E.key(hoursPerson.id,3)]='B';assert(!E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id),'以上は超過を許可する');
hoursPerson.targetMode='max';assert(E.validate(hoursState,month).some(x=>x.type==='hours'&&x.id===hoursPerson.id&&x.text.includes('16時間以内')));
assert(E.targetLimitIssue(hoursState,month,hoursPerson,[[4,'B']]).includes('設定できません'));
hoursPerson.targetMode='min';assert.equal(E.targetLimitIssue(hoursState,month,hoursPerson,[[4,'B']]),'');
const minimum=E.fresh(),minimumMonth=E.month(minimum,month),minimumPerson=minimum.members[0];minimumPerson.target=7;minimumPerson.targetMode='min';minimumPerson.weekdays=[E.weekday(month,1)];E.generate(minimum,month);
const minimumHours=Object.entries(minimumMonth.schedule).filter(([cell])=>cell.startsWith(minimumPerson.id+':')).reduce((sum,[,code])=>sum+(E.shifts[code]?.hours||0),0);assert(minimumHours>=7,'以上は勤務単位で目標以上まで割り当てる');
const capped=E.fresh(),cappedMonth=E.month(capped,month),cappedPerson=capped.members[0];cappedPerson.target=8;cappedPerson.targetMode='max';E.generate(capped,month);assert(E.projectedHours(capped,month,cappedPerson)<=8,'以内の自動作成は規定時間を超えない');
const fixedOver=E.fresh(),fixedOverMonth=E.month(fixedOver,month),fixedOverPerson=fixedOver.members[2];fixedOverPerson.target=8;fixedOverPerson.targetMode='max';fixedOverMonth.schedule[E.key(fixedOverPerson.id,1)]='D';fixedOverMonth.locks[E.key(fixedOverPerson.id,1)]=true;assert.throws(()=>E.generate(fixedOver,month),/勤務時間目安8時間以内/);
for(const id of ['s1','s2','s3']){gm.schedule[E.key(id,8)]='C';gm.locks[E.key(id,8)]=true;}
const before=JSON.stringify(g);assert.throws(()=>E.generate(g,month),/Cの固定勤務が3人/);assert.equal(JSON.stringify(g),before);
delete gm.locks['s3:8'];delete gm.schedule['s3:8'];for(const id of ['s3','s4']){gm.schedule[E.key(id,9)]='D';gm.locks[E.key(id,9)]=true;}
assert.throws(()=>E.generate(g,month),/Dの固定勤務が2人/);
const short=E.fresh();short.members=short.members.slice(0,1);const sm=E.month(short,month);sm.rules.D=0;sm.rules.maxRun=31;sm.rules.off=0;
const shortBefore=JSON.stringify(short);assert.throws(()=>E.generate(short,month),/シフトを完成できません/);assert.equal(JSON.stringify(short),shortBefore,'人数不足を完成扱いにしない');
const existing=E.fresh(),existingMonth=E.month(existing,month);E.generate(existing,month);const originalSchedule=JSON.stringify(existingMonth.schedule);for(const person of existing.members)existingMonth.requests[E.key(person.id,5)]='E';assert.throws(()=>E.generate(existing,month),/Dが1人不足/);assert.equal(JSON.stringify(existingMonth.schedule),originalSchedule,'再作成に失敗しても保存済みのシフトを残す');assert.equal(existingMonth.generated,true);
assert.deepEqual(E.checkData(E.copy(g)),g);
for(const value of [0,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.maxRun=value;assert.throws(()=>E.checkData(invalid),/連続勤務/);}
for(const value of [-1,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.off=value;assert.throws(()=>E.checkData(invalid),/休日/);}
for(const value of [-1,16,1.5]){const invalid=E.copy(g);invalid.members[2].nightMax=value;assert.throws(()=>E.checkData(invalid),/夜勤上限/);}
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.members[2].target=value;assert.throws(()=>E.checkData(invalid),/勤務時間目安/);}
for(const value of ['',null,'minimum','MAX']){const invalid=E.copy(g);invalid.members[2].targetMode=value;assert.throws(()=>E.checkData(invalid),/以上.*以内/);}
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.months[month].targets.s3=value;assert.throws(()=>E.checkData(invalid),/今月の勤務時間目安/);}
for(const weekdays of [[0,0],[-1],[7],[1.5]]){const invalid=E.copy(g);invalid.members[2].weekdays=weekdays;assert.throws(()=>E.checkData(invalid),/勤務可能曜日/);}
console.log('PASS: B unrestricted, exact C2/D1 checks, legacy B/C/D overrides ignored, generation, protected requests/fixed shifts, fixed excess and shortage reporting');
