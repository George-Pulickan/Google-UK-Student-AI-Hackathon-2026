import { SignLanguageSystem, SignTarget } from '../types';

/**
 * Reference photographs for the manual alphabets, cut out from the ASL and
 * BSL fingerspelling charts in the repo root. One file per letter per system.
 */
export function letterPhotoUrl(system: SignLanguageSystem, letter: string): string {
  return `/signs/${system.toLowerCase()}/${letter.toUpperCase()}.png`;
}

/**
 * Maps a curriculum sign onto its reference photo, if it is an alphabet sign.
 * Phrases like HELLO / THANK_YOU have no chart entry and fall back to the
 * illustrated diagram.
 */
export function signPhotoUrl(target: SignTarget): string | null {
  if (!target) return null;

  if (target.system === 'BSL') {
    const match = /^BSL_([A-Z])$/.exec(target.id);
    return match ? letterPhotoUrl('BSL', match[1]) : null;
  }

  return /^[A-Z]$/.test(target.id) ? letterPhotoUrl('ASL', target.id) : null;
}

/** Single letter this sign teaches, or null for phrases. */
export function signLetter(target: SignTarget): string | null {
  if (!target) return null;
  const match = target.system === 'BSL' ? /^BSL_([A-Z])$/.exec(target.id) : /^([A-Z])$/.exec(target.id);
  return match ? match[1] : null;
}
