const assert=require('node:assert/strict');
const E=require('./dist/engine.js');

const month='2026-10',state=E.fresh(),mo=E.month(state,month),part=state.members.at(-1);
part.employmentType='part';part.usesI=true;part.night=false;part.target=0;

assert.equal(E.target(part,mo,E.days(month)),154,'31日－9日休みをIの7時間で計算する');
part.target=140;part.targetMode='min';
assert.equal(E.target(part,mo,E.days(month)),140,'I勤務者の低い個別設定を優先する');
assert.equal(E.targetMode(part),'max','保存済みの「以上」でもI勤務の上限を適用する');
assert.equal(E.targetModeLabel(part),'以内');
mo.targets[part.id]=147;
assert.equal(E.target(part,mo,E.days(month)),147,'今月の個別設定を優先する');
mo.targets[part.id]=200;
assert.equal(E.target(part,mo,E.days(month)),154,'高い月別設定でも31日の上限を超えない');
delete mo.targets[part.id];part.target=200;
assert.equal(E.target(part,mo,E.days(month)),154,'高い職員設定でも31日の上限を超えない');
part.target=0;part.targetMode='max';
assert.equal(E.memberShiftAllowed(part,'I'),true);
for(const code of ['B','C','D','d','G','/B','/C'])assert.equal(E.memberShiftAllowed(part,code),false,code+'はI勤務者に割り当てない');
assert.equal(E.memberShiftAllowed(state.members[0],'I'),false,'I指定のない職員にはIを割り当てない');
assert(E.memberConditionErrors({...part,employmentType:'full'}).some(x=>x.includes('パート')));
assert(E.memberConditionErrors({...part,night:true}).some(x=>x.includes('夜勤')));
assert(E.memberConditionErrors({...part,role:'管理者'}).some(x=>x.includes('管理者')));

E.generate(state,month,{phase:'night'});
E.generate(state,month,{phase:'day',allowIncomplete:true});
const codes=Array.from({length:E.days(month)},(_,i)=>mo.schedule[E.key(part.id,i+1)]);
assert(codes.every(code=>['I','E','F'].includes(code)));
assert.equal(codes.filter(code=>code==='E').length,9);
assert(!E.validate(state,month).some(x=>x.type==='holidays'&&x.id===part.id));
assert(E.projectedHours(state,month,part)<=154,'自動作成でも31日の上限を守る');

const cap31=E.fresh(),person31=cap31.members.at(-1),record31=E.month(cap31,'2026-10');
person31.employmentType='part';person31.usesI=true;person31.night=false;person31.target=200;person31.targetMode='min';
for(let day=1;day<=31;day++)record31.schedule[E.key(person31.id,day)]=day<=22?'I':'E';
assert.equal(E.projectedHours(cap31,'2026-10',person31),154);
assert.equal(E.targetLimitIssue(cap31,'2026-10',person31),'','31日は154時間ちょうどを許可する');
assert(!E.validate(cap31,'2026-10').some(issue=>issue.type==='hours'&&issue.id===person31.id));
assert(E.targetLimitIssue(cap31,'2026-10',person31,[[23,'I']]).includes('154時間以内'),'23日目のIを手動設定できない');
record31.schedule[E.key(person31.id,23)]='I';
assert(E.validate(cap31,'2026-10').some(issue=>issue.type==='hours'&&issue.id===person31.id),'既存の超過勤務を警告する');

const cap30=E.fresh(),person30=cap30.members.at(-1),record30=E.month(cap30,'2026-11');
person30.employmentType='part';person30.usesI=true;person30.night=false;person30.target=154;person30.targetMode='min';
assert.equal(E.partIHoursCap(30),147);
assert.equal(E.target(person30,record30,30),147,'30日の月は保存済み154時間を147時間に抑える');
for(let day=1;day<=30;day++)record30.schedule[E.key(person30.id,day)]=day<=21?'I':'E';
assert.equal(E.projectedHours(cap30,'2026-11',person30),147);
assert.equal(E.targetLimitIssue(cap30,'2026-11',person30),'','30日は147時間ちょうどを許可する');
assert(!E.validate(cap30,'2026-11').some(issue=>issue.type==='hours'&&issue.id===person30.id));
assert(E.targetLimitIssue(cap30,'2026-11',person30,[[22,'I']]).includes('147時間以内'),'22日目のIを手動設定できない');
record30.schedule[E.key(person30.id,22)]='I';
assert(E.validate(cap30,'2026-11').some(issue=>issue.type==='hours'&&issue.id===person30.id&&E.blockingGenerationIssue(cap30,issue)),'30日の超過勤務を警告し自動作成を止める');

for(let day=1;day<=E.days(month);day++)mo.schedule[E.key(part.id,day)]='I';
assert(E.validate(state,month).some(x=>x.type==='holidays'&&x.id===part.id&&x.text.includes('必須9日ちょうど')));

const legacy=E.fresh();delete legacy.members[0].employmentType;delete legacy.members[0].usesI;delete legacy.members[0].targetMode;
const restored=E.checkData(E.copy(legacy));
assert.equal(restored.members[0].employmentType,'full');assert.equal(restored.members[0].usesI,false);assert.equal(restored.members[0].targetMode,'max');
const invalidManager=E.fresh();invalidManager.members[0].employmentType='part';assert.throws(()=>E.checkData(invalidManager),/管理者は正社員/);
console.log('PASS: I is part-time-only, uses 7-hour days, requires exactly nine E holidays and migrates legacy staff');
