window.addEventListener("DOMContentLoaded", async () => {
    // 1. 加载多语言
    await I18n.loadLanguage("zh-cn");
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