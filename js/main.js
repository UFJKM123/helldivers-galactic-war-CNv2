window.addEventListener("DOMContentLoaded", async () => {
    // 1. 加载多语言
    // const params = new URLSearchParams(window.location.search);

    // const currentLanguage = params.get("lang") || "zh-cn";


    // await I18n.loadLanguage(currentLanguage);
    // I18n.updateDOM();

    // 1. 获取语言选择框
    const selector = document.getElementById("language");

    // 2. 注册事件（只注册一次）
    selector.addEventListener("change", onLanguageChange);

    // 3. 根据 URL 获取当前语言
    const params = new URLSearchParams(location.search);
    const lang = params.get("lang") || "zh-cn";

    // 4. 设置下拉框显示
    selector.value = lang;

    await I18n.loadLanguage(lang);
    I18n.updateDOM();


    // 2. 先初始化游戏画布
    const canvas = document.getElementById("starCanvas");
    GameEngine.init(canvas, {
        onEvent: (title, msg) => GameUI.showEventModal(title, msg),
        onGameEnd: (data) => GameUI.showResultModal(data),
        onStateChange: () => GameUI.refresh(GameEngine)
    });

    // 3. 初始化右侧按钮面板
    GameUI.init(GameEngine);

    // 4. 开始第一局游戏
    GameEngine.restart({
        playerCampKey: "EARTH",
        difficulty: "normal",
        gameMode: "normal",
        mapSize: "large"
    });

    // 5. 画出星图
    GameEngine.render();
});

async function onLanguageChange(event) {

    const lang = event.target.value;

    // 更新 URL
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);

    history.replaceState(null, "", url);

    // 加载语言


    console.log("Language changed to:", lang);
    window.location.search = `?lang=${lang}`;
}