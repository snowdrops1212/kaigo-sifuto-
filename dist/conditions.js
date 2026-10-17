(function(root){
'use strict';
 const fields=[['B','Bの人数',0],['C','Cの人数',2],['D','Dの人数',1],['maxRun','連勤警告の目安',1],['off','休日の目安',0]];
 const consecutiveWorkRule='・連勤日数に上限は設けない。連勤が警告目安を超えた日は赤く警告するが、夜勤案・人数調整案の割り当てと反映は止めない。';
const legacyFacilityStatus='I勤務者の月9日休みは自動作成・判定に反映する。正社員176時間と夜勤者の別枠9日は、勤務時間の数え方が未確定のため自動割当・充足判定を保留する。現在のD・d各8時間の換算では、31日の月に通常E9日と夜勤後E1日を取ると最大168時間となり、176時間と両立しない。条件を勝手に緩めず、担当者と換算方法・条件を確認する。';
const previousFacilityStatus='職員ごとの勤務時間目安は、職員情報で選んだ「以上／以内」に応じて自動作成・判定する。正社員を月176時間以上にする場合は、対象職員の目安を176・以上に設定する。I勤務者の月9日休みは自動作成・判定に反映する。夜勤セット内のEとは別の月9日休みは、条件の両立を確認しながら担当者が調整する。';
const priorFacilityStatus='職員ごとの勤務時間目安は、職員情報で選んだ「以上／以内」に応じて自動作成・判定する。「以上」の職員は176時間などの設定時間を超えても出勤できる。「以内」の職員は規定時間までに抑え、設定時間を超える勤務は自動作成・手動変更・勤務交代のいずれでも設定できない。正社員を月176時間以上にする場合は、対象職員の目安を176・以上に設定する。I勤務者の月9日休みは自動作成・判定に反映する。夜勤セット内のEとは別の月9日休みは、条件の両立を確認しながら担当者が調整する。';
const previousCurrentFacilityStatus='職員ごとの勤務時間目安は、職員情報で選んだ「以上／以内」に応じて自動作成・判定する。「以上」の職員は176時間などの設定時間を超えても出勤できる。「以内」の職員は規定時間までに抑える。正社員に月176時間以上を求める場合は、その職員の目安を176・以上に設定する。I勤務者の月9日休みは自動作成・判定に反映する。正社員とI勤務パートは夜勤セットのEとは別に月9日のEを必須とする。勤務時間の下限と両立しない場合は、どちらも緩めず、保存済みのシフトを変更せずに作成を止める。';
const prior168FacilityStatus=previousCurrentFacilityStatus.replace('176時間など','168時間など').replace('月176時間以上','月168時間以上').replace('176・以上','168・以上');
const old168FacilityStatus='職員ごとの勤務時間目安は「以上／以内」で判定する。正社員の月168時間以上は引き続き必須。正社員とI勤務パートは、D→d→Eの最後のEも含めて月9日ちょうどの休日Eを必須とする。9日以外は赤色で警告し、自動作成を止める。';
const fullTimeHoursRule='・正社員は30日の月に21日×8時間＝168時間以上、31日の月に22日×8時間＝176時間以上を勤務時間の下限とする。ちょうどの時間数は達成扱いとし、超過勤務も可能。夜勤明けdと有給Fも各8時間として合計する。';
const partIHoursRule='・I勤務パートは1日7時間とし、31日の月は22日勤務で154時間以内、30日の月は21日勤務で147時間以内を上限とする。ちょうどの時間数は可。個別・月別の時間設定が低い場合は低い方を優先する。';
const nightRoleRule='・管理者と看護職員（看護師）は夜勤D・dを担当しない。夜勤設定が「可能」でも割り当てず、保存済みの該当勤務は警告する。';
const legacyNightOnlyPartRule='・夜勤のみのパートは月3回のD→d→Eを基本とする。4回目は必要な場合のみ案として提案し、本人への確認が必要な「要確認」を表示する。月5回以上は設定しない。';
const nightOnlyPartRule='・夜勤のみのパートは月3回のD→d→Eを基本とする。4回目は必要な場合のみ案として提案し、本人への確認が必要な「要確認」を表示する。通常の時間目安が52時間以内なら4回目の提案時は64時間以内を適用する。52時間より低い個別上限は引き上げない。月5回以上は設定しない。';
const bcNightPreferenceRule='・B・Cが3日続いた人の翌日は原則E（休日）にする。D（夜勤入り）は他の候補が難しい場合に限り許可し、できるだけ避けて要確認の警告を出す。';
const facilityStatus='職員ごとの勤務時間目安は「以上／以内」で判定する。正社員は30日の月に168時間以上、31日の月に176時間以上を必須とし、超過勤務も可能。I勤務パートは31日の月154時間以内、30日の月147時間以内を必須とし、ちょうどは可。正社員とI勤務パートは、D→d→Eの最後のEも含めて月9日ちょうどの休日Eを必須とする。9日以外は赤色で警告する。③人数調整では未達が残っても可能な勤務を途中案としてシフト表へ反映し、完成扱いにはしない。';
const facilityRules='【施設から追加された条件】\n'+fullTimeHoursRule+'\n'+partIHoursRule+'\n'+nightRoleRule+'\n'+nightOnlyPartRule+'\n・正社員とI勤務パートは、夜勤のD → d → Eの最後のEも含めて、月9日ちょうどのE（休日）を取る。\n・9日以外なら休日数を赤色で警告する。③人数調整では未達が残る途中案も表に入れ、完成扱いにはしない。\n・有給Fは通常の休日Eとは別枠とする。\n【追加条件の適用状況】\n'+facilityStatus;
function withPartIHours(text){const original=String(text),heading='【施設から追加された条件】';if(original.includes(partIHoursRule)||!original.includes(heading))return original;const updated=original.replace(heading,heading+'\n'+partIHoursRule);return updated.length<=20000?updated:original;}
function withNightRoleRule(text){const original=String(text).replace('・職種だけで夜勤を制限する機能は未対応。職員の「夜勤：不可」で設定する。',''),heading='【施設から追加された条件】';if(original.includes(nightRoleRule)||!original.includes(heading))return original;const updated=original.replace(heading,heading+'\n'+nightRoleRule);return updated.length<=20000?updated:original;}
function withNightOnlyPartRule(text){const original=String(text).replace(legacyNightOnlyPartRule,nightOnlyPartRule),heading='【施設から追加された条件】';if(original.includes(nightOnlyPartRule)||!original.includes(heading))return original;const updated=original.replace(heading,heading+'\n'+nightOnlyPartRule);return updated.length<=20000?updated:String(text);}
function withPartialDraftRule(text){return String(text)
 .replaceAll('9日以外は赤色で警告し、自動作成を止める。','9日以外は赤色で警告する。③人数調整では未達が残っても可能な勤務を途中案としてシフト表へ反映し、完成扱いにはしない。')
 .replaceAll('・9日以外なら休日数を赤色で警告し、条件を満たせない自動作成案は適用しない。','・9日以外なら休日数を赤色で警告する。③人数調整では未達が残る途中案も表に入れ、完成扱いにはしない。')
 .replaceAll('別勤務で人数を偽らず、作成を止めて不足日と条件を知らせる。','別勤務で人数を偽らず、埋められた分を途中案として表に入れ、不足日と条件を警告する。')
 .replaceAll('・候補案を比較し、C・Dの毎日の人数、B・Cの3日連続後のE、対象職員の夜勤後Eを含む休日9日を満たせない場合は作成を止める。','・候補案を比較し、未達があっても③では可能な勤務を途中案として表に入れる。C・Dの人数、B・Cの3日連続後のE、休日9日の未達は警告し、完成扱いにしない。');}
function withFullTimeHours(text){
 let value=String(text).replaceAll(old168FacilityStatus,facilityStatus)
  .replaceAll('・正社員は月168時間以上働く必要がある。',fullTimeHoursRule)
  .replaceAll('・正社員は月176時間以上働く必要がある。',fullTimeHoursRule)
  .replaceAll('勤務時間の下限（例：168時間以上）','勤務時間の下限（30日の月168時間以上／31日の月176時間以上）')
  .replaceAll('勤務時間の下限（例：176時間以上）','勤務時間の下限（30日の月168時間以上／31日の月176時間以上）')
  .replaceAll('勤務時間の下限とする。夜勤明けdと有給Fも各8時間として合計する。','勤務時間の下限とする。ちょうどの時間数は達成扱いとし、超過勤務も可能。夜勤明けdと有給Fも各8時間として合計する。');
 if(!value.includes(fullTimeHoursRule)&&value.includes('【施設から追加された条件】'))value=value.replace('【施設から追加された条件】','【施設から追加された条件】\n'+fullTimeHoursRule);
   return value.length<=20000?withPartialDraftRule(withNightRoleRule(value)):String(text);
}
function withNineHolidayRule(text){let value=String(text);for(const [oldText,newText] of [
 ['正社員とI勤務パートは夜勤セットのEとは別に月9日のEを確保する。勤務時間の下限（例：168時間以上）と両立しない場合は、どちらも緩めず作成を止める。','正社員とI勤務パートは夜勤セットのEとは別に月9日のEを目標とする。9日未満は赤色で警告し、勤務時間の下限（例：168時間以上）は守る。'],
  ['正社員とI勤務パートは夜勤セットのEとは別に月9日のEを確保する。勤務時間の下限（30日の月168時間以上／31日の月176時間以上）と両立しない場合は、どちらも緩めず作成を止める。','正社員とI勤務パートは夜勤セットのEを含めて月9日ちょうどのEを必須とする。9日以外は赤色で警告し、勤務時間の下限（30日の月168時間以上／31日の月176時間以上）も守る。'],
 ['・候補案を比較し、C・Dの毎日の人数、B・Cの3日連続後のE、対象職員の別枠休日9日を満たせない場合は作成を止める。最適解までは保証しない。','・候補案を比較し、C・Dの毎日の人数とB・Cの3日連続後のEを満たせない場合は作成を止める。別枠休日9日は努力目標とし、未達は赤色で警告する。最適解までは保証しない。'],
 ['・一般の休日目安は時間目安の算出に使う。正社員とI勤務パートの別枠休日9日は必須条件。夜勤回数の完全な均等化は保証しない。','・一般の休日目安は時間目安の算出に使う。正社員とI勤務パートの別枠休日9日は努力目標で、未達は赤色で警告する。夜勤回数の完全な均等化は保証しない。'],
 ['・夜勤のD → d → Eのセット内のEとは別に、月9日のE（休日）を取る。','・夜勤のD → d → Eのセット内のEとは別に、月9日のE（休日）を目標にする。'],
 ['・I勤務を使うパートは、月9日のE（休日）を取る。','・I勤務を使うパートも、月9日のE（休日）を目標にする。'],
 [prior168FacilityStatus,facilityStatus],
 ])value=value.replaceAll(oldText,newText);
 value=value.replaceAll('夜勤セットのEを含めて月9日のEを必須とする。9日未満は','夜勤セットのEを含めて月9日ちょうどのEを必須とする。9日以外は')
  .replaceAll('D→d→Eの最後のEも含めて月9日の休日Eを必須とする。9日未満は','D→d→Eの最後のEも含めて月9日ちょうどの休日Eを必須とする。9日以外は')
  .replaceAll('夜勤のD → d → Eの最後のEも含めて、月9日のE（休日）を取る。','夜勤のD → d → Eの最後のEも含めて、月9日ちょうどのE（休日）を取る。')
  .replaceAll('9日未満なら休日数を赤色で警告し、条件を満たせない自動作成案は適用しない。','9日以外なら休日数を赤色で警告し、条件を満たせない自動作成案は適用しない。');
 for(const [oldText,newText] of [
  ['正社員とI勤務パートは夜勤セットのEとは別に月9日のEを目標とする。9日未満は赤色で警告し、勤務時間の下限（例：168時間以上）は守る。','正社員とI勤務パートは夜勤セットのEを含めて月9日のEを必須とする。9日未満は赤色で警告し、勤務時間の下限（例：168時間以上）も守る。'],
  ['・候補案を比較し、C・Dの毎日の人数とB・Cの3日連続後のEを満たせない場合は作成を止める。別枠休日9日は努力目標とし、未達は赤色で警告する。最適解までは保証しない。','・候補案を比較し、C・Dの毎日の人数、B・Cの3日連続後のE、対象職員の夜勤後Eを含む休日9日を満たせない場合は作成を止める。最適解までは保証しない。'],
  ['・一般の休日目安は時間目安の算出に使う。正社員とI勤務パートの別枠休日9日は努力目標で、未達は赤色で警告する。夜勤回数の完全な均等化は保証しない。','・一般の休日目安は時間目安の算出に使う。正社員とI勤務パートは夜勤後Eを含めた休日9日が必須条件。夜勤回数の完全な均等化は保証しない。'],
  ['・夜勤のD → d → Eのセット内のEとは別に、月9日のE（休日）を目標にする。セット内のEはこの9日に含めない。','・正社員とI勤務パートは、夜勤のD → d → Eの最後のEも含めて、月9日のE（休日）を取る。'],
  ['・I勤務を使うパートも、月9日のE（休日）を目標にする。',''],
  ['・9日未満なら休日数を赤色で警告し、これだけを理由にシフト作成は止めない。','・9日未満なら休日数を赤色で警告し、条件を満たせない自動作成案は適用しない。'],
  ['・夜勤のD → d → Eのセット内のEとは別に、月9日のE（休日）を目標にする。','・正社員とI勤務パートは、夜勤のD → d → Eの最後のEも含めて、月9日のE（休日）を取る。'],
  ['・I勤務を使うパートは、月9日のE（休日）を取る。',''],
  ['正社員とI勤務パートは夜勤セットのEとは別に月9日のEを目標とする。9日未満は赤色で警告し、勤務時間の下限（例：168時間以上）は守る。','正社員とI勤務パートは夜勤セットのEを含めて月9日のEを必須とする。9日未満は赤色で警告し、勤務時間の下限（例：168時間以上）も守る。'],
  ['正社員とI勤務パートは夜勤セットのEを除く月9日の休日Eを努力目標とし、未達の日数を赤色で警告する。休日9日未満だけを理由にシフト作成は止めない。','正社員とI勤務パートは、D→d→Eの最後のEも含めて月9日の休日Eを必須とする。9日未満は赤色で警告し、自動作成を止める。'],
 ])value=value.replaceAll(oldText,newText);
 if(value.includes('【追加条件の適用状況】'))value=value.replace(/【追加条件の適用状況】\n[^\n]*/, '【追加条件の適用状況】\n'+facilityStatus);
 return value.length<=20000?value:String(text);}
function withFacilityRules(text){const value=String(text).replace(legacyFacilityStatus,facilityStatus).replace(previousFacilityStatus,facilityStatus).replace(priorFacilityStatus,facilityStatus).replace(previousCurrentFacilityStatus,facilityStatus).replace('・正社員は月176時間以上働く必要がある。','・正社員は月168時間以上働く必要がある。').replace('・勤務時間の目安は「今月の個別設定」→「職員の月間時間」→「（月の日数−休日目安）×8」の順で決める。有休Fも8時間として含める。','・勤務時間の目安は「今月の個別設定」→「職員の月間時間」→「（月の日数−休日目安）×8」の順で決め、職員情報の「以上／以内」に応じて判定する。「以上」は設定時間を超えても勤務でき、「以内」は設定時間を超える勤務を設定できない。有休Fも8時間として含める。').replace('・勤務時間の目安は「今月の個別設定」→「職員の月間時間」→「（月の日数−休日目安）×8」の順で決め、職員情報の「以上／以内」に応じて判定する。有休Fも8時間として含める。','・勤務時間の目安は「今月の個別設定」→「職員の月間時間」→「（月の日数−休日目安）×8」の順で決め、職員情報の「以上／以内」に応じて判定する。「以上」は設定時間を超えても勤務でき、「以内」は設定時間を超える勤務を設定できない。有休Fも8時間として含める。'),extra='\n\n'+facilityRules,updated=withNineHolidayRule(value);return withPartIHours(updated.includes('【施設から追加された条件】')||updated.length+extra.length>20000?updated:updated+extra);}
function settings(r){return fields.map(([key,label])=>label+'：'+(key==='B'?'制限なし':key==='C'?'2人':key==='D'?'1人':r[key]+'日')).join('\n');}
function template(r){return '【自動反映する設定】\n'+settings(r)+'\n'+"\n【基本方針・現在の自動作成】\n・登録した会議日は、職種「管理者」の在籍中の職員全員をB（日勤）にする。会議日の条件欄に当月の日付を表示する。希望休・有給・固定勤務・勤務不可曜日・夜勤明けと矛盾する場合は作成を停止して調整する。\n・希望休「希」はE（休日）、有給希望「有」はF（有休）として確保する。\n・出勤希望は休みと別の希望として登録し、優先して勤務を組む。希望日以外にも出勤可能。勤務不可曜日・在籍期間・固定勤務・夜勤後の休み・個別条件は優先し、出勤希望を満たせない日は警告する。\n・有給の年間集計は各職員の入職日6か月後を起点とした1年間。表示月末が属する期間の登録日数（予定を含む）を数える。\n・手直しして固定したセルは再作成でも保持する。希望と固定勤務が矛盾するときは作成を止める。\n・職員の入職日・最終勤務日、勤務可能曜日、夜勤可否、夜勤上限を使う。\n・D（夜勤入り）→翌日d（明け）→翌々日E（休日）を基本とする。希望・固定と両立しない場合は警告を確認する。\n・前月の作成データがあれば前月最終日の勤務を参照し、なければ手入力の前月末勤務を使う。\n・前月末Dの場合は1日d・2日E、前月末dの場合は1日Eを確保する。\n・Bは人数制限なし（0人でも可）。Cは毎日ちょうど2人。以前の月別・日別のB・C人数よりこの条件を優先する。Dは保存済みの日別最低人数を月の設定より優先する。\n・勤務時間の目安は「今月の個別設定」→「職員の月間時間」→「（月の日数−休日目安）×8」の順で決め、職員情報の「以上／以内」に応じて判定する。有休Fも8時間として含める。\n・夜勤を先に組み、日中は勤務可能な職員が少ない日からCを2人にし、残りはBで時間目安に近づける。Cの固定勤務が2人を超える場合は作成を停止する。Cが不足する案や手動変更で過不足が出た場合は警告する。\n・60通りの候補から不足や違反が少ない案を選ぶ。全条件の充足・最適解を保証しない。\n・利用予定・日別人数の入力欄は非表示。過去に保存した利用者・日別設定は保持する。利用人数から必要職員数への自動換算は未接続。\n\n【8時間換算・画面の判定ルール】\n・対象はB・C・D・d・G・Iのみ。1人ずつ勤務時間÷8を小数第1位まで残し、第2位以降を切り捨てて合計する。\n・8時間＝1.0、6時間＝0.7、7時間＝0.8。合計7.0以上で施設基準クリア、6.0〜6.9は青、6.0未満は赤。\n・A・E・F・/B・/C・空欄はこの合計に含めない。\n・7.0未満は警告し、候補比較でも評価するが、必ず7.0以上にできる保証はない。法定配置の適合判定ではない。\n\n【勤務記号・現在の登録時間】\nA：7:00〜16:30（休憩未確認、実働時間未設定）\nB：8:30〜17:30（8時間）\nC：10:30〜19:30（8時間）\nD：16:30〜翌10:30（Dに8時間、翌日dに8時間）\nd：夜勤明け（8時間）\nE：休日（0時間）\nF：有休（時間目安には8時間算入）\nG：9:00〜15:00（6時間）\nI：9:00〜17:00（7時間）\n/B：13:30〜17:30（4時間）\n/C：15:30〜19:30（4時間）\n\n【画像の観察結果・参考情報（自動適用しない）】\n・夜勤：毎日Dが1人、dが1人。\n・夜勤の並び：月内で確認できる382件すべてD→翌日d。\n・夜勤明け：d→Eが345件、残り37件は空欄。直後に別勤務なし。\n・B勤務：395日すべて1人以上。2〜4人の日が約84%。\n・C勤務：395日すべて1人以上。376日（約95%）はちょうど2人。\n・夜勤担当：すべて介護職員。管理者・計画作成担当者・看護職員には夜勤なし。\n・常勤時間：月160・168・176時間が中心。\n・休日数：常勤者はEが平均約9日／月。\n・連続勤務：月内最大6日。ほとんどが4日以内。\n・日曜日：平日より日中配置が少ない。\n・非常勤：G・I・半日勤務などで日中の不足を補う。\n※上記は提供画像の観察結果であり、必須条件・法定基準ではない。現在はBの人数制限なし・Cは毎日ちょうど2人。D1人、連勤上限5日・休日目安9日は試作版の仮設定。\n\n【未対応・担当者による確認が必要】\n・任意の文章をAIが解釈して全条件を自動適用する機能は未接続。先頭の5項目だけ「月の作成条件に反映」で適用する。それ以外は共有・確認用のメモ。\n・毎日Dとdをちょうど1人に制限する機能は未対応（Dは最低人数、dは夜勤の連続配置による）。\n・職種だけで夜勤を制限する機能は未対応。職員の「夜勤：不可」で設定する。\n・日曜の日中減員は自動適用しない。日別の必要人数の入力欄は非表示。\n・職員の個別メモ欄は対応する定型文のみ自動適用する。「G勤務：可能」は残り6〜7時間の場合にG（6時間）を候補にする。「勤務区分：夜勤専門」は勤務をD・dに制限する。その他の文章はメモ。I・半日勤務・Aの自動割当は未対応。\n・休日目安は時間目安の算出に使うもので、休日数ちょうどの保証ではない。勤務時間ちょうど・夜勤回数の完全な均等化も保証しない。\n・月をまたぐ連続勤務の完全な判定、資格別配置、法定配置、利用人数に応じた必要職員数の自動判定は未対応。\n\n【追加の条件メモ（自動適用しない）】\n"+'\n\n'+facilityRules;}
function withStaffingRules(text){
 let inSettings=false;
 let value=String(text).split(/\r?\n/).map(raw=>{
  const line=raw.trim().normalize('NFKC');
  if(/^【.*】$/.test(line))inSettings=line==='【自動反映する設定】';
  if(inSettings&&/^Bの最低人数\s*:\s*\d+\s*人$/.test(line))return 'Bの人数：制限なし';
  if(inSettings&&/^Cの最低人数\s*:\s*\d+\s*人$/.test(line))return 'Cの人数：2人';
  if(inSettings&&/^Dの(?:最低)?人数\s*:\s*\d+\s*人$/.test(line))return 'Dの人数：1人';
   if(inSettings&&/^連続勤務の上限\s*:\s*\d+\s*日$/.test(line))return '連勤警告の目安：'+line.match(/\d+/)[0]+'日';
  return raw;
 }).join('\n');
 for(const [oldText,newText]of [["・保存済みの日別B・C・Dの必要人数は、月の最低人数より優先する（日別入力欄は非表示）。","・Bは人数制限なし（0人でも可）。Cは毎日ちょうど2人。以前の月別・日別のB・C人数よりこの条件を優先する。Dは保存済みの日別最低人数を月の設定より優先する。"],["・夜勤を先に組み、日中は勤務可能な職員が少ない日からC・Bの必要人数を埋め、残りはBで時間目安に近づける。","・夜勤を先に組み、日中は勤務可能な職員が少ない日からCを2人にし、残りはBで時間目安に近づける。Cの固定勤務が2人を超える場合は作成を停止する。Cが不足する案や手動変更で過不足が出た場合は警告する。"],["初期のB2人・C2人・D1人、連勤上限5日・休日目安9日は試作版の仮設定。","現在はBの人数制限なし・Cは毎日ちょうど2人。D1人、連勤上限5日・休日目安9日は試作版の仮設定。"]])value=value.replace(oldText,newText);
 value=value.replace('・G・I・半日勤務・Aの自動割当は未対応。手動で入力し、必要なら固定する。','・職員の個別メモ欄は対応する定型文のみ自動適用する。「G勤務：可能」は残り6〜7時間の場合にG（6時間）を候補にする。「勤務区分：夜勤専門」は勤務をD・dに制限する。その他の文章はメモ。I・半日勤務・Aの自動割当は未対応。');
 value=value.replace('・職員の入職日・最終勤務日、勤務可能曜日、夜勤可否、夜勤上限を使う。','・職員の入職日・最終勤務日、勤務可能曜日、夜勤可否を使う。');
 value=value.replace('・D（夜勤入り）→翌日d（明け）→翌々日E（休日）を基本とする。希望・固定と両立しない場合は警告を確認する。','・D（夜勤入り）→翌日d（明け）→翌々日E（休日）を同じ職員に必ず3日連続で割り当てる。月をまたいでも引き継ぎ、どこかが両立しなければその職員にDを割り当てない。');
 value=value.replace('・Bは人数制限なし（0人でも可）。Cは毎日ちょうど2人。以前の月別・日別のB・C人数よりこの条件を優先する。Dは保存済みの日別最低人数を月の設定より優先する。','・Aは使用しない。Bは人数制限なし（0人でも可）。Cは毎日ちょうど2人、Dは毎日ちょうど1人。以前の月別・日別のB・C・D人数よりこの固定条件を優先する。');
 value=value.replace('・夜勤を先に組み、日中は勤務可能な職員が少ない日からCを2人にし、残りはBで時間目安に近づける。Cの固定勤務が2人を超える場合は作成を停止する。Cが不足する案や手動変更で過不足が出た場合は警告する。','・夜勤Dを毎日1人、日中は勤務可能な職員が少ない日からCを2人にし、残りはBで時間目安に近づける。C・Dの固定勤務が定員を超える場合は作成を停止し、手動変更による過不足も警告する。');
 value=value.replace('・A・E・F・/B・/C・空欄はこの合計に含めない。','・E・F・/B・/C・空欄はこの合計に含めない。');
 value=value.replace('A：7:00〜16:30（休憩未確認、実働時間未設定）\n','');
 value=value.replace('・対象はB・C・D・d・G・Iのみ。1人ずつ勤務時間÷8を小数第1位まで残し、第2位以降を切り捨てて合計する。','・対象はB・C・C\'・D・d・G・J・L・M・/C\'・I。1人ずつ勤務時間÷8を小数第1位まで残し、第2位以降を切り捨てて合計する。');
 value=value.replace('G：9:00〜15:00（6時間）\nI：9:00〜17:00（7時間）','G：9:00〜15:00（6時間）\nJ：9:30〜15:30（6時間）\nL：9:30〜17:30（7時間）\nM：10:30〜18:30（7時間）\nC\'：10:00〜19:00（8時間）\n/C\'：13:00〜19:00（6時間）\nI：9:00〜17:00（7時間）');
 value=value.replace('I：9:00〜17:00（7時間）','I：9:00〜17:00（7時間、I勤務を使うパート専用）');
 value=value.replace('※上記は提供画像の観察結果であり、必須条件・法定基準ではない。現在はBの人数制限なし・Cは毎日ちょうど2人。D1人、連勤上限5日・休日目安9日は試作版の仮設定。','※上記は提供画像の観察結果であり、必須条件・法定基準ではない。現在はAを使用せず、Bの人数制限なし・Cは毎日2人・Dは毎日1人を固定条件とする。');
 value=value.replace('・毎日Dとdをちょうど1人に制限する機能は未対応（Dは最低人数、dは夜勤の連続配置による）。','・Dは毎日ちょうど1人に固定する。dはDの翌日に連続配置する。');
 value=value.replace('その他の文章はメモ。I・半日勤務・Aの自動割当は未対応。','その他の文章はメモ。Iは職員情報で「I勤務を使う」としたパートへ割り当て、月9日の休日Eを確認する。半日勤務の自動割当は未対応。');
 value=value.replace('・職員の個別メモ欄は対応する定型文のみ自動適用する。「G勤務：可能」は残り6〜7時間の場合にG（6時間）を候補にする。「勤務区分：夜勤専門」は勤務をD・dに制限する。その他の文章はメモ。Iは職員情報で「I勤務を使う」としたパートへ割り当て、月9日の休日Eを確認する。半日勤務の自動割当は未対応。','・職員の個別メモ欄は職員ごとに必ず確認する。「Gのみ勤務可能」「B・Cのみ勤務可能」は指定した勤務記号だけに制限する。「G勤務：可能」は残り6〜7時間の場合にG（6時間）を候補にする。「勤務区分：夜勤専門」は勤務をD・dに制限する。自動判定できない文章がある場合は、重要事項を無視しないよう自動作成を停止する。Iは職員情報で「I勤務を使う」としたパートへ割り当て、月9日の休日Eを確認する。半日勤務の自動割当は未対応。');
  const heading='【基本方針・現在の自動作成】';
  if(value.includes(heading)&&!value.includes(consecutiveWorkRule))value=value.replace(heading,heading+'\n'+consecutiveWorkRule);
  return value.length<=20000?value:String(text);
}
function parse(text){
 const rules={},errors=[],seen=new Set();let inSettings=false,found=false;
 String(text).normalize('NFKC').split(/\r?\n/).forEach((raw,i)=>{
  const line=raw.trim();if(!line)return;
  if(line==='【自動反映する設定】'){if(found)errors.push('設定の見出しが重複しています。');found=true;inSettings=true;return;}
  if(/^【.*】$/.test(line)){inSettings=false;return;}if(!inSettings)return;
  if(/^Bの人数\s*:\s*制限なし$/.test(line)){if(seen.has('B'))errors.push('Bの人数が重複しています。');seen.add('B');rules.B=0;return;}
   const match=line.match(/^(Cの人数|Dの人数|連勤警告の目安|連続勤務の上限|休日の目安)\s*:\s*(\d+)\s*(人|日)$/);
  if(!match){errors.push((i+1)+'行目：Bは「制限なし」、Cは「2人」、Dは「1人」、その他は数値＋日で指定してください。');return;}
   const field=fields.find(f=>f[1]===(match[1]==='連続勤務の上限'?'連勤警告の目安':match[1])),[key,,min]=field,value=Number(match[2]),unit=['maxRun','off'].includes(key)?'日':'人';
  if(seen.has(key))errors.push(match[1]+'が重複しています。');seen.add(key);
  if(value<min||value>31||match[3]!==unit)errors.push(match[1]+'は'+min+'〜31'+unit+'で指定してください。');
  if(key==='C'&&value!==2)errors.push('Cの人数は毎日ちょうど2人です。');
  if(key==='D'&&value!==1)errors.push('Dの人数は毎日ちょうど1人です。');
  rules[key]=value;
 });
 if(!found)errors.push('【自動反映する設定】の見出しが必要です。');
 for(const [key,label]of fields)if(!seen.has(key))errors.push(label+'がありません。');
 return {rules,errors};
}
const previousPlanningOrder='【シフト作成の順番（毎月適用）】\n1. 全職員の希望休・有給を先に登録し、E・Fとして確保する。\n2. パート・非常勤の職員全員の出勤希望日と希望勤務を夜勤より先に確保する。この画面では雇用区分「パート」に登録した職員が対象。勤務不可曜日・個別条件・固定勤務・時間上限と両立しない場合は警告する。\n3. D→d→Eの夜勤セットを同じ職員で組む。前月からの夜勤も引き継ぐ。\n4. 各職員の勤務時間目安と「以上／以内」を確認しながら、C・Bなど残りの勤務を埋める。条件を満たせない枠は無理に別勤務へ変えず警告する。';
const oldCurrentPlanningOrder='【シフト作成の順番（毎月適用）】\n1. 最初に職員一人ひとりの情報を確認する。氏名・職種・雇用区分・勤務限定・個別メモ・夜勤可否と上限・今月の勤務時間目安・有給利用可否を、職員入力欄と連動する最新の職員条件プロンプトで確認する。対象月に在籍する職員に矛盾や自動判定できない重要メモがあれば作成を止める。\n2. 全職員の希望休・有給を登録し、E・Fとして確保する。\n3. パート・非常勤の職員全員の出勤希望日と希望勤務を夜勤より先に確保する。この画面では雇用区分「パート」に登録した職員が対象。勤務不可曜日・個別条件・固定勤務・時間上限と両立しない場合は警告する。\n4. D→d→Eの夜勤セットを同じ職員で組む。前月からの夜勤も引き継ぐ。\n5. 各職員の勤務時間目安と「以上／以内」を確認しながら、C・Bなど残りの勤務を埋める。条件を満たせない枠は無理に別勤務へ変えず警告する。';
const priorPlanningOrder=oldCurrentPlanningOrder.replace('4. D→d→Eの夜勤セットを同じ職員で組む。前月からの夜勤も引き継ぐ。','4. 毎日Dをちょうど1人にし、その同じ職員に翌日d・翌々日Eを3日連続で確保する。途中交代はしない。月をまたいでも引き継ぎ、3日間のどこかが勤務条件・希望・固定予定と両立しなければ、この職員に夜勤セットを割り当てない。');
const previousNightRestPriority='希望休をD→d→Eの最後のEにできる場合は先にその3日間を確保する。';
const nightRestPriority=previousNightRestPriority+'希望休のEと夜勤セット最後のEは同じ日でよく、休日は1日として数える。';
const planningOrder=priorPlanningOrder.replace('夜勤可否と上限','夜勤可否').replace('4. 毎日Dをちょうど1人にし','4. '+nightRestPriority+'夜勤専門者を除き、夜勤回数の偏りを抑え、前回の夜勤から長く空いた人を優先する。連続する夜勤セットはなるべく避けるが、必要な場合は許可する。毎日Dをちょうど1人にし').replace('5. 各職員の勤務時間目安','5. B・Cが3日続いた人の翌日は原則Eにする。Dは他の候補が難しい場合のみ許可し、要確認として警告する。正社員とI勤務パートは夜勤セットのEを含めて月9日ちょうどのEを必須とする。9日以外は赤色で警告し、勤務時間の下限（例：168時間以上）も守る。\n6. 各職員の勤務時間目安');
 const monthlyPlanningOrder=withFullTimeHours(planningOrder);
  const previousNightRestRule='・3日間のいずれかに在籍外、勤務不可、希望休・有給・出勤希望との衝突、固定予定などがあり成立しない場合、その職員のD自体を割り当てない。3日分を無理に分割しない。';
  const nightRestRule='・希望休のEとD→d→Eの最後のEは重ねてよく、その日は休日1日として数える。3日間のいずれかが在籍外・勤務不可・固定勤務との矛盾や、希望休・有給・出勤希望との不一致で成立しない場合、その職員のD自体を割り当てない。3日分を無理に分割しない。';
  const absoluteRules='【絶対条件：毎日の配置と夜勤の3日セット】\n・Aは使用しない。Bの人数に上限・下限はない。Cは毎日ちょうど2人、Dは毎日ちょうど1人にする。保存済みの旧人数設定より優先する。\n・Dを担当した職員本人が翌日にd、翌々日にEを取る。3日連続・同一職員のセットとし、途中で別の人と交代しない。月末のD・dも翌月へ引き継ぐ。\n'+nightRestRule+'\n・条件を満たせる職員が足りなければ、別勤務で人数を偽らず、埋められた分を途中案として表に入れ、不足日と条件を警告する。';
 function withAbsoluteRules(text){const original=String(text),withPriority=original.includes(nightRestPriority)?original:original.replace(previousNightRestPriority,nightRestPriority),value=withPriority.replace(previousNightRestRule,nightRestRule),heading='【絶対条件：毎日の配置と夜勤の3日セット】';if(value.includes(heading))return value.length<=20000?value:original;const anchor='【基本方針・現在の自動作成】',updated=value.includes(anchor)?value.replace(anchor,absoluteRules+'\n\n'+anchor):value+'\n\n'+absoluteRules;return updated.length<=20000?updated:original;}
function withPlanningOrder(text){
 const value=withNineHolidayRule(String(text).replace('勤務時間の下限（例：176時間以上）','勤務時間の下限（例：168時間以上）').replace('・手直しして固定したセルは再作成でも保持する。希望と固定勤務が矛盾するときは作成を止める。','・手直しして固定したセルは再作成でも保持する。ただし希望休・有給が固定勤務と重なる場合は希望を優先し、重なる夜勤セットを空欄にして再作成する。').replace('・夜勤を先に組み、日中は勤務可能な職員が少ない日からCを2人にし、残りはBで時間目安に近づける。','・希望休とパート・非常勤の出勤希望を先に確保し、夜勤を組んでから日中のC・Bと勤務時間を調整する。').replace('・60通りの候補から不足や違反が少ない案を選ぶ。全条件の充足・最適解を保証しない。','・候補案を比較し、C・Dの毎日の人数とB・Cの3日連続後のEを満たせない場合は作成を止める。別枠休日9日は努力目標とし、未達は赤色で警告する。最適解までは保証しない。').replace('・毎日Dとdをちょうど1人に制限する機能は未対応（Dは最低人数、dは夜勤の連続配置による）。','・Dは毎日ちょうど1人。dは前日のDを担当した同じ職員に割り当てる。').replace('・休日目安は時間目安の算出に使うもので、休日数ちょうどの保証ではない。勤務時間ちょうど・夜勤回数の完全な均等化も保証しない。','・一般の休日目安は時間目安の算出に使う。正社員とI勤務パートの別枠休日9日は努力目標で、未達は赤色で警告する。夜勤回数の完全な均等化は保証しない。')),heading='【シフト作成の順番（毎月適用）】';
  if(value.includes(previousPlanningOrder)){const updated=value.replace(previousPlanningOrder,monthlyPlanningOrder);return updated.length<=20000?updated:value;}
  if(value.includes(oldCurrentPlanningOrder)){const updated=value.replace(oldCurrentPlanningOrder,monthlyPlanningOrder);return updated.length<=20000?updated:value;}
  if(value.includes(priorPlanningOrder)){const updated=value.replace(priorPlanningOrder,monthlyPlanningOrder);return updated.length<=20000?updated:value;}
  if(value.includes(planningOrder)){const updated=value.replace(planningOrder,monthlyPlanningOrder);return updated.length<=20000?updated:value;}
  if(value.includes(heading))return withFullTimeHours(value.replace('夜勤可否と上限','夜勤可否'));
  const anchor='【基本方針・現在の自動作成】',updated=value.includes(anchor)?value.replace(anchor,monthlyPlanningOrder+'\n\n'+anchor):value+'\n\n'+monthlyPlanningOrder;
 return updated.length<=20000?updated:value;
}
function withoutImageObservations(text){
 const value=String(text),heading='【画像の観察結果・参考情報（自動適用しない）】',next='【未対応・担当者による確認が必要】',start=value.indexOf(heading);
 if(start<0)return value;
 const end=value.indexOf(next,start+heading.length);if(end<0)return value;
 return value.slice(0,start).replace(/\s*$/,'\n\n')+value.slice(end);
}
 function withActiveAdditionalHeading(text){return String(text).replaceAll('【追加の条件メモ（自動適用しない）】','【追加の条件（自動適用する）】');}
  const customTimeRule='・セルで時間指定勤務を設定する場合は、開始・終了時刻と実働時間を30分単位で入力する。入力した実働時間を月間勤務時間と8時間換算に反映する。選んだ勤務区分の人数にも算入し、手直ししたセルは固定する。日付をまたぐ夜勤は時間指定ではなくD→d→Eを使う。';
  const oldCustomTimeRule=customTimeRule.replace('30分単位で入力する','入力する');
  const previousCustomTimeRule='・セルで時間指定勤務を設定する場合は、開始・終了時刻から休憩時間を引いた実働時間を月間勤務時間と8時間換算に反映する。選んだ勤務区分の人数にも算入し、手直ししたセルは固定する。日付をまたぐ夜勤は時間指定ではなくD→d→Eを使う。';
  function withCustomTimeRule(text){const original=String(text),heading='【施設から追加された条件】';if(original.includes(previousCustomTimeRule))return original.replace(previousCustomTimeRule,customTimeRule);if(original.includes(oldCustomTimeRule))return original.replace(oldCustomTimeRule,customTimeRule);if(original.includes(customTimeRule)||!original.includes(heading))return original;const updated=original.replace(heading,heading+'\n'+customTimeRule);return updated.length<=20000?updated:original;}
  function withBcNightPreference(text){let value=String(text).replaceAll('B・Cが3日続いた人の翌日はEにする。','B・Cが3日続いた人の翌日は原則Eにする。Dは他の候補が難しい場合のみ許可し、要確認として警告する。').replaceAll('B・Cの3日連続後のEを満たせない場合は作成を止める','B・Cの3日連続後はEを優先し、例外のDには警告する').replaceAll('C・Dの人数、B・Cの3日連続後のE、休日9日の未達は警告し','C・Dの人数と休日9日の未達、およびB・Cの3日連続後の例外的なDは警告し');if(value.includes(bcNightPreferenceRule)||!value.includes('【施設から追加された条件】'))return value;const updated=value.replace('【施設から追加された条件】','【施設から追加された条件】\n'+bcNightPreferenceRule);return updated.length<=20000?updated:value;}
 const currentTemplate=r=>withBcNightPreference(withCustomTimeRule(withActiveAdditionalHeading(withoutImageObservations(withFullTimeHours(withAbsoluteRules(withPlanningOrder(withNightOnlyPartRule(withNightRoleRule(withFacilityRules(withStaffingRules(template(r))))))))))));
 root.ShiftConditions={withStaffingRules,withPlanningOrder,withAbsoluteRules,withoutImageObservations,withNineHolidayRule,withFullTimeHours,planningOrder:monthlyPlanningOrder,absoluteRules,fields,settings,template:currentTemplate,parse,facilityRules,withFacilityRules:text=>withBcNightPreference(withCustomTimeRule(withActiveAdditionalHeading(withFullTimeHours(withNightOnlyPartRule(withNightRoleRule(withFacilityRules(text)))))))};if(typeof module!=='undefined')module.exports=root.ShiftConditions;
})(typeof window!=='undefined'?window:globalThis);
