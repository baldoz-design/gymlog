import { useState, useRef } from 'react';

const S = {
  bg: '#121110', acc: '#D9F24B', ink: '#121110',
  muted: '#8E877C', text: '#F5F2EA', err: '#E0762C', card: '#1B1917'
};
const btn = {
  padding: '14px 0', borderRadius: 12, fontWeight: 800, fontSize: 15,
  border: 'none', cursor: 'pointer', width: '100%',
};

export default function Settings({ onBack, exportAllData, importAllData }) {
  const [exportStatus, setExportStatus] = useState(null); // null | 'loading' | 'ready' | 'done'
  const [exportJson,   setExportJson]   = useState('');

  const [importStep,   setImportStep]   = useState('idle'); // idle | file | confirm | running | done | error
  const [importText,   setImportText]   = useState('');
  const [importError,  setImportError]  = useState('');
  const [importFile,   setImportFile]   = useState('');
  const fileRef = useRef(null);

  // ── Export ──────────────────────────────────────────────────────────────
  async function handleExport() {
    setExportStatus('loading');
    try {
      const json = await exportAllData();
      setExportJson(json);
      setExportStatus('ready');
    } catch (e) {
      setExportStatus(null);
      alert('Errore export: ' + e.message);
    }
  }

  function handleDownload() {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gymlog-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setExportStatus('done');
  }

  // ── Import ──────────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      setImportText(ev.target.result);
      setImportStep('confirm');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImportStep('running');
    try {
      await importAllData(importText);
      setImportStep('done');
    } catch (e) {
      setImportError(String(e));
      setImportStep('error');
    }
  }

  function resetImport() {
    setImportStep('idle');
    setImportText('');
    setImportFile('');
    setImportError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: S.bg, fontFamily: 'sans-serif', boxSizing: 'border-box',
      maxWidth: 480, margin: '0 auto', width: '100%',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '18px 20px 10px', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: S.muted, fontSize: 22, lineHeight: 1 }}
          aria-label="Indietro"
        >
          ←
        </button>
        <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2, color: S.text }}>
          IMPOSTAZIONI
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Export card ── */}
        <div style={{ background: S.card, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div>
              <div style={{ color: S.text, fontWeight: 800, fontSize: 15 }}>Esporta dati</div>
              <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>
                Backup JSON di tutti i tuoi allenamenti
              </div>
            </div>
          </div>

          {exportStatus === null && (
            <button style={{ ...btn, background: S.acc, color: S.ink }}
              onClick={handleExport}>
              Prepara backup
            </button>
          )}
          {exportStatus === 'loading' && (
            <button style={{ ...btn, background: '#2a2a20', color: S.muted }} disabled>
              Caricamento…
            </button>
          )}
          {exportStatus === 'ready' && (
            <button style={{ ...btn, background: S.acc, color: S.ink }}
              onClick={handleDownload}>
              ⬇ Scarica gymlog-backup.json ({Math.round(exportJson.length / 1024)} KB)
            </button>
          )}
          {exportStatus === 'done' && (
            <div style={{ color: S.acc, fontWeight: 700, textAlign: 'center', padding: '10px 0' }}>
              ✓ File condiviso
            </div>
          )}
        </div>

        {/* ── Import card ── */}
        <div style={{ background: S.card, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div>
              <div style={{ color: S.text, fontWeight: 800, fontSize: 15 }}>Importa dati</div>
              <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>
                Ripristina da un file gymlog-backup.json
              </div>
            </div>
          </div>

          {importStep === 'idle' && (
            <label style={{ ...btn, background: '#2a3a1a', color: S.acc, border: '1px solid #4a5a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              Scegli file…
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          )}

          {importStep === 'confirm' && (
            <>
              <div style={{ color: S.muted, fontSize: 13 }}>
                File: <span style={{ color: S.text }}>{importFile}</span>
              </div>
              <div style={{ color: '#E0762C', fontSize: 12, lineHeight: 1.5 }}>
                ⚠ L'import sovrascriverà i dati esistenti.
              </div>
              <button style={{ ...btn, background: S.acc, color: S.ink }}
                onClick={handleImport}>
                Importa ora
              </button>
              <button style={{ ...btn, background: 'transparent', color: S.muted, border: '1px solid #332F2B' }}
                onClick={resetImport}>
                Annulla
              </button>
            </>
          )}

          {importStep === 'running' && (
            <div style={{ color: S.muted, textAlign: 'center', padding: '10px 0' }}>Importazione…</div>
          )}

          {importStep === 'done' && (
            <>
              <div style={{ color: S.acc, fontWeight: 700, textAlign: 'center', padding: '6px 0' }}>
                ✓ Dati importati con successo
              </div>
              <button style={{ ...btn, background: S.acc, color: S.ink }}
                onClick={onBack}>
                Torna all'app
              </button>
            </>
          )}

          {importStep === 'error' && (
            <>
              <div style={{ color: S.err, fontSize: 13, wordBreak: 'break-all' }}>
                ✗ {importError}
              </div>
              <button style={{ ...btn, background: S.acc, color: S.ink }}
                onClick={resetImport}>
                Riprova
              </button>
            </>
          )}
        </div>

        {/* ── Info ── */}
        <div style={{ color: S.muted, fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
          I dati sono salvati solo su questo dispositivo.<br />
          Usa Export + Import per trasferirli tra browser o app.
        </div>
      </div>
    </div>
  );
}
