import { describe, expect, it } from 'vitest';
import { cafeCandidates, drivePlans, initialPlanSelections, lunchCandidates, planPlaces } from '../src/data/drive-plans';
import { buildItinerary, checkPlanCommand } from '../src/lib/drive-plans';
import spots from '../src/data/spots.json';

describe('drive plan command', () => {
  it.each(['1115', ' 1115 ', '１１１５', '　１１１５　', '1１1５'])('accepts %s without a date restriction', (input) => {
    expect(checkPlanCommand(input)).toBe('1115');
  });
  it.each(['', ' ', '　\t'])('identifies an empty command', (input) => expect(checkPlanCommand(input)).toBe('empty'));
  it.each(['1114', '11150', '11 15', '<script>', '山梨'])('rejects %s', (input) => expect(checkPlanCommand(input)).toBe('unknown'));
});

describe('ordered drive plans', () => {
  it('uses the specified defaults and mutually exclusive foliage stop', () => {
    const [first, second] = drivePlans.map((plan) => buildItinerary(plan.stages, initialPlanSelections));
    expect(first.map((stop) => stop.name)).toEqual([
      '赤羽駅', 'ほうとう蔵 歩成 河口湖店', '河口湖もみじ回廊', '御坂峠・天下茶屋',
      '旧御坂トンネル', 'カフェ〈候補から選択〉', '新御坂トンネル', '山中湖ライトアップ',
    ]);
    expect(second.map((stop) => stop.name)).toEqual([
      '赤羽駅', 'ほうとう蔵 歩成 河口湖店', '精進湖', '本栖湖', '御坂峠・天下茶屋',
      '旧御坂トンネル', 'カフェ〈候補から選択〉', '新御坂トンネル', '山中湖ライトアップ',
    ]);
    for (const stops of [first, second]) {
      expect(stops[0].departureTime).toBe('11:00');
      expect(stops.slice(1).every((stop) => stop.departureTime === undefined)).toBe(true);
    }
  });
  it('keeps the required order for every shared candidate and independent foliage selection', () => {
    for (const lunch of lunchCandidates) for (const cafe of [null, ...cafeCandidates]) {
      for (const plan1Foliage of ['corridor', 'koyodai'] as const) for (const plan2Koyodai of [false, true]) {
        const selections = { lunchId: lunch.id, cafeId: cafe?.id ?? null, plan1Foliage, plan2Koyodai };
        const [first, second] = drivePlans.map((plan) => buildItinerary(plan.stages, selections));
        for (const stops of [first, second]) {
          expect(stops.filter((stop) => stop.category === '昼食').map((stop) => stop.id)).toEqual([lunch.id]);
          expect(stops.filter((stop) => stop.category === 'カフェ').map((stop) => stop.id)).toEqual([cafe?.id ?? 'cafe']);
          expect(stops.slice(-5).map((stop) => stop.id)).toEqual(['pass', 'oldTunnel', cafe?.id ?? 'cafe', 'newTunnel', 'illumination']);
          expect(stops.at(-1)?.name).toBe('山中湖ライトアップ');
        }
        expect(first.filter((stop) => stop.category === '紅葉スポット').map((stop) => stop.id)).toEqual([plan1Foliage]);
        expect(second.slice(2, -5).map((stop) => stop.id)).toEqual(plan2Koyodai ? ['koyodai', 'shoji', 'motosu'] : ['shoji', 'motosu']);
      }
    }
  });
  it('includes all candidates and the required reservation note without claiming a booking', () => {
    expect(lunchCandidates).toHaveLength(3);
    expect(cafeCandidates.map((place) => place.name)).toEqual(['黎明荘', 'the;kokubo', '山梨ごはん＆Cafe 槽〈ふね〉', 'pamonirupuff', 'evam eva yamanashi「味」茶房']);
    expect(cafeCandidates.find((place) => place.id === 'fune')?.note).toBe('電話予約必要');
    expect(cafeCandidates.find((place) => place.id === 'kokubo')?.note).toBe('コーヒー');
    expect(cafeCandidates.filter((place) => !['fune', 'kokubo'].includes(place.id)).every((place) => !place.note)).toBe(true);
  });
  it('reuses the corridor pin and uses named Yamanashi searches for new candidates', () => {
    expect(planPlaces.corridor.mapUrl).toBe(spots.find((spot) => spot.id === 'P07')?.googleMapsUrl);
    expect(planPlaces.pass.mapUrl).not.toBe(spots.find((spot) => spot.id === 'P09')?.googleMapsUrl);
    for (const place of [...lunchCandidates, ...cafeCandidates]) {
      const url = new URL(place.mapUrl);
      expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
      expect(url.searchParams.get('query')).toBe(`${place.name} 山梨県`);
    }
  });
});
