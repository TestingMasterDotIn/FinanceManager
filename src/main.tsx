import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize theme immediately to prevent flash
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const isDark = savedTheme === 'dark' || (!savedTheme) // Default to dark mode
  
  if (isDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

// Initialize theme before React renders
initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
