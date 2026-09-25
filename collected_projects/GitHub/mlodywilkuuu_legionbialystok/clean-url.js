(() => {
    const path = window.location.pathname;
    let cleanPath = path;

    if (/\/index\.html$/i.test(path)) {
        cleanPath = path.replace(/index\.html$/i, "");
    } else if (/\.html$/i.test(path)) {
        cleanPath = path.replace(/\.html$/i, "");
    }

    if (cleanPath !== path) {
        window.history.replaceState(
            null,
            "",
            cleanPath + window.location.search + window.location.hash
        );
    }
})();
