'use strict';
// Generated schedule table, viewport behavior, validation display, and cell editing.
let generationFailure=null;
function scheduleViewControls(){return '<div class="schedule-view-toolbar"><div class="toolbar"><button type="button" id="schedule-fit" aria-pressed="'+scheduleFit+'">全体表示</button><button type="button" id="schedule-zoom" aria-pressed="'+(!scheduleFit)+'">文字を大きくする</button><button type="button" id="schedule-expand" class="primary" aria-pressed="'+scheduleExpanded+'">'+(scheduleExpanded?'通常画面に戻る':'表を画面いっぱいに表示')+'</button></div><span id="schedule-view-status" class="subtle" role="status">'+(scheduleFit?'最初は表全体を表示。2本指で左右にずらすと外側の白い余白まで動かせます':'拡大表示：職員名・職種を固定し、2本指で左右に動かせます')+'</span></div>';}
function fitHeightScale(height,tableHeight){if([height,tableHeight].some(v=>!Number.isFinite(v)||v<=0))return 1;return Math.min(1,height/tableHeight);}
function fitWidthScale(width,tableWidth){if([width,tableWidth].some(v=>!Number.isFinite(v)||v<=0))return 1;return Math.min(1,width/tableWidth);}
function fitCanvasWidth(naturalWidth,viewportWidth,scale,widthRatio=1){if([naturalWidth,viewportWidth,scale,widthRatio].some(v=>!Number.isFinite(v)||v<=0))return naturalWidth;return Math.ceil(Math.max(naturalWidth,(viewportWidth-2)*widthRatio/scale));}
function fitFillTableHeight(availableHeight,tableHeight,scale){if([availableHeight,tableHeight,scale].some(v=>!Number.isFinite(v)||v<=0))return 0;return tableHeight*scale<availableHeight*.96?Math.floor(availableHeight*.96/scale):0;}
function fitScheduleTable(){
 const viewport=$('#schedule-viewport'),canvas=$('#schedule-canvas');
 if(tab!=='schedule'||!mo().generated||!viewport||!canvas)return;
 const table=canvas.querySelector?.('.schedule-grid');if(table)table.style.height='';
 canvas.style.zoom='';canvas.style.width='';canvas.style.paddingInline='';
 if(!scheduleFit)return;
 const naturalWidth=438+n()*69,viewportWidth=Number.isFinite(viewport.clientWidth)?viewport.clientWidth:0,availableHeight=Math.max(1,viewport.clientHeight-2);
 canvas.style.width=naturalWidth+'px';
 let height=canvas.offsetHeight;if(!height)return;
 let scale=Math.min(fitHeightScale(availableHeight,height),fitWidthScale(viewportWidth-2,naturalWidth));
 for(let pass=0;pass<2;pass++){const fittedWidth=fitCanvasWidth(naturalWidth,viewportWidth,scale);canvas.style.width=fittedWidth+'px';height=canvas.offsetHeight;if(!height)return;scale=Math.min(fitHeightScale(availableHeight,height),fitWidthScale(viewportWidth-2,fittedWidth));}
 // When the width determines the scale, share the spare vertical space across all table rows.
 const fillHeight=fitFillTableHeight(availableHeight,height,scale);if(table&&fillHeight){table.style.height=fillHeight+'px';height=canvas.offsetHeight;scale=Math.min(scale,fitHeightScale(availableHeight,height));}
 const fittedWidth=fitCanvasWidth(naturalWidth,viewportWidth,scale),panPadding=Math.ceil((viewportWidth-2)/scale);
 canvas.style.width=fittedWidth+'px';canvas.style.paddingInline=panPadding+'px';
 canvas.style.zoom=String(scale);
 viewport.scrollTop=0;viewport.scrollLeft=Math.round(panPadding*scale);
 $('#schedule-view-status').textContent='全体表示 '+Math.round(scale*100)+'%｜最初は全体が見えます。2本指で左右にずらすと外側は白く表示されます。セルをクリックして編集';
}
function queueScheduleFit(){if(window.requestAnimationFrame){if(queueScheduleFit.frame)window.cancelAnimationFrame(queueScheduleFit.frame);queueScheduleFit.frame=window.requestAnimationFrame(fitScheduleTable);}else setTimeout(fitScheduleTable,0);}
function panScheduleHorizontally(event){const viewport=$('#schedule-viewport');if(!viewport||viewport.scrollWidth<=viewport.clientWidth)return;event.preventDefault?.();const delta=Math.abs(event.deltaX||0)>Math.abs(event.deltaY||0)?event.deltaX:(event.shiftKey?event.deltaY:0);if(!delta)return;const before=viewport.scrollLeft,max=Math.max(0,viewport.scrollWidth-viewport.clientWidth);viewport.scrollLeft=Math.max(0,Math.min(max,before+delta));}
function scheduleHourBreakdown(codes){const counts={};for(const code of codes)if(E.shifts[code]?.hours)counts[code]=(counts[code]||0)+1;const parts=Object.keys(E.shifts).filter(code=>counts[code]).map(code=>`${code} ${E.shifts[code].hours}時間×${counts[code]}日=${E.shifts[code].hours*counts[code]}時間`);return (parts.length?parts.join('、'):'勤務時間のある勤務なし')+'（E・空欄は0時間）';}
function bindScheduleView(){
 $('#schedule-fit').onclick=()=>{scheduleFit=true;render();$('#schedule-fit').focus({preventScroll:true});};
 $('#schedule-zoom').onclick=()=>{scheduleFit=false;render();$('#schedule-zoom').focus({preventScroll:true});};
 $('#schedule-expand').onclick=()=>{const returning=scheduleExpanded;scheduleExpanded=!scheduleExpanded;render();if(returning)$('#schedule-viewport').scrollIntoView({block:'start',behavior:'smooth'});$('#schedule-expand').focus({preventScroll:true});};
 if(typeof ResizeObserver!=='undefined'){scheduleResizeObserver=new ResizeObserver(queueScheduleFit);scheduleResizeObserver.observe($('#schedule-viewport'));}
 $('#schedule-viewport').onwheel=panScheduleHorizontally;
 queueScheduleFit();
}
window.addEventListener('resize',queueScheduleFit);
document.fonts?.ready.then(queueScheduleFit);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&scheduleExpanded&&!dialog.open&&!$('#confirm').open){scheduleExpanded=false;render();$('#schedule-expand')?.focus({preventScroll:true});}});

