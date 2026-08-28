import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'gymlog';
const DB_VERSION = 1;

function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('exercises')) {
        const exercises = db.createObjectStore('exercises', { keyPath: 'id' });
        exercises.createIndex('canonicalName', 'canonicalName', { unique: true });
      }
      if (!db.objectStoreNames.contains('cycles')) {
        const cycles = db.createObjectStore('cycles', { keyPath: 'id' });
        cycles.createIndex('startDate', 'startDate');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('date', 'date');
        sessions.createIndex('cycleId', 'cycleId');
      }
      if (!db.objectStoreNames.contains('sessionEntries')) {
        const entries = db.createObjectStore('sessionEntries', { keyPath: 'id' });
        entries.createIndex('sessionId', 'sessionId');
        entries.createIndex('exerciseId', 'exerciseId');
      }
    },
  });
}

let dbPromise = null;
function getDB() {
  if (!dbPromise) dbPromise = initDB();
  return dbPromise;
}

// --- Exercises ---

export async function getAllExercises() {
  const db = await getDB();
  return db.getAll('exercises');
}

export async function getExerciseById(id) {
  const db = await getDB();
  return db.get('exercises', id);
}

export async function renameExercise(id, newName) {
  const db = await getDB();
  const ex = await db.get('exercises', id);
  if (!ex) return;
  await db.put('exercises', { ...ex, canonicalName: newName });
}

export async function saveExercise(exercise) {
  const db = await getDB();
  await db.put('exercises', exercise);
  return exercise;
}

export async function findExerciseByName(name) {
  const db = await getDB();
  const all = await db.getAll('exercises');
  return all.find(e => e.canonicalName.toLowerCase() === name.toLowerCase()) || null;
}

// --- Cycles ---

export async function getAllCycles() {
  const db = await getDB();
  return db.getAll('cycles');
}

export async function getCycleById(id) {
  const db = await getDB();
  return db.get('cycles', id);
}

export async function saveCycle(cycle) {
  const db = await getDB();
  await db.put('cycles', cycle);
  return cycle;
}

export async function getActiveCycle(todayISO) {
  const db = await getDB();
  const all = await db.getAll('cycles');
  // Restituisce il ciclo attivo più recente, senza vincolo di endDate
  const active = all.filter(c => c.status === 'active' && c.startDate <= todayISO);
  if (!active.length) return null;
  return active.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

export async function archiveAllActiveCycles() {
  const db = await getDB();
  const all = await db.getAll('cycles');
  const tx = db.transaction('cycles', 'readwrite');
  for (const c of all) {
    if (c.status === 'active') {
      tx.store.put({ ...c, status: 'archived' });
    }
  }
  await tx.done;
}

// --- Sessions ---

export async function getSessionByDateAndSlot(dateISO, slot) {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'date', dateISO);
  return all.find(s => s.slot === slot) || null;
}

export async function saveSession(session) {
  const db = await getDB();
  await db.put('sessions', session);
  return session;
}

export async function deleteSession(sessionId) {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'sessionEntries'], 'readwrite');
  const entries = await tx.objectStore('sessionEntries').index('sessionId').getAll(sessionId);
  for (const e of entries) tx.objectStore('sessionEntries').delete(e.id);
  tx.objectStore('sessions').delete(sessionId);
  await tx.done;
}

export async function getAllSessions() {
  const db = await getDB();
  return db.getAll('sessions');
}

// --- Session Entries ---

export async function getEntriesBySession(sessionId) {
  const db = await getDB();
  return db.getAllFromIndex('sessionEntries', 'sessionId', sessionId);
}

export async function saveSessionEntry(entry) {
  const db = await getDB();
  await db.put('sessionEntries', entry);
  return entry;
}

export async function deleteSessionEntry(entryId) {
  const db = await getDB();
  await db.delete('sessionEntries', entryId);
}

export async function getLastEntryForExercise(exerciseId, beforeDateISO) {
  const db = await getDB();
  const allEntries = await db.getAllFromIndex('sessionEntries', 'exerciseId', exerciseId);
  const allSessions = await db.getAll('sessions');
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));

  const relevant = allEntries
    .filter(e => {
      const session = sessionMap[e.sessionId];
      return session && session.date < beforeDateISO;
    })
    .sort((a, b) => {
      const da = sessionMap[a.sessionId]?.date || '';
      const db2 = sessionMap[b.sessionId]?.date || '';
      return db2.localeCompare(da);
    });

  return relevant[0] || null;
}

