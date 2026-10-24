import type { ComponentType } from 'react';
import './App.css';
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

function Shell() {
  const { state, dispatch } = useStore();
  const Current = SCREENS[state.screen];
  return (
    <div className="stage">
      <div className="phone">
        <header className="topbar">
          <span className="brand">Second Draft</span>
          <button type="button" className="reset" onClick={() => dispatch({ type: 'reset' })}>
            Reset
          </button>
        </header>
        <p className="notice">Nothing you type is stored.</p>
        <main className="screen">
          <Current />
        </main>
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
