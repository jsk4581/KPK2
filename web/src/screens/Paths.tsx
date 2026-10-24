import persona from '@app/data/persona-dana.json';
import * as logic from '@app/logic.js';
import { useStore } from '../state/store';
import type { PathDraft, RankedRole, TraceEntry, Week } from '../state/types';
import './Landing.css';

export const SOURCE_LABELS = {
  llm: 'AI-drafted',
  fallback: 'Sample output (offline)',
} as const;

const SKILL_NAMES = new Map(persona.skills.map((s) => [s.id, s.name]));
const skillName = (id: string) => SKILL_NAMES.get(id) ?? id;

function SkillList({ ids, empty }: { ids: string[]; empty: string }) {
  if (ids.length === 0) return <p className="p0-muted">{empty}</p>;
  return (
    <ul className="p0-chips">
      {ids.map((id) => (
        <li key={id}>{skillName(id)}</li>
      ))}
    </ul>
  );
}

function PathCard({
  role,
  draft,
  onChoose,
}: {
  role: RankedRole;
  draft: PathDraft;
  onChoose: () => void;
}) {
  const percent = Math.round(role.ratio * 100);
  return (
    <article className="p0-card p0-path" aria-label={role.title}>
      <h3>{role.title}</h3>
      <p>{draft.one_liner}</p>

      <h4>What transfers</h4>
      <SkillList ids={role.transfers} empty="Nothing matched yet. Add more about your work above." />

      <h4>What's missing</h4>
      <p className="p0-muted">Skill overlap: {percent}%</p>
      <SkillList ids={role.missing} empty="You already have every skill this role lists." />

      <h4>First 2 weeks</h4>
      <ol className="p0-steps">
        {draft.first_two_weeks.slice(0, 2).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <button type="button" className="p0-primary" onClick={onChoose}>
        Choose this path
      </button>
    </article>
  );
}

export default function Paths() {
  const { state, dispatch } = useStore();
  const { paths, rankedRoles } = state;

  if (!paths || rankedRoles.length === 0) {
    return (
      <section aria-label="Paths" className="p0">
        <h2>Your paths</h2>
        <p className="p0-muted">No paths yet. Fill in your story first.</p>
        <button type="button" className="p0-secondary" onClick={() => dispatch({ type: 'go', screen: 'inputs' })}>
          Back to my story
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
    <section aria-label="Paths" className="p0">
      <h2>Your paths</h2>
      <p className="p0-muted">Three directions where your experience carries over, closest match first.</p>
      {cards.map(({ role, draft }) => (
        <PathCard key={role.id} role={role} draft={draft} onChoose={() => choose(role, draft)} />
      ))}
      <p className="p0-source" data-source={paths.source}>
        {SOURCE_LABELS[paths.source]}
      </p>
      <button type="button" className="p0-secondary" onClick={() => dispatch({ type: 'go', screen: 'inputs' })}>
        Edit my story
      </button>
    </section>
  );
}
