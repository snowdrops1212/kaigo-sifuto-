const assert=require('node:assert/strict'),E=require('./dist/engine.js');
const month='2026-10';
const s=E.fresh(),mo=E.month(s,month);
mo.meetings=[31,1,15];s.members[0].name='名前から判定しない';s.members[0].night=true;
s.members[1].role='管理者';mo.locks['s3:15']=true;mo.schedule['s3:15']='C';
assert.deepEqual(E.meetingDays(s,month),[1,15,31]);
assert.deepEqual(E.meetingConflicts(s,month),[]);
E.generate(s,month);
for(const id of ['s1','s2'])for(const day of [1,15,31])assert.equal(mo.schedule[E.key(id,day)],'B');
assert.equal(mo.schedule['s3:15'],'C');assert(!E.validate(s,month).some(x=>x.type==='meeting'));
mo.schedule['s1:15']='E';assert(E.validate(s,month).some(x=>x.type==='meeting'&&x.id==='s1'&&x.d===15));
mo.schedule['s1:15']='B';assert.deepEqual(E.checkData(E.copy(s)),s);
assert.deepEqual(E.meetingDays(s,'2026-11'),[]);
for(const [reason,configure] of [
 ['希望休', (s,m)=>m.requests['s1:2']='E'],
 ['有給', (s,m)=>{s.members[0].start='2025-01-01';m.requests['s1:2']='F';}],
 ['固定', (s,m)=>{m.schedule['s1:2']='C';m.locks['s1:2']=true;}],
 ['勤務不可', (s,m)=>s.members[0].weekdays=[]],
 ['夜勤明け', (s,m)=>{m.previous.s1='D';}],
 ['夜勤明け', (s,m)=>{m.schedule['s1:1']='d';m.locks['s1:1']=true;}],
 ['管理者が未登録', (s,m)=>s.members[0].end='2026-10-01']
 ]){
 const st=E.fresh(),m=E.month(st,month);m.meetings=[2];configure(st,m);const before=JSON.stringify(st);
 assert(E.meetingConflicts(st,month).some(x=>x.text.includes(reason)),reason);
 assert.throws(()=>E.generate(st,month),new RegExp(reason));assert.equal(JSON.stringify(st),before,'conflicts must not overwrite schedule or requests');
}
const fixed=E.fresh(),fm=E.month(fixed,month);fm.meetings=[5];fm.schedule['s1:3']='D';fm.locks['s1:3']=true;assert.throws(()=>E.generate(fixed,month),/夜勤明け/);
const prev=E.fresh(),pm=E.month(prev,'2026-12'),jan=E.month(prev,'2027-01');pm.generated=true;pm.schedule['s1:31']='D';jan.meetings=[1,2];assert.equal(E.meetingConflicts(prev,'2027-01').length,2);
pm.schedule['s1:31']='d';assert.equal(E.meetingConflicts(prev,'2027-01').length,1);
const forward=E.fresh(),nov=E.month(forward,'2026-11'),dec=E.month(forward,'2026-12');nov.generated=true;nov.schedule['s3:30']='D';nov.locks['s3:30']=true;dec.generated=true;dec.schedule['s3:1']='B';dec.schedule['s3:2']='E';
assert(E.validate(forward,'2026-11').some(x=>x.type==='sequence'&&x.id==='s3'&&x.d===30));
const forwardBefore=JSON.stringify(forward);assert.throws(()=>E.generate(forward,'2026-11'),/勤務を調整/);assert.equal(JSON.stringify(forward),forwardBefore);
dec.schedule['s3:1']='d';assert.equal(E.futureShiftConflict(forward,'2026-11',forward.members[2],31,'d'),null);assert.equal(E.futureShiftConflict(forward,'2026-11',forward.members[2],32,'E'),null);
assert.equal(E.requiredNightShift(forward,'2026-12',forward.members[2],1),'d');assert.equal(E.requiredNightShift(forward,'2026-12',forward.members[2],2),'E');
dec.requests['s3:1']='E';const carryBefore=JSON.stringify(forward);assert.throws(()=>E.generate(forward,'2026-12'),/前月からのD→d→E/);assert.equal(JSON.stringify(forward),carryBefore);delete dec.requests['s3:1'];
const sequence=E.fresh(),sm=E.month(sequence,month);sm.schedule['s3:10']='D';sm.schedule['s3:11']='d';sm.schedule['s3:12']='B';assert(E.validate(sequence,month).some(x=>x.type==='sequence'&&x.id==='s3'&&x.d===10&&x.text.includes('翌々日の休日E')));
sm.locks['s3:10']=true;sm.locks['s3:12']=true;const sequenceBefore=JSON.stringify(sequence);assert.throws(()=>E.generate(sequence,month),/固定勤務と夜勤後のE/);assert.equal(JSON.stringify(sequence),sequenceBefore);
const tenure=E.fresh(),tm=E.month(tenure,month);tenure.members[0].end='2026-10-15';tenure.members[1].role='管理者';tenure.members[1].start='2026-10-16';tm.meetings=[15,16];E.generate(tenure,month);assert.equal(tm.schedule['s1:15'],'B');assert.equal(tm.schedule['s1:16'],'');assert.equal(tm.schedule['s2:16'],'B');
const legacy=E.fresh(),lm=E.month(legacy,month);delete lm.meetings;assert.deepEqual(E.meetingDays(legacy,month),[]);assert.deepEqual(E.checkData(E.copy(legacy)),legacy);
for(const value of [null,{},'1',[0],[32],[1.5],['1'],[1,1]]){lm.meetings=value;assert.throws(()=>E.checkData(E.copy(legacy)),/会議日/);}
const leap=E.fresh(),feb=E.month(leap,'2028-02');feb.meetings=[29];assert.deepEqual(E.checkData(E.copy(leap)),leap);feb.meetings=[30];assert.throws(()=>E.checkData(E.copy(leap)),/会議日/);
console.log('PASS: manager-role B constraint, multiple managers, sorted monthly meetings, manual-edit validation, conflict preservation, previous/next-month nights, tenure, legacy files and meeting date validation');
