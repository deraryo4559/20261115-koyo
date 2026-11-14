import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialPlanMode, PLAN_MODE_KEY, readPlanMode, restorePlanMode, savePlanMode } from '../src/lib/plan-mode';

afterEach(() => { savePlanMode(initialPlanMode); vi.unstubAllGlobals(); });

describe('persistent command mode', () => {
  it('starts closed and tolerates malformed or outdated saved data', () => {
    for (const value of [null, '', '{bad', 'null', '[]', '{"active":false}', '{"active":"true"}']) {
      expect(restorePlanMode(value)).toEqual(initialPlanMode);
    }
    expect(restorePlanMode('{"active":true,"selections":{"lunchId":"missing","cafeId":"missing","plan2Koyodai":"false"}}')).toEqual({ ...initialPlanMode, active: true });
  });
  it('keeps the mode, all independent selections and map plan until explicit exit', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    const selected = { active: true, mapPlan: 'plan2' as const, selections: { lunchId: 'fudou-kita', cafeId: 'fune', plan1Foliage: 'koyodai' as const, plan2Koyodai: true } };
    savePlanMode(selected);
    expect(readPlanMode()).toEqual(selected);
    expect(restorePlanMode(storage.get(PLAN_MODE_KEY)!)).toEqual(selected);
    savePlanMode({ ...selected, active: false });
    expect(storage.has(PLAN_MODE_KEY)).toBe(false);
    expect(readPlanMode()).toEqual(initialPlanMode);
  });
  it('still allows entering and exiting when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } });
    savePlanMode({ ...initialPlanMode, active: true });
    expect(readPlanMode().active).toBe(true);
    savePlanMode(initialPlanMode);
    expect(readPlanMode().active).toBe(false);
  });
});
