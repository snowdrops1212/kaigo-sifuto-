'use strict';
// Facility conditions, staff management, and per-person scheduling rules.
function staffConditionsPrompt(){
  const m=mo(),days=range(),lines=['【最優先：職員一人ひとりの勤務条件／'+current+'】','この内容は職員入力欄・今月の時間目安から自動生成する。職員を保存したら最新の情報を読み直す。','管理者・看護職員（看護師）は夜勤D・dを担当しない。職員の夜勤設定が「可能」でも割り当てない。','夜勤のみのパートは月3回を基本とし、必要な場合だけ4回目を案に入れて「本人確認が必要」と表示する。5回以上は設定しない。','正社員の勤務時間下限：30日の月は21日×8時間＝168時間以上、31日の月は22日×8時間＝176時間以上。休日Eは夜勤セットのEを含めて9日ちょうど。','I勤務パートの勤務時間上限：31日の月は22日×7時間＝154時間以内、30日の月は21日×7時間＝147時間以内。ちょうどは可。より低い個別設定は優先する。','対象月に在籍する職員は勤務限定・夜勤可否・時間上限・有給可否を優先し、矛盾や自動判定できない重要メモがあれば作成を止める。'];
 for(const p of state.members){
  const personal=E.memberConditions(p),errors=E.memberConditionErrors(p,personal),activeDays=days.filter(d=>E.active(p,current,d)),paidDays=activeDays.filter(d=>E.paidLeaveEligibility(p,E.iso(current,d)).allowed);
  const paid=!activeDays.length?'今月の在籍日なし':paidDays.length===activeDays.length?'今月の在籍日すべてで利用可':paidDays.length?paidDays[0]+'日から利用可':E.paidLeaveEligibility(p,E.iso(current,activeDays.at(-1))).reason;
  const applied=[...(personal.onlyShifts.length?['勤務を'+personal.onlyShifts.join('・')+'のみに限定']:[]),...(personal.nightOnly?['夜勤専門']:[]),...(personal.gAllowed?['G勤務が可能（残り6〜7時間でG候補）']:[])];
   lines.push('',`■ ${p.name}（ID: ${p.id}）`,`氏名：${p.name}／職種：${p.role}／雇用区分：${p.employmentType==='part'?'パート':'正社員'}`,`勤務限定欄：${p.allowedShift?E.parseAllowedShift(p.allowedShift).value+'のみ':'指定なし'}／I勤務：${p.usesI?'使用する':'使用しない'}`,`個別メモ・勤務条件：${p.memberPrompt?.trim()||'なし'}`,`自動適用：${applied.join('／')||'追加なし'}`,`夜勤：${E.nightEligible(p)?E.nightOnlyPartTimer(p)?'可能（月3回基本、4回目要確認）':'可能（回数の上限なし）':'不可'+(E.nightRoleForbidden(p)?'（職種による）':'')}`,`今月の勤務時間目安：${E.effectiveTarget(p,m,current)}時間${E.targetModeLabel(p)}（${p.employmentType==='full'&&E.fullTimeMonthlyHours(n())!==null?'正社員の月別基準':p.usesI?'I勤務の月別上限またはより低い設定':Object.hasOwn(m.targets,p.id)?'今月の設定':p.target?'職員設定':'休日目安から自動計算'}${E.effectiveTarget(p,m,current)!==E.target(p,m,n())?'／通常'+E.target(p,m,n())+'時間・夜勤4回目は本人確認':''}）`,`有給：${paid}（入職日から6か月で判定。残日数は含まない）`,`入職日：${p.start||'未設定'}／最終勤務日：${p.end||'未設定'}／勤務できる曜日：${p.weekdays.map(w=>'日月火水木金土'[w]).join('・')||'なし'}`);
   if(p.employmentType==='full'||p.usesI)lines.push('休日E：月9日ちょうど（D→d→Eの最後のEを含む。有給F・空欄は含まない）。未達の途中案は赤く警告し、完成扱いにしない。');
   if(E.nightOnlyPartTimer(p))lines.push('夜勤のみパート：Dは月3回が基本。4回目は必要なら提案し、本人への確認が必要と表示する。5回以上は不可。');
  if(personal.notes.length)lines.push('未対応の重要メモあり：自動作成を停止して確認（'+personal.notes.join('／')+'）');
  if(errors.length)lines.push('勤務条件の矛盾あり：'+errors.join('／'));
 }
 if(!state.members.length)lines.push('職員が未登録です。先に職員を追加してください。');
 return lines.join('\n');
}
function staffPromptMarkup(){return '<section class="panel staff-prompt-block" id="staff-conditions-section"><div class="panel-head"><div><h2>職員の条件</h2><p class="desc">職員タブで編集した内容を、対象月の条件として自動でまとめます。</p></div><button type="button" id="planning-edit-staff">職員を編集</button></div><label class="field" for="staff-conditions-prompt">職員の条件プロンプト（'+esc(current)+'）</label><textarea id="staff-conditions-prompt" class="staff-conditions-prompt" readonly spellcheck="false" rows="14">'+esc(staffConditionsPrompt())+'</textarea><p class="subtle">職員の保存・削除、今月の時間目安、対象月の変更後に自動更新します。自動作成は文章のコピーではなく、元の職員設定を直接参照します。</p></section>';}
function renderPlanning(){
 const steps=ShiftConditions.planningOrder.split('\n').slice(1).map(line=>line.replace(/^\d+\.\s*/,''));
 content.innerHTML='<section class="panel planning-guide"><div class="panel-head"><div><p class="eyebrow">SHIFT PLANNING GUIDE</p><h2>シフトを組む順番</h2><p class="desc">毎月、この順番を最優先の手順として確認します。</p></div></div><ol class="planning-steps">'+steps.map(step=>'<li><span class="planning-step-text">'+esc(step)+'</span><small>自動作成に反映済み</small></li>').join('')+'</ol><div class="toolbar"><button type="button" class="primary" id="planning-to-schedule">シフト画面に戻る</button></div></section>'+monthlyConditionsPanel()+staffPromptMarkup()+conditionPanel()+'<section class="panel planning-guide"><h2>追加のコツ・申し送り</h2><p class="desc">月をまたいで残したい作り方を記録できます。ブラウザと「データを保存」のファイルに保存されます。</p><label class="field" for="planning-guide-notes">作成時に確認するメモ</label><textarea id="planning-guide-notes" maxlength="5000" rows="8" aria-describedby="planning-guide-help">'+esc(state.planningGuideNotes)+'</textarea><p class="subtle" id="planning-guide-help">この自由記述は保存・表示されますが、自動作成にはまだ適用されません。必ず守る新しい規則は、職員タブや今月の作成条件に設定してください。</p><button type="button" class="primary" id="save-planning-guide">コツを保存</button></section>';
 bindMonthlyConditions();bindConditionPanel();
 $('#planning-to-schedule').onclick=()=>{tab='schedule';render();};
 $('#planning-edit-staff').onclick=()=>{tab='members';render();};
 const save=()=>{const notes=$('#planning-guide-notes').value;if(notes===state.planningGuideNotes)return;if(change(()=>{state.planningGuideNotes=notes;}))toast('組むコツを保存しました');};
 $('#planning-guide-notes').onchange=save;$('#save-planning-guide').onclick=save;
}
function conditionPanel(){
 const m=mo(),createdPrompt=m.conditionPrompt===undefined;if(createdPrompt){m.conditionPrompt=ShiftConditions.withFacilityRules(ShiftConditions.template(m.rules));m.appliedConditionPrompt=m.conditionPrompt;}
 const oldPrompt=m.conditionPrompt,oldApplied=m.appliedConditionPrompt;
  m.conditionPrompt=ShiftConditions.withFullTimeHours(ShiftConditions.withoutImageObservations(ShiftConditions.withAbsoluteRules(ShiftConditions.withPlanningOrder(ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.conditionPrompt))))));
  if(typeof m.appliedConditionPrompt==='string')m.appliedConditionPrompt=ShiftConditions.withFullTimeHours(ShiftConditions.withoutImageObservations(ShiftConditions.withAbsoluteRules(ShiftConditions.withPlanningOrder(ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.appliedConditionPrompt))))));
   if(editorOwnsLock&&(createdPrompt||m.conditionPrompt!==oldPrompt||m.appliedConditionPrompt!==oldApplied)){
   if(!persistState()){
    m.conditionPrompt=oldPrompt;m.appliedConditionPrompt=oldApplied;
    if(!storageBlocked&&!storageNotice.startsWith('条件プロンプトの自動更新を保存できませんでした。'))storageNotice='条件プロンプトの自動更新を保存できませんでした。'+storageNotice;
   }
  }
 return '<section class="panel condition-panel"><div class="panel-head"><div><h2>条件プロンプト</h2><p class="desc">'+esc(current)+' の作成条件を確認・編集します。職員別の情報は上の「職員の条件」から自動連携されます。</p></div><div class="toolbar">'+undoBar()+'</div></div><label class="field" for="condition-prompt">この月の条件の文章</label><textarea id="condition-prompt" maxlength="20000" spellcheck="false" aria-describedby="condition-help">'+esc(m.conditionPrompt)+'</textarea><p id="condition-help" class="subtle">B・C・Dの人数は固定です。文章から変更できるのは連勤警告の目安・休日目安です。職員の条件は職員タブで編集してください。</p><div id="condition-preview" aria-live="polite"></div><div class="toolbar"><button id="apply-condition-prompt" class="primary">月の作成条件に反映</button><button id="condition-to-month">今月の作成条件を確認</button><button id="condition-copy">前月の文章をコピー</button></div><div class="meeting-condition"><label class="field" for="meeting-condition-prompt">会議日の条件（自動連携）</label><textarea id="meeting-condition-prompt" readonly rows="6" aria-describedby="meeting-condition-help">'+esc(meetingConditionText())+'</textarea><p id="meeting-condition-help" class="subtle">会議日の変更はシフト調整タブで行ってください。</p></div><details class="details"><summary>現在、自動作成で使う設定を確認する</summary><pre class="condition-snapshot">'+esc(conditionSnapshot())+'</pre></details></section>';
}
function conditionSnapshot(){
  const m=mo(),standard=E.fullTimeMonthlyHours(n()),lines=[current+' の現在の有効設定',ShiftConditions.settings(m.rules),'正社員の勤務時間下限：30日の月168時間以上／31日の月176時間以上（今月は'+(standard===null?'個別設定を確認':standard+'時間以上')+'）','I勤務パートの勤務時間上限：30日の月147時間以内／31日の月154時間以内（今月の月別上限は'+E.partIHoursCap(n())+'時間、ちょうど可）','正社員とI勤務パートの休日E：月9日ちょうど（D→d→Eの最後のEを含む）'];
 lines.push('',meetingConditionText(),'','希望休・有給・出勤希望（出勤希望を優先し、他の日も出勤可）');
 for(const p of state.members){const req=range().filter(d=>m.requests[k(p.id,d)]).map(d=>{const request=m.requests[k(p.id,d)],shift=request==='W'?m.workRequests[k(p.id,d)]||'':'';return d+'日'+(request==='W'?'出勤希望'+(shift?'（'+shift+' '+E.shifts[shift].label+'）':''):request==='E'?'希':'有');});if(req.length)lines.push(p.name+'：'+req.join('、'));}
 lines.push('登録合計：'+Object.keys(m.requests).length+'日分','','固定勤務');
 for(const p of state.members){const fixed=range().filter(d=>m.locks[k(p.id,d)]).map(d=>d+'日'+(m.schedule[k(p.id,d)]||'空欄'));if(fixed.length)lines.push(p.name+'：'+fixed.join('、'));}
 lines.push('','保存済みの日別設定（入力欄は非表示。B・C・Dの旧人数は適用しない）');
 for(const [day,values]of Object.entries(m.daily))lines.push(day+'日：'+Object.entries(values).map(([c,v])=>c+' '+v+'人'+(['B','C','D'].includes(c)?'（旧設定・適用しない）':'')).join('、'));
 lines.push('','保存済みの利用者予定（入力欄は非表示。必要職員数への自動換算なし）');
 for(const u of state.users)lines.push(u.name+'／'+u.type+'／'+u.weekdays.map(w=>'日月火水木金土'[w]).join('・')+'／'+(u.start||'指定なし')+'〜'+(u.end||'指定なし'));
 if(!state.users.length)lines.push('未登録');
 return lines.join('\n');
}
function updateConditionPreview(){
 const m=mo(),parsed=ShiftConditions.parse(m.conditionPrompt),pending=m.conditionPrompt!==m.appliedConditionPrompt;
  $('#condition-preview').innerHTML='<p><strong>'+(pending?'文章を変更済み・まだ反映していません':'反映確認済み')+'</strong></p>'+(parsed.errors.length?'<p class="form-error">'+parsed.errors.map(esc).join('<br>')+'</p>':'<p>反映予定：'+ShiftConditions.fields.map(([key,label])=>key==='B'?'Bの人数 <strong>制限なし（固定）</strong>':key==='C'?'Cの人数 <strong>2人（固定）</strong>':key==='D'?'Dの人数 <strong>1人（固定）</strong>':esc(label)+' '+m.rules[key]+' → <strong>'+parsed.rules[key]+'</strong>').join(' ／ ')+'</p><p class="subtle">【追加の条件（自動適用する）】に記載された施設ルールは自動作成で適用します。日別の必要人数、個別の勤務時間・勤務曜日・希望休・固定セルはこのボタンで変更しません。</p>');
 $('#apply-condition-prompt').disabled=parsed.errors.length>0;
}
function bindConditionPanel(){
 let recorded=false;const input=$('#condition-prompt');
 input.onfocus=()=>{recorded=false;};
  input.oninput=()=>{
   const before=E.copy(state),wasDirty=dirty,previous=mo().conditionPrompt;
   mo().conditionPrompt=input.value;
   if(!persistState()){
    state=before;dirty=wasDirty;input.value=previous||'';
    toast('条件プロンプトを保存できませんでした。'+storageNotice);
    return;
   }
   if(!recorded){undo.push(before);if(undo.length>40)undo.shift();redo=[];recorded=true;}
   dirty=true;updateConditionPreview();$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;
  };
 $('#apply-condition-prompt').onclick=()=>{const parsed=ShiftConditions.parse(mo().conditionPrompt);if(parsed.errors.length)return;change(()=>{Object.assign(mo().rules,parsed.rules);mo().appliedConditionPrompt=mo().conditionPrompt;});toast('B制限なし・C2人・D1人と、連勤警告の目安・休日の設定を反映しました。シフトの再作成は別途実行してください。');};
 $('#condition-to-month').onclick=()=>{$('#monthly-conditions').scrollIntoView({block:'start',behavior:'smooth'});$('#generate').focus({preventScroll:true});};
 $('#condition-copy').disabled=typeof state.months[E.prevMonth(current)]?.conditionPrompt!=='string';
 $('#condition-copy').onclick=()=>ask('前月の条件文章をコピーしますか？','この月の文章を置き換えます。設定への反映は、内容を確認してから行ってください。',()=>{change(()=>mo().conditionPrompt=state.months[E.prevMonth(current)].conditionPrompt);});
 updateConditionPreview();
}

 function memberSummary(p){const limit=E.memberConditions(p).onlyShifts;return p.role+' / '+employmentLabel(p)+(limit.length?' / 勤務 '+limit.join('・')+'のみ':'')+(p.usesI?' / I勤務・今月'+E.target(p,mo(),n())+'時間以内・休日E合計9日ちょうど':'')+' / '+(E.nightEligible(p)?E.nightOnlyPartTimer(p)?'夜勤3回基本・4回目は要確認':'夜勤可能・回数上限なし':'夜勤なし')+' / 在籍 '+(p.start||'開始日指定なし')+(p.end?'〜'+p.end:'');}
