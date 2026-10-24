import persona from '@app/data/persona-dana.json';
import photoUrl from '@app/data/persona/dana.svg?url';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import './Landing.css';

// Load sample persona goes to the lifelog card (step 2), which leads on to the inputs.
export const SAMPLE_NEXT_SCREEN: Screen = 'lifelog';
export const SIMULATION_LABEL = '[SIMULATION] Sample persona: synthetic';

export default function Landing() {
  const { dispatch } = useStore();
  const p = persona.persona;

  const loadSample = () => {
    dispatch({ type: 'reset' });
    dispatch({ type: 'prefillFields', fields: { ...persona.fields } });
    dispatch({ type: 'go', screen: SAMPLE_NEXT_SCREEN });
  };

  const start = () => {
    dispatch({ type: 'reset' });
    dispatch({ type: 'go', screen: 'inputs' });
  };

  return (
    <section aria-label="Landing" className="p0">
      {/* Screen name for assistive tech; the visible lead is the empathy line. */}
      <h2 className="p0-sr-only">Landing</h2>
      <p className="p0-lead">{p.headline}</p>
      <p className="p0-muted">
        Your expertise, redrafted for the AI era. Tell us what you did and where you are; get three
        paths that keep your skills, and three small actions for this week.
      </p>

      <div className="p0-card p0-persona" aria-label="Sample persona">
        <img src={photoUrl} alt="Sample persona placeholder (SIMULATION)" width={56} height={56} />
        <div>
          <p className="p0-tag">{SIMULATION_LABEL}</p>
          <p className="p0-persona-name">
            {p.name}, {p.role}
          </p>
          <p className="p0-muted">
            {p.years} years · {p.location}
          </p>
        </div>
      </div>

      <div className="p0-actions">
        <button type="button" className="p0-primary" onClick={loadSample}>
          Load sample persona
        </button>
        <button type="button" className="p0-secondary" onClick={start}>
          Start
        </button>
      </div>
    </section>
  );
}
