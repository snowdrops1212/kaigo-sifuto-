'use strict';
// Paid leave, date selection, meeting days, requests, and monthly generation controls.
const paidLeaveBasis='combined';
function paidBadge(p){
 const a=E.annualPaidLeave(state,current,p.id,paidLeaveBasis),period=a.start?a.start+'〜'+a.end:'';
 if(a.status==='missingStart')return '';
 const status=a.status==='notStarted'?'集計開始前':'入職日を確認';
 if(a.status!=='ready')return '<span class="annual-paid-badge paid-status" data-paid-person="'+p.id+'" title="'+esc(period?period+'（'+a.firstStart+'から開始）':status)+'">有給：'+status+'</span>';
 const title=period+'／表示月末を基準に選んだ1年間・予定を含む／'+a.byMonth.map(r=>r.month+'：'+r.count+'日').join('、');
 return '<span class="paid-person-total"><span class="annual-paid-badge" data-paid-person="'+p.id+'" title="'+esc(title)+'">有給 年計 <strong>'+a.total+'</strong> 日</span><small class="paid-person-period">'+period+'</small></span>';
}
function paidYearNote(){return '<p class="paid-year-note">有給は職員ごとの入職日の6か月後を開始日とし、以後1年ごとに集計します。表示月の末日が属する1年間の合計です（月途中が区切りの場合、その月の前半は前の期間）。該当する日がない月は月末を開始日にします。名前の横で期間を確認できます。入職日未設定の場合は集計しません。<br>有給希望「有」とシフトの有休「F」を同じ日は1日として数え、期間内の予定も含みます。希望休・出勤希望は有給に含めません。未入力月・読み込んでいないデータは含みません。実際の取得実績や残日数を確定する機能ではありません。終了前に「データを保存」してください。</p>';}


function validMonth(value){return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=100;}
function offsetMonth(value,delta){if(!validMonth(value))return '';const [y,m]=value.split('-').map(Number),total=y*12+m-1+delta,year=Math.floor(total/12);return year<100||year>9999?'':String(year).padStart(4,'0')+'-'+String(total%12+1).padStart(2,'0');}
function normalizeRequestDate(value){const match=String(value).trim().normalize('NFKC').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);return match?match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0'):'';}
function validRequestDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&validMonth(value.slice(0,7))&&Number(value.slice(8))>=1&&Number(value.slice(8))<=E.days(value.slice(0,7));}
function switchPlanningMonth(value){if(!validMonth(value)){$('#month').value=current;return;}current=value;$('#month').value=current;render();}
let requestCalendarMonth='',calendarTarget='request';
function openRequestCalendar(target='request'){calendarTarget=target;const date=normalizeRequestDate($(target==='meeting'?'#meeting-date':'#request-date').value);requestCalendarMonth=validRequestDate(date)?date.slice(0,7):current;drawRequestCalendar();dialog.showModal();}
function drawRequestCalendar(focusId){
 const month=requestCalendarMonth,[year,monthNumber]=month.split('-').map(Number),selected=normalizeRequestDate($(calendarTarget==='meeting'?'#meeting-date':'#request-date').value),start=E.weekday(month,1);
 dialog.innerHTML='<div class="dialog-head"><h2 id="request-calendar-title">'+(calendarTarget==='meeting'?'会議日を選択':'希望日を選択')+'</h2><button type="button" id="close-request-calendar" aria-label="カレンダーを閉じる">×</button></div>'+
 '<div class="date-calendar-nav"><button type="button" id="request-prev-month" '+(offsetMonth(month,-1)?'':'disabled')+'>‹ 前月</button><span id="request-calendar-heading" aria-live="polite">'+year+'年'+monthNumber+'月</span><button type="button" id="request-next-month" '+(offsetMonth(month,1)?'':'disabled')+'>翌月 ›</button></div>'+
 '<div class="date-calendar-selectors"><label class="field">年<input id="request-calendar-year" type="number" min="100" max="9999" step="1" value="'+year+'"></label><label class="field">月<select id="request-calendar-month">'+options(Array.from({length:12},(_,i)=>[String(i+1),(i+1)+'月']),String(monthNumber))+'</select></label></div>'+
 '<div class="request-date-calendar"><div class="cal-week" aria-hidden="true">'+[...'日月火水木金土'].map(w=>'<span>'+w+'</span>').join('')+'</div><div class="cal-days" role="group" aria-label="'+year+'年'+monthNumber+'月の日付">'+
 '<span aria-hidden="true"></span>'.repeat(start)+Array.from({length:E.days(month)},(_,i)=>{const day=i+1,date=month+'-'+String(day).padStart(2,'0'),weekday=E.weekday(month,day);return '<button type="button" class="date-day '+(selected===date?'selected ':'')+(weekday===0?'sunday':weekday===6?'saturday':'')+'" data-picker-day="'+day+'" aria-pressed="'+(selected===date)+'" aria-label="'+year+'年'+monthNumber+'月'+day+'日">'+day+'</button>';}).join('')+'</div></div>';
 const move=(delta,focus)=>{const target=offsetMonth(requestCalendarMonth,delta);if(target){requestCalendarMonth=target;drawRequestCalendar(focus);}};
 $('#request-prev-month').onclick=()=>move(-1,'#request-prev-month');
 $('#request-next-month').onclick=()=>move(1,'#request-next-month');
 $('#close-request-calendar').onclick=()=>{close();$(calendarTarget==='meeting'?'#open-meeting-calendar':'#open-request-calendar').focus();};
 $('#request-calendar-year').onchange=e=>{const value=e.target.value;if(!/^\d{3,4}$/.test(value)||Number(value)<100||Number(value)>9999){e.target.value=String(year);return toast('年は100〜9999の範囲で入力してください。');}requestCalendarMonth=value.padStart(4,'0')+'-'+String(monthNumber).padStart(2,'0');drawRequestCalendar('#request-calendar-year');};
 $('#request-calendar-month').onchange=e=>{const value=String(year).padStart(4,'0')+'-'+e.target.value.padStart(2,'0');if(validMonth(value)){requestCalendarMonth=value;drawRequestCalendar('#request-calendar-month');}};
 dialog.querySelectorAll('[data-picker-day]').forEach(button=>button.onclick=()=>{const value=requestCalendarMonth+'-'+button.dataset.pickerDay.padStart(2,'0'),field=$(calendarTarget==='meeting'?'#meeting-date':'#request-date');if(calendarTarget==='meeting')meetingDate=value;else requestDate=value;field.value=value;close();field.focus();});
 if(focusId)$(focusId).focus();
}

