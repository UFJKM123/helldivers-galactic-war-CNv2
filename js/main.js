window.addEventListener("DOMContentLoaded", async () => {
    // 1. 加载多语言
    await I18n.loadLanguage("zh-cn");
    I18n.updateDOM();

    // 2. 初始化游戏引擎 + UI
    GameUI.init(GameEngine);

    // 3. 启动第一局
    GameEngine.restart({
        playerCampKey: "EARTH",
        difficulty: "normal",
        gameMode: "normal",
        mapSize: "large"
    });

    GameUI.init(GameEngine);
});