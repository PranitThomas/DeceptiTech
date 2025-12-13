import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/poppins/400.css';
import App from './ui/App.jsx';

// Support both index.html mount and shadow-root mount
const mountEl = document.getElementById('root') || document.querySelector('#app-mount');
if (mountEl) {
	createRoot(mountEl).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
