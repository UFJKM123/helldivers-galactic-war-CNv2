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
            const translated = t(el.dataset.lang);
            // 查找元素里的第一个文本节点，只替换文字，不破坏里面的标签
            let textNode = null;
            for (let node of el.childNodes) {
                if (node.nodeType === 3) {
                    textNode = node;
                    break;
                }
            }
            if (textNode) {
                textNode.textContent = translated;
            } else {
                // 没有文本就插在最前面，保留原来的数字/名称标签
                el.insertBefore(document.createTextNode(translated), el.firstChild);
            }
        });
    }

    return { loadLanguage, t, updateDOM };
})();