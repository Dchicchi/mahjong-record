const PLAYERS = [
  { id: 'taku', name: '拓' },
  { id: 'anchan', name: 'あんちゃん' },
  { id: 'daichi', name: '大地' },
];

const BASE_YAKUMAN = [
  { name: '国士無双', tier: 'single' },
  { name: '四暗刻', tier: 'single' },
  { name: '大三元', tier: 'single' },
  { name: '字一色', tier: 'single' },
  { name: '緑一色', tier: 'single' },
  { name: '純正緑一色', tier: 'single' },
  { name: '小四喜', tier: 'single' },
  { name: '清老頭', tier: 'single' },
  { name: '九蓮宝燈', tier: 'single' },
  { name: '純正九蓮宝燈', tier: 'single' },
  { name: '四槓子', tier: 'single' },
  { name: '天和', tier: 'single' },
  { name: '地和', tier: 'single' },
  { name: '十三不塔', tier: 'single', local: true },
  { name: '大車輪', tier: 'single', local: true },
  { name: '小車輪', tier: 'single', local: true },
  { name: '四連刻', tier: 'single', local: true },
  { name: '国士無双十三面待ち', tier: 'double' },
  { name: '四暗刻単騎', tier: 'double' },
  { name: '大四喜', tier: 'double' },
];

const TYPES = { yakuman: '役満', kazoe: '数え役満', ippatsu: '一発', chombo: 'チョンボ' };
const STORAGE_KEY = 'mahjong-record-v4-records';
const V3_KEY = 'mahjong-record-v3-records';
const V2_KEY = 'mahjong-record-v2-records';
const LOCAL_YAKUMAN_KEY = 'mahjong-record-v4-local-yakuman';
const V3_LOCAL_KEY = 'mahjong-record-v3-local-yakuman';
const MATCH_STORAGE_KEY = 'mahjong-record-v6-matches';

let records = loadRecords();
let localYakuman = loadLocalYakuman();
let selectedDate = startOfDay(new Date());
let calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let statsCursor = new Date();
let pendingYakumanPlayer = null;
let selectedYakumanNames = new Set();
let matches = loadMatches();

const $ = (id) => document.getElementById(id);

