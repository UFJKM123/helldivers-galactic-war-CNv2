window.GameUI = (function() {
    // DOM 缓存
    const dom = {};
    let eventQueue = [];

    function cacheDOM() {
        // 核心面板
        dom.turnNum = document.getElementById("turnNum");
        dom.selText = document.getElementById("selText");
        dom.selPlanetName = document.getElementById("selPlanetName");
        dom.weaponStatus = document.getElementById("weaponStatus");
        dom.deterrenceStatus = document.getElementById("deterrenceStatus");
        dom.tipsPanel = document.getElementById("tipsPanel");
        dom.strengthDisplay = document.getElementById("strengthDisplay");
        dom.sendRatioSelect = document.getElementById("sendRatioSelect");
        dom.difficultySelect = document.getElementById("difficultySelect");
        dom.campSelect = document.getElementById("campSelect");
        dom.mapSizeSelect = document.getElementById("mapSizeSelect");
        dom.gameModeSelect = document.getElementById("gameModeSelect");

        // 按钮
        dom.buildWeaponBtn = document.getElementById("buildWeaponBtn");
        dom.buildFINBtn = document.getElementById("buildFIN");
        dom.nextTurnBtn = document.getElementById("nextTurnBtn");
        dom.randomStrengthBtn = document.getElementById("randomStrengthBtn");
        dom.restartBtn = document.getElementById("restartBtn");
        dom.strategicDrawBtn = document.getElementById("strategicDrawBtn");
        dom.watchBtn = document.getElementById("watchBtn");
        dom.newGameBtn = document.getElementById("newGameBtn");
        dom.eventConfirmBtn = document.getElementById("eventConfirmBtn");

        // 弹窗
        dom.resultModal = document.getElementById("resultModal");
        dom.eventModal = document.getElementById("eventModal");
        dom.winTitle = document.getElementById("winTitle");
        dom.resultType = document.getElementById("resultType");
        dom.campVictoryMessage = document.getElementById("campVictoryMessage");
        dom.statPlanet = document.getElementById("statPlanet");
        dom.statKills = document.getElementById("statKills");
        dom.statTurn = document.getElementById("statTurn");
        dom.finalScore = document.getElementById("finalScore");
        dom.eventTitle = document.getElementById("eventTitle");
        dom.eventMessage = document.getElementById("eventMessage");

        // 画布
        dom.canvas = document.getElementById("starCanvas");
    }

    function bindEvents(engine) {
        // 游戏控制按钮
        dom.restartBtn.addEventListener("click", () => handleRestart(engine));
        dom.nextTurnBtn.addEventListener("click", () => {
            engine.nextTurn();
            updateAllUI(engine);
        });
        dom.buildWeaponBtn.addEventListener("click", () => {
            const res = engine.buildWeapon();
            if(!res.success) alert(res.msg);
            updateAllUI(engine);
        });
        dom.buildFINBtn.addEventListener("click", () => {
            const res = engine.activateFinal();
            if(!res.success) alert(res.msg);
            updateAllUI(engine);
        });
        dom.strategicDrawBtn.addEventListener("click", () => {
            const res = engine.performStrategicDraw();
            if(!res.success) alert(res.msg);
            updateAllUI(engine);
        });
        dom.randomStrengthBtn.addEventListener("click", () => {
            engine.randomizeEnemyStrength();
            updateStrengthDisplay(engine);
        });

        // 下拉框
        dom.sendRatioSelect.addEventListener("change", () => {
            engine.setSendRatio(dom.sendRatioSelect.value);
        });
        dom.campSelect.addEventListener("change", () => handleRestart(engine));
        dom.mapSizeSelect.addEventListener("change", () => handleRestart(engine));
        dom.gameModeSelect.addEventListener("change", () => handleRestart(engine));
        dom.difficultySelect.addEventListener("change", () => handleRestart(engine));

        // 弹窗按钮
        dom.eventConfirmBtn.addEventListener("click", closeEventModal);
        dom.newGameBtn.addEventListener("click", () => {
            closeResultModal();
            handleRestart(engine);
        });
        dom.watchBtn.addEventListener("click", () => {
            closeResultModal();
            engine.startSpectate();
        });

        // 画布鼠标事件
        dom.canvas.addEventListener("mousedown", e => engine.handleMouseDown(e));
        window.addEventListener("mousemove", e => engine.handleMouseMove(e));
        window.addEventListener("mouseup", e => {
            const result = engine.handleMouseUp(e);
            if(result) handleCanvasInteraction(result, engine);
            updateSelectionUI(engine);
        });

        // 窗口缩放
        window.addEventListener("resize", () => {
            engine.resizeCanvas();
        });
    }

    function handleRestart(engine) {
        engine.restart({
            playerCampKey: dom.campSelect.value,
            difficulty: dom.difficultySelect.value,
            gameMode: dom.gameModeSelect.value,
            mapSize: dom.mapSizeSelect.value
        });
        dom.sendRatioSelect.value = "1.0";
        engine.setSendRatio("1.0");
        updateAllUI(engine);
    }

    function handleCanvasInteraction(result, engine) {
        if(result.msg) alert(result.msg);
    }

    // ========== UI 更新方法 ==========
    function updateAllUI(engine) {
        const state = engine.getPublicState();
        dom.turnNum.textContent = state.turn;
        updateSelectionUI(engine);
        updateWeaponStatus(engine);
        updateDrawButton(engine);
        updateTips(engine);
        updateStrengthDisplay(engine);
        updateDeterrenceStatus(engine);
    }

    function updateSelectionUI(engine) {
        const state = engine.getPublicState();
        if(state.selectedWeapon){
            const planet = engine.getCampWeaponDef(state.playerCampKey);
            dom.selText.textContent = `武器：${planet.lwName}`;
            const weaponPlanet = document.querySelector(`[data-uid="${state.selectedWeapon.planetId}"]`);
            dom.selPlanetName.textContent = state.selectedWeapon.planetId ? "已选中武器" : "-";
        } else if(state.selectedPlanets.length > 0){
            dom.selText.textContent = `已选中 ${state.selectedPlanets.length} 颗星球`;
            dom.selPlanetName.textContent = state.selectedPlanets.map(p=>p.planetName).join('、');
        } else {
            dom.selText.textContent = "无";
            dom.selPlanetName.textContent = "-";
        }
    }

    function updateWeaponStatus(engine) {
        dom.weaponStatus.textContent = engine.getWeaponStatusText();
    }

    function updateDeterrenceStatus(engine) {
        const state = engine.getPublicState();
        if(state.deterrenceActive){
            dom.deterrenceStatus.style.display = "block";
            dom.deterrenceStatus.textContent = "⚠ 威慑期间我方兵力停止增长，所有敌人联合进攻！";
        } else {
            dom.deterrenceStatus.style.display = "none";
        }
    }

    function updateDrawButton(engine) {
        const btnState = engine.getDrawButtonState();
        dom.strategicDrawBtn.textContent = btnState.text;
        dom.strategicDrawBtn.disabled = btnState.disabled;
    }

    function updateTips(engine) {
        dom.tipsPanel.textContent = engine.getTipsText();
    }

    function updateStrengthDisplay(engine) {
        dom.strengthDisplay.textContent = engine.getStrengthDisplayText();
    }

    // ========== 弹窗控制 ==========
    function showEventModal(title, message) {
        if(dom.eventModal.style.display === "flex"){
            eventQueue.push({title, message});
        } else {
            dom.eventTitle.innerText = title;
            dom.eventMessage.innerText = message;
            dom.eventModal.style.display = "flex";
        }
    }

    function closeEventModal() {
        if(eventQueue.length > 0){
            const next = eventQueue.shift();
            dom.eventTitle.innerText = next.title;
            dom.eventMessage.innerText = next.message;
        } else {
            dom.eventModal.style.display = "none";
        }
    }

    function showResultModal(data) {
        dom.winTitle.innerText = data.title;
        dom.resultType.innerText = data.resultText;
        dom.campVictoryMessage.innerText = data.campMessage;
        dom.statPlanet.innerText = data.planetCount;
        dom.statKills.innerText = data.kills;
        dom.statTurn.innerText = data.turns;
        dom.finalScore.innerText = data.score;
        dom.watchBtn.style.display = data.isDefeat ? "inline-block" : "none";
        dom.resultModal.style.display = "flex";
    }

    function closeResultModal() {
        dom.resultModal.style.display = "none";
    }

    function init(engine) {
        cacheDOM();
        bindEvents(engine);
        updateAllUI(engine);

        // 注入引擎回调
        engine.init(dom.canvas, {
            onEvent: showEventModal,
            onGameEnd: showResultModal,
            onStateChange: () => updateAllUI(engine)
        });
    }

    return { init, showEventModal, showResultModal };
})();