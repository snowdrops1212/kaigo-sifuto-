const assert=require('node:assert/strict');
const E=require('./dist/engine.js');
const P=require('./dist/conditions.js');
const month='2026-10';

const state=E.fresh(),record=E.month(state,month),person=state.members[2];
for(let day=1;day<=8;day++)record.schedule[E.key(person.id,day)]='E';
record.schedule[E.key(person.id,12)]='D';
record.schedule[E.key(person.id,13)]='d';
record.schedule[E.key(person.id,14)]='E';
assert.equal(E.holidayCount(month,record.schedule,person),9,'夜勤セット末尾のEも休日に数える');
assert(!E.validate(state,month).some(issue=>issue.type==='holidays'&&issue.id===person.id));
record.schedule[E.key(person.id,15)]='E';
assert(E.validate(state,month).some(issue=>issue.type==='holidays'&&issue.id===person.id&&issue.text.includes('10日')),'10日も条件不一致');

const tooMany=E.fresh(),draft=E.month(tooMany,month);
for(let day=1;day<=10;day++)draft.requests[E.key(tooMany.members[0].id,day)]='E';
const before=JSON.stringify(draft.schedule);
assert.throws(()=>E.generate(tooMany,month),error=>error.issues?.some(issue=>issue.type==='holidays'),'9日ちょうどを作れない案は適用しない');
assert.equal(JSON.stringify(draft.schedule),before,'失敗しても現在のシフトを保つ');

const normal=E.fresh();E.generate(normal,month);
for(const member of normal.members.filter(p=>p.employmentType==='full'||p.usesI))assert.equal(E.holidayCount(month,E.month(normal,month).schedule,member),9,member.name);
const prompt=P.template(E.month(normal,month).rules);
assert(prompt.includes('D → d → Eの最後のEも含めて、月9日ちょうど'));
assert(!prompt.includes('セット内のEはこの9日に含めない'));
assert(!prompt.includes('別枠休日9日は努力目標'));
console.log('PASS: D-d-E rest counts toward exactly nine E days, excess blocks generation, prompt updated');
