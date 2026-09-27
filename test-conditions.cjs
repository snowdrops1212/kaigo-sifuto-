const assert=require('node:assert/strict');
const P=require('./dist/conditions.js'),E=require('./dist/engine.js');
const state=E.fresh(),m=E.month(state,'2026-10'),text=P.template(m.rules);
assert.deepEqual(P.parse(text),{rules:m.rules,errors:[]});
assert.equal(P.parse(text.replace('Bの最低人数：2人','Bの最低人数：３人')).rules.B,3);
for(const replacement of ['Bの最低人数：32人','Bの最低人数：2.5人','Bの最低人数：2日','Bの最低人数：2人\nBの最低人数：3人','Bは3人くらい'])assert(P.parse(text.replace('Bの最低人数：2人',replacement)).errors.length);
assert(P.parse('').errors.length);
assert.equal(P.parse(text+'\nBの最低人数：30人').rules.B,2);
assert(P.parse(text.replace('連続勤務の上限：5日','連続勤務の上限：0日')).errors.length);
m.conditionPrompt=text;m.appliedConditionPrompt=text;
assert.deepEqual(E.checkData(E.copy(state)),state);
for(const bad of [{},'x'.repeat(20001)]){m.conditionPrompt=bad;assert.throws(()=>E.checkData(E.copy(state)),/条件の文章/);}
console.log('PASS: condition template, full-width input, strict numbers/units/duplicates, reference isolation, JSON roundtrip and validation');
