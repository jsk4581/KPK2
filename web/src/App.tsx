import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './App.css';
import { useReveal } from './motion';
import Inputs from './screens/Inputs';
import Landing from './screens/Landing';
import LifelogCard from './screens/LifelogCard';
import Paths from './screens/Paths';
import Progress from './screens/Progress';
import Week from './screens/Week';
import { StoreProvider, useStore } from './state/store';
import type { Screen } from './state/types';

const SCREENS: Record<Screen, ComponentType> = {
  landing: Landing,
  lifelog: LifelogCard,
  inputs: Inputs,
  paths: Paths,
  week: Week,
  progress: Progress,
};

// Longest entrance: 7 stagger steps (315ms) plus the first-load duration (640ms).
const ENTER_MS = 1000;

function Shell() {
  const { state, dispatch } = useStore();
  const Current = SCREENS[state.screen];
  const screenRef = useRef<HTMLElement>(null);
  // The first screen shown after load gets a slightly longer entrance.
  const firstScreen = useRef(state.screen);
  const navigated = useRef(false);
  if (state.screen !== firstScreen.current) navigated.current = true;
  useReveal(screenRef, state.screen);
  // Entrance runs once per screen change; later re-renders inside a screen do not replay it.
  const [entering, setEntering] = useState(true);
  useLayoutEffect(() => {
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [state.screen]);
  return (
    <div className="stage">
      <div className="stage-frame" aria-hidden="true">
        <span>Second Draft</span>
        <span>[SIMULATION] Demo · nothing is stored</span>
      </div>
      <div className="phone">
        <div className="phone-screen">
          <header className="topbar">
            <span className="brand">Second Draft</span>
            <button type="button" className="reset" onClick={() => dispatch({ type: 'reset' })}>
              <span className="roll">Reset</span>
            </button>
          </header>
          <p className="notice">Nothing you type is stored.</p>
          <main
            className={entering ? 'screen is-entering' : 'screen'}
            key={state.screen}
            ref={screenRef}
            data-first={navigated.current ? undefined : ''}
          >
            <Current />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
