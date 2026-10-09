(() => {
	const browserUrl = new URL(
		"../../?view=browser",
		document.currentScript?.src || location.href
	).href;
	const createBrowserLink = (className) => {
		const link = document.createElement("a");
		link.className = className;
		link.href = browserUrl;
		link.target = "_top";
		link.textContent = "Browser";
		link.setAttribute("aria-label", "Open the Scramjet browser");
		return link;
	};

	const studyNav = document.querySelector(".edu-nav");
	if (studyNav) {
		const link = createBrowserLink("edu-open ubg-scramjet-link");
		link.textContent = "Browser ↗";
		studyNav.append(link);
	}

	for (const nav of [
		document.getElementById("category-nav"),
		document.getElementById("mobile-category-bar"),
	]) {
		if (nav) {
			nav.append(createBrowserLink("tab-btn inactive ubg-scramjet-link"));
		}
	}
})();
