'use client';
import { lazy, Suspense, useRef, useState, type FormEvent } from 'react';
import { cafeCandidates, drivePlans, lunchCandidates, type PlanPlace, type PlanSelections } from '../data/drive-plans';
import type { PlanModeState } from '../lib/plan-mode';
import { buildItinerary, checkPlanCommand } from '../lib/drive-plans';
import { suppressRouletteForPlan } from '../lib/roulette-command';
import { planAlbumName, planAlbumUrl, planCover } from '../lib/plan-albums';
import { assetUrl } from '../lib/asset-url';
import MapErrorBoundary from './MapErrorBoundary';
import '../styles/drive-plans.css';

const DrivePlanMap = lazy(() => import('./DrivePlanMap'));

function PlanOptions({ planId, scope, selections, onChange }: {
  planId: 'plan1' | 'plan2'; scope: string; selections: PlanSelections; onChange: (next: PlanSelections) => void;
}) {
  return <div className="plan-route-options">
    {planId === 'plan1' ? <fieldset>
      <legend>紅葉スポットを1か所選択</legend>
      <div className="plan-foliage-choices">
        <label><input type="radio" name={`${scope}-foliage`} checked={selections.plan1Foliage === 'corridor'} onChange={() => onChange({ ...selections, plan1Foliage: 'corridor' })} />河口湖もみじ回廊</label>
        <label><input type="radio" name={`${scope}-foliage`} checked={selections.plan1Foliage === 'koyodai'} onChange={() => onChange({ ...selections, plan1Foliage: 'koyodai' })} aria-describedby={`${scope}-condition`} />紅葉台</label>
      </div>
      <p id={`${scope}-condition`}>紅葉台：富士山がよく見える場合におすすめ</p>
    </fieldset> : <fieldset>
      <legend>任意の立ち寄り</legend>
      <label><input type="checkbox" checked={selections.plan2Koyodai} onChange={(event) => onChange({ ...selections, plan2Koyodai: event.target.checked })} aria-describedby={`${scope}-condition`} />紅葉台に立ち寄る</label>
      <p id={`${scope}-condition`}>富士山がよく見える場合のみ</p>
    </fieldset>}
  </div>;
}

function AlbumLink({ place, thumbnail = false }: { place: PlanPlace; thumbnail?: boolean }) {
  const url = planAlbumUrl(place);
  const photo = planCover(place);
  if (!url) return null;
  return <a className={`plan-album-link${thumbnail ? ' plan-album-link--photo' : ''}`} href={url} aria-label={`${planAlbumName(place)}の写真を見る`}>
    {thumbnail && photo && <img src={assetUrl(photo.thumbnailSrc ?? photo.src)} alt={photo.alt} width={560} height={360} loading="lazy" />}
    <span>{place.existingSpotId ? `${planAlbumName(place)}の写真を見る` : '写真を見る'} <span aria-hidden="true">→</span></span>
  </a>;
}

