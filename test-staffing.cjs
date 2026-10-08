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
assert.equal(gm.schedule['s1:5'],'E');assert.equal(gm.schedule['s2:6'],'F');assert.equal(gm.schedule['s3:7'],'C');
assert.equal(JSON.stringify({rules:gm.rules,daily:gm.daily,requests:gm.requests,locks:gm.locks}),retained);
assert(!E.validate(g,month).some(x=>x.type==='coverage'));
for(const id of ['s1','s2','s3']){gm.schedule[E.key(id,8)]='C';gm.locks[E.key(id,8)]=true;}
const before=JSON.stringify(g);assert.throws(()=>E.generate(g,month),/Cの固定勤務が3人/);assert.equal(JSON.stringify(g),before);
delete gm.locks['s3:8'];delete gm.schedule['s3:8'];for(const id of ['s3','s4']){gm.schedule[E.key(id,9)]='D';gm.locks[E.key(id,9)]=true;}
assert.throws(()=>E.generate(g,month),/Dの固定勤務が2人/);
const short=E.fresh();short.members=short.members.slice(0,1);const sm=E.month(short,month);sm.rules.D=0;sm.rules.maxRun=31;sm.rules.off=0;
assert(E.generate(short,month).some(x=>x.type==='coverage'&&x.text.includes('Cが1人不足')));
assert.deepEqual(E.checkData(E.copy(g)),g);
for(const value of [0,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.maxRun=value;assert.throws(()=>E.checkData(invalid),/連続勤務/);}
for(const value of [-1,32,1.5]){const invalid=E.copy(g);invalid.months[month].rules.off=value;assert.throws(()=>E.checkData(invalid),/休日/);}
for(const value of [-1,16,1.5]){const invalid=E.copy(g);invalid.members[2].nightMax=value;assert.throws(()=>E.checkData(invalid),/夜勤上限/);}
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.members[2].target=value;assert.throws(()=>E.checkData(invalid),/勤務時間目安/);}
for(const value of [-1,301,1.5]){const invalid=E.copy(g);invalid.months[month].targets.s3=value;assert.throws(()=>E.checkData(invalid),/今月の勤務時間目安/);}
for(const weekdays of [[0,0],[-1],[7],[1.5]]){const invalid=E.copy(g);invalid.members[2].weekdays=weekdays;assert.throws(()=>E.checkData(invalid),/勤務可能曜日/);}
console.log('PASS: B unrestricted, exact C2/D1 checks, legacy B/C/D overrides ignored, generation, protected requests/fixed shifts, fixed excess and shortage reporting');
