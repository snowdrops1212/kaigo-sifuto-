const assert=require('node:assert/strict'),E=require('./dist/engine.js'),P=require('./dist/conditions.js');
const month='2026-10';
let seed=43;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const s=E.fresh(),m=E.month(s,month),night=s.members[2],manager=s.members[0];
m.requests[E.key(night.id,5)]='E';
for(const day of [1,2,3]){m.schedule[E.key(manager.id,day)]='B';m.locks[E.key(manager.id,day)]=true;}
E.generate(s,month);
assert.equal(m.schedule[E.key(night.id,3)],'D','希望休を夜勤セットのEに合わせる');
assert.equal(m.schedule[E.key(night.id,4)],'d');
assert.equal(m.schedule[E.key(night.id,5)],'E');
assert(!E.validate(s,month).some(issue=>issue.type==='request'&&issue.id===night.id&&issue.d===5),'希望休Eと夜勤セット最後のEの一致は違反ではない');
assert.equal(m.schedule[E.key(manager.id,4)],'E','B・Cが3日続いた翌日はE');
assert(!E.validate(s,month).some(issue=>['coverage','bcRest'].includes(issue.type)));
const nightDays=s.members.filter(person=>person.night).map(person=>Array.from({length:E.days(month)},(_,i)=>i+1).filter(day=>m.schedule[E.key(person.id,day)]==='D'));
assert(Math.max(...nightDays.map(list=>list.length))-Math.min(...nightDays.map(list=>list.length))<=1,'夜勤専門者以外は夜勤回数を均等にする');
assert(nightDays.every(list=>list.every((day,i)=>!i||day-list[i-1]>3)),'他の担当者がいるときは夜勤セットの連続を避ける');
for(const p of s.members.filter(person=>person.employmentType==='full')){
 assert.equal(E.holidayCount(month,m.schedule,p),9,p.name+' の夜勤後E込み休日は9日');
}
const before=JSON.stringify(m.schedule);m.locks[E.key(manager.id,4)]=true;m.schedule[E.key(manager.id,4)]='B';
assert.throws(()=>E.generate(s,month),/B・Cが3日続いた翌日は原則E/,'固定Bは休養規則と矛盾するため停止');
assert.equal(m.schedule[E.key(manager.id,4)],'B','停止時は保存済みの勤務を変更しない');
const draft=E.fresh(),draftMonth=E.month(draft,month),restPerson=draft.members[8];
for(const day of [1,2,3]){draftMonth.schedule[E.key(restPerson.id,day)]=day===2?'C':'B';draftMonth.locks[E.key(restPerson.id,day)]=true;}
E.generate(draft,month,{phase:'night'});
assert.equal(draftMonth.schedule[E.key(restPerson.id,4)],'E','夜勤案でもB・Cが3日続いた後のEを空欄化しない');
assert(!E.validate(draft,month).some(issue=>issue.type==='bcRest'&&issue.id===restPerson.id&&issue.d===4));
const forced=E.fresh(),forcedMonth=E.month(forced,month),forcedPerson=forced.members[2];
for(const day of [1,2,3]){forcedMonth.schedule[E.key(forcedPerson.id,day)]=day===2?'C':'B';forcedMonth.locks[E.key(forcedPerson.id,day)]=true;}
for(const person of forced.members)if(person.id!==forcedPerson.id)person.night=false;
E.generate(forced,month,{phase:'night'});
assert.equal(forcedMonth.schedule[E.key(forcedPerson.id,4)],'D','他の夜勤候補がいなければB・Cの3日後もDを許可する');
assert(E.validate(forced,month).some(issue=>issue.type==='bcNightLoad'&&issue.id===forcedPerson.id&&issue.d===4),'例外のDは警告する');
const preferred=E.fresh(),preferredMonth=E.month(preferred,month),tired=preferred.members[2];
for(const day of [1,2,3]){preferredMonth.schedule[E.key(tired.id,day)]=day===2?'C':'B';preferredMonth.locks[E.key(tired.id,day)]=true;}
E.generate(preferred,month,{phase:'night'});
assert.notEqual(preferredMonth.schedule[E.key(tired.id,4)],'D','他に担当者がいればB・Cの3日後のDを避ける');
const impossible=E.fresh(),im=E.month(impossible,'2026-11');impossible.members[2].targetMode='min';impossible.members[2].weekdays=[1];
assert.throws(()=>E.generate(impossible,'2026-11'),error=>error.issues?.some(issue=>issue.type==='holidays'||issue.type==='hours'),'30日の月の168時間以上と勤務可能曜日が両立しない案は止める');
assert(P.planningOrder.includes('前回の夜勤から長く空いた人'));
assert(P.planningOrder.includes('夜勤セットのEを含めて月9日ちょうど'));
assert(P.planningOrder.includes('希望休のEと夜勤セット最後のEは同じ日でよく'));
assert(P.planningOrder.includes('Dは他の候補が難しい場合のみ許可'));
console.log('PASS: requested E night alignment, B/C rest preserved in night drafts, D exception and warning, mandatory nine off and planning prompt');
