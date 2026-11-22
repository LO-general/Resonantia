import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installSpotlight } from './components/ui/spotlight';

installSpotlight();

createRoot(document.getElementById('root')!).render(<App />);
