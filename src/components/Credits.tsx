'use client';
import { useRef } from 'react';
import type { Spot } from '../types/spot';

export default function Credits({ spots }: { spots: Spot[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="text-button" onClick={() => dialog.current?.showModal()}>写真・地図の出典</button>
    <dialog className="credits-dialog" ref={dialog} aria-labelledby="credits-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="credits-heading"><h2 id="credits-title">写真・地図の出典</h2><button type="button" className="dialog-close" onClick={() => dialog.current?.close()} aria-label="出典を閉じる">×</button></div>
      <p>写真は撮影時の風景です。現在の紅葉・営業状況を示していません。掲載画像は表示用にリサイズし、一覧では一部を切り取って表示しています。</p>
      <ol className="credits-list">{spots.map((spot) => <li key={spot.id}><h3>{spot.name}</h3>{spot.photo ? <><p>{spot.photo.caption}</p><p><a href={spot.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{spot.photo.credit}</a>{' / '}<a href={spot.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{spot.photo.license}</a></p></> : <p>現地写真を確認中です。</p>}</li>)}</ol>
      <h3>地図</h3><p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> / <a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a></p>
    </dialog>
  </>;
}
