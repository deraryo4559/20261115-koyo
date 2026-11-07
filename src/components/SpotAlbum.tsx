'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { assetUrl } from '../lib/asset-url';
import type { Photo, Spot } from '../types/spot';
import '../styles/album.css';

type AlbumSpot = Pick<Spot, 'id' | 'name' | 'photos'>;

function AlbumImage({ photo, eager = false }: { photo: Photo; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="album-photo-error">写真を読み込めませんでした。</span>
    : <img src={assetUrl(photo.src)} alt={photo.alt} width={photo.width ?? 1600} height={photo.height ?? 1067}
      loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}

export default function SpotAlbum({ spot }: { spot: AlbumSpot }) {
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  const photos = spot.photos;
  const current = photos[active];
  const pad = (value: number) => String(value).padStart(2, '0');

  function openPhoto(index: number) {
    setActive(index);
    dialog.current?.showModal();
  }
  function changePhoto(direction: number) {
    setActive((index) => (index + direction + photos.length) % photos.length);
  }

  function photoFigure(photo: Photo, index: number) {
    const frameStyle = {
      '--photo-width': `${photo.width ?? 1600}px`,
      '--photo-ratio': (photo.width ?? 1600) / (photo.height ?? 1067),
    } as CSSProperties;
    return <figure className={`album-print${index === 0 ? ' album-print--cover' : ''}`} style={frameStyle} key={photo.src}>
      <button className="album-image-button" type="button" onClick={() => openPhoto(index)} aria-label={`${spot.name}の写真 ${index + 1} を拡大`}>
        <AlbumImage photo={photo} eager={index === 0} />
        <span className="album-enlarge" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M7 3H3v4m10-4h4v4m0 6v4h-4m-6 0H3v-4" /></svg></span>
      </button>
    </figure>;
  }

  return <div className="spot-album">
    <a className="skip-link" href="#album-photos">写真を見る</a>
    <header className="album-nav">
      <a href={assetUrl('/')} className="album-back"><span aria-hidden="true">←</span> 一覧に戻る</a>
    </header>
    <main>
      <div className={`album-title-block${spot.id === 'P04' ? ' album-title-block--long' : ''}`}>
        <h1>{spot.id === 'P04' ? <><span className="album-title-prefix">アネスト岩田</span>{' '}<span>ターンパイク箱根</span></> : spot.name}</h1>
      </div>
      <section id="album-photos" className="album-photographs" aria-label={`${spot.name}の写真アルバム`}>
        {photos[0] && photoFigure(photos[0], 0)}
        <div className="album-grid">{photos.slice(1).map((photo, index) => photoFigure(photo, index + 1))}</div>
      </section>
      <details className="album-attribution"><summary>写真の出典</summary>
        <ol>{photos.map((photo) => <li key={photo.src}><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.credit}</a><span> — </span><a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></li>)}</ol>
      </details>
    </main>
    <dialog ref={dialog} className="photo-lightbox" aria-label={`${spot.name}の拡大写真`} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); changePhoto(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); changePhoto(-1); }
      }}>
      <div className="lightbox-toolbar"><span>{spot.name}</span><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="拡大写真を閉じる">閉じる <span aria-hidden="true">×</span></button></div>
      {current && <>
        <div className="lightbox-image" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => {
          if (touchStart.current !== null) {
            const distance = event.changedTouches[0].clientX - touchStart.current;
            if (Math.abs(distance) > 50) changePhoto(distance > 0 ? -1 : 1);
          }
          touchStart.current = null;
        }}><AlbumImage key={current.src} photo={current} eager /></div>
        <div className="lightbox-bottom"><button type="button" onClick={() => changePhoto(-1)} aria-label="前の写真">←</button>
          <div aria-live="polite">{pad(active + 1)} / {pad(photos.length)}</div>
          <button type="button" onClick={() => changePhoto(1)} aria-label="次の写真">→</button></div>
      </>}
    </dialog>
  </div>;
}
