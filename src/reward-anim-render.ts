import { t } from './i18n';
import {
  RewardTier,
  rewardAnimDesign,
  rewardDurationFor,
  rewardEmojiFor,
  rewardAnnounceKeyFor
} from './reward-anim';

/**
 * DOM renderer for the reward-anim feature. Lives in its own file so the
 * design module (`reward-anim.ts`) stays pure and unit-testable.
 *
 * Plays a transient overlay celebrating either a leaf completion or a
 * full task completion. Honors `prefers-reduced-motion: reduce` by
 * skipping the animated confetti and showing only the emoji + ARIA
 * announcement.
 */

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export function playReward(tier: RewardTier): void {
  if (tier === 'none') return;
  if (typeof document === 'undefined') return;

  const duration = rewardDurationFor(tier);
  const emoji = rewardEmojiFor(tier);
  const announceKey = rewardAnnounceKeyFor(tier);
  const reduced = rewardAnimDesign.respectReducedMotion && prefersReducedMotion();

  const overlay = document.createElement('div');
  overlay.className = rewardAnimDesign.overlayClass;
  overlay.classList.add(`${rewardAnimDesign.overlayClass}--${tier}`);
  if (reduced) overlay.classList.add(`${rewardAnimDesign.overlayClass}--reduced`);

  if (rewardAnimDesign.ariaAnnounce) {
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
  }

  const glyph = document.createElement('div');
  glyph.className = `${rewardAnimDesign.overlayClass}__glyph`;
  glyph.textContent = emoji;
  overlay.appendChild(glyph);

  if (announceKey) {
    const sr = document.createElement('span');
    sr.className = `${rewardAnimDesign.overlayClass}__sr`;
    sr.textContent = t(announceKey) || '';
    overlay.appendChild(sr);
  }

  if (tier === 'task' && !reduced && rewardAnimDesign.confettiCount > 0) {
    for (let i = 0; i < rewardAnimDesign.confettiCount; i++) {
      const piece = document.createElement('span');
      piece.className = rewardAnimDesign.confettiClass;
      const angle = (360 / rewardAnimDesign.confettiCount) * i;
      const distance = 60 + Math.random() * 40;
      const dx = Math.cos((angle * Math.PI) / 180) * distance;
      const dy = Math.sin((angle * Math.PI) / 180) * distance;
      piece.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      piece.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      piece.style.setProperty('--hue', `${Math.floor(Math.random() * 360)}`);
      piece.style.setProperty(
        '--delay',
        `${(Math.random() * 120).toFixed(0)}ms`
      );
      overlay.appendChild(piece);
    }
  }

  document.body.appendChild(overlay);

  window.setTimeout(() => {
    overlay.remove();
  }, duration);
}