function generationFailureMarkup(){
 if(generationFailure?.month!==current||!generationFailure.issues.length)return '';
  return '<section class="generation-failure" id="generation-failure" aria-labelledby="generation-failure-title"><div class="generation-failure-head"><h3 id="generation-failure-title">前回の案を完成できなかった理由 '+generationFailure.issues.length+'件</h3><button type="button" id="copy-generation-issues">一覧をコピー</button></div><p>'+(generationFailure.draft?'以下は未適用の試案で満たせなかった条件です。':'以下の理由で作成を止めました。')+'現在のシフト表は変更していません。</p><ol>'+generationFailure.issues.map(issue=>'<li>'+esc(issue.text)+'</li>').join('')+'</ol></section>'+generationTrialMarkup();
}
function generationTrialIsStale(proposal){
  if(!proposal?.baseState||proposal.baseState!==JSON.stringify(state))return true;
  if(typeof localStorage==='undefined')return false;
  try{
    const stored=localStorage.getItem(storageKey);
    if(!stored)return false;
    const before=JSON.parse(proposal.baseState),latest=JSON.parse(stored);
    return JSON.stringify(before.members)!==JSON.stringify(latest.members)||JSON.stringify(before.months?.[current])!==JSON.stringify(latest.months?.[current]);
  }catch{return true;}
}
function generationTrialMarkup(){
  const draft=generationFailure?.draft;
  if(!draft||typeof draft!=='object')return '';
   const stale=generationTrialIsStale(generationFailure);
   const unsafeIssues=generationFailure.issues.filter(issue=>!['coverage','hours','holidays','iOff','equivalent'].includes(issue.type));
  const problemIds=new Set(generationFailure.issues.map(issue=>issue.id).filter(Boolean));
  const dates=range();
  const heading='<tr><th scope="col">職員</th>'+dates.map(day=>'<th scope="col">'+day+'<small>'+ '日月火水木金土'[E.weekday(current,day)]+'</small></th>').join('')+'<th scope="col">時間 / 目安</th><th scope="col">休日E</th></tr>';
  const rows=state.members.map(person=>{
    const codes=dates.map(day=>draft[k(person.id,day)]||'');
    const hours=codes.reduce((total,code)=>total+(E.shifts[code]?.hours||0),0);
    const shifts=codes.map((code,index)=>{
      const day=index+1,changed=code!==(mo().schedule[k(person.id,day)]||'');
      return '<td class="trial-shift '+chip(code)+(changed?' trial-changed':'')+'" title="'+esc(day+'日 '+(code?code+' '+E.shifts[code].label:'未入力')+(changed?'・現在の表から変更':'・現在の表と同じ'))+'">'+esc(code||'—')+'</td>';
    }).join('');
    return '<tr><th scope="row" class="'+(problemIds.has(person.id)?'trial-issue-person':'')+'">'+esc(person.name)+'</th>'+shifts+'<td class="'+(problemIds.has(person.id)?'trial-issue-person':'')+'">'+hours+' / '+E.target(person,mo(),n())+E.targetModeLabel(person)+'</td><td>'+codes.filter(code=>code==='E').length+'</td></tr>';
  }).join('');
   return '<section class="generation-trial" id="generation-trial" aria-labelledby="generation-trial-title"><h3 id="generation-trial-title">未適用の試案（全職員）</h3><p>警告が出ていない職員も含め、システムが試しに入れた勤務を表示しています。黄色の印は現在の表と違う勤務です。採用するまでは下のシフト表を変更しません。</p><div class="generation-trial-scroll"><table class="generation-trial-grid"><thead>'+heading+'</thead><tbody>'+rows+'</tbody></table></div><div class="generation-trial-actions">'+(stale?'<p class="form-error">試案を作った後に職員情報やシフト表が変更されました。採用するには③で案を作り直してください。</p>':unsafeIssues.length?'<p class="form-error">希望・勤務制限などと矛盾する試案は採用できません。条件を確認して作り直してください。</p>':'<p class="form-error">未完成の案です。採用しても完了扱いにはならず、C・Dの人数、休日E、勤務時間などの未達は赤い警告として残ります。確認しながら手直ししてください。</p>')+'<button type="button" id="adopt-generation-trial" class="primary"'+(stale||unsafeIssues.length?' disabled':'')+'>採用</button></div></section>';
}
function adoptGenerationTrial(){
  const proposal=generationFailure;
  if(!proposal?.draft||proposal.month!==current||generationTrialIsStale(proposal))return toast('試案が古くなりました。③人数を調整で案を作り直してください。');
  const preview=E.copy(state),record=E.month(preview,current);
  record.schedule={...proposal.draft};record.generated=true;record.generationStage=proposal.phase==='all'?'all':'day';
  if(Object.entries(mo().locks).some(([cell,locked])=>locked&&proposal.draft[cell]!==mo().schedule[cell]))return toast('固定した勤務と試案が一致しません。③で案を作り直してください。');
   const unsafe=E.validate(preview,current).filter(issue=>!['coverage','hours','holidays','iOff','equivalent'].includes(issue.type));
  if(unsafe.length)return toast('勤務条件と矛盾する試案は採用できません。'+unsafe[0].text);
  ask('未完成の試案を仮採用しますか？','現在のシフト表を、上に表示した試案で置き換えます。未達の条件 '+proposal.issues.length+'件は採用後も赤い警告に残り、シフト完成とは扱いません。',()=>{
    if(generationFailure!==proposal||generationTrialIsStale(proposal))return toast('試案が古くなりました。③で案を作り直してください。');
    const saved=change(()=>{const month=mo();month.schedule={...proposal.draft};month.generated=true;month.generationStage=proposal.phase==='all'?'all':'day';});
    if(saved){generationFailure=null;render();toast('試案を採用し、下のシフト表に反映しました。赤い警告を確認してください。');}
  });
  $('#yes').textContent='採用する';
}
function nightDraftGapsMarkup(){
 if(mo().generationStage!=='night')return '';
 const gaps=E.validate(state,current).filter(issue=>issue.type==='coverage'&&/ Dが/.test(issue.text));
 if(!gaps.length)return '';
 return '<section class="generation-failure" id="night-draft-gaps" aria-labelledby="night-draft-gaps-title"><h3 id="night-draft-gaps-title">夜勤案：Dの未配置 '+gaps.length+'日</h3><p>組めた日のD→d→Eは下の表に表示しています。不足日は空欄のまま残し、セルから手動で調整してください。希望日・固定勤務は保持しています。</p><ol>'+gaps.map(issue=>'<li>'+esc(issue.text)+'</li>').join('')+'</ol><button type="button" id="fill-night-gaps">固定を残して夜勤案を再提案</button><p>固定していない夜勤は組み直されます。満たせない出勤希望は下の「確認する項目」に警告として残します。</p></section>';
}
function scheduleWorkflow(){const stage=mo().generationStage,status=stage==='requests'?'希望日だけ反映済みです。確認後、②夜勤案を作成してください。':stage==='night'?'夜勤案を表示中です。②をもう一度押すと夜勤をリセットして作り直せます。':stage==='day'||stage==='all'?'人数を調整した案を表示中です。②を押すと夜勤案から作り直せます。':'白紙の状態です。希望を登録した後、①を押してください。';return '<div class="schedule-workflow" role="group" aria-label="シフト作成の3段階"><div class="schedule-workflow-steps"><button type="button" id="stage-requests" title="登録済みの出勤希望・希望休・有給希望だけを表へ反映">① 希望を入力</button><button type="button" id="stage-nights" title="再度押すと前の夜勤セットをリセットしてD→d→Eを組み直す">② 夜勤案を作成</button><button type="button" id="stage-day" title="夜勤と手直し済み勤務を保ち、日中のC・Bを配置">③ 人数を調整</button><button type="button" id="reset-draft" class="danger" title="職員情報と登録済みの希望を残して、この月のシフト案を白紙に戻す">シフト案をリセット</button></div><span class="workflow-status" role="status">'+status+'</span></div>'+generationFailureMarkup()+nightDraftGapsMarkup();}
function bindScheduleWorkflow(){
 $('#stage-requests').onclick=startRequestsPhase;
 $('#stage-nights').onclick=()=>startGenerationPhase('night');
 const fillNightGaps=$('#fill-night-gaps');if(fillNightGaps)fillNightGaps.onclick=()=>startGenerationPhase('night',true);
 $('#stage-day').onclick=()=>startGenerationPhase('day');
 $('#reset-draft').onclick=resetScheduleDraft;
  const adopt=$('#adopt-generation-trial');if(adopt&&!adopt.disabled)adopt.onclick=adoptGenerationTrial;
 if(generationFailure?.month===current){const button=$('#copy-generation-issues');if(button)button.onclick=()=>{const text=generationFailure.issues.map((issue,index)=>(index+1)+'. '+issue.text).join('\n');if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)return toast('一覧を選択してコピーしてください。');navigator.clipboard.writeText(text).then(()=>toast('理由の一覧をコピーしました。')).catch(()=>toast('コピーできませんでした。一覧を選択してコピーしてください。'));};}
}

