window.I18n = (function() {
    let LANG = {};

    async function loadLanguage(lang) {
        const modules = ["info", "menu"];
        LANG = {};
        for (const module of modules) {
            const response = await fetch(`lang/${lang}/${module}.json`);
            LANG[module] = await response.json();
        }
    }

    function t(path) {
        const text = path.split(".").reduce((obj, key) => obj?.[key], LANG);
        return text ?? `[${path}]`;
    }

    function updateDOM(root = document) {
        root.querySelectorAll("[data-lang]").forEach(el => {
            el.textContent = t(el.dataset.lang);
        });
    }

    return { loadLanguage, t, updateDOM };
})();