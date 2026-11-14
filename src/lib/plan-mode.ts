import { cafeCandidates, initialPlanSelections, lunchCandidates, type PlanSelections } from '../data/drive-plans';

export const PLAN_MODE_KEY = 'koyo:drive-plan:1115:v1';
export interface PlanModeState {
  active: boolean;
  selections: PlanSelections;
  mapPlan: 'plan1' | 'plan2';
}
export const initialPlanMode: PlanModeState = {
  active: false, selections: initialPlanSelections, mapPlan: 'plan1',
};

export function restorePlanMode(raw: string | null): PlanModeState {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.active !== true) return initialPlanMode;
    const selections = value.selections;
    return {
      active: true,
      mapPlan: value.mapPlan === 'plan2' ? 'plan2' : 'plan1',
      selections: {
        lunchId: lunchCandidates.some((place) => place.id === selections?.lunchId) ? selections.lunchId : initialPlanSelections.lunchId,
        cafeId: cafeCandidates.some((place) => place.id === selections?.cafeId) ? selections.cafeId : null,
        plan1Foliage: selections?.plan1Foliage === 'koyodai' ? 'koyodai' : 'corridor',
        plan2Koyodai: selections?.plan2Koyodai === true,
      },
    };
  } catch { return initialPlanMode; }
}

// Storage can be disabled; the current page must still work in that case.
let fallback = initialPlanMode;
export function readPlanMode(): PlanModeState {
  try { return restorePlanMode(localStorage.getItem(PLAN_MODE_KEY)); }
  catch { return fallback; }
}
export function savePlanMode(state: PlanModeState) {
  fallback = state;
  try {
    if (state.active) localStorage.setItem(PLAN_MODE_KEY, JSON.stringify(state));
    else localStorage.removeItem(PLAN_MODE_KEY);
  } catch { /* optional persistence */ }
}