function renderSchedule(){const m=mo();
 const allIssues=E.validate(state,current),nightDraft=m.generationStage==='night',beforeNight=!m.generated||m.generationStage==='requests',issues=beforeNight?[]:nightDraft?allIssues.filter(x=>x.type!=='coverage'||/ Dが/.test(x.text)).filter(x=>!['equivalent','hours','holidays','iOff'].includes(x.type)):allIssues,bad=new Set(issues.filter(x=>x.id&&x.d).map(x=>k(x.id,x.d))),missing=issues.filter(x=>x.type==='coverage').length;
 content.innerHTML=`${scheduleRequestPanel()}<div class="stats"><div class="stat"><span>登録された希望</span><strong>${Object.keys(m.requests).length}</strong><small> 日分</small></div><div class="stat"><span>固定した勤務</span><strong>${Object.values(m.locks).filter(Boolean).length}</strong><small> セル</small></div><div class="stat warn"><span>人数の過不足</span><strong>${missing}</strong><small> 項目</small></div><div class="stat warn"><span>その他の要確認</span><strong>${issues.length-missing}</strong><small> 項目</small></div></div><div class="panel schedule-panel" id="schedule-panel"><div class="panel-head"><div><h2>${current.replace('-','年')}月のシフト案</h2><p class="desc">セルをクリックして変更。固定した勤務は再作成しても保持されます。</p></div><div class="toolbar schedule-actions">${m.generated?undoBar():""}<button id="to-counts">表の下の人数を見る</button><button id="export-csv">CSV出力</button><button id="print-schedule" type="button">印刷</button></div></div><div class="legend">${Object.keys(E.shifts).map(c=>`<span class="chip ${chip(c)}">${c} ${E.shifts[c].label}</span>`).join('')}<span>● 固定 ／ 下線 希望あり ／ 赤枠 要確認</span></div>${scheduleViewControls()}${scheduleWorkflow()}<div class="grid-wrap schedule-viewport ${scheduleFit?'is-fit':'is-zoom'}" id="schedule-viewport" style="--schedule-days:${n()}"><div id="schedule-canvas"><table class="schedule-grid" aria-label="職員のシフトと日別・勤務記号別人数"><colgroup><col class="schedule-name-col"><col span="${n()}" class="schedule-day-col"><col class="schedule-hours-col"><col class="schedule-night-col"><col class="schedule-holiday-col"></colgroup><thead><tr class="week-group-row"><th class="schedule-staff-heading" rowspan="2">職員</th>${weekHeaders()}<th rowspan="2">合計時間 / 目安</th><th rowspan="2">夜勤</th><th rowspan="2">休日</th></tr><tr class="day-header-row">${headerDays()}</tr></thead><tbody>${state.members.map(p=>{const codes=range().map(d=>m.schedule[k(p.id,d)]||''),hours=E.projectedHours(state,current,p),hourDetails=scheduleHourBreakdown(codes);return `<tr>${staffRow(p,true)}${codes.map((c,i)=>{const d=i+1,id=k(p.id,d);return `<td><button class="cell ${chip(c)} ${m.locks[id]?'locked':''} ${m.requests[id]?'marked':''} ${bad.has(id)?'issue':''} ${!E.active(p,current,d)?'unavailable':''}" data-edit="${p.id}" data-date="${d}" aria-label="${esc(p.name)} ${d}日 ${esc(c||'未入力')}" title="${esc(E.shifts[c]?.label||'未入力')}${m.requests[id]?'・希望登録あり':''}">${c||'—'}</button></td>`;}).join('')}<td class="schedule-hours-total" title="${esc(hourDetails)}" aria-label="${esc(p.name)}の合計${hours}時間。${hourDetails}">${hours} / ${E.target(p,m,n())}${E.targetModeLabel(p)}</td><td>${codes.filter(c=>c==='D').length}</td><td>${codes.filter(c=>c==='E').length}</td></tr>`;}).join('')}</tbody>${countsRows()}${equivalentFooter(3)}</table></div></div>${equivalentNote()}<p class="subtle"><strong>合計時間：</strong>B・C・C'・D・d・Fは各8時間、G・J・/C'は各6時間、L・M・Iは各7時間、/B・/Cは各4時間、E・空欄は0時間として足します。夜勤はD 8時間＋翌日d 8時間＝16時間、有給Fは8時間として目安に含めます。各職員の「合計時間 / 目安」にマウスを置くと内訳を確認できます。</p><p class="subtle">勤務記号別の人数は在籍期間内の職員を1人ずつ集計します。Dとd、Bと/B、Cと/Cは別に数えます。法定配置や時間帯別の人数を判定する表ではありません。</p></div><div class="panel"><div class="panel-head"><h2>確認する項目 ${issues.length}件</h2><span class="subtle">編集すると即時更新します</span></div><div class="issue-list">${issues.map((x,i)=>`<button class="issue-link" data-issue="${i}">${esc(x.text)}</button>`).join('')||'<span>登録した条件に対する警告はありません。</span>'}</div><p class="subtle">チェック対象は画面で設定した条件です。資格別配置、法定基準、月をまたぐ連勤の完全な判定は本番導入時に追加します。</p></div>`;
  document.querySelectorAll('.schedule-grid tbody:not(.daily-count-rows) > tr').forEach((row,index)=>{
   const person=state.members[index],cell=row.lastElementChild;
   if(!person||!cell||!(person.employmentType==='full'||person.usesI))return;
   const total=E.holidayCount(current,m.schedule,person);
   cell.textContent=String(total);
   cell.title=`休日E ${total}日／必須9日ちょうど（夜勤セットのEを含む）`;
   cell.setAttribute('aria-label',`${person.name}の休日E${total}日、夜勤後のEも含めて必須9日ちょうど`);
   if(m.generated&&m.generationStage!=='requests'&&range().some(day=>E.active(person,current,day))&&total!==9)cell.classList.add('schedule-off-short');
  });
  document.querySelector('#schedule-viewport')?.insertAdjacentHTML('afterend','<p class="subtle">正社員とI勤務パートの「休日」は、夜勤セットの最後のEを含む合計日数です。9日以外は赤色で表示し、その案は自動作成で適用しません。</p>');
  bindScheduleWorkflow();
 for(const issue of issues){if(issue.type==='coverage'&&issue.d){const code=/ Dが/.test(issue.text)?'D':'C';document.querySelector(`[data-count-code="${code}"][data-count-day="${issue.d}"]`)?.classList?.add?.('metric-issue');}if(issue.type==='equivalent'&&issue.d)document.querySelector(`[data-equivalent-day="${issue.d}"]`)?.classList?.add?.('metric-issue');if(issue.type==='hours'&&issue.id)document.querySelector(`[data-edit="${issue.id}"]`)?.closest?.('tr')?.querySelector?.('.schedule-hours-total')?.classList?.add?.('metric-issue');}
 document.querySelectorAll('.stat.warn').forEach(card=>{if(Number(card.querySelector?.('strong')?.textContent)>0)card.classList?.add?.('critical');});
 bindRequestControls();$('#to-counts').onclick=()=>$('#daily-counts').scrollIntoView({block:'start',behavior:'smooth'});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCell(b.dataset.edit,+b.dataset.date));document.querySelectorAll('[data-issue]').forEach(b=>b.onclick=()=>{const x=issues[+b.dataset.issue];if(x.id&&x.d)editCell(x.id,x.d);else if(x.d)document.querySelector(`[data-date="${x.d}"]`)?.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});else memberForm(x.id);});$('#export-csv').onclick=exportCSV;$('#print-schedule').onclick=printSchedule;bindScheduleView();
}
function shiftedScheduleDate(month,day,offset){let targetMonth=month,targetDay=day+offset;while(targetDay>E.days(targetMonth)){targetDay-=E.days(targetMonth);targetMonth=E.nextMonth(targetMonth);}return {month:targetMonth,day:targetDay};}
function scheduleCode(id,position){return state.months[position.month]?.schedule?.[k(id,position.day)]||'';}
 function clearNightSequenceTail(id,month,day){let cleared=0,preservedRequestedE=false;for(let offset=1;offset<E.nightSequence.length;offset++){const expected=E.nightSequence[offset],position=shiftedScheduleDate(month,day,offset),record=state.months[position.month],cell=k(id,position.day);if(record?.schedule?.[cell]!==expected)continue;if(expected==='E'&&record.requests?.[cell]==='E'){preservedRequestedE=true;continue;}record.schedule[cell]='';delete record.locks[cell];cleared++;}return {cleared,preservedRequestedE};}