function loadRecords() {
  try {
    const v4 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(v4)) return v4;

    const v3 = JSON.parse(localStorage.getItem(V3_KEY) || 'null');
    if (Array.isArray(v3)) {
      const migrated = v3.map(r => {
        if (r.type !== 'yakuman') return { ...r, count: r.count || 1 };
        const names = r.yakumanNames || [r.yakumanName || '役満（種類未記録）'];
        return {
          id: r.id || uid(), playerId: r.playerId, type: 'yakuman', yakumanNames: names,
          occurredAt: r.occurredAt, source: r.source || 'migration',
          createdAt: r.createdAt || r.occurredAt, updatedAt: r.updatedAt || r.occurredAt,
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const v2 = JSON.parse(localStorage.getItem(V2_KEY) || '[]');
    if (Array.isArray(v2)) {
      const migrated = v2.map(r => r.type === 'yakuman'
        ? { ...r, type: 'yakuman', yakumanNames: ['役満（種類未記録）'] }
        : { ...r, count: 1 });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return [];
}

function loadLocalYakuman() {
  try {
    const v4 = JSON.parse(localStorage.getItem(LOCAL_YAKUMAN_KEY) || 'null');
    if (Array.isArray(v4)) return v4;
    const v3 = JSON.parse(localStorage.getItem(V3_LOCAL_KEY) || '[]');
    if (Array.isArray(v3)) {
      const migrated = v3.map(y => ({ ...y, tier: y.tier || 'single' }));
      localStorage.setItem(LOCAL_YAKUMAN_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return [];
}

function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function saveLocalYakuman() { localStorage.setItem(LOCAL_YAKUMAN_KEY, JSON.stringify(localYakuman)); }
function loadMatches(){try{const v=JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
function saveMatches(){localStorage.setItem(MATCH_STORAGE_KEY,JSON.stringify(matches));}
const BACKUP_VERSION = 1;
function buildBackup(){
  return {
    app:'mahjong-record', version:BACKUP_VERSION,
    exportedAt:new Date().toISOString(),
    data:{records,localYakuman,matches}
  };
}
function isValidBackup(payload){
  if(!payload || payload.app!=='mahjong-record' || !payload.data) return false;
  const d=payload.data;
  return Array.isArray(d.records) && Array.isArray(d.localYakuman) && Array.isArray(d.matches);
}
function exportBackup(){
  const payload=buildBackup();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const date=toISODate(new Date());
  a.href=url;a.download=`mahjong-record-backup-${date}.json`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  showToast('バックアップを書き出しました');
}
async function importBackup(file){
  if(!file)return;
  try{
    const text=await file.text(); const payload=JSON.parse(text);
    if(!isValidBackup(payload)) throw new Error('invalid');
    if(!confirm('バックアップを復元しますか？\nこの端末の新規データはバックアップ内容で置き換わります。')) return;
    records=payload.data.records; localYakuman=payload.data.localYakuman; matches=payload.data.matches;
    saveRecords();saveLocalYakuman();saveMatches();renderAll();renderDataStatus();
    showToast('バックアップを復元しました');
  }catch(e){alert('このファイルは麻雀記録アプリのバックアップとして読み込めません。');}
  finally{if($('importBackupInput'))$('importBackupInput').value='';}
}
function renderDataStatus(){
  if(!$('dataStatus'))return;
  const days=new Set(records.map(r=>String(r.occurredAt||'').slice(0,10)).filter(Boolean));
  const matchDays=matches.filter(m=>(m.rounds||[]).length || Number(m.daichiBalance||0)!==0).length;
  const rounds=matches.reduce((s,m)=>s+(m.rounds||[]).length,0);
  $('dataStatus').innerHTML=`<div><span>日付別記録</span><strong>${records.length}件</strong></div><div><span>記録日</span><strong>${days.size}日</strong></div><div><span>半荘</span><strong>${rounds}回</strong></div><div><span>対局日</span><strong>${matchDays}日</strong></div>`;
}
function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function toISODate(date) { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function sameDate(a,b){ return toISODate(a)===toISODate(b); }
function formatDate(date){ return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`; }
function playerName(id){ return PLAYERS.find(p=>p.id===id)?.name || id; }
function uid(){ return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function countSimple(list, type, playerId=null){ return list.filter(r=>r.type===type && (!playerId || r.playerId===playerId)).reduce((s,r)=>s+(r.count||1),0); }
function allYakumanOptions(){
  const builtIn = BASE_YAKUMAN.map((y,i)=>({ id:`base:${i}`, ...y }));
  const custom = localYakuman.map(y=>({ ...y, local:true, tier:y.tier||'single' }));
  return [...builtIn, ...custom];
}
function tierLabel(tier){ return tier==='double' ? 'ダブル' : 'シングル'; }
function getYakumanTier(name){ return allYakumanOptions().find(y=>y.name===name)?.tier || 'single'; }
function yakumanPower(names){ return names.reduce((sum,n)=>sum+(getYakumanTier(n)==='double'?2:1),0); }
function recordLabel(r){
  if(r.type==='yakuman') return `役満・${(r.yakumanNames||['種類未記録']).join(' × ')}`;
  if(r.type==='kazoe') return '数え役満';
  return TYPES[r.type] || r.type;
}

function emptyTotals(){
  return Object.fromEntries(PLAYERS.map(p=>[p.id,{yakuman:0,kazoe:0,ippatsu:0,chombo:0}]));
}

function addLegacyBucket(totals,bucket){
  if(!bucket)return totals;
  PLAYERS.forEach(p=>{
    const src=bucket[p.id]||{};
    totals[p.id].yakuman += Number(src.yakuman||0);
    totals[p.id].ippatsu += Number(src.ippatsu||0);
    totals[p.id].chombo += Number(src.chombo||0);
  });
  return totals;
}

function legacyTotalsFor(year,month=null){
  const totals=emptyTotals();
  const y=LEGACY_DATA?.[year];
  if(!y)return totals;
  const months=month?[Number(month)]:Object.keys(y.months||{}).map(Number);
  months.forEach(m=>{
    const entry=y.months?.[m]; if(!entry)return;
    if(y.granularity==='month') addLegacyBucket(totals,entry);
    else Object.values(entry.weeks||{}).forEach(week=>addLegacyBucket(totals,week));
  });
  return totals;
}

function liveTotalsFor(list){
  const totals=emptyTotals();
  PLAYERS.forEach(p=>{
    const pr=list.filter(r=>r.playerId===p.id);
    totals[p.id].yakuman=pr.filter(r=>r.type==='yakuman').length;
    totals[p.id].kazoe=countSimple(pr,'kazoe');
    totals[p.id].ippatsu=countSimple(pr,'ippatsu');
    totals[p.id].chombo=countSimple(pr,'chombo');
  });
  return totals;
}

function mergeTotals(a,b){
  const out=emptyTotals();
  PLAYERS.forEach(p=>Object.keys(out[p.id]).forEach(k=>out[p.id][k]=(a[p.id]?.[k]||0)+(b[p.id]?.[k]||0)));
  return out;
}

function legacyTotalsForPeriod(period){
  const totals=emptyTotals();
  if(period==='all'){
    Object.keys(LEGACY_DATA||{}).forEach(y=>{
      const part=legacyTotalsFor(Number(y));
      PLAYERS.forEach(p=>['yakuman','ippatsu','chombo'].forEach(k=>totals[p.id][k]+=part[p.id][k]));
    });
    return totals;
  }
  const y=statsCursor.getFullYear();
  return legacyTotalsFor(y,period==='month'?statsCursor.getMonth()+1:null);
}

function sumPlayerTotals(totals,key){ return PLAYERS.reduce((s,p)=>s+(totals[p.id]?.[key]||0),0); }

function timestampForSelectedDate(){
  const now=new Date(); const d=new Date(selectedDate); d.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),0); return d.toISOString();
}

function adjustSimpleCount(playerId,type,delta){
  const dateIso=toISODate(selectedDate);
  const list=records.filter(r=>r.playerId===playerId && r.type===type && toISODate(new Date(r.occurredAt))===dateIso);
  if(delta>0){
    const target=list[0];
    if(target){ target.count=(target.count||1)+1; target.updatedAt=new Date().toISOString(); }
    else records.unshift({id:uid(),playerId,type,count:1,occurredAt:timestampForSelectedDate(),source:'app',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    showToast(`${playerName(playerId)}：${TYPES[type]} +1`);
  } else {
    const total=countSimple(list,type,playerId);
    if(total<=0){ showToast('これ以上は減らせません'); return; }
    const target=list[0];
    target.count=(target.count||1)-1; target.updatedAt=new Date().toISOString();
    if(target.count<=0) records=records.filter(r=>r.id!==target.id);
    showToast(`${playerName(playerId)}：${TYPES[type]} -1`);
  }
  saveRecords(); renderAll();
}

function addKazoe(playerId){
  records.unshift({id:uid(),playerId,type:'kazoe',count:1,occurredAt:timestampForSelectedDate(),source:'app',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  saveRecords(); renderAll(); showToast(`${playerName(playerId)}：数え役満 +1`);
}

function removeLatestKazoe(playerId){
  const dateIso=toISODate(selectedDate);
  const target=records.find(r=>r.playerId===playerId&&r.type==='kazoe'&&toISODate(new Date(r.occurredAt))===dateIso);
  if(!target){showToast('これ以上は減らせません');return;}
  records=records.filter(r=>r.id!==target.id); saveRecords(); renderAll(); showToast(`${playerName(playerId)}：数え役満 -1`);
}

function addYakumanRecord(playerId,names){
  if(!names.length) return;
  const now=new Date();
  records.unshift({id:uid(),playerId,type:'yakuman',yakumanNames:[...names],occurredAt:timestampForSelectedDate(),source:'app',createdAt:now.toISOString(),updatedAt:now.toISOString()});
  saveRecords(); renderAll(); showYakumanCelebration(playerName(playerId),names);
}

function deleteRecord(id){
  records=records.filter(r=>r.id!==id); saveRecords(); renderAll(); renderDayEdit(); showToast('記録を削除しました');
}

function moveRecordToDate(id,isoDate){
  const r=records.find(x=>x.id===id); if(!r)return;
  const old=new Date(r.occurredAt); const d=new Date(`${isoDate}T00:00:00`); d.setHours(old.getHours(),old.getMinutes(),old.getSeconds(),0);
  r.occurredAt=d.toISOString(); r.updatedAt=new Date().toISOString(); saveRecords(); renderAll(); renderDayEdit(); showToast('日付を変更しました');
}

function recordsForDate(date){ const iso=toISODate(date); return records.filter(r=>toISODate(new Date(r.occurredAt))===iso); }

function renderQuickRecord(){
  $('selectedDateBtn').textContent=formatDate(selectedDate);
  const today=startOfDay(new Date());
  $('dayStatus').textContent=sameDate(selectedDate,today)?'今日の麻雀を記録中':'この日の記録をあとから追加・修正できます';
  const dayList=recordsForDate(selectedDate);
  $('quickRecordGrid').innerHTML=PLAYERS.map(player=>{
    const ipp=countSimple(dayList,'ippatsu',player.id), cho=countSimple(dayList,'chombo',player.id), kaz=countSimple(dayList,'kazoe',player.id);
    const yak=dayList.filter(r=>r.playerId===player.id&&r.type==='yakuman').length;
    return `<article class="player-card">
      <div class="player-name-row"><div class="player-name">${player.name}</div><div class="mini-total">役満 ${yak}回</div></div>
      <div class="counter-stack">
        ${counterHtml(player.id,'ippatsu','一発',ipp)}
        ${counterHtml(player.id,'chombo','チョンボ',cho)}
        ${counterHtml(player.id,'kazoe','数え役満',kaz)}
      </div>
      <button class="yakuman-add-btn" data-yakuman-player="${player.id}">🀄 役満を追加</button>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-counter]').forEach(btn=>btn.onclick=()=>{
    const [playerId,type,delta]=btn.dataset.counter.split('|');
    if(type==='kazoe') Number(delta)>0?addKazoe(playerId):removeLatestKazoe(playerId);
    else adjustSimpleCount(playerId,type,Number(delta));
  });
  document.querySelectorAll('[data-yakuman-player]').forEach(btn=>btn.onclick=()=>openYakumanDialog(btn.dataset.yakumanPlayer));
}

function counterHtml(playerId,type,label,value){
  return `<div class="counter-row"><span class="counter-label">${label}</span><div class="counter-controls"><button class="counter-btn minus" data-counter="${playerId}|${type}|-1">−</button><strong class="counter-value">${value}</strong><button class="counter-btn plus" data-counter="${playerId}|${type}|1">＋</button></div></div>`;
}

function renderDaySummary(){
  const list=recordsForDate(selectedDate);
  if(!list.length){$('daySummary').innerHTML='<div class="empty mini">この日はまだ記録なし</div>';return;}
  $('daySummary').innerHTML=PLAYERS.map(p=>{
    const pr=list.filter(r=>r.playerId===p.id); if(!pr.length)return '';
    const chips=[]; const ipp=countSimple(pr,'ippatsu'),cho=countSimple(pr,'chombo'),kaz=countSimple(pr,'kazoe');
    if(ipp)chips.push(`<span class="day-chip">一発 ×${ipp}</span>`);
    if(cho)chips.push(`<span class="day-chip danger-chip">チョンボ ×${cho}</span>`);
    if(kaz)chips.push(`<span class="day-chip kazoe-chip">数え役満 ×${kaz}</span>`);
    pr.filter(r=>r.type==='yakuman').forEach(r=>{
      const names=r.yakumanNames||['種類未記録']; const power=yakumanPower(names);
      chips.push(`<span class="day-chip yakuman-chip">🀄 ${names.join(' × ')}${names.length>1?` <b>複合${power}倍</b>`:''}</span>`);
    });
    return `<div class="day-player"><strong>${p.name}</strong><div class="chip-row">${chips.join('')}</div></div>`;
  }).join('');
}

function renderYearSummary(){
  const year=new Date().getFullYear(); $('currentYearLabel').textContent=year;
  const list=records.filter(r=>new Date(r.occurredAt).getFullYear()===year);
  const cards=[['yakuman','役満和了',list.filter(r=>r.type==='yakuman').length],['kazoe','数え役満',countSimple(list,'kazoe')],['ippatsu','一発',countSimple(list,'ippatsu')],['chombo','チョンボ',countSimple(list,'chombo')]];
  $('yearSummary').innerHTML=cards.map(([,label,value])=>`<div class="summary-card"><div class="summary-value">${value}</div><div class="summary-label">${label}</div></div>`).join('');
}

function renderRecent(){
  const list=[...records].sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt)).slice(0,12);
  $('recentRecords').innerHTML=list.length?list.map(r=>{const d=new Date(r.occurredAt);const suffix=(r.count||1)>1?` ×${r.count}`:'';return `<button class="record-item record-item-button" data-open-date="${toISODate(d)}"><div><div class="record-main">${playerName(r.playerId)} ・ ${recordLabel(r)}${suffix}</div><div class="record-meta">${formatDate(d)}</div></div><span class="chev">›</span></button>`}).join(''):'<div class="empty">まだ記録がありません</div>';
  document.querySelectorAll('[data-open-date]').forEach(btn=>btn.onclick=()=>{selectedDate=startOfDay(new Date(`${btn.dataset.openDate}T00:00:00`));renderAll();switchView('homeView');openDayEdit();});
}

function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(); $('calendarMonthLabel').textContent=`${y}年${m+1}月`;
  const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=startOfDay(new Date()),cells=[];
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const dayRecords=recordsForDate(d),classes=['calendar-day'];
    if(d.getMonth()!==m)classes.push('other');if(sameDate(d,selectedDate))classes.push('selected');if(sameDate(d,today))classes.push('today');
    const hasYakuman=dayRecords.some(r=>r.type==='yakuman'||r.type==='kazoe');
    const totalEvents=dayRecords.reduce((s,r)=>s+(r.type==='yakuman'?1:(r.count||1)),0);
    cells.push(`<button class="${classes.join(' ')}" data-date="${toISODate(d)}"><span>${d.getDate()}</span>${dayRecords.length?`<span class="calendar-count ${hasYakuman?'yakuman-mark':''}">${hasYakuman?'🀄':totalEvents}</span>`:''}</button>`);
  }
  $('calendarGrid').innerHTML=cells.join('');
  document.querySelectorAll('[data-date]').forEach(btn=>btn.onclick=()=>{selectedDate=startOfDay(new Date(`${btn.dataset.date}T00:00:00`));calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);switchView('homeView');renderAll();});
}

function getStatsList(period){
  if(period==='all')return records;
  if(period==='year')return records.filter(r=>new Date(r.occurredAt).getFullYear()===statsCursor.getFullYear());
  return records.filter(r=>{const d=new Date(r.occurredAt);return d.getFullYear()===statsCursor.getFullYear()&&d.getMonth()===statsCursor.getMonth();});
}

function renderStats(){
  const period=$('statsPeriod').value;
  if(period==='all')$('statsControls').innerHTML='<span class="pill">通算</span>';
  else{
    const label=period==='year'?`${statsCursor.getFullYear()}年`:`${statsCursor.getFullYear()}年${statsCursor.getMonth()+1}月`;
    $('statsControls').innerHTML=`<div class="date-row"><button id="statsPrev" class="icon-btn">‹</button><div class="date-button text-center">${label}</div><button id="statsNext" class="icon-btn">›</button></div>`;
    $('statsPrev').onclick=()=>{period==='year'?statsCursor.setFullYear(statsCursor.getFullYear()-1):statsCursor.setMonth(statsCursor.getMonth()-1);renderStats();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();renderAwards();};
    $('statsNext').onclick=()=>{period==='year'?statsCursor.setFullYear(statsCursor.getFullYear()+1):statsCursor.setMonth(statsCursor.getMonth()+1);renderStats();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();renderAwards();};
  }
  const list=getStatsList(period);
  const live=liveTotalsFor(list), historical=legacyTotalsForPeriod(period), combined=mergeTotals(live,historical);
  $('statsTable').innerHTML=`<div class="stats-row stats-5 header"><div>プレイヤー</div><div class="stats-cell">役満</div><div class="stats-cell">数え</div><div class="stats-cell">一発</div><div class="stats-cell">チョンボ</div></div>${PLAYERS.map(p=>`<div class="stats-row stats-5"><strong>${p.name}</strong><div class="stats-cell">${combined[p.id].yakuman}</div><div class="stats-cell">${combined[p.id].kazoe}</div><div class="stats-cell">${combined[p.id].ippatsu}</div><div class="stats-cell">${combined[p.id].chombo}</div></div>`).join('')}`;
  const legacyCount=sumPlayerTotals(historical,'yakuman')+sumPlayerTotals(historical,'ippatsu')+sumPlayerTotals(historical,'chombo');
  $('legacyStatsNote').textContent=legacyCount?`※ この成績には取り込み済みの過去記録を含みます。過去の役満は種類が残っていないため役満図鑑には反映しません。`:'※ 役満図鑑は種類を記録できる新規データのみ反映します。';
  renderCollection(list);
}

function renderCollection(list){
  const counts={};
  list.filter(r=>r.type==='yakuman').forEach(r=>(r.yakumanNames||['種類未記録']).forEach(n=>counts[n]=(counts[n]||0)+1));
  const options=allYakumanOptions(); const extra=Object.keys(counts).filter(n=>!options.some(o=>o.name===n)).map(name=>({name,tier:'single'}));
  $('yakumanCollection').innerHTML=[...options,...extra].map(y=>`<div class="collection-card ${counts[y.name]?'unlocked':''}"><div class="collection-top"><div class="collection-icon">${counts[y.name]?'🀄':'？'}</div><span class="tier-badge ${y.tier==='double'?'double':''}">${tierLabel(y.tier)}</span></div><div class="collection-name">${y.name}</div><div class="collection-count">${counts[y.name]?`${counts[y.name]}回`:'未達成'}</div></div>`).join('');
}

function openYakumanDialog(playerId){
  pendingYakumanPlayer=playerId; selectedYakumanNames=new Set();
  $('yakumanDialogTitle').textContent=`${playerName(playerId)}の役満`;
  renderYakumanOptions(); updateYakumanSelectionSummary(); $('yakumanDialog').showModal();
}

function renderYakumanOptions(){
  $('yakumanOptions').innerHTML=allYakumanOptions().map(y=>`<button class="yakuman-option ${y.local?'local':''} ${selectedYakumanNames.has(y.name)?'selected':''}" data-yakuman="${encodeURIComponent(y.name)}"><span>${y.name}</span><small class="${y.tier==='double'?'double-small':''}">${tierLabel(y.tier)}${y.local?' / LOCAL':''}</small></button>`).join('');
  document.querySelectorAll('[data-yakuman]').forEach(btn=>btn.onclick=()=>{
    const name=decodeURIComponent(btn.dataset.yakuman);
    selectedYakumanNames.has(name)?selectedYakumanNames.delete(name):selectedYakumanNames.add(name);
    renderYakumanOptions(); updateYakumanSelectionSummary();
  });
}

function updateYakumanSelectionSummary(){
  const names=[...selectedYakumanNames]; const power=yakumanPower(names);
  $('yakumanSelectionSummary').innerHTML=names.length?`<strong>${names.length>1?'🔥 複合役満':'選択中'}</strong><span>${names.join(' × ')}</span><em>合計 ${power}倍役満</em>`:'<span>1つ以上選んでください。複数選択で複合役満になります。</span>';
  $('saveYakumanBtn').disabled=!names.length;
}

function showYakumanCelebration(player,names){
  const el=$('celebration'),power=yakumanPower(names),card=el.querySelector('.celebration-card');
  const mega=names.length>1||power>=2;
  $('celebrationTitle').textContent=names.length>1?'🔥 複 合 役 満 🔥':names[0];
  $('celebrationNames').textContent=names.join(' × ');
  $('celebrationSub').innerHTML=`${player}、${power}倍役満炸裂！！${mega?'<div class=\"confetti-line\">🎉🀄🎊🀄🎉</div>':''}`;
  card?.classList.toggle('mega',mega);
  el.classList.add('show'); clearTimeout(showYakumanCelebration.timer); showYakumanCelebration.timer=setTimeout(()=>{el.classList.remove('show');card?.classList.remove('mega');},3000);
}

function openDayEdit(){$('dayEditTitle').textContent=formatDate(selectedDate);renderDayEdit();$('dayEditDialog').showModal();}
function renderDayEdit(){
  if(!$('dayEditDialog'))return;const list=[...recordsForDate(selectedDate)].sort((a,b)=>new Date(a.occurredAt)-new Date(b.occurredAt));
  $('dayEditList').innerHTML=list.length?list.map(r=>`<div class="edit-record"><div><div class="record-main">${playerName(r.playerId)} ・ ${recordLabel(r)}${(r.count||1)>1?` ×${r.count}`:''}</div><div class="record-meta">登録 ${new Date(r.createdAt||r.occurredAt).toLocaleString('ja-JP')}</div></div><div class="edit-actions"><input class="mini-date" type="date" value="${toISODate(new Date(r.occurredAt))}" data-move="${r.id}"><button class="delete-mini" data-delete="${r.id}">削除</button></div></div>`).join(''):'<div class="empty">この日の記録はありません</div>';
  document.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>{if(confirm('この記録を削除しますか？'))deleteRecord(btn.dataset.delete);});
  document.querySelectorAll('[data-move]').forEach(inp=>inp.onchange=()=>moveRecordToDate(inp.dataset.move,inp.value));
}

function legacyMonthTotals(year,month){ return legacyTotalsFor(Number(year),Number(month)); }

function legacyMetricRow(label,totals){
  return `<div class="legacy-row"><strong>${label}</strong>${PLAYERS.map(p=>`<span>${p.name}<b>役 ${totals[p.id].yakuman}</b><b>一 ${totals[p.id].ippatsu}</b><b>チ ${totals[p.id].chombo}</b></span>`).join('')}</div>`;
}

function renderLegacyHistory(){
  if(!$('legacyYearSelect')||!$('legacyHistory'))return;
  const year=Number($('legacyYearSelect').value), data=LEGACY_DATA?.[year];
  if(!data){$('legacyHistory').innerHTML='<div class="empty">過去記録がありません</div>';return;}
  const yearTotals=legacyTotalsFor(year);
  const summary=`<div class="legacy-year-summary"><div><span>役満</span><strong>${sumPlayerTotals(yearTotals,'yakuman')}</strong></div><div><span>一発</span><strong>${sumPlayerTotals(yearTotals,'ippatsu')}</strong></div><div><span>チョンボ</span><strong>${sumPlayerTotals(yearTotals,'chombo')}</strong></div></div>`;
  const months=Object.keys(data.months||{}).map(Number).sort((a,b)=>a-b).map(month=>{
    const entry=data.months[month], totals=legacyMonthTotals(year,month);
    if(data.granularity==='month'){
      return `<details class="legacy-month"><summary><strong>${month}月</strong><span>役満 ${sumPlayerTotals(totals,'yakuman')} / 一発 ${sumPlayerTotals(totals,'ippatsu')} / チョンボ ${sumPlayerTotals(totals,'chombo')}</span></summary><div class="legacy-body">${legacyMetricRow(`${month}月 合計`,totals)}</div></details>`;
    }
    const weekRows=Object.keys(entry.weeks||{}).map(Number).sort((a,b)=>a-b).map(w=>{
      const t=emptyTotals();addLegacyBucket(t,entry.weeks[w]);return legacyMetricRow(`${w}週目`,t);
    }).join('');
    return `<details class="legacy-month"><summary><strong>${month}月</strong><span>役満 ${sumPlayerTotals(totals,'yakuman')} / 一発 ${sumPlayerTotals(totals,'ippatsu')} / チョンボ ${sumPlayerTotals(totals,'chombo')}</span></summary><div class="legacy-body">${weekRows}${legacyMetricRow('月合計',totals)}</div></details>`;
  }).join('');
  $('legacyHistory').innerHTML=summary+months;
}

function renderLocalYakuman(){
  $('localYakumanList').innerHTML=localYakuman.length?localYakuman.map(y=>`<div class="record-item"><div><div class="record-main">${y.name}</div><div class="record-meta">ローカル役満 / ${tierLabel(y.tier||'single')}</div></div><div class="inline-actions"><button class="undo-btn" data-edit-local="${y.id}">編集</button><button class="undo-btn danger" data-delete-local="${y.id}">削除</button></div></div>`).join(''):'<div class="empty">追加のローカル役満はまだありません</div>';
  document.querySelectorAll('[data-edit-local]').forEach(btn=>btn.onclick=()=>openLocalYakumanDialog(btn.dataset.editLocal));
  document.querySelectorAll('[data-delete-local]').forEach(btn=>btn.onclick=()=>{const y=localYakuman.find(x=>x.id===btn.dataset.deleteLocal);if(y&&confirm(`「${y.name}」を一覧から削除しますか？\n過去の記録は残ります。`)){localYakuman=localYakuman.filter(x=>x.id!==y.id);saveLocalYakuman();renderAll();}});
}

function openLocalYakumanDialog(id=null){
  const y=localYakuman.find(x=>x.id===id);$('editingLocalYakumanId').value=y?.id||'';$('localYakumanName').value=y?.name||'';$('localYakumanTier').value=y?.tier||'single';$('localYakumanDialogTitle').textContent=y?'ローカル役満を編集':'ローカル役満を追加';$('localYakumanDialog').showModal();setTimeout(()=>$('localYakumanName').focus(),50);
}


function matchForDate(date,create=false){
  const iso=toISODate(date);
  let m=matches.find(x=>x.date===iso);
  if(!m&&create){m={id:uid(),date:iso,rounds:[],daichiBalance:0};matches.push(m);saveMatches();}
  return m||{id:null,date:iso,rounds:[],daichiBalance:0};
}
function addRound(){
  const m=matchForDate(selectedDate,true);
  m.rounds.push({id:uid(),taku:1,anchan:2,daichi:3});
  saveMatches();renderMatchDay();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();showToast('半荘を追加しました');
}
function setRoundRank(roundId,playerId,rank){
  const m=matchForDate(selectedDate,true),r=m.rounds.find(x=>x.id===roundId); if(!r)return;
  rank=Number(rank); const other=PLAYERS.find(p=>p.id!==playerId && r[p.id]===rank);
  const old=r[playerId]; r[playerId]=rank; if(other)r[other.id]=old;
  saveMatches();renderMatchDay();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();
}
function deleteRound(roundId){
  const m=matchForDate(selectedDate,true);m.rounds=m.rounds.filter(r=>r.id!==roundId);saveMatches();renderMatchDay();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();
}
function setDaichiBalance(value){
  const m=matchForDate(selectedDate,true);m.daichiBalance=Number(value||0);saveMatches();renderMatchStats();renderTrendCharts();renderTitles();
}
function renderMatchDay(){
  if(!$('matchDayPanel'))return; const m=matchForDate(selectedDate);
  const rounds=m.rounds.map((r,i)=>`<div class="round-card"><div class="round-head"><strong>${i+1}半荘目</strong><button class="delete-mini" data-del-round="${r.id}">削除</button></div>${PLAYERS.map(p=>`<div class="rank-row"><span>${p.name}</span><div class="rank-buttons">${[1,2,3].map(n=>`<button class="${r[p.id]===n?'active':''}" data-rank-round="${r.id}" data-rank-player="${p.id}" data-rank="${n}">${n}位</button>`).join('')}</div></div>`).join('')}</div>`).join('');
  $('matchDayPanel').innerHTML=`<div class="match-actions"><button id="addRoundBtn" class="primary-small">＋ 半荘を追加</button><label class="balance-label">大地の収支 <input id="daichiBalanceInput" type="number" step="100" value="${m.daichiBalance||0}"> 円</label></div>${rounds||'<div class="empty mini">まだ半荘記録なし</div>'}`;
  $('addRoundBtn').onclick=addRound;$('daichiBalanceInput').onchange=e=>setDaichiBalance(e.target.value);
  document.querySelectorAll('[data-rank-round]').forEach(b=>b.onclick=()=>setRoundRank(b.dataset.rankRound,b.dataset.rankPlayer,b.dataset.rank));
  document.querySelectorAll('[data-del-round]').forEach(b=>b.onclick=()=>deleteRound(b.dataset.delRound));
}
function matchListForPeriod(period){
  if(period==='all')return matches;
  const y=statsCursor.getFullYear(),m=statsCursor.getMonth()+1;
  return matches.filter(x=>{const d=new Date(x.date+'T00:00:00');return d.getFullYear()===y&&(period==='year'||d.getMonth()+1===m);});
}
function renderMatchStats(){
  if(!$('matchStats'))return; const period=$('statsPeriod').value,list=matchListForPeriod(period);
  const stats=Object.fromEntries(PLAYERS.map(p=>[p.id,{n:0,w1:0,w2:0,w3:0,sum:0}]));
  list.forEach(m=>m.rounds.forEach(r=>PLAYERS.forEach(p=>{const rank=Number(r[p.id]);if(rank){stats[p.id].n++;stats[p.id]['w'+rank]++;stats[p.id].sum+=rank;}})));
  const bal=list.reduce((s,m)=>s+Number(m.daichiBalance||0),0);
  $('matchStats').innerHTML=`<div class="match-kpis"><div><span>半荘数</span><strong>${stats.daichi.n}</strong></div><div><span>大地 1着率</span><strong>${stats.daichi.n?Math.round(stats.daichi.w1/stats.daichi.n*100):0}%</strong></div><div><span>大地 平均順位</span><strong>${stats.daichi.n?(stats.daichi.sum/stats.daichi.n).toFixed(2):'-'}</strong></div><div><span>大地 収支</span><strong class="${bal<0?'money-neg':'money-pos'}">${bal>=0?'+':''}${bal.toLocaleString()}円</strong></div></div><div class="stats-table">${PLAYERS.map(p=>{const s=stats[p.id];return `<div class="match-stat-row"><strong>${p.name}</strong><span>1着 ${s.w1}</span><span>2着 ${s.w2}</span><span>3着 ${s.w3}</span><span>勝率 ${s.n?Math.round(s.w1/s.n*100):0}%</span><span>平均 ${s.n?(s.sum/s.n).toFixed(2):'-'}</span></div>`}).join('')}</div>`;
}
function renderAwards(){
  if(!$('funAwards'))return; const totals=mergeTotals(legacyTotalsForPeriod('all'),liveTotalsFor(records));
  const top=(key)=>[...PLAYERS].sort((a,b)=>totals[b.id][key]-totals[a.id][key])[0];
  const y=top('yakuman'),i=top('ippatsu'),c=top('chombo');
  const allBal=matches.reduce((s,m)=>s+Number(m.daichiBalance||0),0);
  $('funAwards').innerHTML=`<div class="award-card">👑<strong>役満王</strong><span>${y.name} ${totals[y.id].yakuman}回</span></div><div class="award-card">⚡<strong>一発王</strong><span>${i.name} ${totals[i.id].ippatsu}回</span></div><div class="award-card">💥<strong>やらかし王</strong><span>${c.name} ${totals[c.id].chombo}回</span></div><div class="award-card">${allBal>=0?'💰':'💸'}<strong>大地の通算収支</strong><span>${allBal>=0?'+':''}${allBal.toLocaleString()}円</span></div>`;
}

function svgLineChart(values,{percent=false,money=false}={}){
  if(!values.length)return '<div class="chart-empty">まだデータがありません</div>';
  const w=640,h=170,p=18,min=Math.min(...values,0),max=Math.max(...values,0),range=(max-min)||1;
  const pts=values.map((v,i)=>{const x=p+(w-p*2)*(values.length===1?.5:i/(values.length-1));const y=h-p-(v-min)/range*(h-p*2);return [x,y,v];});
  const line=pts.map((q,i)=>`${i?'L':'M'} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  const zeroY=h-p-(0-min)/range*(h-p*2);
  return `<svg viewBox="0 0 ${w} ${h}" role="img"><line x1="${p}" y1="${zeroY}" x2="${w-p}" y2="${zeroY}" stroke="currentColor" opacity=".12"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${pts.map(q=>`<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="currentColor"/>`).join('')}</svg>`;
}
function renderTrendCharts(){
  if(!$('balanceChart'))return;
  const list=[...matchListForPeriod($('statsPeriod').value)].sort((a,b)=>a.date.localeCompare(b.date));
  let running=0,rounds=0,wins=0; const balances=[],rates=[];
  list.forEach(m=>{running+=Number(m.daichiBalance||0);balances.push(running);m.rounds.forEach(r=>{if(Number(r.daichi)){rounds++;if(Number(r.daichi)===1)wins++;}});rates.push(rounds?wins/rounds*100:0);});
  $('balanceChart').innerHTML=svgLineChart(balances,{money:true});
  $('winRateChart').innerHTML=svgLineChart(rates,{percent:true});
  $('balanceTrendLabel').textContent=`${running>=0?'+':''}${running.toLocaleString()}円`;
  $('winRateTrendLabel').textContent=rounds?`${(wins/rounds*100).toFixed(1)}%`:'-';
}
function currentMonthCombinedTotals(){
  const y=statsCursor.getFullYear(),m=statsCursor.getMonth()+1;
  const live=liveTotalsFor(records.filter(r=>{const d=new Date(r.occurredAt);return d.getFullYear()===y&&d.getMonth()+1===m;}));
  return mergeTotals(live,legacyTotalsFor(y,m));
}
function renderMonthlyMvp(){
  if(!$('monthlyMvp'))return; const totals=currentMonthCombinedTotals(),ml=matchListForPeriod('month');
  const rankStats=Object.fromEntries(PLAYERS.map(p=>[p.id,{n:0,w1:0,sum:0}]));
  ml.forEach(m=>m.rounds.forEach(r=>PLAYERS.forEach(p=>{const rank=Number(r[p.id]);if(rank){rankStats[p.id].n++;rankStats[p.id].sum+=rank;if(rank===1)rankStats[p.id].w1++;}})));
  const scored=PLAYERS.map(p=>{const t=totals[p.id],rs=rankStats[p.id];const avg=rs.n?rs.sum/rs.n:0;const score=t.yakuman*12+t.ippatsu*2-t.chombo*4+rs.w1*3+(rs.n&&avg?Math.max(0,(3-avg))*2:0);return {p,t,rs,score};}).sort((a,b)=>b.score-a.score);
  const x=scored[0];
  $('monthlyMvp').innerHTML=`<div class="mvp-crown">👑</div><div class="mvp-name">${x.p.name}</div><div class="mvp-score">MVPスコア ${x.score.toFixed(1)}</div><div class="mvp-detail">役満 ${x.t.yakuman} / 一発 ${x.t.ippatsu} / チョンボ ${x.t.chombo}${x.rs.n?` / 1着 ${x.rs.w1} / 平均 ${(x.rs.sum/x.rs.n).toFixed(2)}`:''}</div>`;
}
function renderTitles(){
  if(!$('titleCollection'))return; const totals=mergeTotals(legacyTotalsForPeriod('all'),liveTotalsFor(records)),d=totals.daichi,allBal=matches.reduce((s,m)=>s+Number(m.daichiBalance||0),0);
  const roundCount=matches.reduce((s,m)=>s+m.rounds.length,0),winCount=matches.reduce((s,m)=>s+m.rounds.filter(r=>Number(r.daichi)===1).length,0);
  const defs=[
    ['🀄','役満ハンター','役満を10回以上',d.yakuman>=10],['🔥','役満ジャンキー','役満を30回以上',d.yakuman>=30],['⚡','一発屋','一発を50回以上',d.ippatsu>=50],['💥','やらかし名人','チョンボを10回以上',d.chombo>=10],
    ['💰','勝ち組','通算収支が+10,000円以上',allBal>=10000],['👑','トップギア','1着を20回以上',winCount>=20],['🎲','打ち込み勢','50半荘以上記録',roundCount>=50],['🌈','複合役満師','複合役満を1回以上',records.some(r=>r.type==='yakuman'&&(r.yakumanNames||[]).length>1)]
  ];
  $('titleCollection').innerHTML=defs.map(([e,n,c,u])=>`<div class="title-card ${u?'':'locked'}"><span class="emoji">${u?e:'🔒'}</span><strong>${n}</strong><span>${u?'獲得済み':c}</span></div>`).join('');
}
function renderAll(){renderQuickRecord();renderDaySummary();renderMatchDay();renderYearSummary();renderRecent();renderCalendar();renderStats();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();renderAwards();renderLegacyHistory();renderLocalYakuman();renderDataStatus();}
function switchView(viewId){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===viewId));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===viewId));if(viewId==='calendarView')renderCalendar();if(viewId==='statsView'){renderStats();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();renderAwards();renderLegacyHistory();}if(viewId==='settingsView')renderLocalYakuman();}
function showToast(text){const toast=$('toast');toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),1600);}

$('prevDay').onclick=()=>{selectedDate.setDate(selectedDate.getDate()-1);selectedDate=startOfDay(selectedDate);renderAll();};
$('nextDay').onclick=()=>{selectedDate.setDate(selectedDate.getDate()+1);selectedDate=startOfDay(selectedDate);renderAll();};
$('todayBtn').onclick=()=>{selectedDate=startOfDay(new Date());calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);renderAll();switchView('homeView');};
$('selectedDateBtn').onclick=()=>{$('datePicker').value=toISODate(selectedDate);$('calendarDialog').showModal();};
$('applyDateBtn').onclick=(e)=>{e.preventDefault();if($('datePicker').value){selectedDate=startOfDay(new Date(`${$('datePicker').value}T00:00:00`));calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);renderAll();$('calendarDialog').close();}};
$('prevMonth').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();};
$('nextMonth').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();};
$('statsPeriod').onchange=()=>{renderStats();renderMatchStats();renderTrendCharts();renderMonthlyMvp();renderTitles();renderAwards();};
$('legacyYearSelect').onchange=renderLegacyHistory;
$('editDayBtn').onclick=openDayEdit;
$('closeDayEditDialog').onclick=()=>$('dayEditDialog').close();
$('addFromDayEdit').onclick=()=>{$('dayEditDialog').close();showToast('下のカウンターから追加できます');};
$('closeYakumanDialog').onclick=()=>$('yakumanDialog').close();
$('saveYakumanBtn').onclick=()=>{const names=[...selectedYakumanNames];if(!names.length)return;$('yakumanDialog').close();addYakumanRecord(pendingYakumanPlayer,names);pendingYakumanPlayer=null;selectedYakumanNames=new Set();};
$('openLocalFromYakuman').onclick=()=>{$('yakumanDialog').close();openLocalYakumanDialog();};
$('addLocalYakumanBtn').onclick=()=>openLocalYakumanDialog();
$('closeLocalYakumanDialog').onclick=()=>$('localYakumanDialog').close();
$('localYakumanForm').onsubmit=(e)=>{e.preventDefault();const name=$('localYakumanName').value.trim(),tier=$('localYakumanTier').value;if(!name)return;const id=$('editingLocalYakumanId').value;if(id){const y=localYakuman.find(x=>x.id===id);if(y){y.name=name;y.tier=tier;}}else{localYakuman.push({id:uid(),name,tier});}saveLocalYakuman();$('localYakumanDialog').close();renderAll();showToast('ローカル役満を保存しました');};
$('exportBackupBtn').onclick=exportBackup;
$('importBackupInput').onchange=(e)=>importBackup(e.target.files?.[0]);
$('clearAllBtn').onclick=()=>{if(confirm('この端末で追加した日付別記録・追加ローカル役満・対局成績を削除しますか？\n2022〜2025の取り込み済み過去記録は残ります。\n\n必要なら先にバックアップを書き出してください。')){records=[];localYakuman=[];matches=[];saveRecords();saveLocalYakuman();saveMatches();renderAll();showToast('端末の新規データを削除しました');}};
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
$('celebration').onclick=()=>$('celebration').classList.remove('show');

renderAll();

// Phase 9: installable PWA support
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = $('installAppBtn');
  if (btn) btn.hidden = false;
  if ($('installStatus')) $('installStatus').textContent = 'このブラウザでは直接追加できます。';
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if ($('installAppBtn')) $('installAppBtn').hidden = true;
  if ($('installStatus')) $('installStatus').textContent = 'ホーム画面への追加が完了しました。';
});
if ($('installAppBtn')) {
  $('installAppBtn').onclick = async () => {
    if (!deferredInstallPrompt) {
      showToast('iPhoneはSafariの共有 → ホーム画面に追加');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $('installAppBtn').hidden = true;
  };
}
if ($('installStatus') && window.matchMedia('(display-mode: standalone)').matches) {
  $('installStatus').textContent = 'ホーム画面から起動中です。';
}
