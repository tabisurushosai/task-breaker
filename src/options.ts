import { applyI18n, t } from './i18n';
import { getPremiumStatus } from './premium';
import { openCheckout, redeemUnlockCode } from './upgrade';

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const stateEl = document.getElementById('premium-state') as HTMLParagraphElement;
  const purchaseEl = document.getElementById('premium-purchase') as HTMLDivElement;
  const buyBtn = document.getElementById('open-checkout-btn') as HTMLButtonElement;
  const redeemBtn = document.getElementById('redeem-btn') as HTMLButtonElement;
  const codeInput = document.getElementById('unlock-code-input') as HTMLInputElement;
  const resultEl = document.getElementById('redeem-result') as HTMLParagraphElement;

  const refreshPremiumState = async () => {
    const status = await getPremiumStatus();
    if (status.isPremium && !status.isTrial) {
      stateEl.textContent = t('options_premium_state_unlocked');
      purchaseEl.hidden = true;
    } else if (status.isTrial) {
      stateEl.textContent = t('options_premium_state_trial', [
        String(status.trialDaysRemaining)
      ]);
      purchaseEl.hidden = false;
    } else {
      stateEl.textContent = t('options_premium_state_free');
      purchaseEl.hidden = false;
    }
  };

  buyBtn.addEventListener('click', () => {
    openCheckout();
  });

  redeemBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    resultEl.classList.remove('redeem-result-ok', 'redeem-result-error');
    const code = codeInput.value;
    if (!code.trim()) return;

    redeemBtn.disabled = true;
    try {
      const result = await redeemUnlockCode(code);
      if (result.ok) {
        resultEl.textContent = t('options_premium_redeem_success');
        resultEl.classList.add('redeem-result-ok');
        codeInput.value = '';
        await refreshPremiumState();
      } else if (result.reason === 'already_unlocked') {
        resultEl.textContent = t('options_premium_redeem_already');
        resultEl.classList.add('redeem-result-ok');
        await refreshPremiumState();
      } else {
        resultEl.textContent = t('options_premium_redeem_invalid');
        resultEl.classList.add('redeem-result-error');
      }
    } finally {
      redeemBtn.disabled = false;
    }
  });

  await refreshPremiumState();
});
