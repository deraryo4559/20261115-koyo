import { cafeCandidates, lunchCandidates, planPlaces, type PlanPlace, type PlanSelections, type PlanStage } from '../data/drive-plans';

export function checkPlanCommand(value: string): 'empty' | 'unknown' | '1115' {
  const command = value.normalize('NFKC').trim();
  return command === '' ? 'empty' : command === '1115' ? '1115' : 'unknown';
}

export interface ItineraryStop extends PlanPlace {
  category: string;
  departureTime?: string;
}

export function buildItinerary(stages: readonly PlanStage[], selections: PlanSelections): ItineraryStop[] {
  const lunch = lunchCandidates.find((place) => place.id === selections.lunchId) ?? lunchCandidates[0];
  const cafe = cafeCandidates.find((place) => place.id === selections.cafeId);
  return stages.flatMap((stage): ItineraryStop[] => {
    switch (stage) {
      case 'lunch': return [{ ...lunch, category: '昼食' }];
      case 'cafe': return [{ ...(cafe ?? { id: 'cafe', name: 'カフェ〈候補から選択〉' }), category: 'カフェ' }];
      case 'foliageChoice': return [{ ...planPlaces[selections.plan1Foliage], category: '紅葉スポット' }];
      case 'optionalKoyodai': return selections.plan2Koyodai ? [{ ...planPlaces.koyodai, category: '紅葉スポット' }] : [];
      case 'start': return [{ ...planPlaces.start, category: '出発', departureTime: '11:00' }];
      case 'pass': return [{ ...planPlaces.pass, category: '峠' }];
      case 'oldTunnel': case 'newTunnel': return [{ ...planPlaces[stage], category: '経由' }];
      case 'illumination': return [{ ...planPlaces.illumination, category: 'ライトアップ' }];
      default: return [{ ...planPlaces[stage], category: '湖畔' }];
    }
  });
}
