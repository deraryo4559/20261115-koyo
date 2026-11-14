import spots from './spots.json';

// These ordered plans are independent of the map's regional spot categories.
const searchMap = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const yamanashiMap = (name: string) => searchMap(`${name} 山梨県`);

export interface PlanPlace {
  id: string;
  name: string;
  mapUrl?: string;
  note?: string;
}

export const lunchCandidates = [
  { id: 'funari', name: 'ほうとう蔵 歩成 河口湖店', note: '第一候補' },
  { id: 'fudou-kita', name: 'ほうとう不動 河口湖北本店', note: '歩成が混雑している場合などの代替候補' },
  { id: 'fudou-higashi', name: 'ほうとう不動 東恋路店', note: '歩成が混雑している場合などの代替候補' },
].map((place) => ({ ...place, mapUrl: yamanashiMap(place.name) }));

export const cafeCandidates = [
  { id: 'reimeisou', name: '黎明荘' },
  { id: 'kokubo', name: 'the;kokubo', note: 'コーヒー' },
  { id: 'fune', name: '山梨ごはん＆Cafe 槽〈ふね〉', note: '電話予約必要' },
  { id: 'pamonirupuff', name: 'pamonirupuff' },
  { id: 'evameva', name: 'evam eva yamanashi「味」茶房' },
].map((place) => ({ ...place, mapUrl: yamanashiMap(place.name) }));

export const planPlaces = {
  start: { id: 'start', name: '赤羽駅', mapUrl: searchMap('赤羽駅 東京都') },
  corridor: { id: 'corridor', name: '河口湖もみじ回廊', mapUrl: spots.find((spot) => spot.id === 'P07')!.googleMapsUrl },
  koyodai: { id: 'koyodai', name: '紅葉台', mapUrl: yamanashiMap('紅葉台') },
  shoji: { id: 'shoji', name: '精進湖', mapUrl: yamanashiMap('精進湖') },
  motosu: { id: 'motosu', name: '本栖湖', mapUrl: yamanashiMap('本栖湖') },
  // P09 is a hiking pass, not the roadside tea house. Do not reuse that pin here.
  pass: { id: 'pass', name: '御坂峠・天下茶屋', mapUrl: yamanashiMap('御坂峠 天下茶屋') },
  oldTunnel: { id: 'oldTunnel', name: '旧御坂トンネル', mapUrl: yamanashiMap('旧御坂トンネル') },
  newTunnel: { id: 'newTunnel', name: '新御坂トンネル', mapUrl: yamanashiMap('新御坂トンネル') },
  illumination: { id: 'illumination', name: '山中湖ライトアップ', mapUrl: yamanashiMap('山中湖 ライトアップ') },
} satisfies Record<string, PlanPlace>;

export type PlanStage = keyof typeof planPlaces | 'lunch' | 'cafe' | 'foliageChoice' | 'optionalKoyodai';
export const drivePlans = [
  {
    id: 'plan1', label: 'ルート1', title: '降りてしっかりと満喫',
    stages: ['start', 'lunch', 'foliageChoice', 'pass', 'oldTunnel', 'cafe', 'newTunnel', 'illumination'],
  },
  {
    id: 'plan2', label: 'ルート2', title: 'ドライブでいろいろすばやく見回る',
    stages: ['start', 'lunch', 'optionalKoyodai', 'shoji', 'motosu', 'pass', 'oldTunnel', 'cafe', 'newTunnel', 'illumination'],
  },
] as const satisfies readonly { id: string; label: string; title: string; stages: readonly PlanStage[] }[];

export interface PlanSelections {
  lunchId: string;
  cafeId: string | null;
  plan1Foliage: 'corridor' | 'koyodai';
  plan2Koyodai: boolean;
}
export const initialPlanSelections: PlanSelections = {
  lunchId: 'funari', cafeId: null, plan1Foliage: 'corridor', plan2Koyodai: false,
};
