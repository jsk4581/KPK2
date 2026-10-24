import persona from '@app/data/persona-dana.json';
import photoUrl from '@app/data/persona/dana.svg?url';
import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import './LandingScreen.css';

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
    <section aria-label="Landing" className="landing">
      <span className="eyebrow" aria-hidden="true">
        CAREER AGENT
      </span>
      <p className="display landing-headline">{p.headline}</p>
      <p className="lead landing-lead">
        Your expertise, redrafted for the AI era. Tell us what you did and where you are; get three
        paths that keep your skills, and three small actions for this week.
      </p>

      <div className="card-raised landing-persona" aria-label="Sample persona">
        <img
          className="landing-avatar"
          src={photoUrl}
          alt="Sample persona placeholder (SIMULATION)"
          width={56}
          height={56}
        />
        <div className="landing-persona-body">
          <p className="tag tag-sim">{SIMULATION_LABEL}</p>
          <p className="landing-persona-name">
            {p.name}, {p.role}
          </p>
          <p className="mono muted landing-persona-meta">
            {p.years} years · {p.location}
          </p>
        </div>
      </div>

      <div className="btn-stack landing-actions">
        <button type="button" className="btn-primary" onClick={loadSample}>
          <span className="roll">Load sample persona</span>
        </button>
        <button type="button" className="btn-secondary" onClick={start}>
          <span className="roll">Start</span>
        </button>
      </div>
    </section>
  );
}
