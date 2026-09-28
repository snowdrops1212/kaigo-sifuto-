'use strict';
const E=ShiftEngine,$=s=>document.querySelector(s),content=$('#content'),dialog=$('#editor');
let state=E.fresh(),current='2026-10',tab='schedule',undo=[],redo=[],dirty=false;
let requestPerson='',requestKind='E',requestDate='',meetingDate='';
let scheduleFit=true,scheduleExpanded=false,scheduleResizeObserver;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mo=()=>E.month(state,current),n=()=>E.days(current),k=E.key,chip=c=>E.shifts[c]?.cls||'blank';
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500);}
function change(fn){undo.push(E.copy(state));if(undo.length>40)undo.shift();redo=[];fn();dirty=true;render();}
function revert(forward){const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;to.push(E.copy(state));state=from.pop();dirty=true;render();toast('変更を戻しました');}
function close(){dialog.close();}
function ask(title,text,action){const d=$('#confirm');d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="dialog-bottom"><button id="no">戻る</button><button class="primary" id="yes">実行する</button></div>`;d.showModal();$('#no').onclick=()=>d.close();$('#yes').onclick=()=>{d.close();action();};}
function options(vals,selected){return vals.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');}
function range(){return Array.from({length:n()},(_,i)=>i+1);}
function headerDays(){return range().map(d=>{const w=E.weekday(current,d);return `<th class="${w===0?'sunday':w===6?'saturday':''}">${d}<small>${'日月火水木金土'[w]}</small></th>`;}).join('');}
function staffRow(p,paid=false){return `<th${paid?' class="paid-person"':''}><span class="person-heading"><span class="person-name" title="${esc(p.name+'／'+p.role)}">${esc(p.name)}</span>${paid?paidBadge(p):''}</span><span class="person-role">${esc(p.role)}${p.night?' ・夜勤可':''}</span></th>`;}
function undoBar(){return `<button id="undo" ${undo.length?'':'disabled'}>↶ 元に戻す</button><button id="redo" ${redo.length?'':'disabled'}>↷ やり直す</button>`;}
function render(){mo();scheduleResizeObserver?.disconnect();if(tab!=='schedule'||!mo().generated)scheduleExpanded=false;document.body?.classList.toggle('schedule-expanded',scheduleExpanded);document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});if(tab==='members')renderMembers();else renderSchedule();if($('#undo'))$('#undo').onclick=()=>revert(false);if($('#redo'))$('#redo').onclick=()=>revert(true);}
function equivalentNote(){return '<div class="equivalent-note"><strong>8時間換算：B・C・D・d・G・Iのみ</strong><span>1人ずつ勤務時間÷8を小数第1位まで切り捨てて合計（8時間＝1.0、6時間＝0.7、7時間＝0.8）。A・E・F・/B・/C・空欄は対象外。</span><span><b class="fte-pass">7.0以上：基準クリア</b> ／ <b class="fte-near">6.0〜6.9：青</b> ／ <b class="fte-low">6.0未満：赤</b></span></div>';}
function equivalentFooter(extra){return '<tfoot><tr class="equivalent-row"><th scope="row">8時間換算 合計<small>B C D d G I</small></th>'+E.dailyEquivalent(state,current).map(r=>'<td class="fte-'+r.status+'" data-equivalent-day="'+r.day+'" aria-label="'+r.day+'日 8時間換算 '+r.value+' '+(r.status==='pass'?'基準クリア':'基準未満')+'" title="'+(r.status==='pass'?'基準クリア':'基準7.0未満')+'">'+r.value+'</td>').join('')+'<td colspan="'+extra+'">—</td></tr></tfoot>';}
function countsRows(){const rows=E.dailyCounts(state,current),codes=[...Object.keys(E.shifts),'blank'];return '<tbody class="daily-count-rows" id="daily-counts" aria-label="日別・勤務記号別の人数"><tr class="counts-heading"><th scope="row">勤務記号別 人数</th><td colspan="'+n()+'">各日の人数（人）</td><td colspan="3">月計（延べ）</td></tr>'+codes.map(c=>'<tr><th scope="row"><span class="chip '+chip(c)+'">'+(c==='blank'?'未入力':c+' '+E.shifts[c].label)+'</span></th>'+rows.map(r=>'<td data-count-code="'+c+'" data-count-day="'+r.day+'">'+r.counts[c]+'</td>').join('')+'<td class="count-total" colspan="3" data-count-total-code="'+c+'">'+rows.reduce((sum,r)=>sum+r.counts[c],0)+'</td></tr>').join('')+'</tbody>';}


const paidLeaveBasis='combined';
function paidBadge(p){const a=E.annualPaidLeave(state,current,p.id,paidLeaveBasis),title=a.start+'〜'+a.end+'／'+a.byMonth.map(r=>r.month+'：'+r.count+'日').join('、');return '<span class="annual-paid-badge" data-paid-person="'+p.id+'" title="'+esc(title)+'">有給 年計 <strong>'+a.total+'</strong> 日</span>';}
function paidYearNote(){const year=Number(current.slice(0,4))-(Number(current.slice(5))<4?1:0);return '<p class="paid-year-note">'+year+'年度（'+year+'年4月〜'+(year+1)+'年3月）｜'+'有給希望「有」とシフトの有休「F」の年間合計（同じ日は1日・予定を含む）。通常のお休み「希／E」は別枠です'+'。未入力月・読み込んでいないデータは含みません。実際の取得実績を確定する機能ではありません。月をまたいで管理するため、終了前に「データを保存」してください。</p>';}


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
 return '【会議日の勤務条件】\n対象月：'+current+'\n会議日：'+(dates.length?dates.join('、'):'未登録')+'\n会議日は職種「管理者」の在籍中の職員全員をB（日勤 8:30〜17:30）にする。\n希望休・有給・固定勤務・勤務不可曜日・夜勤明けと矛盾する場合は、上書きせず作成を停止して調整する。\n会議日は「希望休・有給を登録」の下の会議日欄から変更する。登録内容は自動作成に直接反映される。';
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

function requestControls(){
 if(requestPerson&&!state.members.some(p=>p.id===requestPerson))requestPerson='';
 return '<form class="request-controls" id="request-form"><label class="field">職員<select id="request-person" required>'+options([['','職員を選択'],...state.members.map(p=>[p.id,p.name])],requestPerson)+'</select></label><label class="field">休みの種類<select id="request-kind">'+options([['E','希望休'],['F','有給']],requestKind)+'</select></label><div class="field request-date-field"><label for="request-date">日付</label><div class="request-date-input"><input id="request-date" type="text" inputmode="numeric" autocomplete="off" required placeholder="2026/10/01" aria-describedby="request-date-help" value="'+esc(requestDate)+'"><button id="open-request-calendar" type="button" aria-haspopup="dialog" aria-controls="editor">カレンダー</button></div></div><button id="register-request" type="submit" class="primary">登録</button><p class="desc" id="request-date-help">日付は年/月/日で入力、またはカレンダーから選択できます。前月・翌月、年・月の指定で移動できます。登録すると、その月のシフト画面に切り替わります。</p></form>';
}
function bindRequestControls(){
 bindMeetingControls();
 $('#open-request-calendar').onclick=()=>openRequestCalendar();
 $('#request-person').onchange=e=>{requestPerson=e.target.value;};
 $('#request-date').oninput=e=>{requestDate=e.target.value;};
 $('#request-kind').onchange=e=>{requestKind=e.target.value;render();$('#request-kind').focus({preventScroll:true});};
 $('#request-form').onsubmit=e=>{
  e.preventDefault();if(!e.target.reportValidity())return;
  const p=state.members.find(p=>p.id===requestPerson),date=normalizeRequestDate($('#request-date').value),day=Number(date.slice(8)),targetMonth=date.slice(0,7);
  if(!p)return toast('職員を選んでください。');
  if(!validRequestDate(date))return toast('正しい日付を入力してください。');
  if(!E.active(p,targetMonth,day))return toast('この日は職員の在籍期間外です。日付または在籍期間を確認してください。');
  const id=k(p.id,day),existing=state.months[targetMonth];
  const showTarget=()=>{requestDate=date;current=targetMonth;$('#month').value=current;};
  if(existing?.requests[id]===requestKind){showTarget();render();return toast('同じ内容が登録済みです。');}
  change(()=>{E.month(state,targetMonth).requests[id]=requestKind;showTarget();});
  toast(p.name+' '+date+'の'+(requestKind==='F'?'有給':'希望休')+'を登録しました。'+(mo().generated?'作成済みシフトへの反映は、再作成または手動変更で行ってください。':''));
 };
}
function monthlyConditionsPanel(){const m=mo();return `<div class="panel" id="monthly-conditions"><div class="panel-head"><div><h2>今月の作成条件</h2><p class="desc">Bは人数制限なし、Cは毎日ちょうど2人です。D・休日の条件は変更できます。</p></div><button id="generate" class="primary">この条件でシフト案を作る</button></div><div class="fields"><label class="field">B 日勤の人数<input id="staffing-b" readonly value="制限なし"><small>0人でも可・上限なし</small></label><label class="field">C 遅番の人数<input id="staffing-c" readonly value="2人"><small>毎日ちょうど2人</small></label>${[['D','D 夜勤の最低人数'],['off','休日の目安（日）']].map(([v,l])=>`<label class="field">${l}<input type="number" required data-rule="${v}" min="${v==='maxRun'?1:0}" max="31" value="${m.rules[v]}"></label>`).join('')}</div><details class="details"><summary>職員ごとの今月の時間・前月末の勤務</summary><p class="subtle">前月の作成データがあれば自動参照します。月末の夜勤・明けは翌月に引き継ぎます。</p><div class="grid-wrap"><table><thead><tr><th>職員</th><th>今月の時間目安（有休込み）</th><th>前月末の勤務</th></tr></thead><tbody>${state.members.map(x=>`<tr>${staffRow(x)}<td><input aria-label="${esc(x.name)} 今月の時間" data-target="${x.id}" type="number" min="0" max="300" required value="${E.target(x,m,n())}"></td><td><select aria-label="${esc(x.name)} 前月末の勤務" data-previous="${x.id}" ${state.months[E.prevMonth(current)]?.generated?'disabled':''}>${options([['','指定なし'],['B','B 日勤'],['C','C 遅番'],['D','D 夜勤入り'],['d','d 夜勤明け'],['E','E 休日'],['F','F 有休']],E.prior(state,current,x))}</select></td></tr>`).join('')}</tbody></table></div></details></div>`;}
function bindMonthlyConditions(){const m=mo();
 document.querySelectorAll('[data-rule]').forEach(i=>i.onchange=()=>{if(!['D','maxRun','off'].includes(i.dataset.rule))return;if(!i.checkValidity())return i.reportValidity();change(()=>m.rules[i.dataset.rule]=+i.value);});
 document.querySelectorAll('[data-target]').forEach(i=>i.onchange=()=>{if(!i.checkValidity())return i.reportValidity();change(()=>m.targets[i.dataset.target]=+i.value);});
 document.querySelectorAll('[data-previous]').forEach(i=>i.onchange=()=>change(()=>m.previous[i.dataset.previous]=i.value));
 $('#generate').onclick=startGenerate;
}
function startGenerate(){const meetingErrors=E.meetingConflicts(state,current);if(meetingErrors.length)return toast(meetingErrors[0].text+'。会議日または条件を調整してください。');if(mo().conditionPrompt!==undefined&&mo().conditionPrompt!==mo().appliedConditionPrompt){tab='members';render();$('#condition-prompt').focus();toast('変更した条件の反映内容を確認し、「月の作成条件に反映」を押してください。');return;}const conflict=Object.entries(mo().requests).find(([key,c])=>mo().locks[key]&&mo().schedule[key]!==c);if(conflict){const [id,day]=conflict[0].split(':');return toast(`${state.members.find(p=>p.id===id)?.name} ${day}日：希望休と固定勤務が重なっています。先に固定を解除するか、勤務を変更してください。`);}const run=()=>{toast('希望休を確保して、シフトを組んでいます…');const b=$('#generate');if(b){b.disabled=true;b.textContent='作成中…';}setTimeout(()=>{try{change(()=>{E.generate(state,current);tab='schedule';});toast('シフト案を作成しました。要確認の項目を確認してください。');}catch(err){render();toast(err.message);}},60);};if(mo().generated)ask('シフト案を再作成しますか？','希望休と固定したセルを保持して再作成します。固定していない手直しは置き換わります。元に戻すこともできます。',run);else run();}
function requestSummary(){
 const requests=mo().requests,days=range();
 const people=state.members.map(p=>({person:p,off:days.filter(d=>requests[k(p.id,d)]==='E'),paid:days.filter(d=>requests[k(p.id,d)]==='F')})).filter(p=>p.off.length||p.paid.length);
 const total=people.reduce((sum,p)=>sum+p.off.length+p.paid.length,0),[year,month]=current.split('-').map(Number);
 const dateTags=(dates,kind)=>dates.length?dates.map(day=>'<span class="request-summary-date '+(kind==='F'?'paid':'off')+'">'+day+'日（'+'日月火水木金土'[E.weekday(current,day)]+'）</span>').join(''):'<span class="subtle">なし</span>';
 return '<div class="request-summary-compact" id="request-summary" aria-labelledby="request-summary-title"><div class="request-summary-heading"><h3 id="request-summary-title">'+year+'年'+month+'月の希望一覧</h3><span class="subtle">'+people.length+'人・'+total+'日分（延べ）</span></div>'+
 (people.length?'<ul class="request-summary-list">'+people.map(p=>'<li data-summary-person="'+esc(p.person.id)+'"><strong class="request-summary-name">'+esc(p.person.name)+'</strong><div class="request-summary-kind"><span class="request-summary-label">希望休</span><div class="request-summary-dates" data-summary-kind="E">'+dateTags(p.off,'E')+'</div></div><div class="request-summary-kind"><span class="request-summary-label">有給</span><div class="request-summary-dates" data-summary-kind="F">'+dateTags(p.paid,'F')+'</div></div></li>').join('')+'</ul>':'<p class="request-summary-empty">この月の希望休・有給はまだ登録されていません。</p>')+'</div>';
}
function scheduleRequestPanel(){return '<section class="panel" id="schedule-request-panel"><div class="panel-head"><h2>希望休・有給を登録</h2>'+(mo().generated?'':'<div class="toolbar">'+undoBar()+'</div>')+'</div>'+requestControls()+paidYearNote()+'<p class="subtle">作成済みのシフトは自動変更しません。登録後に再作成するか、勤務セルを手動で変更してください。</p>'+requestSummary()+meetingControls()+'</section>';}

function scheduleViewControls(){return '<div class="schedule-view-toolbar"><div class="toolbar"><button type="button" id="schedule-fit" aria-pressed="'+scheduleFit+'">縦を全体表示</button><button type="button" id="schedule-zoom" aria-pressed="'+(!scheduleFit)+'">文字を大きくする</button><button type="button" id="schedule-expand" class="primary" aria-pressed="'+scheduleExpanded+'">'+(scheduleExpanded?'通常画面に戻る':'表を画面いっぱいに表示')+'</button></div><span id="schedule-view-status" class="subtle" role="status">'+(scheduleFit?'全職員と人数集計を縦に表示。日付は横にスクロールできます':'拡大表示：スクロールして編集できます')+'</span></div>';}
function fitHeightScale(height,tableHeight){if([height,tableHeight].some(v=>!Number.isFinite(v)||v<=0))return 1;return Math.min(1,height/tableHeight);}
function fitScheduleTable(){
 const viewport=$('#schedule-viewport'),canvas=$('#schedule-canvas');
 if(tab!=='schedule'||!mo().generated||!viewport||!canvas)return;
 canvas.style.zoom='';canvas.style.width='';
 if(!scheduleFit)return;
 canvas.style.width='max-content';
 const width=canvas.offsetWidth,height=canvas.offsetHeight;
 if(!width||!height)return;
 const scale=fitHeightScale(Math.max(1,viewport.clientHeight-2),height);
 canvas.style.zoom=String(scale);
 viewport.scrollTop=0;
 $('#schedule-view-status').textContent='縦を全体表示 '+Math.round(scale*100)+'%｜日付は横スクロールできます。セルをクリックして編集'+(scale<0.7?'。文字が小さい場合は画面いっぱいに表示、または文字を大きくするを選んでください。':'');
}
function queueScheduleFit(){if(window.requestAnimationFrame){if(queueScheduleFit.frame)window.cancelAnimationFrame(queueScheduleFit.frame);queueScheduleFit.frame=window.requestAnimationFrame(fitScheduleTable);}else setTimeout(fitScheduleTable,0);}
function bindScheduleView(){
 $('#schedule-fit').onclick=()=>{scheduleFit=true;render();$('#schedule-fit').focus({preventScroll:true});};
 $('#schedule-zoom').onclick=()=>{scheduleFit=false;render();$('#schedule-zoom').focus({preventScroll:true});};
 $('#schedule-expand').onclick=()=>{scheduleExpanded=!scheduleExpanded;if(scheduleExpanded)scheduleFit=true;render();$('#schedule-expand').focus({preventScroll:true});};
 if(typeof ResizeObserver!=='undefined'){scheduleResizeObserver=new ResizeObserver(queueScheduleFit);scheduleResizeObserver.observe($('#schedule-viewport'));}
 queueScheduleFit();
}
window.addEventListener('resize',queueScheduleFit);
document.fonts?.ready.then(queueScheduleFit);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&scheduleExpanded&&!dialog.open&&!$('#confirm').open){scheduleExpanded=false;render();$('#schedule-expand')?.focus({preventScroll:true});}});

function renderSchedule(){const m=mo();if(!m.generated){content.innerHTML=scheduleRequestPanel()+'<div class="panel empty"><h2>月の条件を入力したら、シフト案を作成</h2><p>希望休を確保し、設定した配置人数を満たす組み合わせを探します。</p><button class="primary" id="generate">シフト案を作る</button> <button id="edit-month-settings">作成条件を確認する</button></div>';$('#generate').onclick=startGenerate;$('#edit-month-settings').onclick=()=>{tab='members';render();};bindRequestControls();return;}
 const issues=E.validate(state,current),bad=new Set(issues.filter(x=>x.id&&x.d).map(x=>k(x.id,x.d))),missing=issues.filter(x=>x.type==='coverage').length;
 content.innerHTML=`${scheduleRequestPanel()}<div class="stats"><div class="stat"><span>登録された希望</span><strong>${Object.keys(m.requests).length}</strong><small> 日分</small></div><div class="stat"><span>固定した勤務</span><strong>${Object.values(m.locks).filter(Boolean).length}</strong><small> セル</small></div><div class="stat warn"><span>人数の過不足</span><strong>${missing}</strong><small> 項目</small></div><div class="stat warn"><span>その他の要確認</span><strong>${issues.length-missing}</strong><small> 項目</small></div></div><div class="panel schedule-panel" id="schedule-panel"><div class="panel-head"><div><h2>${current.replace('-','年')}月のシフト案</h2><p class="desc">セルをクリックして変更。固定した勤務は再作成しても保持されます。</p></div><div class="toolbar schedule-actions">${undoBar()}<button id="generate">再作成</button><button id="to-counts">表の下の人数を見る</button><button id="to-requests">希望休を入力</button><button id="export-csv">CSV出力</button></div></div><div class="legend">${Object.keys(E.shifts).map(c=>`<span class="chip ${chip(c)}">${c} ${E.shifts[c].label}</span>`).join('')}<span>● 固定 ／ 下線 希望あり ／ 赤枠 要確認</span></div>${scheduleViewControls()}<div class="grid-wrap schedule-viewport ${scheduleFit?'is-fit':'is-zoom'}" id="schedule-viewport" style="--schedule-days:${n()}"><div id="schedule-canvas"><table class="schedule-grid" aria-label="職員のシフトと日別・勤務記号別人数"><colgroup><col class="schedule-name-col"><col span="${n()}" class="schedule-day-col"><col span="3" class="schedule-meta-col"></colgroup><thead><tr><th>職員</th>${headerDays()}<th>時間 / 目安</th><th>夜勤</th><th>休日</th></tr></thead><tbody>${state.members.map(p=>{const codes=range().map(d=>m.schedule[k(p.id,d)]||''),hours=codes.reduce((v,c)=>v+(E.shifts[c]?.hours||0),0);return `<tr>${staffRow(p,true)}${codes.map((c,i)=>{const d=i+1,id=k(p.id,d);return `<td><button class="cell ${chip(c)} ${m.locks[id]?'locked':''} ${m.requests[id]?'marked':''} ${bad.has(id)?'issue':''} ${!E.active(p,current,d)?'unavailable':''}" data-edit="${p.id}" data-date="${d}" aria-label="${esc(p.name)} ${d}日 ${esc(c||'未入力')}" title="${esc(E.shifts[c]?.label||'未入力')}${m.requests[id]?'・休み希望あり':''}">${c||'—'}</button></td>`;}).join('')}<td>${codes.includes('A')?`${hours}＋A未確定`:hours} / ${E.target(p,m,n())}</td><td>${codes.filter(c=>c==='D').length}</td><td>${codes.filter(c=>c==='E').length}</td></tr>`;}).join('')}</tbody>${countsRows()}${equivalentFooter(3)}</table></div></div>${equivalentNote()}<p class="subtle">夜勤はD＋翌日dとして集計します。時間の目安には有休を含みます。</p><p class="subtle">勤務記号別の人数は在籍期間内の職員を1人ずつ集計します。Dとd、Bと/B、Cと/Cは別に数えます。法定配置や時間帯別の人数を判定する表ではありません。</p><p class="subtle">A＝7:00〜16:30（手動入力に対応）。休憩時間が未確認のため、Aを含む勤務時間合計は未確定です。</p></div><div class="panel"><div class="panel-head"><h2>確認する項目 ${issues.length}件</h2><span class="subtle">編集すると即時更新します</span></div><div class="issue-list">${issues.map((x,i)=>`<button class="issue-link" data-issue="${i}">${esc(x.text)}</button>`).join('')||'<span>登録した条件に対する警告はありません。</span>'}</div><p class="subtle">チェック対象は画面で設定した条件です。資格別配置、法定基準、月をまたぐ連勤の完全な判定は本番導入時に追加します。</p></div>`;
 bindRequestControls();$('#to-counts').onclick=()=>$('#daily-counts').scrollIntoView({block:'start',behavior:'smooth'});$('#to-requests').onclick=()=>{$('#schedule-request-panel').scrollIntoView({block:'start',behavior:'smooth'});$('#request-person').focus({preventScroll:true});};
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCell(b.dataset.edit,+b.dataset.date));document.querySelectorAll('[data-issue]').forEach(b=>b.onclick=()=>{const x=issues[+b.dataset.issue];if(x.id&&x.d)editCell(x.id,x.d);else if(x.d)document.querySelector(`[data-date="${x.d}"]`)?.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});else memberForm(x.id);});$('#generate').onclick=startGenerate;$('#export-csv').onclick=exportCSV;bindScheduleView();
}
function editCell(id,d){const p=state.members.find(x=>x.id===id),m=mo(),cell=k(id,d),c=m.schedule[cell]||'';dialog.innerHTML=`<div class="dialog-head"><div><span class="subtle">${current.replace('-','年')}月${d}日（${'日月火水木金土'[E.weekday(current,d)]}）</span><h2>${esc(p.name)}</h2></div><button class="close" aria-label="閉じる">×</button></div>${p.role==='管理者'&&E.active(p,current,d)&&E.meetingDays(state,current).includes(d)?'<div class="note">会議日です。管理者はB勤務が必要です。B以外に変更すると要確認として表示します。</div>':''}${m.requests[cell]?`<div class="note">この日は${m.requests[cell]==='E'?'希望休':'有給希望'}です。変更した場合は要確認として表示します。</div>`:''}<p class="desc">現在：${c?`${c} ${E.shifts[c].label}`:'未入力'}　変更する勤務を選んでください。</p><div class="choices">${Object.entries(E.shifts).map(([v,s])=>`<button class="choice ${s.cls}" data-choice="${v}"><strong>${v} ${s.label}</strong><small>${s.time||'勤務なし'}</small></button>`).join('')}</div><label><input id="lock-edit" type="checkbox" checked> 変更後のセルを固定する</label><p><label><input id="night-set" type="checkbox" checked> Dを選んだとき、翌日d・翌々日Eも設定</label></p><div class="fields"><label class="field">同じ日の勤務を交換する<select id="swap-person"><option value="">交換相手を選択</option>${options(state.members.filter(x=>x.id!==id&&E.active(x,current,d)).map(x=>[x.id,`${x.name}：${m.schedule[k(x.id,d)]||'未入力'}`]),'')}</select></label><button id="swap">勤務を交換</button></div><div class="dialog-bottom"><button id="unlock">${m.locks[cell]?'固定を解除':'現在の勤務を固定'}</button><button id="empty-cell">空欄にする</button><button class="primary close-action">閉じる</button></div>`;dialog.showModal();dialog.querySelector('.close').onclick=close;dialog.querySelector('.close-action').onclick=close;
 dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const v=b.dataset.choice,fix=$('#lock-edit').checked,patches=[[d,v]];if(v==='D'&&$('#night-set').checked){if(d+1<=n())patches.push([d+1,'d']);if(d+2<=n())patches.push([d+2,'E']);}for(const [day,code]of patches){const q=k(id,day);if(day!==d&&((m.locks[q]&&m.schedule[q]!==code)||(m.requests[q]&&m.requests[q]!==code))){toast(`${day}日は固定または希望休があります。先に確認してください。`);return;}}change(()=>{for(const[day,code]of patches){m.schedule[k(id,day)]=code;if(fix)m.locks[k(id,day)]=true;else delete m.locks[k(id,day)];}});close();toast('勤務を変更しました');});
 $('#unlock').onclick=()=>{change(()=>m.locks[cell]?delete m.locks[cell]:m.locks[cell]=true);close();};$('#empty-cell').onclick=()=>{change(()=>{m.schedule[cell]='';m.locks[cell]=true;});close();};$('#swap').onclick=()=>{const other=$('#swap-person').value;if(!other)return toast('交換相手を選んでください');const q=k(other,d);if(m.locks[q])return toast('交換相手の勤務は固定されています。先に解除してください。');change(()=>{[m.schedule[cell],m.schedule[q]]=[m.schedule[q]||'',m.schedule[cell]||''];m.locks[cell]=true;m.locks[q]=true;});close();toast('勤務を交換しました。要確認の項目を確認してください。');};
}

function conditionPanel(){
 const m=mo();if(m.conditionPrompt===undefined){m.conditionPrompt=ShiftConditions.withFacilityRules(ShiftConditions.template(m.rules));m.appliedConditionPrompt=m.conditionPrompt;}
 m.conditionPrompt=ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.conditionPrompt));if(typeof m.appliedConditionPrompt==='string')m.appliedConditionPrompt=ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.appliedConditionPrompt));
 return '<section class="panel condition-panel"><div class="panel-head"><div><h2>シフトを組む条件・プロンプト</h2><p class="desc">'+esc(current)+' の条件です。画像の規則と現在の作成方法を入れています。</p></div><div class="toolbar">'+undoBar()+'</div></div><div class="note">Bは人数制限なし、Cは毎日ちょうど2人で固定です。文章から変更できるのはD・連勤上限・休日目安です。会議日の条件は登録欄から直接反映します。それ以外の自由記述はメモとして保存します。</div><div class="meeting-condition"><label class="field" for="meeting-condition-prompt">会議日の条件（登録欄と自動連携）</label><textarea id="meeting-condition-prompt" readonly rows="6" aria-describedby="meeting-condition-help">'+esc(meetingConditionText())+'</textarea><p id="meeting-condition-help" class="subtle">この条件は自動で適用します。会議日の変更はシフト調整ページの会議日欄で行ってください。</p></div><div class="note"><strong>施設の追加条件：正社員は月176時間以上／夜勤セットのEとは別に月9日のE</strong><p>条件文に追加しています。正社員の区分・勤務時間の数え方の確認が必要なため、この2条件の自動割当・充足判定は保留です。</p></div><label class="field" for="condition-prompt">条件の文章（この月用）</label><textarea id="condition-prompt" maxlength="20000" spellcheck="false" aria-describedby="condition-help">'+esc(m.conditionPrompt)+'</textarea><p id="condition-help" class="subtle">Bの人数は「制限なし」、Cの人数は「2人」のまま、D・連勤上限・休日目安を数値＋人／日で編集してください。内容は「データを保存」のファイルにも含まれます。</p><div id="condition-preview" aria-live="polite"></div><div class="toolbar"><button id="apply-condition-prompt" class="primary">月の作成条件に反映</button><button id="condition-to-month">今月の作成条件を確認</button><button id="condition-copy">前月の文章をコピー</button></div><details class="details"><summary>現在、自動作成で使う設定を確認する</summary><pre class="condition-snapshot">'+esc(conditionSnapshot())+'</pre></details></section>';
}
function conditionSnapshot(){
 const m=mo(),lines=[current+' の現在の有効設定',ShiftConditions.settings(m.rules),'','職員ごとの条件（夜勤可否が優先。職種のみでは制限しません）'];
 for(const p of state.members)lines.push(p.name+'／'+p.role+'／'+(p.night?'夜勤可・月'+p.nightMax+'回まで':'夜勤不可')+'／勤務曜日：'+p.weekdays.map(w=>'日月火水木金土'[w]).join('・')+'／在籍：'+(p.start||'指定なし')+'〜'+(p.end||'指定なし')+'／今月の目安：'+E.target(p,m,n())+'時間／前月末：'+(E.prior(state,current,p)||'未指定'));
 lines.push('','職員専用の個別メモ・勤務条件（対応する定型文のみ自動適用）');
 for(const p of state.members)if(p.memberPrompt){const parsed=E.parseMemberPrompt(p.memberPrompt);lines.push(p.name+'：'+p.memberPrompt);lines.push('自動適用：'+(parsed.nightOnly?'夜勤専門':parsed.gAllowed?'G勤務が可能（残り6〜7時間でG候補）':'追加なし'));if(parsed.notes.length)lines.push('未対応の文章はメモのみ');}
 lines.push('',meetingConditionText(),'','希望休・有給希望');
 for(const p of state.members){const req=range().filter(d=>m.requests[k(p.id,d)]).map(d=>d+'日'+(m.requests[k(p.id,d)]==='E'?'希':'有'));if(req.length)lines.push(p.name+'：'+req.join('、'));}
 lines.push('登録合計：'+Object.keys(m.requests).length+'日分','','固定勤務');
 for(const p of state.members){const fixed=range().filter(d=>m.locks[k(p.id,d)]).map(d=>d+'日'+(m.schedule[k(p.id,d)]||'空欄'));if(fixed.length)lines.push(p.name+'：'+fixed.join('、'));}
 lines.push('','保存済みの日別設定（入力欄は非表示。B・Cの旧人数は適用せず、Dのみ月の設定より優先）');
 for(const [day,values]of Object.entries(m.daily))lines.push(day+'日：'+Object.entries(values).map(([c,v])=>c+' '+v+'人'+(['B','C'].includes(c)?'（旧設定・適用しない）':'')).join('、'));
 lines.push('','保存済みの利用者予定（入力欄は非表示。必要職員数への自動換算なし）');
 for(const u of state.users)lines.push(u.name+'／'+u.type+'／'+u.weekdays.map(w=>'日月火水木金土'[w]).join('・')+'／'+(u.start||'指定なし')+'〜'+(u.end||'指定なし'));
 if(!state.users.length)lines.push('未登録');
 return lines.join('\n');
}
function updateConditionPreview(){
 const m=mo(),parsed=ShiftConditions.parse(m.conditionPrompt),pending=m.conditionPrompt!==m.appliedConditionPrompt;
 $('#condition-preview').innerHTML='<p><strong>'+(pending?'文章を変更済み・まだ反映していません':'反映確認済み')+'</strong></p>'+(parsed.errors.length?'<p class="form-error">'+parsed.errors.map(esc).join('<br>')+'</p>':'<p>反映予定：'+ShiftConditions.fields.map(([key,label])=>key==='B'?'Bの人数 <strong>制限なし（固定）</strong>':key==='C'?'Cの人数 <strong>2人（固定）</strong>':esc(label)+' '+m.rules[key]+' → <strong>'+parsed.rules[key]+'</strong>').join(' ／ ')+'</p><p class="subtle">日別の必要人数、個別の勤務時間・勤務曜日・希望休・固定セルは変更しません。本文の参考情報や追加メモは自動適用しません。</p>');
 $('#apply-condition-prompt').disabled=parsed.errors.length>0;
}
function bindConditionPanel(){
 let recorded=false;const input=$('#condition-prompt');
 input.onfocus=()=>{recorded=false;};
 input.oninput=()=>{if(!recorded){undo.push(E.copy(state));if(undo.length>40)undo.shift();redo=[];recorded=true;}mo().conditionPrompt=input.value;dirty=true;updateConditionPreview();$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;};
 $('#apply-condition-prompt').onclick=()=>{const parsed=ShiftConditions.parse(mo().conditionPrompt);if(parsed.errors.length)return;change(()=>{Object.assign(mo().rules,parsed.rules);mo().appliedConditionPrompt=mo().conditionPrompt;});toast('B制限なし・C2人と、D・連勤・休日の設定を反映しました。シフトの再作成は別途実行してください。');};
 $('#condition-to-month').onclick=()=>{$('#monthly-conditions').scrollIntoView({block:'start',behavior:'smooth'});$('#generate').focus({preventScroll:true});};
 $('#condition-copy').disabled=typeof state.months[E.prevMonth(current)]?.conditionPrompt!=='string';
 $('#condition-copy').onclick=()=>ask('前月の条件文章をコピーしますか？','この月の文章を置き換えます。設定への反映は、内容を確認してから行ってください。',()=>{change(()=>mo().conditionPrompt=state.months[E.prevMonth(current)].conditionPrompt);});
 updateConditionPreview();
}

function renderMembers(){content.innerHTML=`${monthlyConditionsPanel()}${conditionPanel()}<div class="panel"><div class="panel-head"><h2>職員 ${state.members.length}人</h2><button class="primary" id="add-member">職員を追加</button></div><p class="desc">サンプルは「編集」で実名・勤務条件に変更できます。不要な職員は「削除」で取り除けます。</p><div class="member-list">${state.members.map(p=>`<div class="member-card"><div><p>${esc(p.name)}</p><span class="subtle">${esc(p.role)} / ${p.night?`夜勤 月${p.nightMax}回まで`:'夜勤なし'}<br>${p.start?esc(p.start)+'〜':'開始日指定なし'}${p.end?esc(p.end):''}</span>${p.memberPrompt?'<details class="member-note"><summary>個別メモ・勤務条件</summary><p class="personal-note">'+esc(p.memberPrompt)+'</p></details>':''}</div><div class="member-actions"><button type="button" data-member="${p.id}" aria-label="${esc(p.name)}を編集">編集</button><button type="button" class="danger" data-delete-member="${p.id}" aria-label="${esc(p.name)}を削除">削除</button></div></div>`).join('')||'<p class="subtle">職員は未登録です。「職員を追加」から登録してください。</p>'}</div></div><div class="note">サンプルの氏名を編集すると、その職員の勤務条件・希望休・シフトは引き継がれます。実際に職員が入れ替わる場合は、新しい職員として追加してください。退職者の履歴を残す場合は、削除せず最終勤務日を設定します。編集・削除後は「データを保存」してください。</div>`;bindMonthlyConditions();bindConditionPanel();$('#add-member').onclick=()=>memberForm();document.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>memberForm(b.dataset.member));document.querySelectorAll('[data-delete-member]').forEach(b=>b.onclick=()=>confirmMemberDelete(b.dataset.deleteMember));}
function confirmMemberDelete(id){
 const info=E.memberRemovalSummary(state,id);if(!info)return toast('対象の職員が見つかりません。');
 const text=info.person.name+'を削除します。全月のこの職員の希望休・有給希望 '+info.requests+'件、勤務セル '+info.schedule+'件、固定 '+info.locks+'件、個別設定 '+info.settings+'件（'+info.months+'か月分）も削除し、有給の年間集計からも外します。ほかの職員・会議日・月の条件は残します。この職員専用の個別メモは削除します。月の条件文に書いた名前やメモは自動では消しません。履歴を残したい退職者は、削除せず最終勤務日を設定してください。削除前にデータを保存することをおすすめします。削除直後は「元に戻す」で復元できます。'+(info.person.role==='管理者'?' 管理者がいなくなると会議日の条件を満たせなくなるため、必要に応じて新しい管理者を登録してください。':'');
 ask('この職員を削除しますか？',text,()=>{
  if(!state.members.some(p=>p.id===id))return toast('対象の職員はすでに削除されています。');
  change(()=>{E.removeMember(state,id);if(requestPerson===id)requestPerson='';});
  toast(info.person.name+'を削除しました。直後なら「元に戻す」で復元できます。');
 });
 $('#yes').textContent='この職員を削除';$('#yes').className='danger';$('#no').focus();
}

function personalConditionPreview(text,night){
 const parsed=E.parseMemberPrompt(text),errors=E.memberConditionErrors({night},parsed),lines=[];
 if(parsed.nightOnly)lines.push('夜勤専門：D・dのみ勤務。休日E・有給Fは利用できます。夜勤上限や勤務可能曜日は引き続き守ります。');
 if(parsed.gAllowed)lines.push('G勤務が可能：B・Cも候補です。月の時間目安まで残り6〜7時間の場合はG（6時間）を自動割当の候補にします。G専任の指定ではありません。');
 if(!lines.length)lines.push('追加の自動割当条件はありません。');
 return '<strong>自動作成に反映する内容</strong><p>'+lines.map(esc).join('<br>')+'</p>'+
 (errors.length?'<p class="form-error">'+errors.map(esc).join('<br>')+'</p>':'')+
 (parsed.notes.length?'<p>メモのみ（自動適用しない）：</p><pre class="personal-note">'+esc(parsed.notes.join('\n'))+'</pre>':'');
}
function memberPromptFields(p){
 return '<section class="full personal-conditions"><label class="field" for="member-prompt">個別メモ・勤務条件（この職員専用）<textarea id="member-prompt" name="memberPrompt" rows="4" maxlength="2000" aria-describedby="member-prompt-help" placeholder="例：G勤務：可能">'+esc(p.memberPrompt||'')+'</textarea></label><div class="toolbar"><button type="button" data-personal-example="G勤務：可能">G勤務が可能を入力</button><button type="button" data-personal-example="勤務区分：夜勤専門">夜勤専門を入力</button></div><p id="member-prompt-help" class="subtle">1行に1条件、2,000文字まで。対応する定型文だけ自動反映します。それ以外はメモとして保存します。全月で共通の条件です。作成済みシフトは変更せず、再作成時に適用します。</p><div id="member-prompt-preview" role="status" aria-live="polite">'+personalConditionPreview(p.memberPrompt||'',p.night)+'</div></section>';
}
function bindMemberPrompt(){
 const input=$('#member-prompt'),night=$('#person-form select[name="night"]');
 const refresh=()=>{$('#member-prompt-preview').innerHTML=personalConditionPreview(input.value,night.value==='yes');};
 input.oninput=refresh;night.onchange=refresh;
 dialog.querySelectorAll('[data-personal-example]').forEach(button=>button.onclick=()=>{
  const line=button.dataset.personalExample;
  if(!input.value.split(/\r?\n/).some(x=>x.trim()===line)){
   const next=(input.value.trimEnd()?input.value.trimEnd()+'\n':'')+line;
   if(next.length>2000)return toast('個別メモは2,000文字以内で入力してください。');
   input.value=next;
  }refresh();input.focus();
 });
}
function memberForm(id){editPerson(id,false);}
function editPerson(id,isUser){const list=isUser?state.users:state.members,p=E.copy(list.find(x=>x.id===id)||{id:(isUser?'u':'s')+crypto.randomUUID(),name:'',role:'介護職員',type:'通い',night:false,nightMax:6,target:0,weekdays:[0,1,2,3,4,5,6],start:'',end:''});dialog.innerHTML=`<div class="dialog-head"><h2>${isUser?'利用予定':'職員'}を${id?'変更':'追加'}</h2><button class="close" aria-label="閉じる">×</button></div><form id="person-form"><div class="form-grid"><label class="field full">${isUser?'利用者名または管理番号':'氏名'}<input name="name" required maxlength="50" value="${esc(p.name)}"></label>${isUser?`<label class="field">サービス<select name="type">${options(['通い','泊まり','訪問'].map(x=>[x,x]),p.type)}</select></label><div></div>`:`<label class="field">職種<select name="role">${options(['介護職員','看護職員','管理者','計画作成担当者'].map(x=>[x,x]),p.role)}</select></label><label class="field">夜勤<select name="night">${options([['yes','可能'],['no','不可']],p.night?'yes':'no')}</select></label><label class="field">夜勤の上限（月）<input name="nightMax" type="number" required min="0" max="15" value="${p.nightMax}"></label><label class="field">月の勤務時間目安<input name="target" type="number" required min="0" max="300" value="${p.target}"><small>0＝月の日数と休日目安から算出</small></label>`}<label class="field">${isUser?'利用開始日':'入職日'}<input name="start" type="date" value="${esc(p.start)}"></label><label class="field">${isUser?'利用終了日':'最終勤務日'}<input name="end" type="date" value="${esc(p.end)}"></label><div class="full">${isUser?'利用する':'勤務できる'}曜日<div class="weekday-picks">${[...'日月火水木金土'].map((w,i)=>`<label><input type="checkbox" name="weekdays" value="${i}" ${p.weekdays.includes(i)?'checked':''}>${w}</label>`).join('')}</div></div>${isUser?'':memberPromptFields(p)}</div><p id="form-error" class="form-error"></p><div class="dialog-bottom"><button type="button" class="cancel">キャンセル</button><button class="primary" type="submit">保存</button></div></form>`;dialog.showModal();dialog.querySelector('.close').onclick=close;dialog.querySelector('.cancel').onclick=close;if(!isUser)bindMemberPrompt();$('#person-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);if(f.get('start')&&f.get('end')&&f.get('start')>f.get('end')){$('#form-error').textContent='終了日は開始日以降にしてください。';return;}Object.assign(p,{name:String(f.get('name')).trim(),start:f.get('start'),end:f.get('end'),weekdays:f.getAll('weekdays').map(Number)});if(!p.name){$('#form-error').textContent='氏名を入力してください。';return;}if(isUser)p.type=f.get('type');else Object.assign(p,{role:f.get('role'),night:f.get('night')==='yes',nightMax:+f.get('nightMax'),target:+f.get('target'),memberPrompt:String(f.get('memberPrompt')||'')});if(!isUser){const errors=E.memberConditionErrors(p);if(errors.length){$('#form-error').textContent=errors.join(' ');return;}}change(()=>{if(id)list[list.findIndex(x=>x.id===id)]=p;else list.push(p);});close();toast('保存しました');};}
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function exportCSV(){const safe=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const rows=[['氏名','職種',...range().map(d=>`${d}日`)],...state.members.map(p=>[p.name,p.role,...range().map(d=>mo().schedule[k(p.id,d)]||'')]),[],['勤務別人数','',...range().map(d=>`${d}日`)],...[...Object.keys(E.shifts),'blank'].map(c=>[c==='blank'?'未入力':c,'人数',...E.dailyCounts(state,current).map(r=>r.counts[c])]),['8時間換算 合計','BCDdGI',...E.dailyEquivalent(state,current).map(r=>r.value)],['換算基準','7.0以上',...E.dailyEquivalent(state,current).map(r=>r.status==='pass'?'基準クリア':r.status==='near'?'6.0台（青）':'6.0未満（赤）')]];download(`あかり_シフト案_${current}.csv`,'\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
$('#month').onchange=e=>switchPlanningMonth(e.target.value);$('#planning-prev-month').onclick=()=>switchPlanningMonth(offsetMonth(current,-1));$('#planning-next-month').onclick=()=>switchPlanningMonth(offsetMonth(current,1));document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
$('#save').onclick=()=>{download(`あかり_シフトデータ_${current}.json`,JSON.stringify(state,null,2),'application/json');dirty=false;toast('保存ファイルをダウンロードしました');};$('#load').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5e6)return toast('ファイルが大きすぎます（上限5MB）。');let incoming;try{incoming=E.checkData(JSON.parse(await f.text()));}catch(err){return toast(err.message);}ask('保存データを開きますか？','現在の画面を、ファイルの職員・希望休・シフトで置き換えます。',()=>{change(()=>{state=incoming;});toast('保存データを開きました');});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();revert(e.shiftKey);}});
render();
if(document.modelContext?.registerTool){for(const tool of [{name:'read_shift_requests',title:'希望休を確認',description:'選択中の月の希望休を読み取ります。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({month:current,requests:mo().requests,members:state.members.map(p=>({id:p.id,name:p.name}))})},{name:'set_shift_requests',title:'希望休を登録',description:'指定職員の指定日に希望休または有給希望を登録。シフト自体は変更しません。',inputSchema:{type:'object',properties:{memberId:{type:'string'},days:{type:'array',items:{type:'integer'}},type:{type:'string',enum:['E','F']}},required:['memberId','days','type'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{const p=state.members.find(x=>x.id===input.memberId);if(!p||!Array.isArray(input.days)||!input.days.length||!['E','F'].includes(input.type)||input.days.some(d=>!Number.isInteger(d)||d<1||d>n()||!E.active(p,current,d)))throw Error('職員・日付・休みの種類を確認してください。');change(()=>{for(const d of input.days)mo().requests[k(p.id,d)]=input.type;});return {month:current,registered:input.days.length};}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}}
