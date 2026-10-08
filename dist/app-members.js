'use strict';
// Facility conditions, staff management, and per-person scheduling rules.
function conditionPanel(){
 const m=mo();if(m.conditionPrompt===undefined){m.conditionPrompt=ShiftConditions.withFacilityRules(ShiftConditions.template(m.rules));m.appliedConditionPrompt=m.conditionPrompt;}
 m.conditionPrompt=ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.conditionPrompt));if(typeof m.appliedConditionPrompt==='string')m.appliedConditionPrompt=ShiftConditions.withStaffingRules(ShiftConditions.withFacilityRules(m.appliedConditionPrompt));
 return '<section class="panel condition-panel"><div class="panel-head"><div><h2>シフトを組む条件・プロンプト</h2><p class="desc">'+esc(current)+' の条件です。画像の規則と現在の作成方法を入れています。</p></div><div class="toolbar">'+undoBar()+'</div></div><div class="note">Aは使用しません。Bは人数制限なし、Cは毎日ちょうど2人、Dは毎日ちょうど1人で固定です。文章から変更できるのは連勤上限・休日目安です。I勤務は職員情報で指定したパートだけに割り当て、月9日の休日Eを確保します。</div><div class="meeting-condition"><label class="field" for="meeting-condition-prompt">会議日の条件（登録欄と自動連携）</label><textarea id="meeting-condition-prompt" readonly rows="6" aria-describedby="meeting-condition-help">'+esc(meetingConditionText())+'</textarea><p id="meeting-condition-help" class="subtle">この条件は自動で適用します。会議日の変更はシフト調整ページの会議日欄で行ってください。</p></div><div class="note"><strong>施設の追加条件：正社員は月176時間以上／夜勤セットのEとは別に月9日のE</strong><p>「以上」の職員は176時間などの設定時間を超えても出勤できます。「以内」の職員は規定時間までに抑え、設定時間を超える勤務は自動作成・手動変更・勤務交代のいずれでも設定できません。正社員を176時間以上にする場合は、その職員の目安を176・以上に設定してください。夜勤セットとは別の月9日休みは確認が必要です（I勤務者は自動反映）。</p></div><label class="field" for="condition-prompt">条件の文章（この月用）</label><textarea id="condition-prompt" maxlength="20000" spellcheck="false" aria-describedby="condition-help">'+esc(m.conditionPrompt)+'</textarea><p id="condition-help" class="subtle">B・C・Dの人数は固定です。連勤上限・休日目安を数値＋日で編集してください。内容は「データを保存」のファイルにも含まれます。</p><div id="condition-preview" aria-live="polite"></div><div class="toolbar"><button id="apply-condition-prompt" class="primary">月の作成条件に反映</button><button id="condition-to-month">今月の作成条件を確認</button><button id="condition-copy">前月の文章をコピー</button></div><details class="details"><summary>現在、自動作成で使う設定を確認する</summary><pre class="condition-snapshot">'+esc(conditionSnapshot())+'</pre></details></section>';
}
function conditionSnapshot(){
 const m=mo(),lines=[current+' の現在の有効設定',ShiftConditions.settings(m.rules),'','職員ごとの条件（夜勤可否が優先。職種のみでは制限しません）'];
 for(const p of state.members)lines.push(p.name+'／'+p.role+'／'+(p.employmentType==='part'?'パート':'正社員')+(p.usesI?'・I勤務・月9日休':'')+'／'+(p.night?'夜勤可・月'+p.nightMax+'回まで':'夜勤不可')+'／勤務曜日：'+p.weekdays.map(w=>'日月火水木金土'[w]).join('・')+'／在籍：'+(p.start||'指定なし')+'〜'+(p.end||'指定なし')+'／今月の目安：'+E.target(p,m,n())+'時間'+E.targetModeLabel(p)+'／前月末：'+(E.prior(state,current,p)||'未指定'));
 lines.push('','職員専用の個別メモ・勤務条件（氏名・勤務限定欄・メモの指定を必須適用。未対応文がある場合は勤務を割り当てない）');
 for(const p of state.members){const parsed=E.memberConditions(p),applied=[...(parsed.onlyShifts.length?['勤務を'+parsed.onlyShifts.join('・')+'のみに限定']:[]),...(parsed.nightOnly?['夜勤専門']:[]),...(parsed.gAllowed?['G勤務が可能（残り6〜7時間でG候補）']:[])];if(!p.memberPrompt&&!p.allowedShift&&!applied.length)continue;lines.push(p.name+'：'+(p.memberPrompt||'個別メモなし')+(p.allowedShift?'／勤務限定欄：'+E.parseAllowedShift(p.allowedShift).value+'のみ':''));lines.push('自動適用：'+(applied.join('／')||'追加なし'));if(parsed.notes.length)lines.push('未対応の重要メモあり：自動作成を停止して確認');if(parsed.errors.length)lines.push('勤務条件の矛盾あり：'+parsed.errors.join('／'));}
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
 $('#condition-preview').innerHTML='<p><strong>'+(pending?'文章を変更済み・まだ反映していません':'反映確認済み')+'</strong></p>'+(parsed.errors.length?'<p class="form-error">'+parsed.errors.map(esc).join('<br>')+'</p>':'<p>反映予定：'+ShiftConditions.fields.map(([key,label])=>key==='B'?'Bの人数 <strong>制限なし（固定）</strong>':key==='C'?'Cの人数 <strong>2人（固定）</strong>':key==='D'?'Dの人数 <strong>1人（固定）</strong>':esc(label)+' '+m.rules[key]+' → <strong>'+parsed.rules[key]+'</strong>').join(' ／ ')+'</p><p class="subtle">日別の必要人数、個別の勤務時間・勤務曜日・希望休・固定セルは変更しません。本文の参考情報や追加メモは自動適用しません。</p>');
 $('#apply-condition-prompt').disabled=parsed.errors.length>0;
}
function bindConditionPanel(){
 let recorded=false;const input=$('#condition-prompt');
 input.onfocus=()=>{recorded=false;};
 input.oninput=()=>{if(!recorded){undo.push(E.copy(state));if(undo.length>40)undo.shift();redo=[];recorded=true;}mo().conditionPrompt=input.value;dirty=true;persistState();updateConditionPreview();$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;};
 $('#apply-condition-prompt').onclick=()=>{const parsed=ShiftConditions.parse(mo().conditionPrompt);if(parsed.errors.length)return;change(()=>{Object.assign(mo().rules,parsed.rules);mo().appliedConditionPrompt=mo().conditionPrompt;});toast('B制限なし・C2人・D1人と、連勤・休日の設定を反映しました。シフトの再作成は別途実行してください。');};
 $('#condition-to-month').onclick=()=>{$('#monthly-conditions').scrollIntoView({block:'start',behavior:'smooth'});$('#generate').focus({preventScroll:true});};
 $('#condition-copy').disabled=typeof state.months[E.prevMonth(current)]?.conditionPrompt!=='string';
 $('#condition-copy').onclick=()=>ask('前月の条件文章をコピーしますか？','この月の文章を置き換えます。設定への反映は、内容を確認してから行ってください。',()=>{change(()=>mo().conditionPrompt=state.months[E.prevMonth(current)].conditionPrompt);});
 updateConditionPreview();
}

