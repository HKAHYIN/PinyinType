import './style.css';
import { renderHeader } from './components/Header';
import { Menu } from './components/Menu';
import { Game } from './components/Game';

// 1. Find the App Root
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error("App root not found");
}

// 2. Router setup
type Route = 'menu' | 'practice';

const BASE_URL = import.meta.env.BASE_URL; 

function getCurrentRoute(): Route {
  const path = window.location.pathname;
  if (path.includes('/practice')) {
    return 'practice';
  }
  return 'menu';
}

function navigateTo(route: Route): void {
  const path = route === 'menu' ? BASE_URL : `${BASE_URL}practice`;
  window.history.pushState({ route }, '', path);
  handleRoute(route);
}

function handleRoute(route: Route): void {
  if (route === 'menu') {
    menu.show();
    if (game) {
      const gameContainer = app!.querySelector('#game-container');
      if (gameContainer) {
        (gameContainer as HTMLElement).style.display = 'none';
      }
    }
  } else if (route === 'practice') {
    menu.hide();
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const route = e.state?.route || getCurrentRoute();
  handleRoute(route);
});

// 3. Initialize components
let game: Game | null = null;
let menu: Menu;

const navigateToMenu = () => navigateTo('menu');

renderHeader(app, navigateToMenu);

game = new Game(app, navigateToMenu);
menu = new Menu(app, (text) => {
  navigateTo('practice');
  game?.start(text);
});

// 4. Handle initial route
handleRoute(getCurrentRoute());
