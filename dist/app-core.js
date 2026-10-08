'use strict';
// Shared application state, DOM helpers, undo/redo, and top-level rendering.
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
function staffRow(p,paid=false){return `<th${paid?' class="paid-person"':''}><span class="person-heading"><span class="person-identity"><span class="person-name" title="${esc(p.name+'／'+p.role)}">${esc(p.name)}</span><span class="person-role">${esc(p.role)}</span></span>${paid?paidBadge(p):''}</span></th>`;}
function undoBar(){return `<button id="undo" ${undo.length?'':'disabled'}>↶ 元に戻す</button><button id="redo" ${redo.length?'':'disabled'}>↷ やり直す</button>`;}
function render(){mo();scheduleResizeObserver?.disconnect();if(tab!=='schedule'||!mo().generated)scheduleExpanded=false;document.body?.classList.toggle('schedule-expanded',scheduleExpanded);document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});if(tab==='members')renderMembers();else renderSchedule();if($('#undo'))$('#undo').onclick=()=>revert(false);if($('#redo'))$('#redo').onclick=()=>revert(true);}
function equivalentNote(){return '<div class="equivalent-note"><strong>8時間換算：B・C・D・d・G・Iのみ</strong><span>1人ずつ勤務時間÷8を小数第1位まで切り捨てて合計（8時間＝1.0、6時間＝0.7、7時間＝0.8）。E・F・/B・/C・空欄は対象外。</span><span><b class="fte-pass">7.0以上：基準クリア</b> ／ <b class="fte-near">6.0〜6.9：青</b> ／ <b class="fte-low">6.0未満：赤</b></span></div>';}
function equivalentFooter(extra){return '<tfoot><tr class="equivalent-row"><th scope="row">8時間換算 合計<small>B C D d G I</small></th>'+E.dailyEquivalent(state,current).map(r=>'<td class="fte-'+r.status+'" data-equivalent-day="'+r.day+'" aria-label="'+r.day+'日 8時間換算 '+r.value+' '+(r.status==='pass'?'基準クリア':'基準未満')+'" title="'+(r.status==='pass'?'基準クリア':'基準7.0未満')+'">'+r.value+'</td>').join('')+'<td colspan="'+extra+'">—</td></tr></tfoot>';}
function countsRows(){const rows=E.dailyCounts(state,current),codes=[...Object.keys(E.shifts),'blank'];return '<tbody class="daily-count-rows" id="daily-counts" aria-label="日別・勤務記号別の人数"><tr class="counts-heading"><th scope="row">勤務記号別 人数</th><td colspan="'+n()+'">各日の人数（人）</td><td colspan="3">月計（延べ）</td></tr>'+codes.map(c=>'<tr><th scope="row"><span class="chip '+chip(c)+'">'+(c==='blank'?'未入力':c+' '+E.shifts[c].label)+'</span></th>'+rows.map(r=>'<td data-count-code="'+c+'" data-count-day="'+r.day+'">'+r.counts[c]+'</td>').join('')+'<td class="count-total" colspan="3" data-count-total-code="'+c+'">'+rows.reduce((sum,r)=>sum+r.counts[c],0)+'</td></tr>').join('')+'</tbody>';}
