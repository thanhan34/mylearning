'use client';

import { useEffect, useState } from 'react';

type Draft = { selectedDate: string; text: string };
type DraftState = Draft & { owner: string | null };

function storageKey(owner: string) {
  return `homework-submission-draft:v1:${encodeURIComponent(owner)}`;
}

function readDraft(owner: string): Draft | null {
  const raw = window.localStorage.getItem(storageKey(owner));
  if (!raw) return null;
  const draft: unknown = JSON.parse(raw);
  if (!draft || typeof draft !== 'object') return null;
  const candidate = draft as Partial<Draft>;
  if (typeof candidate.text !== 'string' || typeof candidate.selectedDate !== 'string') return null;
  // Keep an empty date too: the student may be in the middle of changing it.
  if (candidate.selectedDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(candidate.selectedDate)) return null;
  return { text: candidate.text, selectedDate: candidate.selectedDate };
}

export function useHomeworkDraft(owner: string | null, defaultDate: string) {
  const [draft, setDraft] = useState<DraftState>({ owner: null, selectedDate: defaultDate, text: '' });
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let restored: Draft | null = null;
    let failed = false;
    if (owner) {
      try {
        restored = readDraft(owner);
      } catch {
        failed = true;
      }
    }
    setDraft({ owner, selectedDate: defaultDate, text: '', ...restored });
    setStorageError(failed);
  }, [owner, defaultDate]);

  const ready = !!owner && draft.owner === owner;

  function updateDraft(changes: Partial<Draft>) {
    if (!owner || !ready) return;
    const next = { ...draft, ...changes };
    setDraft(next);
    try {
      // Write in the input event, not in an effect/debounce that navigation could interrupt.
      window.localStorage.setItem(storageKey(owner), JSON.stringify({ selectedDate: next.selectedDate, text: next.text }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function clearDraft() {
    if (!owner) return;
    try {
      window.localStorage.removeItem(storageKey(owner));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setDraft(current => current.owner === owner ? { ...current, text: '' } : current);
  }

  return { selectedDate: draft.selectedDate, text: draft.text, ready, storageError, updateDraft, clearDraft };
}