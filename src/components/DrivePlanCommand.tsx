'use client';
import { useRef, useState, type FormEvent } from 'react';
import { cafeCandidates, drivePlans, initialPlanSelections, lunchCandidates, type PlanPlace, type PlanSelections } from '../data/drive-plans';
import { buildItinerary, checkPlanCommand } from '../lib/drive-plans';
import '../styles/drive-plans.css';

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
        <label>
          <input type="radio" name={name} value={place.id} checked={value === place.id} onChange={() => onChange(place.id)} />
          <span><span className="plan-candidate-name">{place.name}</span>{place.note && <span className="plan-candidate-note">{place.note}</span>}</span>
        </label>
        <MapLink place={place} />
      </div>)}
    </div>
  </fieldset>;
}

export default function DrivePlanCommand() {
  const [command, setCommand] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [selections, setSelections] = useState<PlanSelections>({ ...initialPlanSelections });
  const submitButton = useRef<HTMLButtonElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = checkPlanCommand(command);
    if (result !== '1115') {
      setError(result === 'empty' ? 'コマンドを入力してください' : '該当するコマンドがありません');
      setAnnouncement('');
      return;
    }
    setError('');
    setOpen(true);
    setAnnouncement('11/15 山梨ドライブプランの2つのルートを表示しました。');
  }
  function close() {
    setOpen(false);
    setAnnouncement('ドライブプランを閉じました。');
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

  return <div className="drive-plan-command content-width">
    <form className="plan-command-form" onSubmit={submit} noValidate>
      <label htmlFor="plan-command">コマンド入力</label>
      <div className="plan-command-controls">
        <input id="plan-command" value={command} onChange={(event) => { setCommand(event.target.value); setError(''); }}
          placeholder="コマンドを入力してください" autoComplete="off" autoCapitalize="off" spellCheck={false}
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
          <button className="plan-close" type="button" onClick={close} aria-label="ドライブプランを閉じる">閉じる <span aria-hidden="true">×</span></button>
        </div>
        <div className="plan-shared-choices">
          <p className="plan-selection-help">ほうとう・カフェを各1店選ぶと、両ルートに反映されます。</p>
          <CandidateGroup label="ほうとう候補" name="plan-lunch" candidates={lunchCandidates} value={selections.lunchId} onChange={selectLunch} />
          <CandidateGroup label="カフェ候補" name="plan-cafe" candidates={cafeCandidates} value={selections.cafeId} onChange={selectCafe} />
          <button className="plan-clear" type="button" disabled={selections.cafeId === null} onClick={() => selectCafe(null)}>カフェの選択を解除</button>
        </div>
        <div className="drive-plan-grid">
          {drivePlans.map((plan) => <article className="drive-plan-card" key={plan.id} aria-labelledby={`${plan.id}-title`}>
            <div className="plan-card-heading"><p>{plan.label}</p><h3 id={`${plan.id}-title`}>{plan.title}</h3></div>
            <div className="plan-route-options">
              {plan.id === 'plan1' ? <fieldset>
                <legend>紅葉スポットを1か所選択</legend>
                <label><input type="radio" name="plan1-foliage" checked={selections.plan1Foliage === 'corridor'} onChange={() => setSelections((current) => ({ ...current, plan1Foliage: 'corridor' }))} />河口湖もみじ回廊</label>
                <label><input type="radio" name="plan1-foliage" checked={selections.plan1Foliage === 'koyodai'} onChange={() => setSelections((current) => ({ ...current, plan1Foliage: 'koyodai' }))} aria-describedby="plan1-condition" />紅葉台</label>
                <p id="plan1-condition">紅葉台：富士山がよく見える場合におすすめ</p>
              </fieldset> : <fieldset>
                <legend>任意の立ち寄り</legend>
                <label><input type="checkbox" checked={selections.plan2Koyodai} onChange={(event) => setSelections((current) => ({ ...current, plan2Koyodai: event.target.checked }))} aria-describedby="plan2-condition" />紅葉台に立ち寄る</label>
                <p id="plan2-condition">富士山がよく見える場合のみ</p>
              </fieldset>}
            </div>
            <ol className="plan-itinerary" aria-label={`${plan.label}の訪問順`}>
              {buildItinerary(plan.stages, selections).map((stop) => <li key={stop.id}>
                <div className="plan-stop-copy"><span className="plan-stop-category">{stop.category}</span><p className="plan-stop-name">{stop.departureTime && <time>{stop.departureTime} </time>}{stop.name}</p>{stop.note === '電話予約必要' && <p className="plan-stop-note">電話予約必要</p>}</div>
                <MapLink place={stop} />
              </li>)}
            </ol>
          </article>)}
        </div>
      </>}
    </section>
  </div>;
}
