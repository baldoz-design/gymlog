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
  return all.find(c => c.startDate <= todayISO && c.endDate >= todayISO && c.status === 'active') || null;
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
  // Elimina tutte le entry della sessione
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

// --- Seed data — programma reale Small Class Maggio/Giugno 2026 ---

export async function seedTestData() {
  await clearAllData();
  // Tutti gli esercizi dalla lavagna
  const ex = {
    // LUN/MAR
    splitSquat:    { id: uuidv4(), canonicalName: 'Split Squat', createdAt: '2026-05-11' },
    pullUp:        { id: uuidv4(), canonicalName: 'Pull Up', createdAt: '2026-05-11' },
    deadbug:       { id: uuidv4(), canonicalName: 'Deadbug', createdAt: '2026-05-11' },
    rdl:           { id: uuidv4(), canonicalName: 'RDL', createdAt: '2026-05-11' },
    spintePianaMono: { id: uuidv4(), canonicalName: 'Spinte Panca Piana Mono', createdAt: '2026-05-11' },
    affondoLat:    { id: uuidv4(), canonicalName: 'Affondo Laterale', createdAt: '2026-05-11' },
    curlPanca60:   { id: uuidv4(), canonicalName: 'Curl Panca 60°', createdAt: '2026-05-11' },
    plankDrag:     { id: uuidv4(), canonicalName: 'Plank Drag Anteriore', createdAt: '2026-05-11' },
    // MER/GIO
    squat:         { id: uuidv4(), canonicalName: 'Squat', createdAt: '2026-05-11' },
    spinte30:      { id: uuidv4(), canonicalName: 'Spinte Panca 30°', createdAt: '2026-05-11' },
    bodySaw:       { id: uuidv4(), canonicalName: 'Body Saw', createdAt: '2026-05-11' },
    sediaMuro:     { id: uuidv4(), canonicalName: 'Sedia Muro', createdAt: '2026-05-11' },
    trxMono:       { id: uuidv4(), canonicalName: 'TRX Mono', createdAt: '2026-05-11' },
    rdlSplit:      { id: uuidv4(), canonicalName: 'RDL Split Stance', createdAt: '2026-05-11' },
    dbBicPress:    { id: uuidv4(), canonicalName: '1DB HK Bic. Curl + 6H Press', createdAt: '2026-05-11' },
    pallofRot:     { id: uuidv4(), canonicalName: 'Pallof Rotation', createdAt: '2026-05-11' },
    // VEN/SAB
    dl:            { id: uuidv4(), canonicalName: 'DL', createdAt: '2026-05-11' },
    chinUp:        { id: uuidv4(), canonicalName: 'Chin Up', createdAt: '2026-05-11' },
    plankReach:    { id: uuidv4(), canonicalName: 'Plank Reach', createdAt: '2026-05-11' },
    affondoAnt:    { id: uuidv4(), canonicalName: 'Affondo Anteriore', createdAt: '2026-05-11' },
    floorPress:    { id: uuidv4(), canonicalName: 'Floor Press', createdAt: '2026-05-11' },
    legCurl:       { id: uuidv4(), canonicalName: 'Leg Curl Pattine', createdAt: '2026-05-11' },
    pushdown:      { id: uuidv4(), canonicalName: 'Pushdown', createdAt: '2026-05-11' },
    sitUp:         { id: uuidv4(), canonicalName: 'Sit Up', createdAt: '2026-05-11' },
  };
  const exercises = Object.values(ex);

  const cycleId = uuidv4();
  const cycle = {
    id: cycleId,
    name: 'Small Class — Maggio/Giugno 2026',
    startDate: '2026-05-11',
    endDate: '2026-06-14',
    status: 'active',
    weeks: [
      { weekNumber: 1, reps: 6 },
      { weekNumber: 2, reps: 6 },
      { weekNumber: 3, reps: 8 },
      { weekNumber: 4, reps: 8 },
      { weekNumber: 5, reps: 10 },
    ],
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
          { position: 1, exerciseId: ex.affondoLat.id },
          { position: 2, exerciseId: ex.curlPanca60.id },
          { position: 3, exerciseId: ex.plankDrag.id },
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
          { position: 1, exerciseId: ex.rdlSplit.id },
          { position: 2, exerciseId: ex.dbBicPress.id },
          { position: 3, exerciseId: ex.pallofRot.id },
        ]},
      ],
      FRI_SAT: [
        { label: 'A', exercises: [
          { position: 1, exerciseId: ex.dl.id },
          { position: 2, exerciseId: ex.chinUp.id },
          { position: 3, exerciseId: ex.plankReach.id },
        ]},
        { label: 'B', exercises: [
          { position: 1, exerciseId: ex.affondoAnt.id },
          { position: 2, exerciseId: ex.floorPress.id },
        ]},
        { label: 'C', exercises: [
          { position: 1, exerciseId: ex.legCurl.id },
          { position: 2, exerciseId: ex.pushdown.id },
          { position: 3, exerciseId: ex.sitUp.id },
        ]},
      ],
    },
  };

  // Sessioni pregresse realistiche (sett. 1 e 2 già fatte)
  const sessions = [
    { id: uuidv4(), date: '2026-05-12', slot: 'MON_TUE', cycleId, weekNumber: 1 },
    { id: uuidv4(), date: '2026-05-14', slot: 'WED_THU', cycleId, weekNumber: 1 },
    { id: uuidv4(), date: '2026-05-16', slot: 'FRI_SAT', cycleId, weekNumber: 1 },
    { id: uuidv4(), date: '2026-05-19', slot: 'MON_TUE', cycleId, weekNumber: 2 },
    { id: uuidv4(), date: '2026-05-21', slot: 'WED_THU', cycleId, weekNumber: 2 },
    { id: uuidv4(), date: '2026-05-23', slot: 'FRI_SAT', cycleId, weekNumber: 2 },
  ];
  const [s1, s2, s3, s4, s5, s6] = sessions;

  const entries = [
    // Sett.1 LUN/MAR
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.splitSquat.id,    valueType: 'weight', weightKg: 12,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.pullUp.id,        valueType: 'elastic', weightKg: null, elasticColor: 'blue',   isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.deadbug.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.rdl.id,           valueType: 'weight', weightKg: 30,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.spintePianaMono.id, valueType: 'weight', weightKg: 14, elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.affondoLat.id,    valueType: 'weight', weightKg: 8,    elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.curlPanca60.id,   valueType: 'weight', weightKg: 6,    elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s1.id, exerciseId: ex.plankDrag.id,     valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    // Sett.1 MER/GIO
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.squat.id,         valueType: 'weight', weightKg: 40,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.spinte30.id,      valueType: 'weight', weightKg: 12,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.bodySaw.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.sediaMuro.id,     valueType: 'none', weightKg: null,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.trxMono.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.rdlSplit.id,      valueType: 'weight', weightKg: 16,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.dbBicPress.id,    valueType: 'weight', weightKg: 8,    elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s2.id, exerciseId: ex.pallofRot.id,     valueType: 'elastic', weightKg: null, elasticColor: 'yellow', isIncrease: false },
    // Sett.1 VEN/SAB
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.dl.id,            valueType: 'weight', weightKg: 50,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.chinUp.id,        valueType: 'elastic', weightKg: null, elasticColor: 'blue',   isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.plankReach.id,    valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.affondoAnt.id,    valueType: 'weight', weightKg: 10,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.floorPress.id,    valueType: 'weight', weightKg: 14,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.legCurl.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.pushdown.id,      valueType: 'elastic', weightKg: null, elasticColor: 'yellow', isIncrease: false },
    { id: uuidv4(), sessionId: s3.id, exerciseId: ex.sitUp.id,         valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    // Sett.2 LUN/MAR
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.splitSquat.id,    valueType: 'weight', weightKg: 14,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.pullUp.id,        valueType: 'elastic', weightKg: null, elasticColor: 'yellow', isIncrease: true },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.deadbug.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.rdl.id,           valueType: 'weight', weightKg: 32,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.spintePianaMono.id, valueType: 'weight', weightKg: 14, elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.affondoLat.id,    valueType: 'weight', weightKg: 10,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.curlPanca60.id,   valueType: 'weight', weightKg: 6,    elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s4.id, exerciseId: ex.plankDrag.id,     valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    // Sett.2 MER/GIO
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.squat.id,         valueType: 'weight', weightKg: 42,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.spinte30.id,      valueType: 'weight', weightKg: 14,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.bodySaw.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.sediaMuro.id,     valueType: 'none', weightKg: null,   elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.trxMono.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.rdlSplit.id,      valueType: 'weight', weightKg: 18,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.dbBicPress.id,    valueType: 'weight', weightKg: 8,    elasticColor: null,     isIncrease: false },
    { id: uuidv4(), sessionId: s5.id, exerciseId: ex.pallofRot.id,     valueType: 'elastic', weightKg: null, elasticColor: 'yellow', isIncrease: false },
    // Sett.2 VEN/SAB
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.dl.id,            valueType: 'weight', weightKg: 55,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.chinUp.id,        valueType: 'elastic', weightKg: null, elasticColor: 'yellow', isIncrease: true },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.plankReach.id,    valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.affondoAnt.id,    valueType: 'weight', weightKg: 12,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.floorPress.id,    valueType: 'weight', weightKg: 16,   elasticColor: null,     isIncrease: true },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.legCurl.id,       valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.pushdown.id,      valueType: 'elastic', weightKg: null, elasticColor: 'orange', isIncrease: true },
    { id: uuidv4(), sessionId: s6.id, exerciseId: ex.sitUp.id,         valueType: 'bodyweight', weightKg: null, elasticColor: null,  isIncrease: false },
  ];

  const db = await getDB();
  const tx = db.transaction(['exercises', 'cycles', 'sessions', 'sessionEntries'], 'readwrite');
  for (const e of exercises) tx.objectStore('exercises').put(e);
  tx.objectStore('cycles').put(cycle);
  for (const s of sessions) tx.objectStore('sessions').put(s);
  for (const e of entries) tx.objectStore('sessionEntries').put(e);
  await tx.done;

  console.log('[seedTestData] Dati di test caricati');
  return { exercises, cycle, sessions, entries };
}
