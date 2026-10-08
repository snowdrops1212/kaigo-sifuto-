const assert=require('node:assert/strict');
const E=require('./dist/engine.js');

const month='2026-10',state=E.fresh(),mo=E.month(state,month),part=state.members.at(-1);
part.employmentType='part';part.usesI=true;part.night=false;part.target=300;mo.targets[part.id]=280;

assert.equal(E.target(part,mo,E.days(month)),154,'31日－9日休みをIの7時間で計算する');
assert.equal(E.memberShiftAllowed(part,'I'),true);
for(const code of ['B','C','D','d','G','/B','/C'])assert.equal(E.memberShiftAllowed(part,code),false,code+'はI勤務者に割り当てない');
assert.equal(E.memberShiftAllowed(state.members[0],'I'),false,'I指定のない職員にはIを割り当てない');
assert(E.memberConditionErrors({...part,employmentType:'full'}).some(x=>x.includes('パート')));
assert(E.memberConditionErrors({...part,night:true}).some(x=>x.includes('夜勤')));
assert(E.memberConditionErrors({...part,role:'管理者'}).some(x=>x.includes('管理者')));

E.generate(state,month);
const codes=Array.from({length:E.days(month)},(_,i)=>mo.schedule[E.key(part.id,i+1)]);
assert(codes.every(code=>['I','E','F'].includes(code)));
assert(codes.filter(code=>code==='E').length>=9);
assert(!E.validate(state,month).some(x=>x.type==='iOff'&&x.id===part.id));

for(let day=1;day<=E.days(month);day++)mo.schedule[E.key(part.id,day)]='I';
assert(E.validate(state,month).some(x=>x.type==='iOff'&&x.id===part.id&&x.text.includes('月9日')));

const legacy=E.fresh();delete legacy.members[0].employmentType;delete legacy.members[0].usesI;
const restored=E.checkData(E.copy(legacy));
assert.equal(restored.members[0].employmentType,'full');assert.equal(restored.members[0].usesI,false);
const invalidManager=E.fresh();invalidManager.members[0].employmentType='part';assert.throws(()=>E.checkData(invalidManager),/管理者は正社員/);
console.log('PASS: I is part-time-only, uses 7-hour days, targets at least nine E holidays, validates shortages and migrates legacy staff');
