import { useEffect, useState } from 'react';
import { Game } from './components/Game.tsx';
import { Header } from './components/Header.tsx';
import { Menu } from './components/Menu.tsx';

type Route = 'menu' | 'practice';
type RomanizationMode = 'pinyin' | 'jyutping';
type ScriptMode = 'simplified' | 'traditional';
type JyutpingApi = {
  getJyutpingList: (text: string) => [string, string | null][];
};

const BASE_URL = import.meta.env.BASE_URL;

const getCurrentRoute = (): Route => {
  const path = window.location.pathname;
  return path.includes('/practice') ? 'practice' : 'menu';
};

const getInitialDisableSpace = (): boolean => {
  const stored = localStorage.getItem('disableSpace');
  if (stored === null) {
    localStorage.setItem('disableSpace', 'true');
    return true;
  }
  return stored === 'true';
};

const getInitialRomanizationMode = (): RomanizationMode => {
  const stored = localStorage.getItem('romanizationMode');
  if (stored === 'pinyin' || stored === 'jyutping') return stored;
  localStorage.setItem('romanizationMode', 'pinyin');
  return 'pinyin';
};

const getInitialScriptMode = (): ScriptMode => {
  const stored = localStorage.getItem('scriptMode');
  if (stored === 'simplified' || stored === 'traditional') return stored;
  localStorage.setItem('scriptMode', 'simplified');
  return 'simplified';
};

export function App() {
  const [route, setRoute] = useState<Route>(() => getCurrentRoute());
  const [disableSpace, setDisableSpace] = useState<boolean>(() => getInitialDisableSpace());
  const [gameText, setGameText] = useState<string | null>(null);
  const [romanizationMode, setRomanizationMode] = useState<RomanizationMode>(() => getInitialRomanizationMode());
  const [scriptMode, setScriptMode] = useState<ScriptMode>(() => getInitialScriptMode());
  const [jyutpingApi, setJyutpingApi] = useState<JyutpingApi | null>(null);

  const navigateTo = (next: Route) => {
    const path = next === 'menu' ? BASE_URL : `${BASE_URL}practice`;
    window.history.pushState({ route: next }, '', path);
    setRoute(next);
    if (next === 'menu') {
      setGameText(null);
    }
  };

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const nextRoute = (e.state?.route || getCurrentRoute()) as Route;
      setRoute(nextRoute);
      if (nextRoute === 'menu') {
        setGameText(null);
      }
    };
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  useEffect(() => {
    if (romanizationMode !== 'jyutping' || jyutpingApi) return;
    let cancelled = false;
    import('to-jyutping').then((mod) => {
      if (!cancelled) {
        setJyutpingApi((mod as { default?: JyutpingApi }).default ?? (mod as JyutpingApi));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [romanizationMode, jyutpingApi]);

  const handleStart = async (text: string) => {
    if (romanizationMode === 'jyutping' && !jyutpingApi) {
      const mod = await import('to-jyutping');
      setJyutpingApi((mod as { default?: JyutpingApi }).default ?? (mod as JyutpingApi));
    }
    navigateTo('practice');
    setGameText(text);
  };

  const handleToggleSpace = (value: boolean) => {
    setDisableSpace(value);
    localStorage.setItem('disableSpace', String(value));
  };

  const handleRomanizationChange = (value: RomanizationMode) => {
    setRomanizationMode(value);
    localStorage.setItem('romanizationMode', value);
  };

  const handleScriptChange = (value: ScriptMode) => {
    setScriptMode(value);
    localStorage.setItem('scriptMode', value);
  };

  return (
    <>
      <Header
        disableSpace={disableSpace}
        onToggleSpace={handleToggleSpace}
        onBrandClick={() => navigateTo('menu')}
        showControls={route === 'menu'}
      />
      {route === 'menu' && (
        <Menu
          onStart={handleStart}
          romanizationMode={romanizationMode}
          scriptMode={scriptMode}
          onRomanizationChange={handleRomanizationChange}
          onScriptChange={handleScriptChange}
        />
      )}
      <Game
        text={gameText}
        disableSpace={disableSpace}
        onRestart={() => navigateTo('menu')}
        visible={route === 'practice'}
        romanizationMode={romanizationMode}
        scriptMode={scriptMode}
        jyutpingApi={jyutpingApi}
      />
    </>
  );
}
