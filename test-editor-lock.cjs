const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./dist/engine.js'),StaffStore=require('./dist/staff-store.js');

function memory(){const data=new Map();return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
function page(storage,locks){
 const handlers={},els=new Map(),document={querySelector(k){if(!els.has(k))els.set(k,{style:{},textContent:'',innerHTML:''});return els.get(k);},addEventListener(){},querySelectorAll(){return [];}};
 const ctx=vm.createContext({ShiftEngine:E,StaffStore,localStorage:storage,navigator:{locks},document,window:{addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn)},console:{warn(){}},setTimeout(){},clearTimeout(){}});
 vm.runInContext(fs.readFileSync('./dist/app-core.js','utf8'),ctx);vm.runInContext('render=()=>{}',ctx);
 return {run:code=>vm.runInContext(code,ctx),handlers};
}

async function main(){
 const storage=memory(),initial=E.fresh();E.month(initial,'2026-10');storage.setItem('akari-shift-state-v1',JSON.stringify(initial));
 let occupied=false;
 const locks={request(name,options,callback){assert.equal(name,'akari-shift-editor-v1');assert.equal(options.ifAvailable,true);if(occupied)return Promise.resolve(callback(null));occupied=true;return Promise.resolve(callback({name})).finally(()=>{occupied=false;});}};
 const first=page(storage,locks),second=page(storage,locks);
 assert.equal(first.run('editorOwnsLock'),false,'権限確認前は編集できない');
 assert.equal(first.run("change(()=>state.months['2026-10'].requests['s1:1']='E')"),false);
 first.run('beginEditorSession()');second.run('beginEditorSession()');
 assert.equal(first.run('editorOwnsLock'),true,'最初のタブだけが編集権限を持つ');
 assert.equal(second.run('editorOwnsLock'),false,'次のタブは閲覧専用');
 assert.equal(second.run("change(()=>state.months['2026-10'].requests['s1:2']='E')"),false,'閲覧専用タブは保存できない');
 assert.equal(second.run('persistState()'),false,'直接の保存も拒否する');
 assert.equal(second.run('importSavedState(E.fresh())'),false,'ファイル復元も拒否する');
 assert.equal(first.run("change(()=>state.months['2026-10'].requests['s1:1']='E')"),true);
 assert.equal(JSON.parse(storage.getItem('akari-shift-state-v1')).months['2026-10'].requests['s1:1'],'E');
  const currentSave=storage.getItem('akari-shift-state-v1'),stale=JSON.parse(currentSave);
  stale.months['2026-10'].requests={};
  const staleSave=JSON.stringify(stale);
  storage.setItem('akari-shift-state-v1',staleSave);
  first.handlers.storage[0]({key:'akari-shift-state-v1',newValue:staleSave,storageArea:storage});
  assert.equal(first.run("state.months['2026-10'].requests['s1:1']"),'E','旧タブの書き込みで編集中の希望を消さない');
  assert.equal(first.run('storageBlocked'),true,'競合後は自動保存を止める');
  assert.equal(first.run("change(()=>state.months['2026-10'].requests['s1:2']='E')"),false,'競合中の追加編集を拒否する');
  assert.equal(first.run("state.months['2026-10'].requests['s1:1']"),'E','ファイル保存用の画面データも保持する');
  storage.setItem('akari-shift-state-v1',currentSave);
 first.handlers.pagehide[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(occupied,false,'編集タブを閉じると権限を解放する');
 second.run('beginEditorSession()');
 assert.equal(second.run('editorOwnsLock'),true,'別タブが最新状態を読み直して編集を引き継ぐ');
 assert.equal(second.run("state.months['2026-10'].requests['s1:1']"),'E');
 assert.equal(second.run("change(()=>state.months['2026-10'].requests['s1:2']='E')"),true);
 const requests=JSON.parse(storage.getItem('akari-shift-state-v1')).months['2026-10'].requests;
 assert.equal(requests['s1:1'],'E');assert.equal(requests['s1:2'],'E','引き継ぎ後も前タブの希望を保持する');
 second.handlers.pagehide[0]();
 console.log('PASS: one editing tab at a time, read-only contenders, lock handoff and latest-state reload');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
