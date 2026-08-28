import { useState, useEffect } from 'react';
import Home from './screens/Home';
import Session from './screens/Session';
import Stats from './screens/Stats';
import Program from './screens/Program';
import Calendar from './screens/Calendar';
import Splash from './screens/Splash';

const NAV_KEY = 'gymlog_nav';

function readNav() {
  try {
    const raw = localStorage.getItem(NAV_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeNav(screen, params) {
  try {
    if (screen === 'home') localStorage.removeItem(NAV_KEY);
    else localStorage.setItem(NAV_KEY, JSON.stringify({ screen, params }));
  } catch {}
}

async function exportAllData() {
  const db = await new Promise(res => {
    const r = indexedDB.open('gymlog'); r.onsuccess = () => res(r.result);
  });
  const result = {};
  for (const storeName of ['cycles', 'exercises', 'sessions', 'sessionEntries']) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    result[storeName] = await new Promise(res => {
      const tx = db.transaction(storeName, 'readonly');
      tx.objectStore(storeName).getAll().onsuccess = e => res(e.target.result);
    });
  }
  return JSON.stringify(result, null, 2);
}

async function importAllData(json) {
  let data;
  try { data = JSON.parse(json.trim()); }
  catch (e) { throw new Error('JSON parse error: ' + e.message + ' — primi 80 car: ' + json.slice(0, 80)); }
  if (typeof data !== 'object' || data === null) throw new Error('Il file non contiene un oggetto JSON valido');
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('gymlog');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(new Error('Impossibile aprire il database'));
  });
  for (const storeName of ['cycles', 'exercises', 'sessions', 'sessionEntries']) {
    const rows = data[storeName];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (!db.objectStoreNames.contains(storeName)) continue;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const row of rows) store.put(row);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = e => rej(new Error(storeName + ': ' + e.target.error)); });
  }
}

