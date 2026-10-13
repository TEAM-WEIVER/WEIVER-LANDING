import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/ui.css';
import './styles/base.css';
import './styles/components.css';
import './styles/hero.css';
import './styles/scenes.css';
import './styles/content.css';
import './styles/landing-theme.css';
import './styles/reservation.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
