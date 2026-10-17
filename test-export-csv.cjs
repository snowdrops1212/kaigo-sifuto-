const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('./dist/app.js','utf8');
const start=source.indexOf('function exportCSV(){');
const end=source.indexOf("$('#month').onchange",start);
assert(start>=0&&end>start,'CSV出力関数を読み取る');

let output;
let stage='day';
const codes=['B','C',"C'",'D','d','G','J','L','M',"/C'",'I'];
const context={
 state:{members:[]},current:'2026-10',range:()=>[4,5],
 mo:()=>({generationStage:stage}),
 E:{
  shifts:{},equivalentCodes:codes,
  dailyCounts:()=>[{counts:{blank:0}},{counts:{blank:0}}],
  dailyEquivalent:()=>[{day:4,tenths:60,value:'6.0'},{day:5,tenths:60,value:'6.0'}],
  weekday:(_month,day)=>day===4?0:1
 },
 download:(_name,data)=>{output=data;}
};
vm.runInNewContext(source.slice(start,end)+'\nexportCSV();',context);
const rows=output.replace(/^\ufeff/,'').split('\r\n');
assert(rows.some(row=>row.includes('8時間換算 合計')&&row.includes(codes.join('・'))),'対象勤務記号を画面とそろえる');
assert(rows.some(row=>row.includes('必要な8時間換算')&&row.endsWith('"6.0","7.0"')),'日曜と通常日の基準を分ける');
assert(rows.some(row=>row.includes('換算判定')&&row.endsWith('"基準クリア","基準未満"')),'日曜6.0は合格、通常日6.0は未達');
for(const pendingStage of [undefined,'requests','night']){
 stage=pendingStage;output='';
 vm.runInNewContext(source.slice(start,end)+'\nexportCSV();',context);
 const pendingRows=output.replace(/^\ufeff/,'').split('\r\n');
 assert(pendingRows.some(row=>row.includes('換算判定')&&row.endsWith('"人数調整前","人数調整前"')),`${pendingStage||'白紙'}段階のCSVは画面と同じ保留表示`);
}
const withCustom={...context,state:{members:[{id:'s1',name:'職員',role:'介護職員'}]},k:(id,day)=>`${id}:${day}`};
const record={generationStage:'day',schedule:{'s1:4':'B'},customTimes:{'s1:4':{code:'B',start:'09:00',end:'17:00',breakMinutes:60}}};
withCustom.mo=()=>record;
withCustom.E={...context.E,shiftHours:()=>7};
vm.runInNewContext(source.slice(source.indexOf('function csvShiftCell'),end)+'\nexportCSV();',withCustom);
 assert(output.includes('B 09:00〜17:00 実働7時間'),'時間指定勤務の時刻と実働をCSVに出す');
console.log('PASS: CSV equivalent legend and daily thresholds match the schedule view');