function MapLink({ place }: { place: PlanPlace }) {
  return place.mapUrl ? <a className="plan-map-link" href={place.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${place.name}をGoogleマップで確認（新しいタブ）`}>地図 <span aria-hidden="true">↗</span></a> : null;
}

function CandidateGroup({ label, name, candidates, value, onChange }: {
  label: string; name: string; candidates: PlanPlace[]; value: string | null; onChange: (id: string) => void;
}) {
  return <fieldset className="plan-candidates">
    <legend>{label}</legend>
    <div className="plan-candidate-grid">
      {candidates.map((place) => <div className={`plan-candidate${value === place.id ? ' is-selected' : ''}`} key={place.id}>
        <AlbumLink place={place} thumbnail />
        <label>
          <input type="radio" name={name} value={place.id} checked={value === place.id} onChange={() => onChange(place.id)} />
          <span><span className="plan-candidate-name">{place.name}</span>{place.note && <span className="plan-candidate-note">{place.note}</span>}</span>
        </label>
        <MapLink place={place} />
      </div>)}
    </div>
  </fieldset>;
}

export default function DrivePlanCommand({ mode, onChange }: { mode: PlanModeState; onChange: (patch: Partial<PlanModeState>) => void }) {
  const [command, setCommand] = useState('');
  const { active: open, selections, mapPlan } = mode;
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const submitButton = useRef<HTMLButtonElement>(null);
  const activePlan = drivePlans.find((plan) => plan.id === mapPlan)!;

  function setSelections(update: (current: PlanSelections) => PlanSelections) {
    onChange({ selections: update(selections) });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = checkPlanCommand(command);
    if (result !== '1115') {
      setError(result === 'empty' ? 'コマンドを入力してください' : '該当するコマンドがありません');
      setAnnouncement('');
      return;
    }
    setError('');
    suppressRouletteForPlan();
    onChange({ active: true });
    event.currentTarget.querySelector('input')?.blur();
    setAnnouncement('11/15 山梨ドライブプランの2つのルートを表示しました。');
  }
  function close() {
    onChange({ active: false });
    setCommand('');
    setError('');
    setAnnouncement('コマンドモードを終了しました。');
    submitButton.current?.focus({ preventScroll: true });
  }
  function selectLunch(lunchId: string) {
    setSelections((current) => ({ ...current, lunchId }));
    setAnnouncement(`両ルートの昼食を${lunchCandidates.find((place) => place.id === lunchId)!.name}に変更しました。`);
  }
  function selectCafe(cafeId: string | null) {
    setSelections((current) => ({ ...current, cafeId }));
    setAnnouncement(cafeId ? `両ルートのカフェを${cafeCandidates.find((place) => place.id === cafeId)!.name}に変更しました。` : '両ルートのカフェを未選択に戻しました。');
  }

  // Scroll only for an explicit navigation action, never for a candidate selection.
  function goToSection(id: string) {
    const section = document.getElementById(id);
    section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    section?.focus({ preventScroll: true });
  }

  return <div className="drive-plan-command content-width">
    <form className="plan-command-form" onSubmit={submit} noValidate>
      <label htmlFor="plan-command">コマンド入力</label>
      <div className="plan-command-controls">
        <input id="plan-command" value={command} onChange={(event) => { setCommand(event.target.value); setError(''); }}
          placeholder="コマンドを入力してください" inputMode="numeric" enterKeyHint="go" autoComplete="off" autoCapitalize="off" spellCheck={false}
          aria-invalid={Boolean(error)} aria-describedby="plan-command-error" />
        <button ref={submitButton} type="submit" aria-expanded={open} aria-controls="drive-plan-panel">表示</button>
      </div>
      <p id="plan-command-error" className="plan-command-error" role="alert">{error}</p>
    </form>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <section id="drive-plan-panel" className="drive-plan-panel" hidden={!open} aria-labelledby="drive-plan-title">
      {open && <>
        <div className="drive-plan-heading">
          <h2 id="drive-plan-title">11/15 山梨ドライブプラン</h2>
          <button className="plan-close" type="button" onClick={close}>コマンドモードを終了にする</button>
        </div>
        <nav className="plan-section-nav" aria-label="ドライブプラン内の移動">
          <button type="button" onClick={() => goToSection('plan-map-section')}>地図</button>
          <button type="button" onClick={() => goToSection('plan-shop-section')}>お店を選ぶ</button>
          <button type="button" onClick={() => goToSection('plan-itinerary-section')}>行程を比較</button>
        </nav>
        <section id="plan-map-section" tabIndex={-1} className="plan-map-section" aria-labelledby="plan-map-title">
          <div className="plan-map-heading"><h3 id="plan-map-title">ルートを地図で確認</h3>
            <div className="plan-map-switch" role="group" aria-label="地図に表示するプラン">
              {drivePlans.map((plan) => <button type="button" key={plan.id} aria-pressed={mapPlan === plan.id} onClick={() => onChange({ mapPlan: plan.id })}>{plan.label}</button>)}
            </div>
          </div>
          <div className="plan-map-options">
            <p className="plan-map-plan-name">{activePlan.title}</p>
            <PlanOptions planId={mapPlan} scope="map" selections={selections} onChange={(next) => onChange({ selections: next })} />
          </div>
          <MapErrorBoundary onRetry={() => window.location.reload()}><Suspense fallback={<p className="plan-map-loading" role="status">地図を読み込んでいます…</p>}>
            <DrivePlanMap planId={mapPlan} label={activePlan.label} stops={buildItinerary(activePlan.stages, selections)} />
          </Suspense></MapErrorBoundary>
        </section>
        <section id="plan-shop-section" tabIndex={-1} className="plan-shared-choices" aria-label="両ルート共通のお店選び">
          <p className="plan-selection-help">ほうとう・カフェを各1店選ぶと、両ルートに反映されます。</p>
          <CandidateGroup label="ほうとう候補" name="plan-lunch" candidates={lunchCandidates} value={selections.lunchId} onChange={selectLunch} />
          <CandidateGroup label="カフェ候補" name="plan-cafe" candidates={cafeCandidates} value={selections.cafeId} onChange={selectCafe} />
          <button className="plan-clear" type="button" disabled={selections.cafeId === null} onClick={() => selectCafe(null)}>カフェの選択を解除</button>
        </section>
        <section id="plan-itinerary-section" tabIndex={-1} className="drive-plan-grid" aria-label="2つのルートの行程比較">
          {drivePlans.map((plan) => <article className="drive-plan-card" key={plan.id} aria-labelledby={`${plan.id}-title`}>
            <div className="plan-card-heading"><p>{plan.label}</p><h3 id={`${plan.id}-title`}>{plan.title}</h3></div>
            <PlanOptions planId={plan.id} scope={plan.id} selections={selections} onChange={(next) => onChange({ selections: next })} />
            <div className="plan-mobile-route-summary">
              <p>{plan.id === 'plan1' ? `紅葉スポット：${selections.plan1Foliage === 'corridor' ? '河口湖もみじ回廊' : '紅葉台'}` : `紅葉台：${selections.plan2Koyodai ? '立ち寄る' : '立ち寄らない'}`}</p>
              {plan.id === 'plan2' && <p>紅葉台は富士山がよく見える場合のみ追加できます。</p>}
              <button type="button" onClick={() => { onChange({ mapPlan: plan.id }); goToSection('plan-map-section'); }}>{plan.label}を地図で確認・変更</button>
            </div>
            <ol className="plan-itinerary" aria-label={`${plan.label}の訪問順`}>
              {buildItinerary(plan.stages, selections).map((stop) => <li key={stop.id}>
                <div className="plan-stop-copy"><span className="plan-stop-category">{stop.category}</span><p className="plan-stop-name">{stop.departureTime && <time>{stop.departureTime} </time>}{stop.name}</p>{stop.note === '電話予約必要' && <p className="plan-stop-note">電話予約必要</p>}<AlbumLink place={stop} /></div>
                <MapLink place={stop} />
              </li>)}
            </ol>
          </article>)}
        </section>
      </>}
    </section>
  </div>;
}
