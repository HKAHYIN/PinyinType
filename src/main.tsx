import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

const app = document.getElementById('app');

if (!app) {
  throw new Error('App root not found');
}

createRoot(app).render(<App />);
