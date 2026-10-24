import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './App.css';
import { useReveal } from './motion';
import { ScreenSwap } from './motion/ScreenSwap';
import Inputs from './screens/Inputs';
import Landing from './screens/Landing';
import LifelogCard from './screens/LifelogCard';
import Paths from './screens/Paths';
import Progress from './screens/Progress';
import Week from './screens/Week';
import { StoreProvider, useStore } from './state/store';
import type { Screen } from './state/types';

// Flow order, used to tell a forward step from a step back (Reset, Edit my story).
const ORDER: readonly Screen[] = ['landing', 'lifelog', 'inputs', 'paths', 'week', 'progress'];

const SCREENS: Record<Screen, ComponentType> = {
  landing: Landing,
  lifelog: LifelogCard,
  inputs: Inputs,
  paths: Paths,
  week: Week,
  progress: Progress,
};

// Longest entrance: the swap wait (140ms), 7 block steps (315ms), the list cascade
// (60ms + up to 6 x 35ms) and the item duration (560ms), rounded up.
const ENTER_MS = 1300;

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
        <span>Dream Achieve Moments</span>
        <span>[SIMULATION] Demo · nothing is stored</span>
      </div>
      <div className="phone">
        <div className="phone-screen">
          <header className="topbar">
            <span className="brand">Dream Achieve Moments</span>
            <button type="button" className="reset" onClick={() => dispatch({ type: 'reset' })}>
              <span className="roll">Reset</span>
            </button>
          </header>
          <p className="notice">Nothing you type is stored.</p>
          <ScreenSwap screenKey={state.screen} screenRef={screenRef} order={ORDER}>
            <main
              className={entering ? 'screen is-entering' : 'screen'}
              key={state.screen}
              ref={screenRef}
              data-first={navigated.current ? undefined : ''}
            >
              <Current />
            </main>
          </ScreenSwap>
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
