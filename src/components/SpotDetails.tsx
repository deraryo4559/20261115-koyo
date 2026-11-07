'use client';
import { useState } from 'react';
import { routeById } from '../data/routes';
import type { Spot } from '../types/spot';
import SpotPhoto from './SpotPhoto';
import { spotUrl } from '../lib/spot-url';

export default function SpotDetails({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <aside className={`spot-detail${expanded ? ' is-expanded' : ''}`} aria-labelledby="detail-name">
    <button id="detail-close" className="detail-close" type="button" onClick={onClose} aria-label="スポット詳細を閉じる">×</button>
    <div className="detail-summary">
      <SpotPhoto spot={spot} eager className="detail-photo" />
      <div className="detail-intro">
        <p className="detail-route">{routeById[spot.routeId].label}</p>
        <h2 id="detail-name">{spot.name}</h2>
        <p className="detail-description">{spot.description}</p>
      </div>
    </div>
    <div className="detail-actions">
      <a href={spotUrl(spot.id)} className="primary-link">写真アルバムを見る <span aria-hidden="true">→</span></a>
      <a href={spot.googleMapsUrl} className="text-button" target="_blank" rel="noopener noreferrer">Googleマップで見る <span aria-hidden="true">↗</span></a>
      <button type="button" className="text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="detail-more">{expanded ? '詳しい情報を閉じる −' : 'アクセス・写真の情報 ＋'}</button>
    </div>
    <div id="detail-more" className="detail-more" hidden={!expanded}>
      <dl className="detail-facts">
        <div><dt>場所</dt><dd>{spot.address} / {spot.kind}</dd></div>
        <div><dt>地図の位置</dt><dd>{spot.locationNote}{spot.coordinateStatus === 'approximate' && <strong className="unverified">代表位置は照合中です。</strong>}</dd></div>
        <div><dt>駐車場・車の到着地点</dt><dd>{spot.parkingNote}</dd></div>
        <div><dt>徒歩・散策</dt><dd>{spot.walkingNote}</dd></div>
      </dl>
      <a className="official-link" href={spot.officialUrl} target="_blank" rel="noopener noreferrer">営業・料金・交通情報を公式サイトで確認 <span aria-hidden="true">↗</span></a>
      <div className="photo-credit">
        <h3>写真について</h3>
        {spot.photo ? <>
          <p>{spot.photo.caption}</p>
          <p><a href={spot.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{spot.photo.credit}</a>{' / '}<a href={spot.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{spot.photo.license}</a></p>
          <p>掲載用にサイズを調整しています。写真は現在の色づきや営業状況を示すものではありません。</p>
        </> : <p>掲載条件と現地の対応が確認できる写真を準備しています。</p>}
      </div>
      <details className="data-sources"><summary>地点情報の出典</summary><ul>{spot.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul><p>地点情報の確認日：{spot.verifiedAt}</p></details>
    </div>
  </aside>;
}
