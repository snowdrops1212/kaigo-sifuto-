const assert=require('node:assert/strict');
const E=require('./dist/engine.js');

assert.equal(E.customTimeMinutes({code:'B',start:'08:30',end:'17:30',breakMinutes:60}),480);
assert.equal(E.customTimeMinutes({code:'G',start:'09:00',end:'15:00',breakMinutes:0}),360);
assert.equal(E.customTimeMinutes({code:'B',start:'08:00',end:'12:00',actualMinutes:240}),240,'入力した実働時間を直接採用する');
assert.equal(E.customTimeMinutes({code:'B',start:'09:00',end:'17:00',actualMinutes:420}),420,'勤務時間から休憩を推測せず実働を使う');
assert(Number.isNaN(E.customTimeMinutes({code:'B',start:'08:00',end:'12:00',actualMinutes:300})),'実働は拘束時間を超えない');
assert(Number.isNaN(E.customTimeMinutes({code:'B',start:'17:30',end:'08:30',breakMinutes:60})),'日付をまたぐ時間は通常勤務として入力しない');
assert(Number.isNaN(E.customTimeMinutes({code:'D',start:'16:30',end:'22:30',breakMinutes:0})),'夜勤はD→d→Eの既存ルールを使う');

const state=E.fresh(),month='2026-10',record=E.month(state,month),person=state.members[2];
record.schedule['s3:1']='B';record.customTimes['s3:1']={code:'B',start:'09:00',end:'17:00',actualMinutes:420};record.locks['s3:1']=true;
record.schedule['s3:2']='C';record.customTimes['s3:2']={code:'C',start:'10:00',end:'18:30',breakMinutes:60};record.locks['s3:2']=true;
record.schedule['s3:3']='T';record.customTimes['s3:3']={code:'T',start:'12:00',end:'16:30',breakMinutes:0};record.locks['s3:3']=true;
assert.equal(E.shiftHours(record,'s3:1','B'),7);
assert.equal(E.shiftHours(record,'s3:2','C'),7.5);
assert.equal(E.shiftHours(record,'s3:3','T'),4.5);
assert.equal(E.projectedHours(state,month,person),19);
assert.equal(E.dailyEquivalent(state,month)[0].value,'0.8');
assert.equal(E.dailyEquivalent(state,month)[1].value,'0.9');
assert.equal(E.dailyEquivalent(state,month)[2].value,'0.5');
assert.equal(E.dailyCounts(state,month)[1].counts.C,1);
assert.equal(E.dailyCounts(state,month)[2].counts.T,1);
assert(E.validate(state,month).some(issue=>issue.type==='coverage'&&issue.d===2&&issue.text.includes('Cが1人不足')));
assert.deepEqual(E.checkData(E.copy(state)),state,'時間指定勤務はJSONに保存・復元できる');
record.generated=true;record.generationStage='requests';
E.generate(state,month,{phase:'night',allowIncomplete:true});
assert.equal(record.schedule['s3:1'],'B','夜勤案で固定した時間指定勤務を保持する');
assert.equal(record.customTimes['s3:1'].start,'09:00');
assert.equal(E.shiftHours(record,'s3:1','B'),7);
assert.deepEqual(E.checkData(E.copy(state)),state);
E.generate(state,month,{phase:'day',allowIncomplete:true});
assert.equal(record.schedule['s3:1'],'B','人数調整でも固定した時間指定勤務を保持する');
assert.equal(record.customTimes['s3:1'].start,'09:00');
assert.deepEqual(E.checkData(E.copy(state)),state);

const invalid=E.copy(state);invalid.months[month].customTimes['s3:1'].end='07:00';assert.throws(()=>E.checkData(invalid),/手入力した勤務時間/);
const missing=E.copy(state);delete missing.months[month].customTimes['s3:3'];assert.throws(()=>E.checkData(missing),/時間指定勤務/);
const unlocked=E.copy(state);delete unlocked.months[month].locks['s3:1'];assert.throws(()=>E.checkData(unlocked),/手入力した勤務時間/);

const capped=E.fresh(),cappedRecord=E.month(capped,month),part=capped.members[2];part.employmentType='part';part.target=7;part.targetMode='max';
cappedRecord.schedule['s3:1']='B';cappedRecord.customTimes['s3:1']={code:'B',start:'09:00',end:'17:00',actualMinutes:420};cappedRecord.locks['s3:1']=true;
assert.equal(E.targetLimitIssue(capped,month,part),'');
cappedRecord.customTimes['s3:1'].actualMinutes=480;assert.match(E.targetLimitIssue(capped,month,part),/8時間/);

const removed=E.copy(state);E.removeMember(removed,'s3');assert.equal(Object.keys(removed.months[month].customTimes).length,0);
const legacy=E.fresh();delete E.month(legacy,month).customTimes;assert.deepEqual(E.checkData(E.copy(legacy)),E.checkData(legacy));
console.log('PASS: custom times calculate net hours, monthly totals, daily equivalents, C/T counts, caps, JSON validation, deletion and legacy data');
