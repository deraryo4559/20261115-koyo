export const SUPPRESS_ROULETTE_EVENT = 'koyo:suppress-roulette';

/** The existing roulette clock carries this choice through album navigation. */
export function suppressRouletteForPlan() {
  window.dispatchEvent(new Event(SUPPRESS_ROULETTE_EVENT));
}
