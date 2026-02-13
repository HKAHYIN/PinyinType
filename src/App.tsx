import { useEffect, useState } from 'react';
import { Game } from './components/Game.tsx';
import { Header } from './components/Header.tsx';
import { Menu } from './components/Menu.tsx';

type Route = 'menu' | 'practice';

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

export function App() {
  const [route, setRoute] = useState<Route>(() => getCurrentRoute());
  const [disableSpace, setDisableSpace] = useState<boolean>(() => getInitialDisableSpace());
  const [gameText, setGameText] = useState<string | null>(null);

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

  const handleStart = (text: string) => {
    navigateTo('practice');
    setGameText(text);
  };

  const handleToggleSpace = (value: boolean) => {
    setDisableSpace(value);
    localStorage.setItem('disableSpace', String(value));
  };

  return (
    <>
      <Header
        disableSpace={disableSpace}
        onToggleSpace={handleToggleSpace}
        onBrandClick={() => navigateTo('menu')}
        showControls={route === 'menu'}
      />
      {route === 'menu' && <Menu onStart={handleStart} />}
      <Game text={gameText} disableSpace={disableSpace} onRestart={() => navigateTo('menu')} visible={route === 'practice'} />
    </>
  );
}