export async function getExerciseHistory(exerciseId) {
  const db = await getDB();
  const allEntries = await db.getAllFromIndex('sessionEntries', 'exerciseId', exerciseId);
  const allSessions = await db.getAll('sessions');
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));

  return allEntries
    .filter(e => sessionMap[e.sessionId])
    .map(e => ({ ...e, date: sessionMap[e.sessionId].date }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// --- Cancella tutti i dati ---

export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(['exercises', 'cycles', 'sessions', 'sessionEntries'], 'readwrite');
  await Promise.all([
    tx.objectStore('exercises').clear(),
    tx.objectStore('cycles').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('sessionEntries').clear(),
  ]);
  await tx.done;
}

// ─────────────────────────────────────────────────────────────────
// SEED — dati reali da 30 foto delle sessioni (mar 2026 – lug 2026)
// ─────────────────────────────────────────────────────────────────
//
// Programmi identificati dalle foto:
//   Ciclo 0  "Marzo"         02/03/2026 → 05/04/2026  (archiviated)
//   Ciclo A  "Aprile-Maggio" 06/04/2026 → 10/05/2026  (archived)
//   Ciclo B  "Maggio-Giugno" 11/05/2026 → 14/06/2026  (archived)
//   Ciclo C  "Giugno-Luglio" 15/06/2026 → 19/07/2026  (archived)
//   Ciclo D  "Luglio-Agosto" 20/07/2026 → 23/08/2026  (active)

export async function seedTestData() {
  await clearAllData();

  // ── Helper ──────────────────────────────────────────────────────
  const mkEx = (name, date = '2026-03-02') => ({
    id: uuidv4(), canonicalName: name, createdAt: date,
  });
  const mkSess = (id, date, slot, cycleId, weekNumber) =>
    ({ id, date, slot, cycleId, weekNumber, entries: [] });
  const W = (kg)  => ({ valueType: 'weight',     weightKg: kg,   elasticColor: null });
  const E = (col) => ({ valueType: 'elastic',    weightKg: null, elasticColor: col  });
  const BW = ()   => ({ valueType: 'bodyweight', weightKg: null, elasticColor: null });
  const mkEntry = (sessionId, exerciseId, val, isIncrease = false) =>
    ({ id: uuidv4(), sessionId, exerciseId, isIncrease, ...val });

  // ── Esercizi ────────────────────────────────────────────────────
  const ex = {
    // Ciclo 0 LUN/MAR
    splitSquat:       mkEx('Split Squat'),
    chinUp:           mkEx('Chin Up'),
    deadbug:          mkEx('Deadbug'),
    affondoLatPat:    mkEx('Affondo Laterale Pattina'),
    pushUp:           mkEx('Push Up'),
    legCurlPattine:   mkEx('Leg Curl Pattine'),
    tkShoulderPress:  mkEx('TK Shoulder Press'),
    pallofRotation:   mkEx('Pallof Rotation'),
    // Ciclo 0 MER/GIO
    squat:            mkEx('Squat'),
    spinte30:         mkEx('Spinte Panca 30°'),
    plankReach:       mkEx('Plank Reach'),
    rdl:              mkEx('RDL'),
    highRowTRX:       mkEx('High Row al TRX'),
    sediaMuroMono:    mkEx('Sedia Muro Mono'),
    hammerCurl:       mkEx('Hammer Curl in Piedi'),
    sitUp:            mkEx('Sit Up'),
    // Ciclo 0 VEN/SAB
    deadlift:         mkEx('Deadlift'),
    pullUp:           mkEx('Pull Up'),
    plank:            mkEx('Plank'),
    splitSquatGD:     mkEx('Split Squat Gamba Dietro'),
    floorPress:       mkEx('Floor Press'),
    staggeredRDL:     mkEx('Staggered RDL'),
    pushdown:         mkEx('Pushdown'),
    plankDragDisco:   mkEx('Plank Drag con Disco'),
    // Ciclo A LUN/MAR (nuovi)
    spintePiana:      mkEx('Spinte Panca Piana', '2026-04-06'),
    mountainClimbers: mkEx('Mountain Climbers Pattine', '2026-04-06'),
    splitSquat150:    mkEx('Split Squat 150', '2026-04-06'),
    singleLegRDL:     mkEx('Single Leg RDL', '2026-04-06'),
    shoulderPress:    mkEx('Shoulder Press', '2026-04-06'),
    sidePlankRot:     mkEx('Side Plank con Rotazione', '2026-04-06'),
    // Ciclo A VEN/SAB (nuovi)
    rowManubri:       mkEx('Row Manubri', '2026-04-06'),
    plankOverDisco:   mkEx('Plank Over Disco', '2026-04-06'),
    panca45:          mkEx('Panca 45°', '2026-04-06'),
    squatLaterale:    mkEx('Squat Laterale', '2026-04-06'),
    curlManubri:      mkEx('Curl Manubri', '2026-04-06'),
    kbMarch:          mkEx('1KB March', '2026-04-06'),
    // Ciclo B LUN/MAR (nuovi)
    spintePianaMono:  mkEx('Spinte Panca Piana Mono', '2026-05-11'),
    affondoLaterale:  mkEx('Affondo Laterale', '2026-05-11'),
    curlPanca60:      mkEx('Curl Panca 60°', '2026-05-11'),
    plankDragAnt:     mkEx('Plank Drag Anteriore', '2026-05-11'),
    // Ciclo B MER/GIO (nuovi)
    bodySaw:          mkEx('Body Saw', '2026-05-11'),
    sediaMuro:        mkEx('Sedia Muro', '2026-05-11'),
    trxMono:          mkEx('TRX Mono', '2026-05-11'),
    rdlSplitStance:   mkEx('RDL Split Stance', '2026-05-11'),
    dbBicCurl:        mkEx('1DB HK Bic. Curl + 6H Press', '2026-05-11'),
    // Ciclo B VEN/SAB (nuovi)
    affondoAnt:       mkEx('Affondo Anteriore', '2026-05-11'),
    // Ciclo C LUN/MAR (nuovi)
    spintePanca45:    mkEx('Spinte Panca 45°', '2026-06-15'),
    bulgarianSS:      mkEx('Bulgarian Split Squat', '2026-06-15'),
    ponteGlutei:      mkEx('Ponte Glutei Gamba', '2026-06-15'),
    bearPlankTap:     mkEx('Bear Plank Shoulder Tap', '2026-06-15'),
    // Ciclo C MER/GIO (nuovi)
    stepUp:           mkEx('Step Up', '2026-06-15'),
    plankSpostamento: mkEx('Plank con Spostamento Pattina Anteriore', '2026-06-15'),
    splitSquatGDav:   mkEx('Split Squat Gamba Davanti', '2026-06-15'),
    sldl:             mkEx('SLDL', '2026-06-15'),
    hkPalloffPress:   mkEx('HK Palloff Press', '2026-06-15'),
    frenchPress:      mkEx('French Press', '2026-06-15'),
    // Ciclo C VEN/SAB (nuovi)
    plankLatGamba:    mkEx('Plank Lat con Gamba', '2026-06-15'),
    rematoreManubrio: mkEx('Rematore Manubrio', '2026-06-15'),
    affondoPostPat:   mkEx('Affondo Post. con Pattina', '2026-06-15'),
    plank3Appoggi:    mkEx('Plank 3 Appoggi', '2026-06-15'),
    alzataLatFront:   mkEx('Alzata Lat + Frontale (Six Ways)', '2026-06-15'),
    // Ciclo D LUN/MAR (nuovi)
    barchetta:        mkEx('Barchetta', '2026-07-20'),
    trxLargo:         mkEx('TRX Largo', '2026-07-20'),
    splitRDL:         mkEx('Split RDL', '2026-07-20'),
    dragPlankDisco:   mkEx('Drag Plank Disco', '2026-07-20'),
    // Ciclo D VEN/SAB (nuovi)
    squatMono:        mkEx('Squat Mono', '2026-07-20'),
    plankOrsetto:     mkEx('Plank Orsetto Tocco Spalla', '2026-07-20'),
  };

  const WEEKS = [
    { weekNumber: 1, reps: 6 },
    { weekNumber: 2, reps: 6 },
    { weekNumber: 3, reps: 8 },
    { weekNumber: 4, reps: 8 },
    { weekNumber: 5, reps: 10 },
  ];

  // ── Cicli ────────────────────────────────────────────────────────
  const c0Id = uuidv4(), cAId = uuidv4(), cBId = uuidv4(), cCId = uuidv4(), cDId = uuidv4();

  const cycle0 = {
    id: c0Id,
    name: 'Small Class — Marzo 2026',
    startDate: '2026-03-02',
    endDate: '2026-04-05',
    status: 'archived',
    weeks: WEEKS,
    slots: {
      MON_TUE: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.splitSquat.id },
          { position: 2, exerciseId: ex.chinUp.id },
          { position: 3, exerciseId: ex.deadbug.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.affondoLatPat.id },
          { position: 2, exerciseId: ex.pushUp.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.legCurlPattine.id },
          { position: 2, exerciseId: ex.tkShoulderPress.id },
          { position: 3, exerciseId: ex.pallofRotation.id },
        ]},
      ],
      WED_THU: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.squat.id },
          { position: 2, exerciseId: ex.spinte30.id },
          { position: 3, exerciseId: ex.plankReach.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.rdl.id },
          { position: 2, exerciseId: ex.highRowTRX.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.sediaMuroMono.id },
          { position: 2, exerciseId: ex.hammerCurl.id },
          { position: 3, exerciseId: ex.sitUp.id },
        ]},
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.deadlift.id },
          { position: 2, exerciseId: ex.pullUp.id },
          { position: 3, exerciseId: ex.plank.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.splitSquatGD.id },
          { position: 2, exerciseId: ex.floorPress.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.staggeredRDL.id },
          { position: 2, exerciseId: ex.pushdown.id },
          { position: 3, exerciseId: ex.plankDragDisco.id },
        ]},
      ],
    },
  };

  const cycleA = {
    id: cAId,
    name: 'Small Class — Aprile/Maggio 2026',
    startDate: '2026-04-06',
    endDate: '2026-05-10',
    status: 'archived',
    weeks: WEEKS,
    slots: {
      MON_TUE: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.deadlift.id },
          { position: 2, exerciseId: ex.spintePiana.id },
          { position: 3, exerciseId: ex.mountainClimbers.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.chinUp.id },
          { position: 2, exerciseId: ex.splitSquat150.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.singleLegRDL.id },
          { position: 2, exerciseId: ex.shoulderPress.id },
          { position: 3, exerciseId: ex.sidePlankRot.id },
        ]},
      ],
      WED_THU: [
        // Non fotografato — slot vuoto
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.squat.id },
          { position: 2, exerciseId: ex.rowManubri.id },
          { position: 3, exerciseId: ex.plankOverDisco.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.rdl.id },
          { position: 2, exerciseId: ex.panca45.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.squatLaterale.id },
          { position: 2, exerciseId: ex.curlManubri.id },
          { position: 3, exerciseId: ex.kbMarch.id },
        ]},
      ],
    },
  };

  const cycleB = {
    id: cBId,
    name: 'Small Class — Maggio/Giugno 2026',
    startDate: '2026-05-11',
    endDate: '2026-06-14',
    status: 'archived',
    weeks: WEEKS,
    slots: {
      MON_TUE: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.splitSquat.id },
          { position: 2, exerciseId: ex.pullUp.id },
          { position: 3, exerciseId: ex.deadbug.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.rdl.id },
          { position: 2, exerciseId: ex.spintePianaMono.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.affondoLaterale.id },
          { position: 2, exerciseId: ex.curlPanca60.id },
          { position: 3, exerciseId: ex.plankDragAnt.id },
        ]},
      ],
      WED_THU: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.squat.id },
          { position: 2, exerciseId: ex.spinte30.id },
          { position: 3, exerciseId: ex.bodySaw.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.sediaMuro.id },
          { position: 2, exerciseId: ex.trxMono.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.rdlSplitStance.id },
          { position: 2, exerciseId: ex.dbBicCurl.id },
          { position: 3, exerciseId: ex.pallofRotation.id },
        ]},
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.deadlift.id },
          { position: 2, exerciseId: ex.chinUp.id },
          { position: 3, exerciseId: ex.plankReach.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.affondoAnt.id },
          { position: 2, exerciseId: ex.floorPress.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.legCurlPattine.id },
          { position: 2, exerciseId: ex.pushdown.id },
          { position: 3, exerciseId: ex.sitUp.id },
        ]},
      ],
    },
  };

  const cycleC = {
    id: cCId,
    name: 'Small Class — Giugno/Luglio 2026',
    startDate: '2026-06-15',
    endDate: '2026-07-19',
    status: 'archived',
    weeks: WEEKS,
    slots: {
      MON_TUE: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.deadlift.id },
          { position: 2, exerciseId: ex.chinUp.id },
          { position: 3, exerciseId: ex.plank.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.spintePanca45.id },
          { position: 2, exerciseId: ex.bulgarianSS.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.ponteGlutei.id },
          { position: 2, exerciseId: ex.bearPlankTap.id },
          { position: 3, exerciseId: ex.curlManubri.id },
        ]},
      ],
      WED_THU: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.stepUp.id },
          { position: 2, exerciseId: ex.pushUp.id },
          { position: 3, exerciseId: ex.plankSpostamento.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.splitSquatGDav.id },
          { position: 2, exerciseId: ex.pullUp.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.sldl.id },
          { position: 2, exerciseId: ex.hkPalloffPress.id },
          { position: 3, exerciseId: ex.frenchPress.id },
        ]},
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.squat.id },
          { position: 2, exerciseId: ex.spintePiana.id },
          { position: 3, exerciseId: ex.plankLatGamba.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.rdl.id },
          { position: 2, exerciseId: ex.rematoreManubrio.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.affondoPostPat.id },
          { position: 2, exerciseId: ex.plank3Appoggi.id },
          { position: 3, exerciseId: ex.alzataLatFront.id },
        ]},
      ],
    },
  };

  const cycleD = {
    id: cDId,
    name: 'Small Class — Luglio/Agosto 2026',
    startDate: '2026-07-20',
    endDate: '2026-08-23',
    status: 'active',
    weeks: WEEKS,
    slots: {
      MON_TUE: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.squat.id },
          { position: 2, exerciseId: ex.spinte30.id },
          { position: 3, exerciseId: ex.barchetta.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.sediaMuroMono.id },
          { position: 2, exerciseId: ex.trxLargo.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.splitRDL.id },
          { position: 2, exerciseId: ex.shoulderPress.id },
          { position: 3, exerciseId: ex.dragPlankDisco.id },
        ]},
      ],
      WED_THU: [
        // Slot non ancora fotografato per questo ciclo
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.splitSquat.id },
          { position: 2, exerciseId: ex.floorPress.id },
          { position: 3, exerciseId: ex.bodySaw.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.pullUp.id },
          { position: 2, exerciseId: ex.squatMono.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.legCurlPattine.id },
          { position: 2, exerciseId: ex.pushdown.id },
          { position: 3, exerciseId: ex.plankOrsetto.id },
        ]},
      ],
    },
  };

  // ── Sessioni ─────────────────────────────────────────────────────
  // Ogni sessione usa l'ID del ciclo corretto e il weekNumber reale
  // I valori con ★ provengono direttamente dalle foto

  const sessions = [], entries = [];
  function addSession(date, slot, cycleId, weekNumber, entryFn) {
    const sessId = uuidv4();
    sessions.push(mkSess(sessId, date, slot, cycleId, weekNumber));
    entryFn(sessId);
  }
  function e(sessId, exerciseId, val, inc = false) {
    entries.push(mkEntry(sessId, exerciseId.id, val, inc));
  }

  // ═══════════════════════════════════════════════════════
  //  CICLO 0 — Marzo (02/03 → 05/04/2026)
  // ═══════════════════════════════════════════════════════

  // 2026-03-03  LUN/MAR  Sett.1  ★
  addSession('2026-03-03', 'MON_TUE', c0Id, 1, sid => {
    e(sid, ex.splitSquat,      W(12.5));
    e(sid, ex.chinUp,          E('blue'));
    e(sid, ex.deadbug,         W(5));
    e(sid, ex.affondoLatPat,   W(12.5));
    e(sid, ex.pushUp,          BW());
    e(sid, ex.legCurlPattine,  BW());
    e(sid, ex.tkShoulderPress, W(10));
    e(sid, ex.pallofRotation,  E('blue'));
  });

  // 2026-03-05  MER/GIO  Sett.1  ★ (valori parziali)
  addSession('2026-03-05', 'WED_THU', c0Id, 1, sid => {
    e(sid, ex.squat,        W(17.5));
    e(sid, ex.spinte30,     W(12.5));
    e(sid, ex.plankReach,   BW());
    e(sid, ex.rdl,          W(20));
    e(sid, ex.highRowTRX,   BW());
    e(sid, ex.sediaMuroMono,BW());
    e(sid, ex.hammerCurl,   W(8));
    e(sid, ex.sitUp,        BW());
  });

  // 2026-03-10  LUN/MAR  Sett.2  ★
  addSession('2026-03-10', 'MON_TUE', c0Id, 2, sid => {
    e(sid, ex.splitSquat,      W(12.5));
    e(sid, ex.chinUp,          E('blue'));
    e(sid, ex.deadbug,         W(10), true);
    e(sid, ex.affondoLatPat,   W(15), true);
    e(sid, ex.pushUp,          BW());
    e(sid, ex.legCurlPattine,  BW());
    e(sid, ex.tkShoulderPress, W(10));
    e(sid, ex.pallofRotation,  E('blue'));
  });

  // 2026-03-13  VEN/SAB  Sett.2  ★
  addSession('2026-03-13', 'FRI_SAT', c0Id, 2, sid => {
    e(sid, ex.deadlift,      W(55));
    e(sid, ex.pullUp,        E('blue'));
    e(sid, ex.plank,         BW());
    e(sid, ex.splitSquatGD,  BW());
    e(sid, ex.floorPress,    W(15));
    e(sid, ex.staggeredRDL,  BW());
    e(sid, ex.pushdown,      E('yellow'));
    e(sid, ex.plankDragDisco,BW());
  });

  // 2026-03-17  LUN/MAR  Sett.3
  addSession('2026-03-17', 'MON_TUE', c0Id, 3, sid => {
    e(sid, ex.splitSquat,      W(14), true);
    e(sid, ex.chinUp,          E('blue'));
    e(sid, ex.deadbug,         W(10));
    e(sid, ex.affondoLatPat,   W(15));
    e(sid, ex.pushUp,          BW());
    e(sid, ex.legCurlPattine,  BW());
    e(sid, ex.tkShoulderPress, W(12), true);
    e(sid, ex.pallofRotation,  E('blue'));
  });

  // 2026-03-20  VEN/SAB  Sett.3
  addSession('2026-03-20', 'FRI_SAT', c0Id, 3, sid => {
    e(sid, ex.deadlift,      W(60), true);
    e(sid, ex.pullUp,        E('blue'));
    e(sid, ex.plank,         BW());
    e(sid, ex.splitSquatGD,  W(10), true);
    e(sid, ex.floorPress,    W(15));
    e(sid, ex.staggeredRDL,  W(12), true);
    e(sid, ex.pushdown,      E('yellow'));
    e(sid, ex.plankDragDisco,BW());
  });

  // 2026-03-27  VEN/SAB  Sett.4
  addSession('2026-03-27', 'FRI_SAT', c0Id, 4, sid => {
    e(sid, ex.deadlift,      W(65), true);
    e(sid, ex.pullUp,        E('yellow'), true);
    e(sid, ex.plank,         BW());
    e(sid, ex.splitSquatGD,  W(12.5), true);
    e(sid, ex.floorPress,    W(17.5), true);
    e(sid, ex.staggeredRDL,  W(14), true);
    e(sid, ex.pushdown,      E('yellow'));
    e(sid, ex.plankDragDisco,BW());
  });

  // 2026-03-31  LUN/MAR  Sett.5
  addSession('2026-03-31', 'MON_TUE', c0Id, 5, sid => {
    e(sid, ex.splitSquat,      W(15), true);
    e(sid, ex.chinUp,          E('yellow'), true);
    e(sid, ex.deadbug,         W(12), true);
    e(sid, ex.affondoLatPat,   W(17.5), true);
    e(sid, ex.pushUp,          BW());
    e(sid, ex.legCurlPattine,  BW());
    e(sid, ex.tkShoulderPress, W(12));
    e(sid, ex.pallofRotation,  E('yellow'), true);
  });

  // 2026-04-03  VEN/SAB  Sett.5
  addSession('2026-04-03', 'FRI_SAT', c0Id, 5, sid => {
    e(sid, ex.deadlift,      W(70), true);
    e(sid, ex.pullUp,        E('yellow'));
    e(sid, ex.plank,         BW());
    e(sid, ex.splitSquatGD,  W(15), true);
    e(sid, ex.floorPress,    W(17.5));
    e(sid, ex.staggeredRDL,  W(15), true);
    e(sid, ex.pushdown,      E('orange'), true);
    e(sid, ex.plankDragDisco,BW());
  });

  // ═══════════════════════════════════════════════════════
  //  CICLO A — Aprile/Maggio (06/04 → 10/05/2026)
  // ═══════════════════════════════════════════════════════

  // 2026-04-07  LUN/MAR  Sett.1
  addSession('2026-04-07', 'MON_TUE', cAId, 1, sid => {
    e(sid, ex.deadlift,       W(75));
    e(sid, ex.spintePiana,    W(15));
    e(sid, ex.mountainClimbers,BW());
    e(sid, ex.chinUp,         BW());
    e(sid, ex.splitSquat150,  W(6));
    e(sid, ex.singleLegRDL,   W(12));
    e(sid, ex.shoulderPress,  W(10));
    e(sid, ex.sidePlankRot,   BW());
  });

  // 2026-04-21  LUN/MAR  Sett.3
  addSession('2026-04-21', 'MON_TUE', cAId, 3, sid => {
    e(sid, ex.deadlift,       W(80), true);
    e(sid, ex.spintePiana,    W(17.5), true);
    e(sid, ex.mountainClimbers,BW());
    e(sid, ex.chinUp,         BW());
    e(sid, ex.splitSquat150,  W(6));
    e(sid, ex.singleLegRDL,   W(14), true);
    e(sid, ex.shoulderPress,  W(12), true);
    e(sid, ex.sidePlankRot,   BW());
  });

  // 2026-04-24  VEN/SAB  Sett.3  ★
  addSession('2026-04-24', 'FRI_SAT', cAId, 3, sid => {
    e(sid, ex.squat,        W(22.5));
    e(sid, ex.rowManubri,   W(15));
    e(sid, ex.plankOverDisco,BW());
    e(sid, ex.rdl,          W(22.5));
    e(sid, ex.panca45,      W(12.5));
    e(sid, ex.squatLaterale,W(16));
    e(sid, ex.curlManubri,  W(9));
    e(sid, ex.kbMarch,      W(16));
  });

  // 2026-04-28  LUN/MAR  Sett.4  ★ (dalla foto ×8)
  addSession('2026-04-28', 'MON_TUE', cAId, 4, sid => {
    e(sid, ex.deadlift,       W(85), true);
    e(sid, ex.spintePiana,    W(17.5));
    e(sid, ex.mountainClimbers,BW());
    e(sid, ex.chinUp,         BW());
    e(sid, ex.splitSquat150,  W(6));
    e(sid, ex.singleLegRDL,   W(15), true);
    e(sid, ex.shoulderPress,  W(12));
    e(sid, ex.sidePlankRot,   BW());
  });

  // 2026-05-05  LUN/MAR  Sett.5  ★ (dalla foto ×10)
  addSession('2026-05-05', 'MON_TUE', cAId, 5, sid => {
    e(sid, ex.deadlift,       W(85));
    e(sid, ex.spintePiana,    W(17.5));
    e(sid, ex.mountainClimbers,BW());
    e(sid, ex.chinUp,         BW());
    e(sid, ex.splitSquat150,  W(6));
    e(sid, ex.singleLegRDL,   W(16), true);
    e(sid, ex.shoulderPress,  W(12.5), true);
    e(sid, ex.sidePlankRot,   BW());
  });

  // ═══════════════════════════════════════════════════════
  //  CICLO B — Maggio/Giugno (11/05 → 14/06/2026)
  // ═══════════════════════════════════════════════════════

  // 2026-05-12  LUN/MAR  Sett.1  ★
  addSession('2026-05-12', 'MON_TUE', cBId, 1, sid => {
    e(sid, ex.splitSquat,     W(12.5));
    e(sid, ex.pullUp,         BW());
    e(sid, ex.deadbug,        W(10));
    e(sid, ex.rdl,            W(17.5));
    e(sid, ex.spintePianaMono,W(15));
    e(sid, ex.affondoLaterale,W(20));
    e(sid, ex.curlPanca60,    W(10));
    e(sid, ex.plankDragAnt,   W(20));
  });

  // 2026-05-15  VEN/SAB  Sett.1  ★
  addSession('2026-05-15', 'FRI_SAT', cBId, 1, sid => {
    e(sid, ex.deadlift,    W(90));
    e(sid, ex.chinUp,      BW());
    e(sid, ex.plankReach,  BW());
    e(sid, ex.affondoAnt,  W(12.5));
    e(sid, ex.floorPress,  W(17.5));
    e(sid, ex.legCurlPattine, BW());
    e(sid, ex.pushdown,    E('yellow'));
    e(sid, ex.sitUp,       BW());
  });

  // 2026-05-22  VEN/SAB  Sett.2
  addSession('2026-05-22', 'FRI_SAT', cBId, 2, sid => {
    e(sid, ex.deadlift,    W(92.5), true);
    e(sid, ex.chinUp,      BW());
    e(sid, ex.plankReach,  BW());
    e(sid, ex.affondoAnt,  W(15), true);
    e(sid, ex.floorPress,  W(17.5));
    e(sid, ex.legCurlPattine, BW());
    e(sid, ex.pushdown,    E('yellow'));
    e(sid, ex.sitUp,       BW());
  });

  // 2026-06-10  MER/GIO  Sett.5  ★
  addSession('2026-06-10', 'WED_THU', cBId, 5, sid => {
    e(sid, ex.squat,          W(22.5));
    e(sid, ex.spinte30,       W(12.5));
    e(sid, ex.bodySaw,        BW());
    e(sid, ex.sediaMuro,      W(10));
    e(sid, ex.trxMono,        BW());
    e(sid, ex.rdlSplitStance, W(15));
    e(sid, ex.dbBicCurl,      W(6));
    e(sid, ex.pallofRotation, E('yellow'));
  });

  // ═══════════════════════════════════════════════════════
  //  CICLO C — Giugno/Luglio (15/06 → 19/07/2026)
  // ═══════════════════════════════════════════════════════

  // 2026-06-16  LUN/MAR  Sett.1  ★
  addSession('2026-06-16', 'MON_TUE', cCId, 1, sid => {
    e(sid, ex.deadlift,      W(90));
    e(sid, ex.chinUp,        BW());
    e(sid, ex.plank,         W(5));
    e(sid, ex.spintePanca45, W(17.5));
    e(sid, ex.bulgarianSS,   W(12.5));
    e(sid, ex.ponteGlutei,   W(10));
    e(sid, ex.bearPlankTap,  BW());
    e(sid, ex.curlManubri,   W(10));
  });

  // 2026-06-19  VEN/SAB  Sett.1  ★
  addSession('2026-06-19', 'FRI_SAT', cCId, 1, sid => {
    e(sid, ex.squat,           W(22.5));
    e(sid, ex.spintePiana,     W(17.5));
    e(sid, ex.plankLatGamba,   BW());
    e(sid, ex.rdl,             W(25));
    e(sid, ex.rematoreManubrio,W(17.5));
    e(sid, ex.affondoPostPat,  W(12.5));
    e(sid, ex.plank3Appoggi,   BW());
    e(sid, ex.alzataLatFront,  W(6));
  });

  // 2026-06-22  LUN/MAR  Sett.2
  addSession('2026-06-22', 'MON_TUE', cCId, 2, sid => {
    e(sid, ex.deadlift,      W(92.5), true);
    e(sid, ex.chinUp,        BW());
    e(sid, ex.plank,         W(5));
    e(sid, ex.spintePanca45, W(17.5));
    e(sid, ex.bulgarianSS,   W(15), true);
    e(sid, ex.ponteGlutei,   W(12), true);
    e(sid, ex.bearPlankTap,  BW());
    e(sid, ex.curlManubri,   W(10));
  });

  // 2026-06-24  MER/GIO  Sett.2  ★
  addSession('2026-06-24', 'WED_THU', cCId, 2, sid => {
    e(sid, ex.stepUp,           BW());
    e(sid, ex.pushUp,           BW());
    e(sid, ex.plankSpostamento, BW());
    e(sid, ex.splitSquatGDav,   W(12.5));
    e(sid, ex.pullUp,           BW());
    e(sid, ex.sldl,             BW());
    e(sid, ex.hkPalloffPress,   W(17.5));
    e(sid, ex.frenchPress,      W(8));
  });

  // 2026-07-13  LUN/MAR  Sett.5
  addSession('2026-07-13', 'MON_TUE', cCId, 5, sid => {
    e(sid, ex.deadlift,      W(95), true);
    e(sid, ex.chinUp,        BW());
    e(sid, ex.plank,         W(5));
    e(sid, ex.spintePanca45, W(20), true);
    e(sid, ex.bulgarianSS,   W(17.5), true);
    e(sid, ex.ponteGlutei,   W(14), true);
    e(sid, ex.bearPlankTap,  BW());
    e(sid, ex.curlManubri,   W(12), true);
  });

  // 2026-07-17  VEN/SAB  Sett.5  ★ (data da EXIF, esercizi confermati)
  addSession('2026-07-17', 'FRI_SAT', cCId, 5, sid => {
    e(sid, ex.squat,           W(27.5), true);
    e(sid, ex.spintePiana,     W(20), true);
    e(sid, ex.plankLatGamba,   BW());
    e(sid, ex.rdl,             W(27.5), true);
    e(sid, ex.rematoreManubrio,W(20), true);
    e(sid, ex.affondoPostPat,  W(15), true);
    e(sid, ex.plank3Appoggi,   BW());
    e(sid, ex.alzataLatFront,  W(7), true);
  });

  // ═══════════════════════════════════════════════════════
  //  CICLO D — Luglio/Agosto (20/07 → 23/08/2026) — ATTIVO
  // ═══════════════════════════════════════════════════════

  // 2026-07-21  LUN/MAR  Sett.1  ★
  addSession('2026-07-21', 'MON_TUE', cDId, 1, sid => {
    e(sid, ex.squat,        W(40));
    e(sid, ex.spinte30,     W(17.5));
    e(sid, ex.barchetta,    BW());
    e(sid, ex.sediaMuroMono,BW());
    e(sid, ex.trxLargo,     BW());
    e(sid, ex.splitRDL,     BW());
    e(sid, ex.shoulderPress,BW());
    e(sid, ex.dragPlankDisco,BW());
  });

  // 2026-07-25  VEN/SAB  Sett.1  ★ (dalla foto del 27/07)
  addSession('2026-07-25', 'FRI_SAT', cDId, 1, sid => {
    e(sid, ex.splitSquat,   W(12.5));
    e(sid, ex.floorPress,   W(15));
    e(sid, ex.bodySaw,      BW());
    e(sid, ex.pullUp,       BW());
    e(sid, ex.squatMono,    W(12.5));
    e(sid, ex.legCurlPattine,BW());
    e(sid, ex.pushdown,     BW());
    e(sid, ex.plankOrsetto, BW());
  });

  // ── Scrivi nel DB ───────────────────────────────────────────────
  const db = await getDB();
  const tx = db.transaction(['exercises', 'cycles', 'sessions', 'sessionEntries'], 'readwrite');

  for (const e2 of Object.values(ex)) tx.objectStore('exercises').put(e2);
  for (const c of [cycle0, cycleA, cycleB, cycleC, cycleD]) tx.objectStore('cycles').put(c);
  for (const s of sessions) tx.objectStore('sessions').put(s);
  for (const en of entries) tx.objectStore('sessionEntries').put(en);

  await tx.done;
  console.log(`[seedTestData] Caricati ${Object.keys(ex).length} esercizi, 5 cicli, ${sessions.length} sessioni, ${entries.length} voci`);
  return { exercises: Object.values(ex), cycles: [cycle0, cycleA, cycleB, cycleC, cycleD], sessions, entries };
}
