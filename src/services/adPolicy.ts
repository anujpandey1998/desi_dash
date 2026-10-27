export const INTERSTITIAL_RUN_INTERVAL = 4;
export const INTERSTITIAL_COOLDOWN_MS = 180000;

export function isInterstitialDue(completedRuns: number, lastShownRun: number, lastShownAt: number, now: number) {
  return completedRuns - lastShownRun >= INTERSTITIAL_RUN_INTERVAL
    && now - lastShownAt >= INTERSTITIAL_COOLDOWN_MS;
}
