const assert=require('node:assert/strict'),E=require('./dist/engine.js');
// Seed randomness for reproducible priority tests; user data is never loaded.
let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const s=E.fresh(),m='2026-10',r=E.month(s,m),p=s.members[2];
p.night=false;p.target=40;p.start='2025-01-01';r.rules.D=0;
for(const day of [3,12,24])r.requests[E.key(p.id,day)]='W';
r.requests['s4:10']='E';r.requests['s5:10']='F';s.members[4].start='2025-01-01';
r.schedule['s6:8']='B';r.locks['s6:8']=true;
E.generate(s,m);
for(const day of [3,12,24])assert(E.works(r.schedule[E.key(p.id,day)]),'requested day gets priority: '+day);
assert(Object.entries(r.schedule).some(([k,c])=>k.startsWith(p.id+':')&&E.works(c)&&r.requests[k]!=='W'),'other dates remain eligible');
assert.equal(r.schedule['s4:10'],'E');assert.equal(r.schedule['s5:10'],'F');assert.equal(r.schedule['s6:8'],'B');
assert(!Object.values(r.schedule).includes('W'),'request marker is not a shift');
assert(!E.validate(s,m).some(x=>x.type==='workRequest'&&x.id===p.id));
assert.equal(E.annualPaidLeave(s,m,p.id).total,0,'work requests are not paid leave');
assert.deepEqual(E.checkData(E.copy(s)),s);
const invalid=E.copy(s);invalid.months[m].requests['s3:1']='X';assert.throws(()=>E.checkData(invalid));
// Fixed rest and unavailable weekdays outrank a soft work preference.
r.requests['s3:5']='W';r.schedule['s3:5']='E';r.locks['s3:5']=true;
p.weekdays=[1,2,3,4,5];r.requests['s3:4']='W';
E.generate(s,m);assert.equal(r.schedule['s3:5'],'E');assert.equal(r.schedule['s3:4'],'E');
assert(E.validate(s,m).some(x=>x.type==='workRequest'&&x.id===p.id&&x.d===5));
assert(E.validate(s,m).some(x=>x.type==='workRequest'&&x.id===p.id&&x.d===4));
// A work request is compatible with manager meeting B.
r.meetings=[7];r.requests['s1:7']='W';assert.equal(E.meetingConflicts(s,m).length,0);
E.generate(s,m);assert.equal(r.schedule['s1:7'],'B');
// Night-only restrictions and post-night rest must remain authoritative.
const s2=E.fresh(),r2=E.month(s2,m),p2=s2.members[2];p2.memberPrompt='夜勤専門';
r2.rules.D=0;r2.previous[p2.id]='D';r2.requests['s3:2']='W';r2.requests['s3:8']='W';
E.generate(s2,m);assert.equal(r2.schedule['s3:1'],'d');assert.equal(r2.schedule['s3:2'],'E');
assert(!Object.entries(r2.schedule).some(([k,c])=>k.startsWith('s3:')&&['B','C','G'].includes(c)));
assert(E.validate(s2,m).some(x=>x.type==='workRequest'&&x.d===2));

// Part-time work requests can specify the exact daytime shift and remain soft constraints.
const typed=E.fresh(),typedMonth=E.month(typed,m),typedPart=typed.members[2];typedPart.employmentType='part';typedPart.night=false;typedPart.target=176;typedPart.targetMode='min';typedMonth.rules.D=0;
for(const [day,code] of [[6,'B'],[7,'C'],[8,'G'],[9,'/B'],[10,'/C']]){const cell=E.key(typedPart.id,day);typedMonth.requests[cell]='W';typedMonth.workRequests[cell]=code;}
E.generate(typed,m);
for(const [day,code] of [[6,'B'],[7,'C'],[8,'G'],[9,'/B'],[10,'/C']])assert.equal(typedMonth.schedule[E.key(typedPart.id,day)],code,day+'日の希望勤務を優先する');
assert(!E.validate(typed,m).some(x=>x.type==='workRequest'&&x.id===typedPart.id));
assert.deepEqual(E.checkData(E.copy(typed)),typed,'希望勤務を保存・読込できる');
const invalidFull=E.copy(typed);invalidFull.members[2].employmentType='full';assert.throws(()=>E.checkData(invalidFull),/パート職員の出勤希望勤務/);
const invalidLink=E.copy(typed);invalidLink.months[m].requests[E.key(typedPart.id,6)]='E';assert.throws(()=>E.checkData(invalidLink),/パート職員の出勤希望勤務/);
const legacy=E.copy(typed);delete legacy.months[m].workRequests;E.checkData(legacy);assert.deepEqual(legacy.months[m].workRequests,{},'旧保存データには空の希望勤務を補う');
assert.equal(E.memberRemovalSummary(s,p.id).requests,5);E.removeMember(s,p.id);
assert(!Object.keys(r.requests).some(k=>k.startsWith('s3:')));
assert(E.removeMember(typed,typedPart.id));assert(!Object.keys(typedMonth.workRequests).some(k=>k.startsWith(typedPart.id+':')));
console.log('PASS: work preference priority, nonrequested days allowed, fixed/rest/availability/night conditions preserved, unmet warnings, meeting compatibility, no W shifts, paid exclusion and JSON/member cleanup');
