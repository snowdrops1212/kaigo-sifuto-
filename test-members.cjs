const assert=require('node:assert/strict'),E=require('./dist/engine.js');
const s=E.fresh();
assert.deepEqual(s.customRoles,[]);s.customRoles.push('生活相談員');
s.members[0].start='2026-01-01';s.members[9].start='2026-01-01';
for(const m of ['2026-12','2027-01']){
 const r=E.month(s,m);
 r.requests={'s1:1':'F','s1:2':'E','s10:1':'F'};
 r.schedule={'s1:1':'F','s1:2':'E','s1:3':'B','s10:1':'F','s10:3':'G'};
 r.locks={'s1:1':true,'s1:2':false,'s10:1':true};
 r.previous={s1:'B',s10:'C'};r.targets={s1:160,s10:168};
 r.daily={3:{B:3,C:2,D:1}};r.meetings=[3];r.generated=true;
 r.conditionPrompt='管理者（サンプル）のメモは自動では消さない';r.appliedConditionPrompt=r.conditionPrompt;
}
E.month(s,'2026-11');
s.users=[{id:'u1',name:'利用者テスト',type:'通い',weekdays:[1],start:'',end:''}];
const before=E.copy(s),serialized=JSON.stringify(s);
assert.deepEqual(E.memberRemovalSummary(s,'s1'),{person:s.members[0],months:2,requests:4,schedule:6,locks:2,settings:4});
assert.equal(JSON.stringify(s),serialized,'preview must be read-only');
assert.equal(E.memberRemovalSummary(s,'missing'),null);assert.equal(E.removeMember(s,'missing'),false);
assert.equal(JSON.stringify(s),serialized,'unknown member must be a no-op');
assert.equal(E.annualPaidLeave(s,'2026-12','s1').total,2);
const retainedPaid=E.annualPaidLeave(s,'2026-12','s10');
const countBefore=E.dailyCounts(s,'2026-12')[2].counts;
assert.equal(countBefore.B,1);assert.equal(countBefore.G,1);
assert.equal(E.removeMember(s,'s1'),true);assert.equal(s.members.length,11);
assert(!s.members.some(p=>p.id==='s1'));assert(s.members.some(p=>p.id==='s10'));
assert.deepEqual(s.members,before.members.filter(p=>p.id!=='s1'));assert.deepEqual(s.users,before.users);
for(const [m,r] of Object.entries(s.months)){
 for(const field of ['requests','schedule','locks']){
  assert(!Object.keys(r[field]).some(k=>k.startsWith('s1:')));
  assert.deepEqual(r[field],Object.fromEntries(Object.entries(before.months[m][field]).filter(([k])=>!k.startsWith('s1:'))));
 }
 for(const field of ['previous','targets']){
  assert(!Object.hasOwn(r[field],'s1'));assert.equal(r[field].s10,before.months[m][field].s10);
 }
 for(const field of ['rules','daily','meetings','generated','conditionPrompt','appliedConditionPrompt'])assert.deepEqual(r[field],before.months[m][field]);
}
assert.deepEqual(E.checkData(JSON.parse(JSON.stringify(s))),s);
const importBase=E.fresh();E.month(importBase,'2028-02');
for(const [label,mutate] of [
 ['希望',x=>x.months['2028-02'].requests['missing:1']='E'],
 ['勤務',x=>x.months['2028-02'].schedule['missing:1']='B'],
 ['固定',x=>x.months['2028-02'].locks['missing:1']=true],
 ['前月末',x=>x.months['2028-02'].previous.missing='D'],
 ['時間目安',x=>x.months['2028-02'].targets.missing=160]
]){const invalid=E.copy(importBase);mutate(invalid);assert.throws(()=>E.checkData(invalid),/登録されていない職員/,label);}
for(const badKey of ['s1:0','s1:30','s1:abc','s1:1:2']){const invalid=E.copy(importBase);invalid.months['2028-02'].schedule[badKey]='B';assert.throws(()=>E.checkData(invalid),/日付|職員ID/,badKey);}
const exactId=E.copy(importBase);exactId.months['2028-02'].schedule['s10:1']='B';assert.deepEqual(E.checkData(exactId),exactId);
for(const [field,value,pattern] of [['start','2026-02-30',/職員の開始日/],['end','2026-13-01',/職員の終了日/],['start',123,/職員の開始日/]]){const invalid=E.copy(importBase);invalid.members[0][field]=value;assert.throws(()=>E.checkData(invalid),pattern);}
const reversed=E.copy(importBase);reversed.members[0].start='2026-10-02';reversed.members[0].end='2026-10-01';assert.throws(()=>E.checkData(reversed),/終了日は開始日以降/);
const leapDates=E.copy(importBase);leapDates.members[0].start='2028-02-29';leapDates.members[0].end='2028-02-29';assert.deepEqual(E.checkData(leapDates),leapDates);
const invalidUser=E.copy(importBase);invalidUser.users=[{id:'u1',name:'利用者',type:'通い',weekdays:[1],start:'2026-02-30',end:''}];assert.throws(()=>E.checkData(invalidUser),/利用者の開始日/);
const legacyDates=E.copy(importBase);delete legacyDates.members[0].start;delete legacyDates.members[0].end;E.checkData(legacyDates);assert.equal(legacyDates.members[0].start,'');assert.equal(legacyDates.members[0].end,'');
const legacyRoles=E.copy(importBase);delete legacyRoles.customRoles;legacyRoles.members[2].role='機能訓練指導員';E.checkData(legacyRoles);assert.deepEqual(legacyRoles.customRoles,['機能訓練指導員']);
for(const roles of [[''],[' 重複'],['重複','重複'],['x'.repeat(51)]]){const invalid=E.copy(importBase);invalid.customRoles=roles;assert.throws(()=>E.checkData(invalid),/手書き職種/);}
assert.equal(E.annualPaidLeave(s,'2026-12','s1').total,null);assert.deepEqual(E.annualPaidLeave(s,'2026-12','s10'),retainedPaid);
assert.equal(E.dailyCounts(s,'2026-12')[2].counts.B,0);assert.equal(E.dailyCounts(s,'2026-12')[2].counts.G,1);
assert(E.meetingConflicts(s,'2026-12').some(x=>x.text.includes('管理者が未登録')));
const removedSnapshot=JSON.stringify(s);assert.throws(()=>E.generate(s,'2026-12'),/管理者が未登録/);assert.equal(JSON.stringify(s),removedSnapshot);
for(const p of [...s.members])assert.equal(E.removeMember(s,p.id),true);
assert.equal(s.members.length,0);assert.equal(Object.keys(s.months['2026-12'].schedule).length,0);
assert.deepEqual(E.checkData(E.copy(s)),s);assert(E.dailyCounts(s,'2026-12').every(row=>Object.values(row.counts).every(c=>c===0)));
console.log('PASS: deletion preview counts, all-month data cleanup, exact member-ID scope, imported orphan/cell/date/period rejection, legacy dates, other staff/conditions/meetings/users preserved, saved-data roundtrip, annual totals, counts, missing manager and last-member removal');
