// Navegação SPA com fetch + History API + transições
(function(){
	const html = document.documentElement;
	const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const TRANSITION_MS = 220;
	const MAIN_SELECTOR = 'main';

	function init() {
		// show page (fade-in)
			// criar overlay se não existir
			if (!document.getElementById('page-overlay')){
				const ov = document.createElement('div');
				ov.id = 'page-overlay';
				document.body.appendChild(ov);
			}
			// esconder overlay (fade-in)
			const ov = document.getElementById('page-overlay');
			ov.classList.add('hidden');
		// delegate clicks
		document.addEventListener('click', onDocumentClick);
		window.addEventListener('popstate', onPopState);
	}

	function onDocumentClick(e){
		const a = e.target.closest('a[href]');
		if (!a) return;
		// ignore modifier clicks
		if (e.defaultPrevented || a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;
		// ignore external, mailto, tel, anchors
		const href = a.getAttribute('href');
		if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
		let url;
		try { url = new URL(href, location.href); } catch { return; }
		if (url.origin !== location.origin) return; // external

		// At this point we handle same-origin navigations
		e.preventDefault();
		navigate(url.href, true);
	}

	function onPopState(){
		// Load current location without pushing history
		navigate(location.href, false);
	}

	async function navigate(href, push){
		if (prefersReduced) return location.href = href; // respect user pref
		const ov = document.getElementById('page-overlay');
		// show overlay (fade to black)
		ov.classList.remove('hidden');

		// wait for overlay to become visible
		await wait(20); // allow class to apply
		await wait(TRANSITION_MS);

		try{
			const res = await fetch(href, { credentials: 'same-origin' });
			if (!res.ok) throw new Error('Network response was not ok');
			const htmlText = await res.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(htmlText, 'text/html');
			const newMain = doc.querySelector(MAIN_SELECTOR);
			const newTitle = doc.querySelector('title') ? doc.querySelector('title').innerText : document.title;
			if (!newMain) throw new Error('No main element in fetched document');

			// replace main
			const currentMain = document.querySelector(MAIN_SELECTOR);
			if (currentMain && newMain) {
				currentMain.replaceWith(newMain);
			}
			// update title
			document.title = newTitle;

			// run scripts inside newMain
			executeScripts(newMain);

			// update history
			if (push) history.pushState({}, '', href);

			// hide overlay (fade-in content)
			await wait(20);
			ov.classList.add('hidden');
			await wait(TRANSITION_MS);
			window.scrollTo(0,0);
		}catch(err){
			console.error('SPA navigation failed, falling back to full load', err);
			location.href = href;
		}
	}

	async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

	function executeScripts(container){
		// Find script tags in the container, clone and append to body to execute
		const scripts = Array.from(container.querySelectorAll('script'));
		scripts.forEach(oldScript=>{
			const script = document.createElement('script');
			if (oldScript.src) {
				script.src = oldScript.src;
				script.async = false;
			} else {
				script.textContent = oldScript.textContent;
			}
			document.body.appendChild(script);
			// remove the script tag from the new container to avoid duplicate execution
			oldScript.parentNode && oldScript.parentNode.removeChild(oldScript);
		});
	}

	// init on DOM ready
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();

})();

