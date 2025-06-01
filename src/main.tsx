import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PixelRatioManager } from './utils/pixelRatio';
import './styles/pixelRatio.css';

// Initialize pixel ratio system
const pixelRatioManager = PixelRatioManager.getInstance();
pixelRatioManager.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
)
