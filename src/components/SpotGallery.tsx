import type { Spot } from '../types/spot';
import SpotPhoto from './SpotPhoto';

export default function SpotGallery({ spots, onSelect, selectedId, compact = false }: {
  spots: Spot[];
  onSelect: (id: string, trigger: HTMLElement) => void;
  selectedId: string | null;
  compact?: boolean;
}) {
  return <div className={`spot-gallery${compact ? ' spot-gallery--compact' : ''}`}>
    {spots.map((spot, index) => <figure className="gallery-item" key={spot.id}>
      <button type="button" className="gallery-button" data-spot-id={spot.id}
        aria-label={`${spot.name}を地図で見る`} aria-pressed={selectedId === spot.id}
        onClick={(event) => onSelect(spot.id, event.currentTarget)}>
        <SpotPhoto spot={spot} eager={index < 4} />
        <span className="gallery-name">{spot.name === 'アネスト岩田 ターンパイク箱根'
          ? <><span>アネスト岩田</span>{' '}<span>ターンパイク箱根</span></> : spot.name}</span>
      </button>
    </figure>)}
  </div>;
}
