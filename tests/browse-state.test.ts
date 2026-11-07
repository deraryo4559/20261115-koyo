import { describe, expect, it } from 'vitest';
import { initialState, restoreBrowseState } from '../src/lib/browse-state';
import { spots } from '../src/data';

const restore = (value: unknown) => restoreBrowseState(JSON.stringify(value), spots);

describe('browse state recovery', () => {
  it('starts with all 19 places and scenery when storage is unavailable or malformed', () => {
    expect(restoreBrowseState(null, spots)).toEqual(initialState);
    expect(restoreBrowseState('{broken', spots)).toEqual(initialState);
    expect(restore(null)).toEqual(initialState);
  });
  it('keeps the selected route, view, and place on return', () => {
    const state = { version: 1, route: 'yamanashi', view: 'map', selectedId: 'P07' };
    expect(restore(state)).toEqual(state);
  });
  it('never restores the deleted route or deleted locations', () => {
    expect(restore({ version: 1, route: 'tsukuba-ashikaga', view: 'map', selectedId: 'P20' })).toEqual(initialState);
    expect(restore({ version: 1, route: 'all', view: 'map', selectedId: 'P22' })).toEqual(initialState);
  });
  it('clears an out-of-route place without silently changing the requested route', () => {
    expect(restore({ version: 1, route: 'hakone', view: 'map', selectedId: 'P07' })).toEqual({ version: 1, route: 'hakone', view: 'map', selectedId: null });
  });
});