async function repairJuly13() {
  const db = await new Promise(res => {
    const r = indexedDB.open('gymlog'); r.onsuccess = () => res(r.result);
  });
  const tx = db.transaction(['sessionEntries'], 'readwrite');
  const store = tx.objectStore('sessionEntries');
  const sessId = '5a46bb66-a16b-4a83-95a9-9c9e9bff98f0';
  store.delete('b25ba9ec-13ff-4104-beb5-43e13f6a2d13');
  store.put({ id: crypto.randomUUID(), sessionId: sessId, exerciseId: 'e065520f-2e36-45e3-85fc-b03c1481a2b5', valueType: 'weight', weightKg: 16, elasticColor: null, isIncrease: false });
  store.put({ id: 'e4eb6829-e0de-419e-b6f2-83937d65f6b8', sessionId: sessId, exerciseId: 'f949e867-8d65-440a-a740-6d045f404133', valueType: 'weight', weightKg: 15, elasticColor: null, isIncrease: false });
  store.put({ id: 'acb60a87-f526-4942-9a58-52b05150f862', sessionId: sessId, exerciseId: '58b19af9-066c-4227-9212-4a6edd02b4a3', valueType: 'weight', weightKg: 10, elasticColor: null, isIncrease: false });
  store.put({ id: 'eb66332d-54e7-428b-87a0-dfffad083381', sessionId: sessId, exerciseId: '8e5ac91c-5a6e-48ed-ade7-a736f180e9a3', valueType: 'weight', weightKg: 10, elasticColor: null, isIncrease: false });
  store.put({ id: '1ff10993-e18a-4525-9125-8921e163488f', sessionId: sessId, exerciseId: '9dae9450-4853-4d62-9216-b8052d50a8e4', valueType: 'weight', weightKg: 10, elasticColor: null, isIncrease: false });
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export default function App() {
  // Leggo lo stato salvato una sola volta all'avvio (functional initializer)
  const [splashDone, setSplashDone] = useState(() => !!readNav());
  const [screen, setScreen]         = useState(() => readNav()?.screen || 'home');
  const [sessionParams, setSessionParams] = useState(() => readNav()?.params || null);
  const urlParams = new URLSearchParams(location.search);
  const [repairStatus, setRepairStatus] = useState(() => urlParams.has('repair') ? 'running' : null);
  const [mode] = useState(() => urlParams.has('export') ? 'export' : urlParams.has('import') ? 'import' : null);
  const [exportJson, setExportJson] = useState('');
  const [exportDone, setExportDone] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState(null); // null | 'running' | 'done' | 'error'
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (repairStatus !== 'running') return;
    repairJuly13()
      .then(() => { setRepairStatus('done'); })
      .catch(() => { setRepairStatus('error'); });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (mode !== 'export') return;
    exportAllData().then(json => setExportJson(json));
  }, []); // eslint-disable-line

  function navigate(target, params = null) {
    writeNav(target, params);
    setSessionParams(params);
    setScreen(target);
  }

  function goHome() {
    writeNav('home', null);
    setSessionParams(null);
    setScreen('home');
  }

  const S = { bg:'#121110', acc:'#D9F24B', ink:'#121110', muted:'#8E877C', text:'#F5F2EA', err:'#E0762C', card:'#1B1917' };
  const btn = { padding:'14px 0', borderRadius:12, fontWeight:800, fontSize:15, border:'none', cursor:'pointer', width:'100%' };

  if (mode === 'export') {
    function doExportDownload() {
      if (!exportJson) return;
      const blob = new Blob([exportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gymlog-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExportDone(true);
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:S.bg, padding:24, boxSizing:'border-box', gap:16, fontFamily:'sans-serif', justifyContent:'center' }}>
        <div style={{ fontSize:48, textAlign:'center' }}>📦</div>
        <h2 style={{ color:S.acc, margin:0, fontSize:22, fontWeight:900, textAlign:'center' }}>Esporta dati</h2>
        <p style={{ color:S.muted, margin:0, fontSize:14, textAlign:'center', lineHeight:1.5 }}>
          {exportJson ? `${Math.round(exportJson.length/1024)} KB da trasferire` : 'Caricamento…'}
        </p>
        <p style={{ color:S.muted, margin:0, fontSize:13, textAlign:'center', lineHeight:1.5 }}>
          Tocca il bottone — si aprirà il file da condividere via AirDrop o inviare a te stesso.
        </p>
        <button
          style={{ ...btn, background: exportJson ? S.acc : '#333', color: exportJson ? S.ink : S.muted, marginTop:8 }}
          disabled={!exportJson}
          onClick={doExportDownload}
        >
          {exportDone ? '✓ File condiviso' : '⬇ Scarica gymlog-backup.json'}
        </button>
        <button style={{ ...btn, background:'transparent', color:S.muted, border:'1px solid #332F2B' }}
          onClick={() => { window.location.href = '/'; }}>
          Torna all'app
        </button>
      </div>
    );
  }

  if (mode === 'import') {
    if (importStatus === 'running') {
      return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:S.bg, color:S.muted, fontFamily:'sans-serif', fontSize:18 }}>Importazione…</div>;
    }
    if (importStatus === 'done') {
      return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:S.bg, color:S.acc, fontFamily:'sans-serif', gap:16 }}>
        <span style={{ fontSize:48 }}>✓</span>
        <span style={{ fontSize:18, fontWeight:700 }}>Dati importati!</span>
        <button onClick={() => { window.location.href = '/'; }} style={{ ...btn, background:S.acc, color:S.ink, width:'auto', padding:'12px 32px' }}>Vai all'app</button>
      </div>;
    }
    if (importStatus === 'error') {
      return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:S.bg, color:S.err, fontFamily:'sans-serif', gap:12, padding:24, boxSizing:'border-box' }}>
        <span style={{ fontSize:32 }}>✗</span>
        <span style={{ fontSize:16, fontWeight:700 }}>Errore importazione</span>
        <span style={{ fontSize:12, color:S.muted, textAlign:'center', wordBreak:'break-all' }}>{importError}</span>
        <button onClick={() => { setImportStatus(null); setImportText(''); setImportError(''); }} style={{ ...btn, background:S.acc, color:S.ink, width:'auto', padding:'10px 28px' }}>Riprova</button>
      </div>;
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:S.bg, padding:24, boxSizing:'border-box', gap:16, fontFamily:'sans-serif', justifyContent:'center' }}>
        <div style={{ fontSize:48, textAlign:'center' }}>📥</div>
        <h2 style={{ color:S.acc, margin:0, fontSize:22, fontWeight:900, textAlign:'center' }}>Importa dati</h2>
        <p style={{ color:S.muted, margin:0, fontSize:13, textAlign:'center', lineHeight:1.5 }}>
          Seleziona il file <strong style={{color:S.text}}>gymlog-backup.json</strong> ricevuto via AirDrop o email.
        </p>
        <label style={{ ...btn, background:S.acc, color:S.ink, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          Scegli file…
          <input type="file" accept=".json,application/json" style={{ display:'none' }}
            onChange={e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => setImportText(ev.target.result);
              reader.readAsText(file);
            }}
          />
        </label>
        {importText && (
          <button
            style={{ ...btn, background:'#2a3a1a', color:S.acc, border:'1px solid #4a5a2a' }}
            onClick={() => {
              setImportStatus('running');
              importAllData(importText)
                .then(() => setImportStatus('done'))
                .catch(err => { setImportError(String(err)); setImportStatus('error'); });
            }}
          >
            ✓ File caricato — Importa ora
          </button>
        )}
        <button style={{ ...btn, background:'transparent', color:S.muted, border:'1px solid #332F2B' }}
          onClick={() => { window.location.href = '/'; }}>
          Annulla
        </button>
      </div>
    );
  }

  if (repairStatus === 'running') {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#121110', color:'#8E877C', fontFamily:'sans-serif', fontSize:18 }}>Correzione in corso…</div>;
  }
  if (repairStatus === 'done') {
    return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#121110', color:'#D9F24B', fontFamily:'sans-serif', gap:16 }}>
      <span style={{ fontSize:48 }}>✓</span>
      <span style={{ fontSize:18, fontWeight:700 }}>Dati corretti!</span>
      <button onClick={() => { window.location.href = '/'; }} style={{ marginTop:12, padding:'12px 28px', borderRadius:12, background:'#D9F24B', color:'#121110', fontWeight:800, fontSize:15, border:'none' }}>Vai all'app</button>
    </div>;
  }
  if (repairStatus === 'error') {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'#121110', color:'#E0762C', fontFamily:'sans-serif', fontSize:18 }}>Errore — riprova</div>;
  }

  if (!splashDone) {
    return <Splash onDone={() => setSplashDone(true)} />;
  }

  if (screen === 'session') {
    return <Session params={sessionParams} onBack={goHome} />;
  }
  if (screen === 'stats') {
    return <Stats onBack={goHome} />;
  }
  if (screen === 'program') {
    return <Program onBack={goHome} />;
  }
  if (screen === 'calendar') {
    return (
      <Calendar
        onBack={goHome}
        onNavigate={navigate}
      />
    );
  }
  return <Home onNavigate={navigate} />;
}
