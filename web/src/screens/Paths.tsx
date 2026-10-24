import type { CSSProperties } from 'react';
import persona from '@app/data/persona-dana.json';
import * as logic from '@app/logic.js';
import { staggerStyle } from '../motion';
import { useStore } from '../state/store';
import type { PathDraft, RankedRole, TraceEntry, Week } from '../state/types';
import './Paths.css';

export const SOURCE_LABELS = {
  llm: 'AI-drafted',
  fallback: 'Sample output (offline)',
} as const;

const SKILL_NAMES = new Map(persona.skills.map((s) => [s.id, s.name]));
const skillName = (id: string) => SKILL_NAMES.get(id) ?? id;

function SkillList({ ids, empty, kind }: { ids: string[]; empty: string; kind: 'have' | 'build' }) {
  if (ids.length === 0) return <p className="path-empty">{empty}</p>;
  return (
    <ul className="chip-list path-chips">
      {ids.map((id) => (
        <li key={id} className={kind === 'have' ? 'chip-have' : 'chip-build'}>
          {skillName(id)}
        </li>
      ))}
    </ul>
  );
}

function PathCard({
  role,
  draft,
  rank,
  onChoose,
}: {
  role: RankedRole;
  draft: PathDraft;
  rank: number;
  onChoose: () => void;
}) {
  const percent = Math.round(role.ratio * 100);
  const top = rank === 0;
  return (
    <article
      className={`p0-path path-card ${top ? 'card-ink' : 'card'}`}
      aria-label={role.title}
      data-reveal={top ? undefined : ''}
      style={top ? undefined : staggerStyle(rank - 1, 80)}
    >
      {/* Rank and overlap figure are decorative: the overlap stays readable as text below. */}
      <div className="path-top" aria-hidden="true">
        <span className="path-rank" data-text={String(rank + 1).padStart(2, '0')} />
        <span className="path-figure" data-text={String(percent)} />
      </div>
      <h3 className="path-title">{role.title}</h3>
      <p className="path-line">{draft.one_liner}</p>

      <div className="path-overlap">
        <div className="meter" style={{ '--value': `${percent}%` } as CSSProperties}>
          <span />
        </div>
        <p className="path-overlap-text">Skill overlap: {percent}%</p>
      </div>

      <h4 className="path-sub">What transfers</h4>
      <SkillList kind="have" ids={role.transfers} empty="Nothing matched yet. Add more about your work above." />

      <h4 className="path-sub">What's missing</h4>
      <SkillList kind="build" ids={role.missing} empty="You already have every skill this role lists." />

      <h4 className="path-sub">First 2 weeks</h4>
      <ol className="path-steps">
        {draft.first_two_weeks.slice(0, 2).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <button type="button" className={`path-choose btn-block ${top ? 'btn-on-ink' : 'btn-primary'}`} onClick={onChoose}>
        <span className="roll">Choose this path</span>
      </button>
    </article>
  );
}

export default function Paths() {
  const { state, dispatch } = useStore();
  const { paths, rankedRoles } = state;

  if (!paths || rankedRoles.length === 0) {
    return (
      <section aria-label="Paths" className="paths">
        <header className="section-head">
          <h2>Your paths</h2>
          <p className="lead">No paths yet. Fill in your story first.</p>
        </header>
        <button type="button" className="btn-tertiary paths-back" onClick={() => dispatch({ type: 'go', screen: 'inputs' })}>
          <span className="roll">Back to my story</span>
        </button>
      </section>
    );
  }

  const cards = rankedRoles
    .map((role) => ({ role, draft: paths.paths.find((p) => p.role_id === role.id) }))
    .filter((c): c is { role: RankedRole; draft: PathDraft } => Boolean(c.draft));

  const choose = (role: RankedRole, draft: PathDraft) => {
    // buildWeek decides the week; the draft only supplies the sentences.
    const step = logic.withTrace('buildWeek', logic.buildWeek, {
      input: () => `path ${role.id}, ${draft.week.actions.length} drafted actions, today ${persona.today}`,
      output: (w: Week) => `${w.actions.length} actions: ${w.actions.map((a) => a.day).join(', ')}; ${w.summary}`,
    })({ ...draft, title: role.title }, persona.today);
    dispatch({ type: 'choosePath', pathId: role.id, week: step.result as Week });
    dispatch({ type: 'addTrace', entries: [step.trace as TraceEntry] });
    dispatch({ type: 'go', screen: 'week' });
  };

  return (
    <section aria-label="Paths" className="paths">
      <header className="section-head">
        <span className="eyebrow path-eyebrow" data-text="Three paths" aria-hidden="true" />
        <h2>Your paths</h2>
        <p className="lead">Three directions where your experience carries over, closest match first.</p>
      </header>
      <div className="path-cards">
        {cards.map(({ role, draft }, i) => (
          <PathCard key={role.id} role={role} draft={draft} rank={i} onChoose={() => choose(role, draft)} />
        ))}
      </div>
      <p className={`p0-source tag ${paths.source === 'llm' ? 'tag-accent' : 'tag-attention'}`} data-source={paths.source}>
        {SOURCE_LABELS[paths.source]}
      </p>
      <button type="button" className="btn-tertiary paths-back" onClick={() => dispatch({ type: 'go', screen: 'inputs' })}>
        <span className="roll">Edit my story</span>
      </button>
    </section>
  );
}
