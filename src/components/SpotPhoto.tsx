'use client';
import { useState } from 'react';
import { assetUrl } from '../lib/asset-url';
import type { Spot } from '../types/spot';

export default function SpotPhoto({ spot, eager = false, className = '' }: { spot: Spot; eager?: boolean; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = spot.photo;
  return <span className={`photo-frame ${className}`}>
    {photo && failedSrc !== photo.src
      ? <img src={assetUrl(photo.src)} alt={photo.alt} width={960} height={640} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(photo.src)} />
      : <span className="photo-fallback" role="img" aria-label={`${spot.name}：${photo ? '画像を読み込めません' : '写真確認中'}`}>
          <span aria-hidden="true">{photo ? '写真を読み込めませんでした' : '現地写真を確認中'}</span>
        </span>}
  </span>;
}
