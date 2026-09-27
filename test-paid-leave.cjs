const assert=require('node:assert/strict'),E=require('./dist/engine.js');
const s=E.fresh(),id='s3';
for(const m of ['2026-03','2026-04','2026-12','2027-03','2027-04']){const r=E.month(s,m);r.requests[id+':1']='F';r.schedule[id+':1']='F';r.requests[id+':2']='E';r.schedule[id+':2']='E';}
E.month(s,'2026-04').requests[id+':3']='F';
E.month(s,'2026-12').schedule[id+':4']='F';
let a=E.annualPaidLeave(s,'2026-10',id);
assert.equal(a.total,5);assert.equal(a.start,'2026-04');assert.equal(a.end,'2027-03');
assert.equal(E.annualPaidLeave(s,'2027-03',id).total,5);
assert.equal(E.annualPaidLeave(s,'2027-04',id).total,1);
assert.equal(E.annualPaidLeave(s,'2026-03',id).total,1);
assert.equal(E.annualPaidLeave(s,'2026-10','s4').total,0);
assert.equal(E.annualPaidLeave(s,'2026-10',id,'requests').total,4);
assert.equal(E.annualPaidLeave(s,'2026-10',id,'schedule').total,4);
delete s.months['2026-04'].requests[id+':3'];assert.equal(E.annualPaidLeave(s,'2026-10',id).total,4);
const before=JSON.stringify(s);E.annualPaidLeave(s,'2030-10',id);assert.equal(JSON.stringify(s),before);
assert.deepEqual(E.annualPaidLeave(E.checkData(E.copy(s)),'2026-10',id),E.annualPaidLeave(s,'2026-10',id));
E.month(s,'2028-02').requests[id+':29']='F';assert.equal(E.annualPaidLeave(s,'2028-02',id).total,2);
console.log('PASS: April/March boundary, annual sum, normal leave excluded, deduplication, requests/schedule, edits, member separation, leap day and saved-data roundtrip');
