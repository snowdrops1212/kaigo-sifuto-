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
assert.equal(m.schedule[E.key(manager.id,4)],'E','B・Cが3日続いた翌日はE');
assert(!E.validate(s,month).some(issue=>['coverage','bcRest','separateOff'].includes(issue.type)));
const nightDays=s.members.filter(person=>person.night).map(person=>Array.from({length:E.days(month)},(_,i)=>i+1).filter(day=>m.schedule[E.key(person.id,day)]==='D'));
assert(Math.max(...nightDays.map(list=>list.length))-Math.min(...nightDays.map(list=>list.length))<=1,'夜勤専門者以外は夜勤回数を均等にする');
assert(nightDays.every(list=>list.every((day,i)=>!i||day-list[i-1]>3)),'他の担当者がいるときは夜勤セットの連続を避ける');
for(const p of s.members.filter(person=>person.employmentType==='full')){
 const separate=Array.from({length:E.days(month)},(_,i)=>i+1).filter(day=>m.schedule[E.key(p.id,day)]==='E'&&!(day>=3&&m.schedule[E.key(p.id,day-2)]==='D'&&m.schedule[E.key(p.id,day-1)]==='d'));
 assert(separate.length>=9,p.name+' は夜勤後Eを除いて休日9日');
}
const before=JSON.stringify(m.schedule);m.locks[E.key(manager.id,4)]=true;m.schedule[E.key(manager.id,4)]='B';
assert.throws(()=>E.generate(s,month),/B・Cが3日続いた翌日はE/,'固定勤務が休養規則と矛盾すれば停止');
assert.equal(m.schedule[E.key(manager.id,4)],'B','停止時は保存済みの勤務を変更しない');
const impossible=E.fresh(),im=E.month(impossible,'2026-11');impossible.members[2].target=176;impossible.members[2].targetMode='min';
const previous=JSON.stringify(impossible);assert.throws(()=>E.generate(impossible,'2026-11'),/両方必須.*シフト作成を止めました/);assert.equal(JSON.stringify(impossible),previous);
assert(P.planningOrder.includes('前回の夜勤から長く空いた人'));
assert(P.planningOrder.includes('夜勤セットのEとは別に月9日'));
console.log('PASS: requested E night alignment, three-day B/C rest, separate nine off, hard stop and planning prompt');
