import { PeerCatApp } from './app';
import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app container');
  }

  const app = new PeerCatApp(container);
  app.run();
});
