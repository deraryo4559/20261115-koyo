import type { Spot } from '../types/spot';
import SpotPhoto from './SpotPhoto';
import { spotUrl } from '../lib/spot-url';

export default function SpotGallery({ spots, compact = false }: {
  spots: Spot[];
  compact?: boolean;
}) {
  return <div className={`spot-gallery${compact ? ' spot-gallery--compact' : ''}`}>
    {spots.map((spot, index) => <figure className="gallery-item" key={spot.id}>
      <a className="gallery-button" data-spot-id={spot.id} href={spotUrl(spot.id)}
        aria-label={`${spot.name}の写真アルバムを見る`}>
        <SpotPhoto spot={spot} eager={index < 4} />
        <span className="gallery-name">{spot.name === 'アネスト岩田 ターンパイク箱根'
          ? <><span>アネスト岩田</span>{' '}<span>ターンパイク箱根</span></> : spot.name}</span>
      </a>
    </figure>)}
  </div>;
}
