const assert=require('node:assert/strict');
const E=require('./dist/engine.js');

for(const role of ['管理者','管理者（介護）','管理者兼介護職員','看護職員','看護職員（兼務）','看護職員兼介護職員','看護師','看護師（兼務）','准看護師','准看護師（兼務）']){
 const p={...E.fresh().members[2],role,night:true};
 assert(E.nightRoleForbidden(p),`${role} は夜勤不可`);
 assert(!E.nightEligible(p));
 assert(!E.memberShiftAllowed(p,'D'));
 assert(!E.memberShiftAllowed(p,'d'));
 assert(!E.workRequestShiftAllowed(p,'D'));
}
assert(E.nightEligible({...E.fresh().members[2],night:true}), '介護職員は夜勤可能');
assert(E.nightEligible({...E.fresh().members[2],role:'看護補助者',night:true}), '看護補助者は看護師と誤認しない');

const legacy=E.fresh(),legacyMonth=E.month(legacy,'2026-10');
legacy.members[0].night=true;
legacy.members[1].night=true;
legacyMonth.schedule[E.key(legacy.members[0].id,1)]='D';
legacyMonth.schedule[E.key(legacy.members[0].id,2)]='d';
legacyMonth.schedule[E.key(legacy.members[0].id,3)]='E';
legacyMonth.requests['s2:5']='W';
legacyMonth.workRequests['s2:5']='D';
const migrated=E.checkData(E.copy(legacy));
assert.equal(migrated.members[0].night,false,'保存済みの管理者は夜勤不可へ移行');
assert.equal(migrated.members[1].night,false,'保存済みの看護職員は夜勤不可へ移行');
assert.equal(migrated.months['2026-10'].schedule['s1:1'],'D','既存の勤務記録は消さない');
assert.equal(migrated.months['2026-10'].workRequests['s2:5'],'D','古い夜勤出勤希望を消さずに要確認へ残す');
assert(E.validate(migrated,'2026-10').some(issue=>issue.type==='night'&&issue.id==='s1'),'保存済みの管理者Dを警告');

let seed=17;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const balanced=E.fresh(),balancedMonth=E.month(balanced,'2026-10'),preferred=balanced.members[2];
preferred.name='パート 夜勤のみ';preferred.employmentType='part';preferred.memberPrompt='夜勤のみ';preferred.target=52;
E.generate(balanced,'2026-10',{phase:'night'});
assert.equal(Array.from({length:31},(_,i)=>balancedMonth.schedule[E.key(preferred.id,i+1)]).filter(code=>code==='D').length,3,'ほかに担当者がいれば3回を優先する');

const draft=E.fresh(),month='2026-10',record=E.month(draft,month),specialist=draft.members[2];
specialist.name='パート 夜勤のみ';
specialist.employmentType='part';
specialist.memberPrompt='夜勤のみ';
specialist.target=52;
specialist.targetMode='max';
for(const p of draft.members)if(p.id!==specialist.id)p.night=false;
assert(E.nightOnlyPartTimer(specialist));
E.generate(draft,month,{phase:'night'});
const nightDays=Array.from({length:E.days(month)},(_,i)=>i+1).filter(day=>record.schedule[E.key(specialist.id,day)]==='D');
assert.equal(nightDays.length,4,'必要なら夜勤のみパートの4回目を夜勤案に提案');
const warnings=E.validate(draft,month);
assert(warnings.some(issue=>issue.type==='nightFourth'&&issue.id===specialist.id&&issue.text.includes('本人への確認')),'4回目は要確認');
assert(!warnings.some(issue=>issue.type==='nightLimit'&&issue.id===specialist.id));
const extraDay=Array.from({length:28},(_,i)=>i+1).find(day=>!nightDays.some(start=>Math.abs(start-day)<3));
assert(extraDay,'5回目を試す空き日がある');
assert(E.targetLimitIssue(draft,month,specialist,[[extraDay,'D']]).includes('月4回まで'),'手動の5回目を禁止');

const capState=E.fresh(),capRecord=E.month(capState,month),capPerson={...capState.members[2],id:'night-cap',name:'夜勤のみパート',employmentType:'part',memberPrompt:'夜勤のみ',target:52,targetMode:'max'};
capState.members.push(capPerson);
for(const day of [1,8,15])for(const [offset,code] of E.nightSequence.entries())capRecord.schedule[E.key(capPerson.id,day+offset)]=code;
assert.equal(E.target(capPerson,capRecord,31),52,'通常の個別目安は52時間を保持する');
assert.equal(E.targetLimitIssue(capState,month,capPerson,[[22,'D'],[23,'d'],[24,'E']]),'','4回目は本人確認つきで64時間を提案できる');
for(const [offset,code] of E.nightSequence.entries())capRecord.schedule[E.key(capPerson.id,22+offset)]=code;
assert.equal(E.effectiveTarget(capPerson,capRecord,month),64,'シフト表に実際の上限64時間を表示する');
assert.equal(E.projectedHours(capState,month,capPerson),64);
assert(!E.validate(capState,month).some(issue=>issue.id===capPerson.id&&issue.type==='hours'));
assert(E.validate(capState,month).some(issue=>issue.id===capPerson.id&&issue.type==='nightFourth'),'4回目の本人確認は残す');
capPerson.target=50;
assert.equal(E.effectiveTarget(capPerson,capRecord,month),50,'52時間より低い個別上限は引き上げない');
assert(E.validate(capState,month).some(issue=>issue.id===capPerson.id&&issue.type==='hours'),'低い個別上限の超過を警告する');
capPerson.target=55;
assert.equal(E.effectiveTarget(capPerson,capRecord,month),55,'別の個別上限も勝手に64時間へ引き上げない');
capPerson.target=52;capPerson.targetMode='min';
assert.equal(E.effectiveTarget(capPerson,capRecord,month),52,'以上指定の下限は変更しない');

console.log('PASS: managers and nurses never work nights; night-only part-timers prefer three, may propose four with a warning, and cannot exceed four');