function memberPromptSummary(text){return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join(' / ');}
function renderMembers(){content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>職員 ${state.members.length}人</h2><p class="desc">ここで職員の情報・勤務条件を追加、編集します。保存した内容は「組む順番・条件プロンプト」の「職員の条件」に反映されます。</p></div><div class="toolbar">${undoBar()}<button class="primary" id="add-member">職員を追加</button></div></div><div class="member-list">${state.members.map(p=>{const promptSummary=memberPromptSummary(p.memberPrompt);return `<div class="member-card"><div class="member-card-main"><p class="member-card-name">${esc(p.name)}</p><span class="subtle member-card-summary">${esc(memberSummary(p))}</span>${promptSummary?'<details class="member-note"><summary>個別メモ・勤務条件：<span class="member-note-value" title="'+esc(promptSummary)+'">'+esc(promptSummary)+'</span></summary><p class="personal-note">'+esc(p.memberPrompt)+'</p></details>':''}</div><div class="member-actions"><button type="button" data-member="${p.id}" aria-label="${esc(p.name)}を編集">編集</button><button type="button" class="danger" data-delete-member="${p.id}" aria-label="${esc(p.name)}を削除">削除</button></div></div>`;}).join('')||'<p class="subtle">職員は未登録です。「職員を追加」から登録してください。</p>'}</div><p class="subtle">同じ職員の氏名や条件の変更は「編集」から行ってください。退職者の履歴を残す場合は、削除せず最終勤務日を設定します。</p><button type="button" id="members-to-planning">職員の条件プロンプトを見る</button></section>`;$('#add-member').onclick=()=>memberForm();$('#members-to-planning').onclick=()=>{tab='planning';render();$('#staff-conditions-section')?.scrollIntoView({block:'start',behavior:'smooth'});};document.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>memberForm(b.dataset.member));document.querySelectorAll('[data-delete-member]').forEach(b=>b.onclick=()=>confirmMemberDelete(b.dataset.deleteMember));}
function confirmMemberDelete(id){
 const info=E.memberRemovalSummary(state,id);if(!info)return toast('対象の職員が見つかりません。');
  const text=info.person.name+'を削除します。全月のこの職員の希望休・有給・出勤希望 '+info.requests+'件、勤務セル '+info.schedule+'件、固定 '+info.locks+'件、個別設定 '+info.settings+'件（'+info.months+'か月分）も削除し、有給の年間集計からも外します。ほかの職員・会議日・月の条件は残します。この職員専用の個別メモは削除します。月の条件文に書いた名前やメモは自動では消しません。履歴を残したい退職者は、削除せず最終勤務日を設定してください。削除前にデータを保存することをおすすめします。削除直後は「元に戻す」で復元できます。'+(info.person.role==='管理者'?' 管理者がいなくなると会議日の条件を満たせなくなるため、必要に応じて新しい管理者を登録してください。':'');
 ask('この職員を削除しますか？',text,()=>{
  if(!state.members.some(p=>p.id===id))return toast('対象の職員はすでに削除されています。');
  if(!change(()=>{E.removeMember(state,id);if(requestPerson===id)requestPerson='';},true))return;
  toast(info.person.name+'を削除しました。直後なら「元に戻す」で復元できます。');
 });
 $('#yes').textContent='この職員を削除';$('#yes').className='danger';$('#no').focus();
}

function personalConditionPreview(text,night,person={}){
 const member={...person,memberPrompt:text,night},parsed=E.memberConditions(member),errors=E.memberConditionErrors(member,parsed),lines=[];
 if(parsed.onlyShifts.length)lines.push('必須条件：勤務を「'+parsed.onlyShifts.join('・')+'」だけに限定します。休日E・有給Fは利用できます。自動作成・手動変更・出勤希望のすべてで指定外の勤務を禁止します。');
  if(parsed.nightOnly)lines.push('夜勤専門：D・dのみ勤務。休日E・有給Fは利用できます。勤務可能曜日は引き続き守ります。');
  if(E.nightOnlyPartTimer(member,parsed))lines.push('夜勤のみパート：月3回を基本とし、4回目は本人への確認が必要な案として提案します。5回以上は不可です。');
 if(parsed.gAllowed)lines.push('G勤務が可能：'+(parsed.onlyShifts.length?'限定勤務の条件を優先します。':'B・Cも候補です。月の時間目安まで残り6〜7時間の場合はG（6時間）を自動割当の候補にします。G専任の指定ではありません。'));
 if(!lines.length)lines.push('追加の自動割当条件はありません。');
 return '<strong>自動作成に反映する内容</strong><p>'+lines.map(esc).join('<br>')+'</p>'+
 (errors.length?'<p class="form-error">'+errors.map(esc).join('<br>')+'</p>':'')+
 (parsed.notes.length?'<p class="form-error"><strong>要確認：</strong>次の文章は自動判定できません。見落としを防ぐため、この職員への勤務割当と自動作成を停止します。勤務限定欄だけでは解除されません。内容を明確な条件に直してから保存してください。</p><pre class="personal-note">'+esc(parsed.notes.join('\n'))+'</pre>':'');
}
function shiftLimitControl(p){
  const current=E.parseAllowedShift(p.allowedShift||'').value,saved=[...new Set([...(state.customShiftLimits||[]),...state.members.map(person=>E.parseAllowedShift(person.allowedShift||'').value)])].filter(value=>value&&!['B','C','G'].includes(value)&&!E.parseAllowedShift(value).codes.includes('d'));
 const known=!current||['B','C','G',...saved].includes(current),selected=known?current:'__custom__';
 return '<label class="field">勤務限定（必ず守る）<select name="allowedShift" id="allowed-shift">'+options([['','指定なし'],['B','Bのみ'],['C','Cのみ'],['G','Gのみ'],...saved.map(value=>[value,value+'のみ']),['__custom__','手入力']],selected)+'</select><span id="custom-allowed-shift-field" '+(selected==='__custom__'?'':'hidden')+'><input id="custom-allowed-shift" name="customAllowedShift" type="text" maxlength="100" placeholder="例：B・Cのみ、Jのみ" value="'+(selected==='__custom__'?esc(p.allowedShift||''):'')+'"></span><small>B・C・G以外も手入力できます。保存した条件は次回から選択肢に残り、指定外の勤務を入れません。</small></label>';
}
function memberPromptFields(p){
 return '<section class="full personal-conditions">'+shiftLimitControl(p)+'<label class="field full" for="member-prompt">個別メモ・勤務条件（この職員専用・必ず確認）<textarea id="member-prompt" name="memberPrompt" rows="4" maxlength="2000" aria-describedby="member-prompt-help" placeholder="例：Gのみ勤務可能">'+esc(p.memberPrompt||'')+'</textarea></label><div class="toolbar"><button type="button" data-personal-example="Gのみ勤務可能">Gのみ勤務を入力</button><button type="button" data-personal-example="G勤務：可能">G勤務が可能を入力</button><button type="button" data-personal-example="勤務区分：夜勤専門">夜勤専門を入力</button></div><p id="member-prompt-help" class="subtle">1行に1条件、2,000文字まで。「Bのみ」「Gのみ」「B・Cのみ勤務可能」のような限定は必須条件として全月へ適用します。自動判定できない文章がある場合は、重要事項を無視しないよう自動作成を停止します。保存すると、作成済みシフトにある条件外の勤務は空白へ戻します。</p><div id="member-prompt-preview" role="status" aria-live="polite">'+personalConditionPreview(p.memberPrompt||'',p.night,p)+'</div></section>';
}
function bindMemberPrompt(){
 const input=$('#member-prompt'),night=$('#person-form select[name="night"]'),limit=$('#allowed-shift'),custom=$('#custom-allowed-shift'),customField=$('#custom-allowed-shift-field'),name=$('#person-form input[name="name"]');
 const refresh=()=>{const manual=limit.value==='__custom__';customField.hidden=!manual;custom.required=manual;$('#member-prompt-preview').innerHTML=personalConditionPreview(input.value,night.value==='yes',{name:name.value,allowedShift:manual?custom.value:limit.value});};
 input.oninput=refresh;night.onchange=refresh;limit.onchange=refresh;custom.oninput=refresh;name.oninput=refresh;refresh();
 dialog.querySelectorAll('[data-personal-example]').forEach(button=>button.onclick=()=>{
  const line=button.dataset.personalExample;
  if(!input.value.split(/\r?\n/).some(x=>x.trim()===line)){
   const next=(input.value.trimEnd()?input.value.trimEnd()+'\n':'')+line;
   if(next.length>2000)return toast('個別メモは2,000文字以内で入力してください。');
   input.value=next;
  }refresh();input.focus();
 });
}
function paidLeavePreview(start){
 const period=E.paidLeavePeriod({start},E.iso(current,E.days(current)));
 if(period.status==='missingStart')return '<strong>有給期間（自動計算）</strong><span>入職日を入力すると、初回利用開始日と1年間の対象期間を表示します。</span>';
 if(period.status==='invalidStart')return '<strong>有給期間（自動計算）</strong><span class="form-error">正しい入職日を入力してください。</span>';
 const first='初回利用開始：'+period.firstStart+'（入職日の6か月後）';
 const cycle=period.status==='notStarted'
  ?'入職から6か月間は利用できません。初回対象期間：'+period.start+'〜'+period.end
  :'表示月に適用される対象期間：'+period.start+'〜'+period.end;
 return '<strong>有給期間（自動計算）</strong><span>'+esc(first)+'</span><span>'+esc(cycle)+'</span>';
}
function bindPaidLeavePreview(){
 const input=$('#person-form input[name="start"]'),preview=$('#paid-leave-preview');
 if(!input||!preview)return;
 const refresh=()=>{preview.innerHTML=paidLeavePreview(input.value);};
 input.oninput=refresh;input.onchange=refresh;refresh();
}
function employmentLabel(p){return p.employmentType==='part'?'パート':'正社員';}
function roleControl(p){const saved=[...new Set([...(state.customRoles||[]),...state.members.map(person=>person.role)])].filter(role=>role&&!E.roles.includes(role)),known=E.roles.includes(p.role)||saved.includes(p.role);return {selected:known?p.role:'__custom__',choices:[...E.roles.map(role=>[role,role]),...saved.map(role=>[role,role]),['__custom__','手書き']]};}
function bindRoleControl(p){const select=$('#person-form select[name="role"]');if(!select)return;const control=roleControl(p);select.innerHTML=options(control.choices,control.selected);select.value=control.selected;select.setAttribute('aria-describedby','role-help');select.insertAdjacentHTML('afterend',`<span id="custom-role-field" ${control.selected==='__custom__'?'':'hidden'}><input id="custom-role" name="customRole" type="text" maxlength="50" placeholder="職種名を入力" value="${control.selected==='__custom__'?esc(p.role):''}"></span><small id="role-help">「手書き」で追加した職種は保存され、次回から選択肢に残ります。</small>`);const field=$('#custom-role-field'),input=$('#custom-role');if(!field||!input)return;const refresh=()=>{const custom=select.value==='__custom__';field.hidden=!custom;input.required=custom;if(custom)input.focus({preventScroll:true});};select.onchange=refresh;refresh();}
function bindNightRoleControl(){const role=$('#person-form select[name="role"]'),custom=$('#custom-role'),night=$('#person-form select[name="night"]');if(!role||!night)return;night.insertAdjacentHTML('afterend','<small id="night-role-help"></small>');const refresh=()=>{const name=role.value==='__custom__'?custom?.value?.trim()||'':role.value,forbidden=E.nightRoleForbidden({role:name});if(forbidden)night.value='no';night.disabled=forbidden;const help=$('#night-role-help');if(help)help.textContent=forbidden?'管理者・看護職員（看護師）は夜勤を担当できません。':'';};const previous=role.onchange;role.onchange=()=>{previous?.();refresh();};if(custom)custom.oninput=refresh;refresh();}
 function targetModeControl(p){const mode=E.targetMode(p),full=p.employmentType==='full',value=full&&E.fullTimeMonthlyHours(n())!==null?E.target(p,mo(),n()):p.target;return `<div class="target-setting"><input aria-labelledby="target-label" name="target" type="number" required min="0" max="300" value="${value}" ${full?'readonly':''}><div class="target-mode-toggle" role="radiogroup" aria-labelledby="target-label" ${full||p.usesI?'hidden':''}><label><input type="radio" name="targetMode" value="min" ${mode==='min'?'checked':''}><span>以上</span></label><label><input type="radio" name="targetMode" value="max" ${mode==='max'?'checked':''}><span>以内</span></label></div>${p.usesI?`<small>I勤務の今月の上限は${E.partIHoursCap(n())}時間以内（ちょうど可）。入力した目安がこれより低ければ、低い方を適用します。</small>`:''}${E.nightOnlyPartTimer(p)&&mode==='max'?'<small>夜勤のみパートで目安が52時間ちょうどの場合、4回目の案では64時間以内を適用し、本人確認の警告を出します。52時間より低い個別上限は引き上げません。</small>':''}</div>`;}
function memberForm(id){editPerson(id,false);}
function showStaffHistory(){
 const entries=protectedStaff?.list()||[];
 dialog.innerHTML='<div class="dialog-head"><h2>職員情報の履歴</h2><button class="close" aria-label="閉じる">×</button></div><p>氏名・勤務条件を保存するたびに履歴を残します。復元前の情報も履歴に残ります。</p>'+entries.map((entry,i)=>'<section class="panel"><strong>'+(entry.savedAt?esc(new Date(entry.savedAt).toLocaleString('ja-JP')):'旧版から保全した情報')+' ／ '+entry.staff.members.length+'人</strong><p>'+entry.staff.members.map(p=>esc(p.name)+(p.allowedShift?'／勤務限定：'+esc(E.parseAllowedShift(p.allowedShift).value)+'のみ':'')+(p.memberPrompt?'：'+esc(p.memberPrompt):'')).join('<br>')+'</p>'+(entry.staff.customShiftLimits?.length?'<p>保存した選択肢：'+entry.staff.customShiftLimits.map(value=>esc(value)+'のみ').join('、')+'</p>':'')+'<button data-restore-staff="'+i+'">この職員情報を復元</button></section>').join('');
 dialog.showModal();dialog.querySelector('.close').onclick=close;
 dialog.querySelectorAll('[data-restore-staff]').forEach(button=>button.onclick=()=>{const entry=entries[Number(button.dataset.restoreStaff)];ask('この職員情報を復元しますか？',entry.staff.members.length+'人の氏名・勤務条件へ戻します。現在の職員情報も履歴に残します。',()=>{if(change(()=>{state=mergeStoredStaff(state,checkedStaffSnapshot(JSON.stringify(entry.staff)));applyMemberConditions(state);},true)){close();toast('職員情報を履歴から復元しました');}});});
}
function editPerson(id,isUser){
 const editingStaffRevision=staffRevision;
 const list=isUser?state.users:state.members;
  const p=E.copy(list.find(x=>x.id===id)||{id:(isUser?'u':'s')+crypto.randomUUID(),name:'',role:'介護職員',type:'通い',employmentType:'full',usesI:false,night:false,target:0,targetMode:'min',weekdays:[0,1,2,3,4,5,6],start:'',end:''});
 dialog.innerHTML=`<div class="dialog-head"><h2>${isUser?'利用予定':'職員'}を${id?'変更':'追加'}</h2><button class="close" aria-label="閉じる">×</button></div><form id="person-form"><div class="form-grid"><label class="field full">${isUser?'利用者名または管理番号':'氏名'}<input name="name" required maxlength="50" value="${esc(p.name)}"></label>${isUser?`<label class="field">サービス<select name="type">${options(['通い','泊まり','訪問'].map(x=>[x,x]),p.type)}</select></label><div></div>`:`<label class="field">職種<select name="role">${options(['介護職員','看護職員','管理者','計画作成担当者'].map(x=>[x,x]),p.role)}</select></label><label class="field">雇用区分<select name="employmentType">${options([['full','正社員'],['part','パート']],p.employmentType||'full')}</select><small>管理者は正社員で登録します。</small></label><label class="field">夜勤<select name="night">${options([['yes','可能'],['no','不可']],p.night?'yes':'no')}</select></label><div class="field"><span id="target-label">月の勤務時間目安</span>${targetModeControl(p)}<small>「以上」は設定時間を超えても出勤できます。「以内」は規定時間を超える勤務を入れられません。I勤務者は月9日休みを維持しながら入力でき、0の場合だけ自動計算します。</small></div>`}<label class="field">${isUser?'利用開始日':'入職日'}<input name="start" type="date" value="${esc(p.start)}">${isUser?'':'<small>有給は入職日の6か月後から利用できます。</small>'}</label>${isUser?'':'<div id="paid-leave-preview" class="paid-leave-preview full" role="status" aria-live="polite">'+paidLeavePreview(p.start)+'</div>'}<label class="field">${isUser?'利用終了日':'最終勤務日'}<input name="end" type="date" value="${esc(p.end)}"></label><div class="full">${isUser?'利用する':'勤務できる'}曜日<div class="weekday-picks">${[...'日月火水木金土'].map((w,i)=>`<label><input type="checkbox" name="weekdays" value="${i}" ${p.weekdays.includes(i)?'checked':''}>${w}</label>`).join('')}</div>${isUser?'':'<small>Dの日と翌日のdは両日とも勤務できる曜日が必要です。翌々日のEまで同じ職員で3日連続にします。</small>'}</div>${isUser?'':memberPromptFields(p)}</div><p id="form-error" class="form-error"></p><div class="dialog-bottom"><button type="button" class="cancel">キャンセル</button><button class="primary" type="submit">保存</button></div></form>`;
    if(!isUser)dialog.innerHTML=dialog.innerHTML.replace('I勤務者は月9日休みを維持しながら入力でき、0の場合だけ自動計算します。','I勤務パートは31日の月154時間以内・30日の月147時間以内（ちょうど可）。入力した目安がより低ければ低い方を適用します。夜勤後のEも含む休日Eを月9日ちょうど確保します。9日以外なら表で赤く警告します。③人数調整では可能な勤務を途中案として反映し、完成扱いにはしません。正社員は30日の月168時間以上・31日の月176時間以上が必須で、超過勤務も可能です。正社員の時間欄は月別基準が優先されます。時間目安は0の場合だけ自動計算します。');
  dialog.showModal();
 dialog.querySelector('.close').onclick=close;
 dialog.querySelector('.cancel').onclick=close;
   if(!isUser){bindMemberPrompt();bindPaidLeavePreview();bindRoleControl(p);bindNightRoleControl();const employment=$('#person-form select[name="employmentType"]'),hours=$('#person-form input[name="target"]'),mode=$('#person-form .target-mode-toggle');employment.onchange=()=>{const full=employment.value==='full';hours.readOnly=full;mode.hidden=full||p.usesI;hours.value=full?E.fullTimeMonthlyHours(n())??p.target:p.target;};}
 $('#person-form').onsubmit=e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  if(f.get('start')&&f.get('end')&&f.get('start')>f.get('end')){$('#form-error').textContent='終了日は開始日以降にしてください。';return;}
  Object.assign(p,{name:String(f.get('name')).trim(),start:f.get('start'),end:f.get('end'),weekdays:f.getAll('weekdays').map(Number)});
  if(!p.name){$('#form-error').textContent='氏名を入力してください。';return;}
  if(isUser)p.type=f.get('type');
   else{const selectedRole=String(f.get('role')||''),role=(selectedRole==='__custom__'?String(f.get('customRole')||''):selectedRole).trim();if(!role||role.length>50){$('#form-error').textContent='手書きの職種名を1〜50文字で入力してください。';return;}const shiftChoice=String(f.get('allowedShift')||''),shiftLimit=E.parseAllowedShift(shiftChoice==='__custom__'?String(f.get('customAllowedShift')||''):shiftChoice);if(shiftLimit.error||shiftChoice==='__custom__'&&!shiftLimit.value){$('#form-error').textContent=shiftLimit.error||'手入力する勤務記号を入力してください。';return;}Object.assign(p,{role,employmentType:f.get('employmentType'),usesI:p.usesI,night:f.get('night')==='yes'&&!E.nightRoleForbidden({role}),target:f.get('employmentType')==='full'?p.target:+f.get('target'),targetMode:f.get('employmentType')==='full'?'min':p.usesI?'max':f.get('targetMode')==='min'?'min':'max',allowedShift:shiftLimit.value,memberPrompt:String(f.get('memberPrompt')||'')});}
  if(!isUser){const errors=E.memberConditionErrors(p);if(errors.length){$('#form-error').textContent=errors.join(' ');return;}}
  let cleared=0;if(!change(()=>{const targetList=isUser?state.users:state.members;if(!isUser&&!E.roles.includes(p.role)&&!state.customRoles.includes(p.role))state.customRoles.push(p.role);if(!isUser&&p.allowedShift&&!['B','C','G'].includes(p.allowedShift)&&!state.customShiftLimits.includes(p.allowedShift))state.customShiftLimits.push(p.allowedShift);if(!isUser&&id)cleared=E.clearMemberConditionConflicts(state,p);if(id)targetList[targetList.findIndex(x=>x.id===id)]=p;else targetList.push(p);},!isUser,editingStaffRevision))return;
  close();toast(cleared?'保存しました。条件外の勤務を'+cleared+'件、空白にしました。':'保存しました');
 };
}