function targetLimitForPositions(person,positions,codes){const months=[...new Set(positions.map(position=>position.month))];for(const month of months){const changes=positions.map((position,i)=>({position,code:codes[i]})).filter(item=>item.position.month===month).map(item=>[item.position.day,item.code]),issue=E.targetLimitIssue(state,month,person,changes);if(issue)return issue;}return '';}
function incomingShiftIssue(person,positions,codes){
 for(let i=0;i<positions.length;i++){const position=positions[i],code=codes[i],record=state.months[position.month],date=E.iso(position.month,position.day),request=record?.requests?.[k(person.id,position.day)];
  if(!E.active(person,position.month,position.day))return `${person.name}：${date}は在籍期間外です。`;
  if(!E.memberShiftAllowed(person,code))return `${person.name}：${date}の${code||'空欄'}は勤務区分に合いません。`;
  if(code==='D'&&!person.night)return `${person.name}は夜勤不可のため、Dを担当できません。`;
  if(E.works(code)&&!person.weekdays.includes(E.weekday(position.month,position.day)))return `${person.name}：${date}は勤務不可の曜日です。`;
  if(person.role==='管理者'&&(record?.meetings||[]).includes(position.day)&&code!=='B')return `${person.name}：${date}は会議日のB勤務が必要です。`;
  if(request==='W'&&(record?.workRequests?.[k(person.id,position.day)]?record.workRequests[k(person.id,position.day)]!==code:!E.works(code)))return `${person.name}：${date}の出勤希望と${code||'空欄'}が重なります。`;
  if(request&&request!=='W'&&request!==code)return `${person.name}：${date}の希望と${code||'空欄'}が重なります。`;
  if(code==='F'&&!E.paidLeaveEligibility(person,date).allowed)return `${person.name}：${date}は有給を利用できません。`;
 }return targetLimitForPositions(person,positions,codes);
}
function swapNightSequence(first,second,startDay){
 const positions=E.nightSequence.map((_,offset)=>shiftedScheduleDate(current,startDay,offset)),expected=E.nightSequence,firstCodes=positions.map(position=>scheduleCode(first.id,position)),secondCodes=positions.map(position=>scheduleCode(second.id,position)),firstStarts=firstCodes[0]==='D',secondStarts=secondCodes[0]==='D';
 if(!firstStarts&&!secondStarts)return false;
 if(firstStarts&&secondStarts){toast('どちらも夜勤Dのため、担当交代は不要です。');return true;}
  const owner=firstStarts?first:second,replacement=firstStarts?second:first,ownerCodes=firstStarts?firstCodes:secondCodes,replacementCodes=firstStarts?secondCodes:firstCodes,restPosition=positions[2],preserveOwnerRequestedE=state.months[restPosition.month]?.requests?.[k(owner.id,restPosition.day)]==='E',ownerCodesAfter=[replacementCodes[0],'',preserveOwnerRequestedE?'E':''];
 for(let i=0;i<positions.length;i++){const position=positions[i],record=state.months[position.month],actual=ownerCodes[i],uncreatedFuture=position.month!==current&&!record?.generated&&!actual;if(actual!==expected[i]&&!uncreatedFuture){toast('現在のD・d・Eが3日連続になっていないため、先にシフトを確認してください。');return true;}}
 for(const position of positions){const code=scheduleCode(replacement.id,position),required=E.requiredNightShift(state,position.month,replacement,position.day);if(['D','d'].includes(code)||required){toast('交代する職員の3日間に別の夜勤セットがあります。別の職員を選んでください。');return true;}if(state.months[position.month]?.locks?.[k(replacement.id,position.day)]){toast('交代する職員の3日間に固定勤務があります。先に固定を解除してください。');return true;}}
 let issue=incomingShiftIssue(replacement,positions,expected)||incomingShiftIssue(owner,[positions[0]],[ownerCodesAfter[0]]);if(issue){toast(issue);return true;}
   if(!change(()=>{for(let i=0;i<positions.length;i++){const position=positions[i],record=E.month(state,position.month),ownerCell=k(owner.id,position.day),replacementCell=k(replacement.id,position.day),ownerCode=ownerCodesAfter[i];record.schedule[ownerCell]=ownerCode;record.schedule[replacementCell]=expected[i];if(ownerCode)record.locks[ownerCell]=true;else delete record.locks[ownerCell];record.locks[replacementCell]=true;}}))return true;close();toast(preserveOwnerRequestedE?`${replacement.name}へD・d・Eの3日間をまとめて交代し、元の担当者のdを空欄にしました。希望休のEは残しました。`:`${replacement.name}へD・d・Eの3日間をまとめて交代し、元の担当者のd・Eを空欄にしました。`);return true;
}
function editCell(id,d){const p=state.members.find(x=>x.id===id),m=mo(),cell=k(id,d),c=m.schedule[cell]||'';dialog.innerHTML=`<div class="dialog-head"><div><span class="subtle">${current.replace('-','年')}月${d}日（${'日月火水木金土'[E.weekday(current,d)]}）</span><h2>${esc(p.name)}</h2></div><button class="close" aria-label="閉じる">×</button></div>${p.role==='管理者'&&E.active(p,current,d)&&E.meetingDays(state,current).includes(d)?'<div class="note">会議日です。管理者はB勤務が必要です。B以外に変更すると要確認として表示します。</div>':''}${m.requests[cell]?`<div class="note">この日は${m.requests[cell]==='W'?'出勤希望':m.requests[cell]==='E'?'希望休':'有給希望'}です。変更した場合は要確認として表示します。</div>`:''}<p class="desc">現在：${c?`${c} ${E.shifts[c].label}`:'未入力'}　変更する勤務を選んでください。</p><div class="choices">${Object.entries(E.shifts).filter(([v])=>E.memberShiftAllowed(p,v)).map(([v,s])=>`<button class="choice ${s.cls}" data-choice="${v}"><strong>${v} ${s.label}</strong><small>${s.time||'勤務なし'}</small></button>`).join('')}<button class="choice choice-empty" data-empty-choice aria-label="空欄にする" title="空欄にする"><strong>—</strong></button></div><p class="subtle">手直しした勤務は次の段階でも固定して保持します。</p><p class="note">Dを選ぶと翌日d・翌々日Eも必ず設定されます。Dを別の勤務や空欄へ変更すると、続くdと夜勤由来のEは空欄になります。希望休のEは残します。</p><div class="fields"><label class="field">同じ日の勤務を交換する<select id="swap-person"><option value="">交換相手を選択</option>${options(state.members.filter(x=>x.id!==id&&E.active(x,current,d)).map(x=>[x.id,`${x.name}：${m.schedule[k(x.id,d)]||'未入力'}`]),'')}</select></label><button id="swap">勤務を交換</button></div><div class="dialog-bottom"><button id="unlock">${m.locks[cell]?'固定を解除':'現在の勤務を固定'}</button><button id="empty-cell">空欄にする</button><button class="primary close-action">閉じる</button></div>`;dialog.showModal();dialog.querySelector('.close').onclick=close;dialog.querySelector('.close-action').onclick=close;
 if(!p.night||!E.memberShiftAllowed(p,'D')){const personal=E.memberConditions(p),reason=!p.night?'職員情報の「夜勤」が「不可」です。':p.usesI?'I勤務を使用する職員は夜勤を担当できません。':personal.errors.length?personal.errors[0]:personal.notes.length?'個別メモに自動判定できない文章があります。職員情報で確認してください。':personal.onlyShifts.length?'勤務限定が「'+personal.onlyShifts.join('・')+'のみ」です。':'職員情報の勤務条件を確認してください。';dialog.querySelector('.choices').insertAdjacentHTML('beforebegin','<p class="note">Dを選べない理由：'+esc(reason)+'</p>');}
 dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
  const v=b.dataset.choice,fix=true,patches=[[d,v]],clearTail=c==='D'&&v!=='D',requiredHere=E.requiredNightShift(state,current,p,d);
  if(requiredHere&&v!==requiredHere)return toast(`前日までの夜勤により、この日は${requiredHere}が必要です。`);
  if(v==='F'){const eligibility=E.paidLeaveEligibility(p,E.iso(current,d));if(!eligibility.allowed)return toast(eligibility.reason);}
  if(v==='D'){
   if(!p.night)return toast(`${p.name}は夜勤不可のため、Dを担当できません。`);
   for(const[offset,required]of E.nightSequence.entries()){const conflict=E.requiredShiftConflict(state,current,p,d+offset,required);if(conflict)return toast(conflict+'。D→d→Eの3日間を同じ職員で確保できません。');if(offset&&d+offset<=n())patches.push([d+offset,required]);}
   const positions=E.nightSequence.map((_,offset)=>shiftedScheduleDate(current,d,offset)),issue=incomingShiftIssue(p,positions,E.nightSequence);if(issue)return toast(issue);
  }
   if(['C','D'].includes(v)&&v!==c){const limit=v==='C'?2:1,others=state.members.filter(person=>person.id!==id&&E.active(person,current,d)&&mo().schedule[k(person.id,d)]===v).length;if(others>=limit)return toast(`${d}日の${v}はすでに${limit}人です。別の職員の勤務を調整してください。`);}
  const limitIssue=v==='D'?targetLimitForPositions(p,E.nightSequence.map((_,offset)=>shiftedScheduleDate(current,d,offset)),E.nightSequence):E.targetLimitIssue(state,current,p,patches);if(limitIssue)return toast(limitIssue);
     let preservedRequestedE=false;if(!change(()=>{const record=mo();for(const[day,code]of patches){record.schedule[k(id,day)]=code;if(fix)record.locks[k(id,day)]=true;else delete record.locks[k(id,day)];}if(clearTail)preservedRequestedE=clearNightSequenceTail(id,current,d).preservedRequestedE;}))return;close();toast(clearTail?preservedRequestedE?'勤務を変更し、続くdを空欄にしました。希望休のEは残しました。':'勤務を変更し、続くd・Eを空欄にしました。':'勤務を変更しました');
 });
    $('#unlock').onclick=()=>{if(change(()=>mo().locks[cell]?delete mo().locks[cell]:mo().locks[cell]=true))close();};
    const emptyCell=()=>{const required=E.requiredNightShift(state,current,p,d);if(required)return toast(`前日までの夜勤により、この日は${required}が必要です。`);const clearTail=c==='D';let preservedRequestedE=false;if(!change(()=>{const record=mo();record.schedule[cell]='';record.locks[cell]=true;if(clearTail)preservedRequestedE=clearNightSequenceTail(id,current,d).preservedRequestedE;}))return;close();toast(clearTail?preservedRequestedE?'Dと続くdを空欄にしました。希望休のEは残しました。':'Dと続くd・Eを空欄にしました。':'勤務を空欄にしました。');};
  $('#empty-cell').onclick=emptyCell;dialog.querySelector('[data-empty-choice]').onclick=emptyCell;
    $('#swap').onclick=()=>{const other=$('#swap-person').value;if(!other)return toast('交換相手を選んでください');const otherPerson=state.members.find(x=>x.id===other),q=k(other,d),record=mo(),mine=record.schedule[cell]||'',theirs=record.schedule[q]||'',mineRequired=E.requiredNightShift(state,current,p,d),otherRequired=E.requiredNightShift(state,current,otherPerson,d);if(mine==='D'||theirs==='D'){if(swapNightSequence(p,otherPerson,d))return;}if(mine==='d'||theirs==='d'||mineRequired||otherRequired)return toast('dまたは夜勤セットのEだけを途中交代することはできません。Dの日から3日間まとめて交代してください。');if(record.locks[q])return toast('交換相手の勤務は固定されています。先に解除してください。');if(!E.memberShiftAllowed(p,theirs)||!E.memberShiftAllowed(otherPerson,mine))return toast('雇用区分・I勤務・夜勤条件に合わないため交換できません。');if(theirs==='F'&&!E.paidLeaveEligibility(p,E.iso(current,d)).allowed||mine==='F'&&!E.paidLeaveEligibility(otherPerson,E.iso(current,d)).allowed)return toast('有給を利用できない職員が含まれるため交換できません。');const limitIssue=E.targetLimitIssue(state,current,p,[[d,theirs]])||E.targetLimitIssue(state,current,otherPerson,[[d,mine]]);if(limitIssue)return toast(limitIssue);if(!change(()=>{const latest=mo();[latest.schedule[cell],latest.schedule[q]]=[theirs,mine];latest.locks[cell]=true;latest.locks[q]=true;}))return;close();toast('勤務を交換しました。要確認の項目を確認してください。');};
}