function meetingConditionText(){
 const dates=E.meetingDays(state,current).map(d=>E.iso(current,d)+'（'+'日月火水木金土'[E.weekday(current,d)]+'）');
 return '【会議日の勤務条件】\n対象月：'+current+'\n会議日：'+(dates.length?dates.join('、'):'未登録')+'\n会議日は職種「管理者」の在籍中の職員全員をB（日勤 8:30〜17:30）にする。\n希望休・有給・固定勤務・勤務不可曜日・夜勤明けと矛盾する場合は、上書きせず作成を停止して調整する。\n会議日は「希望休・有給・出勤希望を登録」の下の会議日欄から変更する。登録内容は自動作成に直接反映される。';
}
function meetingControls(){
 const dates=E.meetingDays(state,current),errors=E.meetingConflicts(state,current);
 return '<section class="meeting-section" aria-labelledby="meeting-title"><h3 id="meeting-title">会議日を登録</h3><form id="meeting-form" class="meeting-form"><div class="field"><label for="meeting-date">会議日</label><div class="request-date-input"><input id="meeting-date" type="text" inputmode="numeric" autocomplete="off" required placeholder="'+current.replace('-','/')+'/01" value="'+esc(meetingDate)+'" aria-describedby="meeting-help"><button id="open-meeting-calendar" type="button" aria-haspopup="dialog" aria-controls="editor">カレンダー</button></div></div><button class="primary" type="submit">会議日を追加</button></form><p id="meeting-help" class="subtle">会議日は管理者をB勤務にします。日付を選んで追加してください。作成済みのシフトは再作成すると反映されます。</p><div class="meeting-dates" aria-label="'+esc(current)+'の会議日">'+(dates.length?dates.map(day=>'<button type="button" data-remove-meeting="'+day+'" aria-label="'+day+'日の会議日を解除">'+day+'日（'+'日月火水木金土'[E.weekday(current,day)]+'） <span aria-hidden="true">×</span></button>').join(''):'<span class="subtle">この月の会議日は未登録です。</span>')+'</div><p class="subtle">登録した日を押すと解除できます。対象は職種「管理者」の在籍中の職員全員です。</p>'+(errors.length?'<ul class="meeting-errors">'+errors.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul>':'')+'</section>';
}
function removeMeetingDay(day){
 if(!E.meetingDays(state,current).includes(day))return;
 change(()=>{mo().meetings=E.meetingDays(state,current).filter(d=>d!==day);});
 toast(day+'日の会議日を解除しました。作成済みシフトは変更していません。');
}
function bindMeetingControls(){
 $('#meeting-date').oninput=e=>{meetingDate=e.target.value;};
 $('#open-meeting-calendar').onclick=()=>openRequestCalendar('meeting');
 $('#meeting-form').onsubmit=e=>{
  e.preventDefault();if(!e.target.reportValidity())return;
  const date=normalizeRequestDate($('#meeting-date').value);
  if(!validRequestDate(date))return toast('正しい会議日を入力してください。');
  const month=date.slice(0,7),day=Number(date.slice(8)),existing=[...(state.months[month]?.meetings||[])];
  const show=()=>{meetingDate=date;current=month;$('#month').value=current;};
  if(existing.includes(day)){show();render();return toast('この会議日は登録済みです。');}
  change(()=>{E.month(state,month).meetings=[...existing,day].sort((a,b)=>a-b);show();});
  toast(date+'の会議日を登録しました。管理者をB勤務にする条件でシフトを作成します。');
 };
 document.querySelectorAll('[data-remove-meeting]').forEach(b=>b.onclick=()=>removeMeetingDay(Number(b.dataset.removeMeeting)));
}

function requestShiftChoices(p){return E.workRequestShifts.filter(code=>E.workRequestShiftAllowed(p,code)).map(code=>{const shift=E.shifts[code],time=(shift.requestTime||shift.time).replaceAll(':','：').replaceAll('–','～');return [code,code+'＝'+time];});}
function requestShiftControl(){const p=state.members.find(person=>person.id===requestPerson),choices=requestKind==='W'?requestShiftChoices(p):[],enabled=choices.length>0;if(enabled&&!choices.some(([code])=>code===requestShift))requestShift=choices[0][0];return '<label class="field">希望勤務<select id="request-shift" '+(enabled?'':'disabled')+' aria-describedby="request-date-help">'+options(enabled?choices:[['','—']],enabled?requestShift:'')+'</select></label>';}
function requestControls(){
 if(requestPerson&&!state.members.some(p=>p.id===requestPerson))requestPerson='';
 return '<form class="request-controls" id="request-form"><label class="field">職員<select id="request-person" required>'+options([['','職員を選択'],...state.members.map(p=>[p.id,p.name])],requestPerson)+'</select></label><label class="field">希望の種類<select id="request-kind">'+options([['E','希望休'],['F','有給'],['W','出勤希望']],requestKind)+'</select></label>'+requestShiftControl()+'<div class="field request-date-field"><label for="request-date">日付</label><div class="request-date-input"><input id="request-date" type="text" inputmode="numeric" autocomplete="off" required placeholder="2026/10/01" aria-describedby="request-date-help" value="'+esc(requestDate)+'"><button id="open-request-calendar" type="button" aria-haspopup="dialog" aria-controls="editor">カレンダー</button></div></div><button id="register-request" type="submit" class="primary">登録</button><p class="desc" id="request-date-help">日付は年/月/日で入力、またはカレンダーから選択できます。正社員・パートとも、出勤希望の時だけ希望勤務を選べます。希望休・有給では「—」の無効な欄になります。出勤希望は優先して勤務を組み、希望日以外にも出勤できます。同じ職員・同じ日の希望は、最後に登録した内容に置き換わります。</p></form>';
}
function bindRequestControls(){
 bindMeetingControls();
 document.querySelectorAll('[data-remove-request]').forEach(button=>button.onclick=()=>removeRequest(button.dataset.removeRequest,+button.dataset.removeDay));
 $('#open-request-calendar').onclick=()=>openRequestCalendar();
 $('#request-person').onchange=e=>{requestPerson=e.target.value;render();$('#request-person').focus({preventScroll:true});};
 $('#request-date').oninput=e=>{requestDate=e.target.value;};
 $('#request-kind').onchange=e=>{requestKind=e.target.value;render();$('#request-kind').focus({preventScroll:true});};
 $('#request-shift').onchange=e=>{requestShift=e.target.value;};
 $('#request-form').onsubmit=e=>{
  e.preventDefault();if(!e.target.reportValidity())return;
  const p=state.members.find(p=>p.id===requestPerson),date=normalizeRequestDate($('#request-date').value),day=Number(date.slice(8)),targetMonth=date.slice(0,7);
  if(!p)return toast('職員を選んでください。');
  if(!validRequestDate(date))return toast('正しい日付を入力してください。');
  if(!E.active(p,targetMonth,day))return toast('この日は職員の在籍期間外です。日付または在籍期間を確認してください。');
  if(requestKind==='F'){
   const eligibility=E.paidLeaveEligibility(p,date);
   if(!eligibility.allowed)return toast(eligibility.reason+'。職員情報の入職日を確認してください。');
  }
  const requestedShift=requestKind==='W'?requestShift:'',allowed=requestShiftChoices(p).some(([code])=>code===requestedShift);
  if(requestKind==='W'&&!allowed)return toast('希望勤務を選んでください。');
  const id=k(p.id,day),existing=state.months[targetMonth];
  const showTarget=()=>{requestDate=date;current=targetMonth;$('#month').value=current;};
  if(existing?.requests[id]===requestKind&&(requestedShift?existing.workRequests?.[id]===requestedShift:!existing?.workRequests?.[id])){showTarget();render();return toast('同じ内容が登録済みです。');}
  change(()=>{const record=E.month(state,targetMonth);record.requests[id]=requestKind;if(requestedShift)record.workRequests[id]=requestedShift;else delete record.workRequests[id];showTarget();});
  const shiftLabel=requestedShift?'（'+requestedShift+' '+E.shifts[requestedShift].label+'）':'';
  toast(p.name+' '+date+'の'+(requestKind==='W'?'出勤希望'+shiftLabel:requestKind==='F'?'有給':'希望休')+'を登録しました。'+(mo().generated?'作成済みシフトへの反映は、再作成または手動変更で行ってください。':''));
 };
}
function removeRequest(personId,day){const person=state.members.find(p=>p.id===personId),cell=k(personId,day),code=mo().requests[cell];if(!person||!code)return;const label=code==='W'?'出勤希望':code==='F'?'有給':'希望休';change(()=>{delete mo().requests[cell];delete mo().workRequests[cell];});toast(person.name+' '+day+'日の'+label+'を削除しました。');}
function monthlyConditionsPanel(){const m=mo();return `<div class="panel" id="monthly-conditions"><div class="panel-head"><div><h2>今月の作成条件</h2><p class="desc">Aは使用しません。Bは人数制限なし、Cは毎日2人、Dは毎日1人で固定です。</p></div><button id="generate" class="primary">この条件でシフト案を作る</button></div><div class="fields"><label class="field">B 日勤の人数<input id="staffing-b" readonly value="制限なし"><small>0人でも可・上限なし</small></label><label class="field">C 遅番の人数<input id="staffing-c" readonly value="2人"><small>毎日ちょうど2人</small></label><label class="field">D 夜勤の人数<input id="staffing-d" readonly value="1人"><small>毎日ちょうど1人</small></label><label class="field">休日の目安（日）<input type="number" required data-rule="off" min="0" max="31" value="${m.rules.off}"></label></div><details class="details"><summary>職員ごとの今月の時間・前月末の勤務</summary><p class="subtle">前月の作成データがあれば自動参照します。月末の夜勤・明けは翌月に引き継ぎます。時間の「以上／以内」は職員情報の設定を使います。I勤務者の時間目安は月9日休みで自動計算します。</p><div class="grid-wrap"><table><thead><tr><th>職員</th><th>今月の時間目安（有休込み）</th><th>前月末の勤務</th></tr></thead><tbody>${state.members.map(x=>`<tr>${staffRow(x)}<td><div class="monthly-target"><input aria-label="${esc(x.name)} 今月の時間" data-target="${x.id}" type="number" min="0" max="300" required value="${E.target(x,m,n())}" ${x.usesI?'readonly':''}><span>${E.targetModeLabel(x)}</span></div></td><td><select aria-label="${esc(x.name)} 前月末の勤務" data-previous="${x.id}" ${state.months[E.prevMonth(current)]?.generated?'disabled':''}>${options([['','指定なし'],['B','B 日勤'],['C','C 遅番'],['D','D 夜勤入り'],['d','d 夜勤明け'],['E','E 休日'],['F','F 有休']],E.prior(state,current,x))}</select></td></tr>`).join('')}</tbody></table></div></details></div>`;}
function bindMonthlyConditions(){const m=mo();
 document.querySelectorAll('[data-rule]').forEach(i=>i.onchange=()=>{if(i.dataset.rule!=='off')return;if(!i.checkValidity())return i.reportValidity();change(()=>m.rules.off=+i.value);});
 document.querySelectorAll('[data-target]').forEach(i=>i.onchange=()=>{const person=state.members.find(p=>p.id===i.dataset.target);if(person?.usesI)return;if(!i.checkValidity())return i.reportValidity();change(()=>m.targets[i.dataset.target]=+i.value);});
 document.querySelectorAll('[data-previous]').forEach(i=>i.onchange=()=>change(()=>m.previous[i.dataset.previous]=i.value));
 $('#generate').onclick=startGenerate;
}
function startGenerate(){const meetingErrors=E.meetingConflicts(state,current);if(meetingErrors.length)return toast(meetingErrors[0].text+'。会議日または条件を調整してください。');if(mo().conditionPrompt!==undefined&&mo().conditionPrompt!==mo().appliedConditionPrompt){tab='members';render();$('#condition-prompt').focus();toast('変更した条件の反映内容を確認し、「月の作成条件に反映」を押してください。');return;}const conflict=Object.entries(mo().requests).find(([key,c])=>c!=='W'&&mo().locks[key]&&mo().schedule[key]!==c);if(conflict){const [id,day]=conflict[0].split(':');return toast(`${state.members.find(p=>p.id===id)?.name} ${day}日：希望休と固定勤務が重なっています。先に固定を解除するか、勤務を変更してください。`);}const run=()=>{toast('希望休を確保して、シフトを組んでいます…');const b=$('#generate');if(b){b.disabled=true;b.textContent='作成中…';}setTimeout(()=>{try{change(()=>{E.generate(state,current);tab='schedule';});toast('シフト案を作成しました。要確認の項目を確認してください。');}catch(err){render();toast(err.message);}},60);};if(mo().generated)ask('シフト案を再作成しますか？','希望休と固定したセルを保持して再作成します。固定していない手直しは置き換わります。元に戻すこともできます。',run);else run();}
function requestSummary(){
 const requests=mo().requests,days=range(),kinds=[['E','希望休','off'],['F','有給','paid'],['W','出勤希望','work-request']];
 const people=state.members.map(p=>({person:p,groups:kinds.map(([code,label,cls])=>({code,label,cls,dates:days.filter(d=>requests[k(p.id,d)]===code)}))})).filter(p=>p.groups.some(g=>g.dates.length));
 const total=people.reduce((sum,p)=>sum+p.groups.reduce((v,g)=>v+g.dates.length,0),0),[year,month]=current.split('-').map(Number);
 return '<div class="request-summary-compact" id="request-summary" aria-labelledby="request-summary-title"><div class="request-summary-heading"><h3 id="request-summary-title">'+year+'年'+month+'月の希望一覧</h3><span class="subtle">'+people.length+'人・'+total+'日分（延べ）</span></div>'+
 (people.length?'<ul class="request-summary-list">'+people.map(p=>'<li data-summary-person="'+esc(p.person.id)+'"><strong class="request-summary-name">'+esc(p.person.name)+'</strong>'+p.groups.map(g=>'<div class="request-summary-kind"><span class="request-summary-label">'+g.label+'</span><div class="request-summary-dates" data-summary-kind="'+g.code+'">'+(g.dates.length?g.dates.map(day=>{const shift=g.code==='W'?mo().workRequests[k(p.person.id,day)]||'':'',dateText=day+'日（'+'日月火水木金土'[E.weekday(current,day)]+'）'+(shift?'・'+shift+' '+E.shifts[shift].label:'');return '<span class="request-summary-date '+g.cls+'">'+dateText+'<button type="button" class="request-summary-remove" data-remove-request="'+esc(p.person.id)+'" data-remove-day="'+day+'" aria-label="'+esc(p.person.name+'の'+day+'日の'+g.label+'を削除')+'" title="この希望を削除"><span aria-hidden="true">×</span></button></span>';}).join(''):'<span class="subtle">なし</span>')+'</div></div>').join('')+'</li>').join('')+'</ul>':'<p class="request-summary-empty">この月の希望休・有給・出勤希望はまだ登録されていません。</p>')+'</div>';
}
function scheduleRequestPanel(){return '<section class="panel" id="schedule-request-panel"><div class="panel-head"><h2>希望休・有給・出勤希望を登録</h2>'+(mo().generated?'':'<div class="toolbar">'+undoBar()+'</div>')+'</div>'+requestControls()+paidYearNote()+'<p class="subtle">作成済みのシフトは自動変更しません。登録後に再作成するか、勤務セルを手動で変更してください。</p>'+requestSummary()+meetingControls()+'</section>';}