function memberSummary(p){const limit=E.memberConditions(p).onlyShifts;return p.role+' / '+employmentLabel(p)+(limit.length?' / 勤務 '+limit.join('・')+'のみ':'')+(p.usesI?' / I勤務・月9日休':'')+' / '+(p.night?'夜勤 月'+p.nightMax+'回まで':'夜勤なし')+' / 在籍 '+(p.start||'開始日指定なし')+(p.end?'〜'+p.end:'');}
function memberPromptSummary(text){return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join(' / ');}
function renderMembers(){content.innerHTML=`${monthlyConditionsPanel()}${conditionPanel()}<div class="panel"><div class="panel-head"><h2>職員 ${state.members.length}人</h2><button class="primary" id="add-member">職員を追加</button></div><p class="desc">サンプルは「編集」で実名・勤務条件に変更できます。不要な職員は「削除」で取り除けます。</p><div class="member-list">${state.members.map(p=>{const promptSummary=memberPromptSummary(p.memberPrompt);return `<div class="member-card"><div class="member-card-main"><p class="member-card-name">${esc(p.name)}</p><span class="subtle member-card-summary">${esc(memberSummary(p))}</span>${promptSummary?'<details class="member-note"><summary>個別メモ・勤務条件：<span class="member-note-value" title="'+esc(promptSummary)+'">'+esc(promptSummary)+'</span></summary><p class="personal-note">'+esc(p.memberPrompt)+'</p></details>':''}</div><div class="member-actions"><button type="button" data-member="${p.id}" aria-label="${esc(p.name)}を編集">編集</button><button type="button" class="danger" data-delete-member="${p.id}" aria-label="${esc(p.name)}を削除">削除</button></div></div>`;}).join('')||'<p class="subtle">職員は未登録です。「職員を追加」から登録してください。</p>'}</div></div><div class="note">サンプルの氏名を編集すると、その職員の勤務条件・希望休・シフトは引き継がれます。実際に職員が入れ替わる場合は、新しい職員として追加してください。退職者の履歴を残す場合は、削除せず最終勤務日を設定します。編集・削除後は「データを保存」してください。</div>`;bindMonthlyConditions();bindConditionPanel();$('#add-member').onclick=()=>memberForm();document.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>memberForm(b.dataset.member));document.querySelectorAll('[data-delete-member]').forEach(b=>b.onclick=()=>confirmMemberDelete(b.dataset.deleteMember));}
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
 if(parsed.nightOnly)lines.push('夜勤専門：D・dのみ勤務。休日E・有給Fは利用できます。夜勤上限や勤務可能曜日は引き続き守ります。');
 if(parsed.gAllowed)lines.push('G勤務が可能：'+(parsed.onlyShifts.length?'限定勤務の条件を優先します。':'B・Cも候補です。月の時間目安まで残り6〜7時間の場合はG（6時間）を自動割当の候補にします。G専任の指定ではありません。'));
 if(!lines.length)lines.push('追加の自動割当条件はありません。');
 return '<strong>自動作成に反映する内容</strong><p>'+lines.map(esc).join('<br>')+'</p>'+
 (errors.length?'<p class="form-error">'+errors.map(esc).join('<br>')+'</p>':'')+
 (parsed.notes.length?'<p class="form-error"><strong>要確認：</strong>次の文章は自動判定できません。見落としを防ぐため、この職員への勤務割当と自動作成を停止します。勤務限定欄だけでは解除されません。内容を明確な条件に直してから保存してください。</p><pre class="personal-note">'+esc(parsed.notes.join('\n'))+'</pre>':'');
}
function shiftLimitControl(p){
 const current=E.parseAllowedShift(p.allowedShift||'').value,saved=[...new Set([...(state.customShiftLimits||[]),...state.members.map(person=>E.parseAllowedShift(person.allowedShift||'').value)])].filter(value=>value&&!['B','C','G'].includes(value));
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
function targetModeControl(p){const mode=E.targetMode(p);return `<div class="target-setting"><input aria-labelledby="target-label" name="target" type="number" required min="0" max="300" value="${p.target}"><div class="target-mode-toggle" role="radiogroup" aria-labelledby="target-label"><label><input type="radio" name="targetMode" value="min" ${mode==='min'?'checked':''}><span>以上</span></label><label><input type="radio" name="targetMode" value="max" ${mode==='max'?'checked':''}><span>以内</span></label></div></div>`;}
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
 const p=E.copy(list.find(x=>x.id===id)||{id:(isUser?'u':'s')+crypto.randomUUID(),name:'',role:'介護職員',type:'通い',employmentType:'full',usesI:false,night:false,nightMax:6,target:0,targetMode:'max',weekdays:[0,1,2,3,4,5,6],start:'',end:''});
 dialog.innerHTML=`<div class="dialog-head"><h2>${isUser?'利用予定':'職員'}を${id?'変更':'追加'}</h2><button class="close" aria-label="閉じる">×</button></div><form id="person-form"><div class="form-grid"><label class="field full">${isUser?'利用者名または管理番号':'氏名'}<input name="name" required maxlength="50" value="${esc(p.name)}"></label>${isUser?`<label class="field">サービス<select name="type">${options(['通い','泊まり','訪問'].map(x=>[x,x]),p.type)}</select></label><div></div>`:`<label class="field">職種<select name="role">${options(['介護職員','看護職員','管理者','計画作成担当者'].map(x=>[x,x]),p.role)}</select></label><label class="field">雇用区分<select name="employmentType">${options([['full','正社員'],['part','パート']],p.employmentType||'full')}</select><small>管理者は正社員で登録します。</small></label><label class="field">I勤務（パート日勤）<select name="usesI">${options([['no','使用しない'],['yes','使用する']],p.usesI?'yes':'no')}</select><small>I勤務はパート専用です。管理者には使用できません。</small></label><label class="field">夜勤<select name="night">${options([['yes','可能'],['no','不可']],p.night?'yes':'no')}</select></label><label class="field">夜勤の上限（月）<input name="nightMax" type="number" required min="0" max="15" value="${p.nightMax}"></label><div class="field"><span id="target-label">月の勤務時間目安</span>${targetModeControl(p)}<small>「以上」は設定時間を超えても出勤できます。「以内」は設定時間を超える勤務を入れられません。I勤務者は月9日休みを維持しながら入力でき、0の場合だけ自動計算します。</small></div>`}<label class="field">${isUser?'利用開始日':'入職日'}<input name="start" type="date" value="${esc(p.start)}">${isUser?'':'<small>有給は入職日の6か月後から利用できます。</small>'}</label>${isUser?'':'<div id="paid-leave-preview" class="paid-leave-preview full" role="status" aria-live="polite">'+paidLeavePreview(p.start)+'</div>'}<label class="field">${isUser?'利用終了日':'最終勤務日'}<input name="end" type="date" value="${esc(p.end)}"></label><div class="full">${isUser?'利用する':'勤務できる'}曜日<div class="weekday-picks">${[...'日月火水木金土'].map((w,i)=>`<label><input type="checkbox" name="weekdays" value="${i}" ${p.weekdays.includes(i)?'checked':''}>${w}</label>`).join('')}</div>${isUser?'':'<small>Dを担当した翌日のdと翌々日のEは、曜日設定より優先して同じ職員に連続設定します。</small>'}</div>${isUser?'':memberPromptFields(p)}</div><p id="form-error" class="form-error"></p><div class="dialog-bottom"><button type="button" class="cancel">キャンセル</button><button class="primary" type="submit">保存</button></div></form>`;
 dialog.showModal();
 dialog.querySelector('.close').onclick=close;
 dialog.querySelector('.cancel').onclick=close;
 if(!isUser){bindMemberPrompt();bindPaidLeavePreview();bindRoleControl(p);}
 $('#person-form').onsubmit=e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  if(f.get('start')&&f.get('end')&&f.get('start')>f.get('end')){$('#form-error').textContent='終了日は開始日以降にしてください。';return;}
  Object.assign(p,{name:String(f.get('name')).trim(),start:f.get('start'),end:f.get('end'),weekdays:f.getAll('weekdays').map(Number)});
  if(!p.name){$('#form-error').textContent='氏名を入力してください。';return;}
  if(isUser)p.type=f.get('type');
 else{const selectedRole=String(f.get('role')||''),role=(selectedRole==='__custom__'?String(f.get('customRole')||''):selectedRole).trim();if(!role||role.length>50){$('#form-error').textContent='手書きの職種名を1〜50文字で入力してください。';return;}const shiftChoice=String(f.get('allowedShift')||''),shiftLimit=E.parseAllowedShift(shiftChoice==='__custom__'?String(f.get('customAllowedShift')||''):shiftChoice);if(shiftLimit.error||shiftChoice==='__custom__'&&!shiftLimit.value){$('#form-error').textContent=shiftLimit.error||'手入力する勤務記号を入力してください。';return;}Object.assign(p,{role,employmentType:f.get('employmentType'),usesI:f.get('usesI')==='yes',night:f.get('night')==='yes',nightMax:+f.get('nightMax'),target:+f.get('target'),targetMode:f.get('targetMode')==='min'?'min':'max',allowedShift:shiftLimit.value,memberPrompt:String(f.get('memberPrompt')||'')});}
  if(!isUser){const errors=E.memberConditionErrors(p);if(errors.length){$('#form-error').textContent=errors.join(' ');return;}}
  let cleared=0;if(!change(()=>{const targetList=isUser?state.users:state.members;if(!isUser&&!E.roles.includes(p.role)&&!state.customRoles.includes(p.role))state.customRoles.push(p.role);if(!isUser&&p.allowedShift&&!['B','C','G'].includes(p.allowedShift)&&!state.customShiftLimits.includes(p.allowedShift))state.customShiftLimits.push(p.allowedShift);if(!isUser&&id)cleared=E.clearMemberConditionConflicts(state,p);if(id)targetList[targetList.findIndex(x=>x.id===id)]=p;else targetList.push(p);},!isUser,editingStaffRevision))return;
  close();toast(cleared?'保存しました。条件外の勤務を'+cleared+'件、空白にしました。':'保存しました');
 };
}
