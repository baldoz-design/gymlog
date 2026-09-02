import { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth }          from './firebase';
import {
  getAllCycles, getAllExercises, getAllSessions, getAllSessionEntries,
  clearAllData, importFromJSON, migrateFromIndexedDB,
} from './db';
import Auth     from './screens/Auth';
import Home     from './screens/Home';
import Session  from './screens/Session';
import Stats    from './screens/Stats';
import Program  from './screens/Program';
import Calendar from './screens/Calendar';
import Splash   from './screens/Splash';
import Settings from './screens/Settings';

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

// ── Export / Import (usa Firestore tramite db.js) ──────────────────────────────

async function exportAllData() {
  const [cycles, exercises, sessions, sessionEntries] = await Promise.all([
    getAllCycles(),
    getAllExercises(),
    getAllSessions(),
    getAllSessionEntries(),
  ]);
  return JSON.stringify({ cycles, exercises, sessions, sessionEntries }, null, 2);
}

async function importAllData(json) {
  let data;
  try { data = JSON.parse(json.trim()); }
  catch (e) { throw new Error('JSON parse error: ' + e.message + ' — primi 80 car: ' + json.slice(0, 80)); }
  if (typeof data !== 'object' || data === null) throw new Error('Il file non contiene un oggetto JSON valido');
  await importFromJSON(data);
}

// ── Componente principale ──────────────────────────────────────────────────────

export default function App() {
  // Auth
  const [user,       setUser]       = useState(undefined); // undefined=loading, null=not authed
  const [authError,  setAuthError]  = useState('');

  // Migrazione IndexedDB → Firestore (una-tantum per browser)
  const [migStatus,  setMigStatus]  = useState('idle'); // idle | running | done | error
  const [migCount,   setMigCount]   = useState(0);

  // Navigazione app
  const [splashDone, setSplashDone] = useState(() => !!readNav());
  const [screen,     setScreen]     = useState(() => readNav()?.screen || 'home');
  const [sessionParams, setSessionParams] = useState(() => readNav()?.params || null);

  // ── Auth listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Gestisce il ritorno dal redirect Google Sign-in
    getRedirectResult(auth)
      .then(result => {
        if (result) setAuthError(''); // login riuscito via redirect
      })
      .catch(err => {
        if (err.code && err.code !== 'auth/no-current-user') {
          setAuthError('Accesso fallito: ' + err.message);
        }
      });

    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

  // ── Migrazione al primo accesso ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem('gymlog_cloud_ready_v1');
    if (flag) return;

    setMigStatus('running');
    migrateFromIndexedDB()
      .then(count => {
        localStorage.setItem('gymlog_cloud_ready_v1', '1');
        setMigCount(count);
        setMigStatus('done');
      })
      .catch(() => {
        // Se la migrazione fallisce (IndexedDB vuoto o errore),
        // segniamo comunque come fatto per non riprovare in loop.
        localStorage.setItem('gymlog_cloud_ready_v1', '1');
        setMigStatus('done');
      });
  }, [user]);

  // ── Navigazione ──────────────────────────────────────────────────────────────
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

  // ── Render stati di caricamento / auth ───────────────────────────────────────

  const S = { bg: '#121110', acc: '#D9F24B', ink: '#121110', muted: '#8E877C', text: '#F5F2EA' };
  const centerBox = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100dvh', background: S.bg,
    fontFamily: 'sans-serif', gap: 16, padding: 24, boxSizing: 'border-box',
    maxWidth: 480, margin: '0 auto', width: '100%',
  };

  if (user === undefined) {
    // Auth ancora in inizializzazione (di solito < 500ms)
    return <div style={{ ...centerBox }}>
      <div style={{ color: S.muted, fontSize: 14 }}>Connessione…</div>
    </div>;
  }

  if (user === null) {
    return <Auth error={authError} />;
  }

  if (migStatus === 'running') {
    return <div style={{ ...centerBox }}>
      <div style={{ fontSize: 36 }}>☁️</div>
      <div style={{ color: S.acc, fontWeight: 800, fontSize: 16 }}>Migrazione dati…</div>
      <div style={{ color: S.muted, fontSize: 13, textAlign: 'center' }}>
        Sto spostando i dati dal browser al cloud.<br />Ci vogliono pochi secondi.
      </div>
    </div>;
  }

  if (migStatus === 'done' && migCount > 0 && !localStorage.getItem('gymlog_mig_ack')) {
    return <div style={{ ...centerBox }}>
      <div style={{ fontSize: 42 }}>✅</div>
      <div style={{ color: S.acc, fontWeight: 800, fontSize: 18 }}>Migrazione completata</div>
      <div style={{ color: S.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
        {migCount} record spostati su Firestore.<br />
        Da ora i tuoi dati sono sincronizzati su tutti i browser.
      </div>
      <button
        onClick={() => { localStorage.setItem('gymlog_mig_ack', '1'); setMigStatus('idle'); }}
        style={{ background: S.acc, color: S.ink, border: 'none', borderRadius: 12, padding: '14px 32px', fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 8 }}
      >
        Vai all'app →
      </button>
    </div>;
  }

  // ── Schermate app ─────────────────────────────────────────────────────────────

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  if (screen === 'session')  return <Session  params={sessionParams} onBack={goHome} />;
  if (screen === 'stats')    return <Stats    onBack={goHome} />;
  if (screen === 'program')  return <Program  onBack={goHome} />;
  if (screen === 'calendar') return <Calendar onBack={goHome} onNavigate={navigate} />;
  if (screen === 'settings') return (
    <Settings
      onBack={goHome}
      exportAllData={exportAllData}
      importAllData={importAllData}
    />
  );

  return <Home onNavigate={navigate} />;
}
