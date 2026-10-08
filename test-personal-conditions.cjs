const assert=require('node:assert/strict'),E=require('./dist/engine.js');
for(const text of ['G勤務：可能','Ｇ勤務：可能。','Gを使えます','この人はGを使えます'])assert.equal(E.parseMemberPrompt(text).gAllowed,true);
for(const text of ['勤務区分：夜勤専門','夜勤専門','夜勤専門です。'])assert.equal(E.parseMemberPrompt(text).nightOnly,true);
for(const [text,codes] of [['Gのみ勤務可能',['G']],['Ｂ・Ｃのみ勤務可能。',['B','C']],['勤務可能：Dのみ',['D','d']]])assert.deepEqual(E.parseMemberPrompt(text).onlyShifts,codes);
for(const text of ['Bのみ','Bのみ勤務','Bのみ勤務可能','勤務はBのみ','勤務：Bのみ','勤務可能：Bのみ','勤務区分：Bのみ']){const parsed=E.parseMemberPrompt(text);assert.deepEqual(parsed.onlyShifts,['B'],text);assert.equal(parsed.errors.length,0,text);}
for(const [input,value,codes] of [['Cのみ','C',['C']],['B・Cのみ','B・C',['B','C']],['Ｊのみ','J',['J']],['/C\'のみ',"/C'",["/C'"]],['Dのみ','D・d',['D','d']]]){const parsed=E.parseAllowedShift(input);assert.equal(parsed.error,'',input);assert.equal(parsed.value,value,input);assert.deepEqual(parsed.codes,codes,input);}
for(const input of ['Zのみ','任意の勤務','Eのみ','B・Zのみ'])assert(E.parseAllowedShift(input).error,input+' は保存不可');
const onlyGPerson={memberPrompt:'Gのみ',night:false,usesI:false,role:'介護職員',employmentType:'full'};
assert(E.memberShiftAllowed(onlyGPerson,'G'));assert(E.memberShiftAllowed(onlyGPerson,'E'));assert(E.memberShiftAllowed(onlyGPerson,'F'));assert(!E.memberShiftAllowed(onlyGPerson,'B'));assert(!E.memberShiftAllowed(onlyGPerson,'C'));assert(!E.workRequestShiftAllowed(onlyGPerson,'B'));assert(E.workRequestShiftAllowed(onlyGPerson,'G'));
for(const [name,allowed,forbidden] of [['パート Gのみ','G',['B','C','D']],['パート Bのみ','B',['G','C','D']]]){
 const named={...onlyGPerson,name,memberPrompt:''};assert(E.memberShiftAllowed(named,allowed),name);for(const code of forbidden)assert(!E.memberShiftAllowed(named,code),name+' '+code);
 const explicit={...onlyGPerson,name:'任意の氏名',memberPrompt:'',allowedShift:allowed};assert(E.memberShiftAllowed(explicit,allowed));for(const code of forbidden)assert(!E.memberShiftAllowed(explicit,code));
}
assert(!E.memberShiftAllowed({...onlyGPerson,memberPrompt:'腰痛に注意'},'B'),'未対応メモを無視して勤務を割り当てない');
assert(E.memberConditionErrors({...onlyGPerson,name:'パート Bのみ',allowedShift:'G',memberPrompt:''}).length,'矛盾した勤務限定を拒否する');
for(const text of ['夜勤専門ではない','この人はGを使えません','夜勤専門かどうかは未確認','会議日はBにして']){
 const p=E.parseMemberPrompt(text);assert.equal(p.nightOnly,false);assert.equal(p.gAllowed,false);assert.deepEqual(p.notes,[text]);
}
assert(E.parseMemberPrompt('G勤務：可能\nG勤務：不可').errors.length);
assert(E.parseMemberPrompt('G勤務：可能\n夜勤専門').errors.length);
assert(E.memberConditionErrors({memberPrompt:'夜勤専門',night:false}).some(x=>x.includes('「可能」')));
assert.equal(E.parseMemberPrompt().notes.length,0);assert(E.parseMemberPrompt(null).errors.length);
assert(E.parseMemberPrompt('あ'.repeat(2001)).errors.length);
const month='2026-10',s=E.fresh(),m=E.month(s,month),p=s.members[2];
for(const member of s.members)member.night=false;
p.start='2025-01-01';p.night=true;p.nightMax=15;p.memberPrompt='夜勤専門です';
m.requests['s3:5']='F';m.requests['s3:10']='E';
E.generate(s,month);
const codes=Array.from({length:E.days(month)},(_,i)=>m.schedule[E.key(p.id,i+1)]);
assert(codes.includes('D'));assert(codes.every(c=>['D','d','E','F'].includes(c)));
assert.equal(m.schedule['s3:5'],'F');assert.equal(m.schedule['s3:10'],'E');assert(!E.validate(s,month).some(x=>x.type==='personal'));
m.schedule['s3:4']='B';assert(E.validate(s,month).some(x=>x.type==='personal'&&x.d===4));m.locks['s3:4']=true;
const before=JSON.stringify(s);assert.throws(()=>E.generate(s,month),/勤務区分と固定勤務/);assert.equal(JSON.stringify(s),before);
for(const hours of [6,14]){
 const g=E.fresh(),gm=E.month(g,month);g.members[0].memberPrompt='G勤務：可能';g.members[0].target=hours;gm.requests['s1:1']='E';E.generate(g,month);
 const values=Object.entries(gm.schedule).filter(([k])=>k.startsWith('s1:')).map(([,c])=>c);
 assert.equal(values.filter(c=>c==='G').length,1);assert.equal(values.reduce((n,c)=>n+(E.shifts[c]?.hours||0),0),hours);assert.equal(gm.schedule['s1:1'],'E');
 assert.equal(E.dailyEquivalent(g,month).find(r=>gm.schedule[E.key('s1',r.day)]==='G').tenths%10,7);
}
const onlyG=E.fresh(),onlyGMonth=E.month(onlyG,month),onlyGStaff=onlyG.members[2];onlyGStaff.memberPrompt='Gのみ';onlyGStaff.target=18;onlyGStaff.targetMode='max';E.generate(onlyG,month);
const onlyGCodes=Object.entries(onlyGMonth.schedule).filter(([key])=>key.startsWith(onlyGStaff.id+':')).map(([,code])=>code);assert.equal(onlyGCodes.filter(code=>code==='G').length,3);assert(onlyGCodes.every(code=>['G','E','F',''].includes(code)));assert(!E.validate(onlyG,month).some(issue=>issue.type==='personal'&&issue.id===onlyGStaff.id));
onlyGMonth.schedule[E.key(onlyGStaff.id,1)]='B';assert(E.validate(onlyG,month).some(issue=>issue.type==='personal'&&issue.id===onlyGStaff.id&&issue.d===1));
const onlyB=E.fresh(),onlyBMonth=E.month(onlyB,month),onlyBStaff=onlyB.members[2];onlyBStaff.memberPrompt='Bのみ';onlyBStaff.target=24;onlyBStaff.targetMode='max';E.generate(onlyB,month);const onlyBCodes=Object.entries(onlyBMonth.schedule).filter(([key])=>key.startsWith(onlyBStaff.id+':')).map(([,code])=>code);assert(onlyBCodes.every(code=>['B','E','F',''].includes(code)));assert(!onlyBCodes.includes('C'));
onlyBMonth.schedule[E.key(onlyBStaff.id,1)]='C';onlyBMonth.locks[E.key(onlyBStaff.id,1)]=true;onlyBMonth.requests[E.key(onlyBStaff.id,2)]='W';onlyBMonth.workRequests[E.key(onlyBStaff.id,2)]='C';assert.equal(E.clearMemberConditionConflicts(onlyB,onlyBStaff),1);assert.equal(onlyBMonth.schedule[E.key(onlyBStaff.id,1)],'');assert.equal(onlyBMonth.locks[E.key(onlyBStaff.id,1)],undefined);assert.equal(onlyBMonth.workRequests[E.key(onlyBStaff.id,2)],undefined);
for(const [name,allowed] of [['パート Gのみ','G'],['パート Bのみ','B']]){const named=E.fresh(),person=named.members[2],record=E.month(named,month);person.name=name;person.memberPrompt='';person.target=16;person.targetMode='max';E.generate(named,month);assert(Object.entries(record.schedule).filter(([cell])=>cell.startsWith(person.id+':')).every(([,code])=>!E.works(code)||code===allowed),name+' の自動作成');}
for(const [limit,allowed] of [['C','C'],['B・C','B,C']]){const custom=E.fresh(),person=custom.members[2],record=E.month(custom,month);person.allowedShift=limit;person.target=24;person.targetMode='max';E.generate(custom,month);assert(Object.entries(record.schedule).filter(([cell])=>cell.startsWith(person.id+':')).every(([,code])=>!E.works(code)||allowed.split(',').includes(code)),limit+' の自動作成');}
const unknown=E.fresh();E.month(unknown,month);unknown.members[2].memberPrompt='腰痛のため重要事項を確認';const unknownBefore=JSON.stringify(unknown);assert.throws(()=>E.generate(unknown,month),/自動判定できない重要事項/);assert.equal(JSON.stringify(unknown),unknownBefore);assert(E.validate(unknown,month).some(issue=>issue.type==='personalNote'&&issue.id==='s3'));
const legacy=E.fresh(),lm=E.month(legacy,month);legacy.members[0].target=6;E.generate(legacy,month);
assert(!Object.entries(lm.schedule).some(([k,c])=>k.startsWith('s1:')&&c==='G'));
const manager=E.fresh(),mm=E.month(manager,month);manager.members[0].night=true;manager.members[0].memberPrompt='夜勤専門';mm.meetings=[5];
assert(E.meetingConflicts(manager,month).some(x=>x.text.includes('個別メモの勤務条件')));const snapshot=JSON.stringify(manager);assert.throws(()=>E.generate(manager,month),/会議日のB勤務と個別メモの勤務条件/);assert.equal(JSON.stringify(manager),snapshot);
assert.deepEqual(E.checkData(E.copy(s)),s);
for(const bad of [123,{},null,'a'.repeat(2001)]){const copy=E.copy(s);copy.members[0].memberPrompt=bad;assert.throws(()=>E.checkData(copy),/個別メモ/);}
assert.deepEqual(E.checkData(E.fresh()),E.fresh());
console.log('PASS: short and long personal-condition aliases, B/G-only enforcement, unknown important-note blocking, duplicate/conflict checks, night-only allocation, G6-hour allocation, meeting/fixed conflicts and JSON validation');
