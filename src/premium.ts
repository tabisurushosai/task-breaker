/**
 * Premium / trial state management.
 *
 * Free users get the basic feature set unconditionally. A 7-day trial unlocks
 * Premium features starting from trial_start_ts (set on first install). After
 * the trial expires, Premium features are gated until the user purchases.
 *
 * No external calls — all state lives in chrome.storage.local.
 */

import { getStorage, setStorage } from './storage';

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface PremiumStatus {
  isPremium: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialStartTs: number;
}

function now(): number {
  return Date.now();
}

export async function getTrialStartTs(): Promise<number> {
  const data = await getStorage(['trial_start_ts']);
  const ts = data.trial_start_ts;
  if (typeof ts === 'number' && ts > 0) {
    return ts;
  }
  const fresh = now();
  await setStorage({ trial_start_ts: fresh });
  return fresh;
}

export async function isPremiumUnlocked(): Promise<boolean> {
  const data = await getStorage(['premium_unlocked']);
  return data.premium_unlocked === true;
}

export async function isTrialActive(currentTs: number = now()): Promise<boolean> {
  const start = await getTrialStartTs();
  return currentTs - start < TRIAL_DURATION_MS;
}

export async function getPremiumStatus(currentTs: number = now()): Promise<PremiumStatus> {
  const [unlocked, trialStartTs] = await Promise.all([
    isPremiumUnlocked(),
    getTrialStartTs()
  ]);
  const elapsed = currentTs - trialStartTs;
  const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);
  const trialDaysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  const isTrial = !unlocked && elapsed < TRIAL_DURATION_MS;
  return {
    isPremium: unlocked || isTrial,
    isTrial,
    trialDaysRemaining: unlocked ? 0 : trialDaysRemaining,
    trialStartTs
  };
}

export async function unlockPremium(): Promise<void> {
  await setStorage({ premium_unlocked: true });
}

export async function lockPremium(): Promise<void> {
  await setStorage({ premium_unlocked: false });
}
