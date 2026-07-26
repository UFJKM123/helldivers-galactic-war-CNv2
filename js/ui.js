window.GameUI = (function() {
    const dom = {};
    let eventQueue = [];

    function cacheDOM() {
        // 顶部信息显示
        dom.turnNum = document.getElementById("turnNum");
        dom.selText = document.getElementById("selText");
        dom.selPlanetName = document.getElementById("selPlanetName");
        
        // 武器与状态
        dom.weaponStatus = document.getElementById("weaponStatus");
        dom.deterrenceStatus = document.getElementById("deterrenceStatus");
        dom.tipsPanel = document.getElementById("tipsPanel");
        dom.strengthDisplay = document.getElementById("strengthDisplay");
        
        // 下拉选择框
        dom.sendRatioSelect = document.getElementById("sendRatioSelect");
        dom.difficultySelect = document.getElementById("difficultySelect");
        dom.campSelect = document.getElementById("campSelect");
        dom.mapSizeSelect = document.getElementById("mapSizeSelect");
        dom.gameModeSelect = document.getElementById("gameModeSelect");

        // 所有按钮
        dom.buildWeaponBtn = document.getElementById("buildWeaponBtn");
        dom.buildFINBtn = document.getElementById("buildFIN");
        dom.nextTurnBtn = document.getElementById("nextTurnBtn");
        dom.randomStrengthBtn = document.getElementById("randomStrengthBtn");
        dom.restartBtn = document.getElementById("restartBtn");
        dom.strategicDrawBtn = document.getElementById("strategicDrawBtn");
        dom.watchBtn = document.getElementById("watchBtn");
        dom.newGameBtn = document.getElementById("newGameBtn");
        dom.eventConfirmBtn = document.getElementById("eventConfirmBtn");

        // 弹窗相关
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

        // 下拉框事件
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

        // 画布鼠标交互
        dom.canvas.addEventListener("mousedown", e => engine.handleMouseDown(e));
        window.addEventListener("mousemove", e => engine.handleMouseMove(e));
        window.addEventListener("mouseup", e => {
            const result = engine.handleMouseUp(e);
            if(result && result.msg) alert(result.msg);
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

    // ========== 界面更新核心方法 ==========
    function updateAllUI(engine) {
        const state = engine.getPublicState();
        // 回合数
        if(dom.turnNum) dom.turnNum.textContent = state.turn;
        // 选中信息
        updateSelectionUI(engine);
        // 武器状态
        updateWeaponStatus(engine);
        // 战略机遇按钮
        updateDrawButton(engine);
        // 底部提示
        updateTips(engine);
        // 阵营强度
        updateStrengthDisplay(engine);
        // 威慑状态
        updateDeterrenceStatus(engine);
    }

    function updateSelectionUI(engine) {
        if(!dom.selText || !dom.selPlanetName) return;
        const state = engine.getPublicState();

        // 选中了武器
        if(state.selectedWeapon){
            const campDef = engine.getCampWeaponDef(state.playerCampKey);
            dom.selText.textContent = "武器：" + campDef.lwName;
            dom.selPlanetName.textContent = "已选中武器";
        }
        // 选中了星球
        else if(state.selectedPlanets.length > 0){
            dom.selText.textContent = "已选中 " + state.selectedPlanets.length + " 颗星球";
            dom.selPlanetName.textContent = state.selectedPlanets.map(p=>p.planetName).join('、');
        }
        // 什么都没选
        else {
            dom.selText.textContent = "无";
            dom.selPlanetName.textContent = "-";
        }
    }

    function updateWeaponStatus(engine) {
        if(!dom.weaponStatus) return;
        dom.weaponStatus.textContent = engine.getWeaponStatusText();
    }

    function updateDeterrenceStatus(engine) {
        if(!dom.deterrenceStatus) return;
        const state = engine.getPublicState();
        if(state.deterrenceActive){
            dom.deterrenceStatus.style.display = "block";
            dom.deterrenceStatus.textContent = "⚠ 威慑期间我方兵力停止增长，所有敌人联合进攻！";
        } else {
            dom.deterrenceStatus.style.display = "none";
        }
    }

    function updateDrawButton(engine) {
        if(!dom.strategicDrawBtn) return;
        const btnState = engine.getDrawButtonState();
        dom.strategicDrawBtn.textContent = btnState.text;
        dom.strategicDrawBtn.disabled = btnState.disabled;
    }

    function updateTips(engine) {
        if(!dom.tipsPanel) return;
        dom.tipsPanel.textContent = engine.getTipsText();
    }

    function updateStrengthDisplay(engine) {
        if(!dom.strengthDisplay) return;
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

    // 供引擎回调的刷新方法
    function refresh(engine) {
        updateAllUI(engine);
    }

    // 初始化入口
    function init(engine) {
        cacheDOM();
        if(!dom.canvas){
            console.error("UI初始化失败：找不到画布元素");
            return;
        }
        bindEvents(engine);
        updateAllUI(engine);
    }

    return { init, refresh, showEventModal, showResultModal };
})();