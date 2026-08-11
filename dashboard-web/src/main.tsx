import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OverviewPage } from './modules/overview';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverviewPage />
  </StrictMode>
);
