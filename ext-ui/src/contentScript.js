// Inject a shadow-root mounted container into the page and render the widget app
(() => {
	const containerId = 'deceptitech-widget-root';
	if (document.getElementById(containerId)) return;

	const host = document.createElement('div');
	host.id = containerId;
	host.style.all = 'initial';
	host.style.position = 'fixed';
	host.style.bottom = '16px';
	host.style.right = '16px';
	host.style.zIndex = '2147483647';
	host.style.pointerEvents = 'none';
	const shadow = host.attachShadow({ mode: 'open' });

	const appMount = document.createElement('div');
	appMount.id = 'app-mount';
	shadow.appendChild(appMount);

	// Inject the built React bundle for the UI into the shadow root
	const script = document.createElement('script');
	script.type = 'module';
	script.src = chrome.runtime.getURL('assets/main.js');
	shadow.appendChild(script);

	// Styles isolation: fonts and base styles for shadow
	const baseStyle = document.createElement('style');
	baseStyle.textContent = `
		:host, * { box-sizing: border-box; }
		body { margin: 0; }
	`;
	shadow.appendChild(baseStyle);

	document.documentElement.appendChild(host);
})();


