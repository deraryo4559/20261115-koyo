'use client';
import { useEffect, useRef, useState } from 'react';
import { routes } from '../data/routes';
import { assetUrl } from '../lib/asset-url';
import '../styles/roulette.css';

const CLOCK_KEY = 'koyo:roulette:main-clock:v1';
let fallbackClock: { startedAt: number; shown: boolean; documentId: number } | null = null;

export default function RouteRoulette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const spun = useRef(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  useEffect(() => {
    const documentId = performance.timeOrigin;
    let clock = fallbackClock;
    try {
      const saved = JSON.parse(sessionStorage.getItem(CLOCK_KEY) ?? 'null');
      if (saved && Number.isFinite(saved.startedAt) && typeof saved.shown === 'boolean') clock = saved;
    } catch { /* Storage is optional. */ }
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isMain = window.location.pathname.replace(/\/$/, '') === assetUrl('/').replace(/\/$/, '');
    if (!clock || (isMain && navigation?.type === 'reload' && clock.documentId !== documentId)) {
      clock = { startedAt: documentId, shown: false, documentId };
    }
    const current = clock;
    const save = () => {
      fallbackClock = current;
      try { sessionStorage.setItem(CLOCK_KEY, JSON.stringify(current)); } catch { /* optional */ }
    };
    save();
    const tick = () => {
      if (!current.shown && Date.now() - current.startedAt >= 60_000 && document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) {
        dialog.current?.showModal();
        current.shown = true;
        save();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => { clearInterval(interval); if (timer.current) clearTimeout(timer.current); };
  }, []);
  function close() {
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    setSpinning(false);
    dialog.current?.close();
  }
  function spin() {
    if (busy.current || spun.current) return;
    spun.current = true;
    setHasSpun(true);
    busy.current = true;
    setSpinning(true); setResult(null);
    const index = Math.floor(Math.random() * 3);
    // The pointer is at 12 o'clock; stop at the center of the selected 120° sector.
    setAngle((current) => current + 1800 + ((360 - (index * 120 + 60) - current % 360 + 360) % 360));
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 4200;
    timer.current = setTimeout(() => { setResult(index); setSpinning(false); busy.current = false; }, duration);
  }
  return <dialog ref={dialog} className="route-roulette" aria-labelledby="roulette-title" onCancel={(e) => { e.preventDefault(); close(); }}>
    <button type="button" className="roulette-close" aria-label="ルーレットを閉じる" onClick={close}>×</button>
    <h1 id="roulette-title">どれにするか迷っていませんか？</h1>
    <h2>神の力に頼ってみましょう</h2>
    <div className="roulette-stage">
      <span className="roulette-pointer" aria-hidden="true" />
      <div className="roulette-wheel" aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }}>
        {routes.map((route, i) => <span key={route.id} style={{ transform: `rotate(${i * 120 + 60}deg) translateY(-78px) rotate(-${i * 120 + 60}deg)` }}>{route.shortLabel}</span>)}
      </div>
    </div>
    <p className="sr-only">箱根・御殿場、山梨、秩父・多摩の3ルートから選びます。</p>
    <button type="button" className="roulette-spin" disabled={hasSpun} onClick={spin}>{spinning ? '回転中…' : hasSpun ? 'このスクショを見せてね' : 'ルーレットを回す'}</button>
    <div className="roulette-result" aria-live="polite">
      {result !== null && <><p>{routes[result].shortLabel}</p><a href={`${assetUrl('/')}?route=${routes[result].id}`} onClick={close}>このルートを見る →</a></>}
    </div>
  </dialog>;
}
