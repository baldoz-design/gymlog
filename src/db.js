/**
 * db.js — Firestore backend
 * Stessa API pubblica del vecchio db.js (IndexedDB),
 * ora i dati vivono su Firebase e sono accessibili da qualsiasi browser.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() {
  const u = auth.currentUser;
  if (!u) throw new Error('Utente non autenticato');
  return u.uid;
}

function col(store) {
  return collection(db, 'users', uid(), store);
}

function ref(store, id) {
  return doc(db, 'users', uid(), store, id);
}

// ── Exercises ──────────────────────────────────────────────────────────────────

export async function getAllExercises() {
  const snap = await getDocs(col('exercises'));
  return snap.docs.map(d => d.data());
}

export async function getExerciseById(id) {
  const snap = await getDoc(ref('exercises', id));
  return snap.exists() ? snap.data() : null;
}

export async function renameExercise(id, newName) {
  const r = ref('exercises', id);
  const snap = await getDoc(r);
  if (!snap.exists()) return;
  await setDoc(r, { ...snap.data(), canonicalName: newName });
}

export async function saveExercise(exercise) {
  await setDoc(ref('exercises', exercise.id), exercise);
  return exercise;
}

export async function findExerciseByName(name) {
  const all = await getAllExercises();
  return all.find(e => e.canonicalName.toLowerCase() === name.toLowerCase()) || null;
}

// ── Cycles ─────────────────────────────────────────────────────────────────────

export async function getAllCycles() {
  const snap = await getDocs(col('cycles'));
  return snap.docs.map(d => d.data());
}

export async function getCycleById(id) {
  const snap = await getDoc(ref('cycles', id));
  return snap.exists() ? snap.data() : null;
}

export async function saveCycle(cycle) {
  await setDoc(ref('cycles', cycle.id), cycle);
  return cycle;
}

export async function getActiveCycle(todayISO) {
  const all = await getAllCycles();
  const active = all.filter(c => c.status === 'active' && c.startDate <= todayISO);
  if (!active.length) return null;
  return active.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

export async function archiveAllActiveCycles() {
  const all = await getAllCycles();
  const batch = writeBatch(db);
  for (const c of all) {
    if (c.status === 'active') {
      batch.set(ref('cycles', c.id), { ...c, status: 'archived' });
    }
  }
  await batch.commit();
}

// ── Sessions ───────────────────────────────────────────────────────────────────

export async function getSessionByDateAndSlot(dateISO, slot) {
  const q = query(col('sessions'), where('date', '==', dateISO));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data()).find(s => s.slot === slot) || null;
}

export async function saveSession(session) {
  await setDoc(ref('sessions', session.id), session);
  return session;
}

export async function deleteSession(sessionId) {
  const q = query(col('sessionEntries'), where('sessionId', '==', sessionId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  for (const d of snap.docs) batch.delete(d.ref);
  batch.delete(ref('sessions', sessionId));
  await batch.commit();
}

export async function getAllSessions() {
  const snap = await getDocs(col('sessions'));
  return snap.docs.map(d => d.data());
}

// ── Session Entries ────────────────────────────────────────────────────────────

export async function getEntriesBySession(sessionId) {
  const q = query(col('sessionEntries'), where('sessionId', '==', sessionId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getAllSessionEntries() {
  const snap = await getDocs(col('sessionEntries'));
  return snap.docs.map(d => d.data());
}

export async function saveSessionEntry(entry) {
  await setDoc(ref('sessionEntries', entry.id), entry);
  return entry;
}

export async function deleteSessionEntry(entryId) {
  await deleteDoc(ref('sessionEntries', entryId));
}

export async function getLastEntryForExercise(exerciseId, beforeDateISO) {
  const [entriesSnap, allSessions] = await Promise.all([
    getDocs(query(col('sessionEntries'), where('exerciseId', '==', exerciseId))),
    getAllSessions(),
  ]);
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));
  const entries = entriesSnap.docs.map(d => d.data());

  const relevant = entries
    .filter(e => {
      const sess = sessionMap[e.sessionId];
      return sess && sess.date < beforeDateISO;
    })
    .sort((a, b) => {
      const da = sessionMap[a.sessionId]?.date || '';
      const db2 = sessionMap[b.sessionId]?.date || '';
      return db2.localeCompare(da);
    });

  return relevant[0] || null;
}

export async function getExerciseHistory(exerciseId) {
  const [entriesSnap, allSessions] = await Promise.all([
    getDocs(query(col('sessionEntries'), where('exerciseId', '==', exerciseId))),
    getAllSessions(),
  ]);
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));

  return entriesSnap.docs.map(d => d.data())
    .filter(e => sessionMap[e.sessionId])
    .map(e => ({ ...e, date: sessionMap[e.sessionId].date }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Bulk helper per Home (evita N chiamate a getAllSessions) ───────────────────
// Restituisce una mappa exerciseId → entry più recente prima di beforeDateISO.
export async function getLastEntriesMap(exerciseIds, beforeDateISO) {
  const [allSessions, allEntries] = await Promise.all([
    getAllSessions(),
    getAllSessionEntries(),
  ]);
  const sessionMap = Object.fromEntries(allSessions.map(s => [s.id, s]));
  const result = {};
  for (const exerciseId of exerciseIds) {
    const relevant = allEntries
      .filter(e => e.exerciseId === exerciseId && sessionMap[e.sessionId]?.date < beforeDateISO)
      .sort((a, b) => {
        const da = sessionMap[a.sessionId]?.date || '';
        const db2 = sessionMap[b.sessionId]?.date || '';
        return db2.localeCompare(da);
      });
    result[exerciseId] = relevant[0] || null;
  }
  return result;
}

// ── Clear all ──────────────────────────────────────────────────────────────────

export async function clearAllData() {
  for (const store of ['exercises', 'cycles', 'sessions', 'sessionEntries']) {
    const snap = await getDocs(col(store));
    if (snap.empty) continue;
    // Firestore batch limit: 500 ops. Chunk by 400 per sicurezza.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  }
}

// ── Import (da JSON backup) ────────────────────────────────────────────────────

export async function importFromJSON(data) {
  await clearAllData();
  for (const store of ['cycles', 'exercises', 'sessions', 'sessionEntries']) {
    const rows = data[store];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(db);
      for (const row of rows.slice(i, i + 400)) {
        batch.set(ref(store, row.id), row);
      }
      await batch.commit();
    }
  }
}

// ── Migrazione da IndexedDB locale ────────────────────────────────────────────
// Chiamata una sola volta al primo accesso: legge il vecchio gymlog da IndexedDB
// del browser e scrive tutto su Firestore. Restituisce il numero di record migrati.

export async function migrateFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gymlog');
    req.onerror = () => reject(new Error('IndexedDB non disponibile'));
    req.onsuccess = async () => {
      const idb = req.result;
      const stores = ['cycles', 'exercises', 'sessions', 'sessionEntries'];
      const data = {};
      for (const store of stores) {
        if (!idb.objectStoreNames.contains(store)) { data[store] = []; continue; }
        data[store] = await new Promise(res => {
          const tx = idb.transaction(store, 'readonly');
          tx.objectStore(store).getAll().onsuccess = e => res(e.target.result);
        });
      }
      const total = Object.values(data).reduce((s, arr) => s + (arr?.length || 0), 0);
      if (total === 0) { resolve(0); return; }
      try {
        await importFromJSON(data);
        resolve(total);
      } catch (e) {
        reject(e);
      }
    };
  });
}

// ── Stub legacy ────────────────────────────────────────────────────────────────
// seedTestData era usata solo in sviluppo con IndexedDB; non serve con Firestore.
export async function seedTestData() {
  console.warn('seedTestData non disponibile con Firestore — usa l\'import da JSON');
}
