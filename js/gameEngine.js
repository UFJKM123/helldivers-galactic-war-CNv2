window.GameEngine = (function() {
    const { MAP_SIZES, CAMPS, CAMP_KEYS, STRATEGIC_EVENTS, PLANET_NAME_LIST } = GameConfig;

    const state = {
        canvas: null,
        ctx: null,
        planets: [],
        links: [],
        blockedLinks: new Set(),
        playerCampKey: "EARTH",
        difficulty: "normal",
        gameMode: "normal",
        turn: 1,
        selectedWeapon: null,
        weapons: [],
        statKills: 0,
        lastDrawTurn: 0,
        aiStrengthFactors: {},
        deterrenceActive: false,
        deterrenceTurnsLeft: 0,
        eliminationsTriggered: new Set(),
        maiaRiverTriggered: false,
        lastWeakCamp: null,
        spectateMode: false,
        weakWarningTriggered: false,
        currentMapSize: "large",
        currentConfig: null,
        selectedPlanets: [],
        eventQueue: [],
        homeFallTriggered: new Set(),
        weaponMovedThisTurn: false,
        isMouseDown: false,
        dragStartX: 0,
        dragStartY: 0,
        hasDragged: false,
        boxStartX: 0,
        boxStartY: 0,
        boxEndX: 0,
        boxEndY: 0,
        sendRatio: 1.0
    };

    let callbacks = {
        onEvent: null,
        onGameEnd: null,
        onStateChange: null
    };

    function init(canvas, cb) {
        state.canvas = canvas;
        state.ctx = canvas.getContext("2d");
        callbacks = { ...callbacks, ...cb };
        resizeCanvas();
    }

    function getDifficultyParams() {
        switch(state.difficulty){
            case 'easy': return {neutMin:4,neutMax:14,aiThreshold:20,aiExtraGrowth:false};
            case 'hard': return {neutMin:12,neutMax:38,aiThreshold:5,aiExtraGrowth:true};
            default: return {neutMin:6,neutMax:22,aiThreshold:10,aiExtraGrowth:false};
        }
    }

    function resizeCanvas() {
        if (!state.canvas || !state.ctx) return;
        state.canvas.width = window.innerWidth - 340;
        state.canvas.height = window.innerHeight;
        if(state.planets.length) render();
    }

    function restart(options = {}) {
        resizeCanvas();

        state.playerCampKey = options.playerCampKey || "EARTH";
        state.difficulty = options.difficulty || "normal";
        state.gameMode = options.gameMode || "normal";
        state.currentMapSize = options.mapSize || "large";
        state.currentConfig = MAP_SIZES[state.currentMapSize];

        state.turn = 1;
        state.lastDrawTurn = 0;
        state.selectedWeapon = null;
        state.statKills = 0;
        state.blockedLinks.clear();
        state.planets = [];
        state.links = [];
        state.weapons = [];
        state.deterrenceActive = false;
        state.deterrenceTurnsLeft = 0;
        state.aiStrengthFactors = {};
        state.eliminationsTriggered.clear();
        state.maiaRiverTriggered = false;
        state.lastWeakCamp = null;
        state.weakWarningTriggered = false;
        state.spectateMode = false;
        state.eventQueue = [];
        state.selectedPlanets = [];
        state.homeFallTriggered.clear();
        state.weaponMovedThisTurn = false;
        state.isMouseDown = false;
        state.hasDragged = false;

        CAMP_KEYS.forEach(ck => {
            if(ck !== state.playerCampKey) state.aiStrengthFactors[ck] = 0;
        });

        generateGalaxy();

        if(state.gameMode === "democracy_dark"){
            const darkTurns = state.currentConfig.darkTurns;
            for(let i=0; i<darkTurns; i++){
                CAMP_KEYS.filter(ck=>ck!==state.playerCampKey).forEach(ck=>{
                    const diff = getDifficultyParams();
                    aiActionNeutralOnly(ck, diff.aiThreshold);
                    state.planets.forEach(p=>{
                        if(p.camp===ck){ p.troop+=1; if(p.resource) p.troop+=2; }
                    });
                });
            }
            state.turn = 1;
        }

        notifyStateChange();
        render();
    }

    function generateGalaxy() {
        const W = state.canvas.width, H = state.canvas.height, pad = state.currentConfig.canvasPad;
        const corners = [{x:pad,y:pad},{x:W-pad,y:pad},{x:pad,y:H-pad},{x:W-pad,y:H-pad}];
        const shuffled = [...CAMP_KEYS].sort(()=>Math.random()-0.5);
        
        shuffled.forEach((ck,idx)=>{
            state.planets.push({
                x:corners[idx].x, y:corners[idx].y,
                camp:ck, originalCamp:ck, isHome:true, troop:70,
                planetName:CAMPS[ck].homeName,
                uid:Math.random().toString(36).slice(2,10),
                resource:false
            });
        });

        const earthPlanet = state.planets.find(p=>p.camp==="EARTH"&&p.isHome);
        if(earthPlanet){
            let ox = earthPlanet.x + 80, oy = earthPlanet.y + 50;
            if(ox > W - pad) ox = earthPlanet.x - 80;
            if(oy > H - pad) oy = earthPlanet.y - 50;
            if(ox < pad) ox = earthPlanet.x + 40;
            if(oy < pad) oy = earthPlanet.y + 40;
            state.planets.push({
                x:ox, y:oy, camp:"EARTH", originalCamp:"EARTH",
                isHome:false, troop:10, planetName:"麦拉芬蒙河",
                uid:Math.random().toString(36).slice(2,10), resource:false
            });
        }

        const diff = getDifficultyParams();
        let namePool = [...PLANET_NAME_LIST].sort(()=>Math.random()-0.5);
        const totalNormal = state.currentConfig.planetTotal - 5;
        const resourceIndices = new Set();
        while(resourceIndices.size < state.currentConfig.resourceCount){
            resourceIndices.add(Math.floor(Math.random()*totalNormal));
        }

        for(let i=0;i<totalNormal;i++){
            let x,y;
            do{
                x = pad + Math.random()*(W-pad*2);
                y = pad + Math.random()*(H-pad*2);
            } while(state.planets.some(p=>Math.hypot(p.x-x,p.y-y)<40));
            
            const initT = Math.floor(Math.random()*(diff.neutMax-diff.neutMin)) + diff.neutMin;
            let pname = namePool.length>0 ? namePool.shift() : "星球"+i;
            state.planets.push({
                x, y, camp:null, originalCamp:null,
                isHome:false, troop:initT, planetName:pname,
                uid:Math.random().toString(36).slice(2,10),
                resource:resourceIndices.has(i)
            });
        }

        buildConnections();
        ensureConnectivity();
    }

    function buildConnections() {
        state.links = [];
        const count = state.currentConfig.linksPerPlanet;
        state.planets.forEach(p=>{
            const others = state.planets
                .filter(o=>o.uid!==p.uid)
                .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))
                .slice(0,count);
            others.forEach(t=>{
                const idPair = [p.uid,t.uid].sort().join("_");
                if(!state.links.some(l=>l.idPair===idPair)){
                    state.links.push({a:p, b:t, idPair});
                }
            });
        });
    }

    function ensureConnectivity() {
        state.planets.forEach(p=>{
            const hasLink = state.links.some(l=>l.a.uid===p.uid||l.b.uid===p.uid);
            if(!hasLink){
                const nearest = state.planets
                    .filter(o=>o.uid!==p.uid)
                    .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
                if(nearest){
                    const idPair = [p.uid,nearest.uid].sort().join("_");
                    if(!state.links.some(l=>l.idPair===idPair)){
                        state.links.push({a:p, b:nearest, idPair});
                    }
                }
            }
        });
    }

    function render() {
        if (!state.ctx || !state.canvas) return;
        const ctx = state.ctx;
        ctx.clearRect(0,0,state.canvas.width,state.canvas.height);

        state.links.forEach(ln=>{
            const isBlock = state.blockedLinks.has(ln.idPair);
            ctx.beginPath();
            ctx.moveTo(ln.a.x, ln.a.y);
            ctx.lineTo(ln.b.x, ln.b.y);
            ctx.strokeStyle = isBlock ? "#aa4444" : "#5a7aaa";
            ctx.lineWidth = isBlock ? 2 : 1;
            ctx.stroke();
        });

        state.planets.forEach(p=>{
            const r = p.isHome ? 16 : 10;
            const campData = p.camp ? CAMPS[p.camp] : null;

            if(state.selectedPlanets.some(sp=>sp.uid===p.uid)){
                ctx.beginPath();
                ctx.arc(p.x,p.y,r+6,0,Math.PI*2);
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            if(state.selectedWeapon && state.selectedWeapon.planetId === p.uid){
                ctx.beginPath();
                ctx.arc(p.x,p.y,r+5,0,Math.PI*2);
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(p.x,p.y,r,0,Math.PI*2);
            ctx.fillStyle = campData ? campData.color : "#505050";
            ctx.fill();

            if(p.isHome){
                ctx.beginPath();
                ctx.arc(p.x,p.y,r+3,0,Math.PI*2);
                ctx.strokeStyle = "#ffdd00";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            if(p.resource){
                ctx.fillStyle = "#ffaa00";
                ctx.font = "12px Arial";
                ctx.fillText("◆", p.x, p.y-r-2);
            }

            ctx.fillStyle = "#fff";
            ctx.font = "bold 11px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.troop, p.x, p.y+r+13);

            ctx.fillStyle = "#aaa";
            ctx.font = "8px Microsoft Yahei";
            ctx.fillText(p.planetName, p.x, p.y+r+22);

            const planetWeapons = state.weapons.filter(w=>w.planetId===p.uid);
            if(planetWeapons.length){
                let yOff = p.y - r - 8;
                planetWeapons.forEach(w=>{
                    const wc = CAMPS[w.camp];
                    ctx.fillStyle = wc ? wc.color : "#fff";
                    ctx.font = "16px Arial";
                    ctx.fillText(w.type==='mobile'?'◈':'⬢', p.x, yOff);
                    yOff -= 16;
                });
            }
        });

        if(state.isMouseDown && state.hasDragged){
            const x = Math.min(state.boxStartX, state.boxEndX);
            const y = Math.min(state.boxStartY, state.boxEndY);
            const w = Math.abs(state.boxEndX - state.boxStartX);
            const h = Math.abs(state.boxEndY - state.boxStartY);
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = "rgba(0,255,255,0.1)";
            ctx.fillRect(x, y, w, h);
        }
    }

    function getCampWeaponDef(campKey) {
        return CAMPS[campKey];
    }

    function buildWeapon() {
        if(state.spectateMode) return { success:false, msg:"观战模式无法操作" };

        const camp = getCampWeaponDef(state.playerCampKey);
        const planet = state.selectedPlanets.length===1 ? state.selectedPlanets[0] : null;

        if(!planet || planet.camp !== state.playerCampKey){
            return { success:false, msg:"请选中己方星球" };
        }

        if(camp.weaponType === 'mobile'){
            if(state.weapons.some(w=>w.camp===state.playerCampKey && w.type==='mobile')){
                return { success:false, msg:`${camp.lwName}已建造！` };
            }
            if(planet.troop < 180) return { success:false, msg:"需要180兵力" };
            
            planet.troop -= 180;
            state.weapons.push({
                id: Math.random().toString(36).slice(2,8),
                camp: state.playerCampKey,
                type: 'mobile',
                planetId: planet.uid,
                guardBonus: camp.guardBonus,
                weaken: camp.weaken,
                decay: 0
            });
        } else {
            if(planet.troop < 150) return { success:false, msg:"需要150兵力" };
            const existingCount = state.weapons.filter(w=>
                w.camp===state.playerCampKey && w.planetId===planet.uid
            ).length;
            if(existingCount >= 4){
                return { success:false, msg:`该星球已部署了4个${camp.lwName}，无法继续部署。` };
            }
            planet.troop -= 150;
            state.weapons.push({
                id: Math.random().toString(36).slice(2,8),
                camp: state.playerCampKey,
                type: 'deploy',
                planetId: planet.uid,
                guardBonus: camp.guardBonus,
                weaken: camp.weaken,
                decay: camp.decay || 0
            });
        }

        render();
        return { success:true };
    }

    function findWeaponAtPos(mx, my) {
        for(let w of state.weapons){
            const planet = state.planets.find(p=>p.uid===w.planetId);
            if(!planet) continue;
            const r = planet.isHome ? 16 : 10;
            const planetWeapons = state.weapons.filter(wp=>wp.planetId===planet.uid);
            const index = planetWeapons.indexOf(w);
            if(index === -1) continue;
            const yCenter = planet.y - r - 8 - 16*index - 8;
            if(mx >= planet.x-8 && mx <= planet.x+8 && my >= yCenter-8 && my <= yCenter+8){
                return w;
            }
        }
        return null;
    }

    function arePlayerPlanetsConnected(a, b) {
        if(a.uid === b.uid) return true;
        const visited = new Set();
        const queue = [a];
        visited.add(a.uid);

        while(queue.length > 0){
            const cur = queue.shift();
            for(let ln of state.links){
                let neighbor = null;
                if(ln.a.uid === cur.uid) neighbor = ln.b;
                else if(ln.b.uid === cur.uid) neighbor = ln.a;
                else continue;
                if(state.blockedLinks.has(ln.idPair)) continue;
                if(neighbor.camp !== state.playerCampKey) continue;
                if(neighbor.uid === b.uid) return true;
                if(!visited.has(neighbor.uid)){
                    visited.add(neighbor.uid);
                    queue.push(neighbor);
                }
            }
        }
        return false;
    }

    function handleMouseDown(e) {
        if(state.spectateMode) return;
        if(e.button !== 0) return;
        const rect = state.canvas.getBoundingClientRect();
        state.dragStartX = e.clientX - rect.left;
        state.dragStartY = e.clientY - rect.top;
        state.boxStartX = state.boxEndX = state.dragStartX;
        state.boxStartY = state.boxEndY = state.dragStartY;
        state.isMouseDown = true;
        state.hasDragged = false;
    }

    function handleMouseMove(e) {
        if(!state.isMouseDown || state.spectateMode) return;
        const rect = state.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - state.dragStartX;
        const dy = my - state.dragStartY;

        if(Math.abs(dx) > 3 || Math.abs(dy) > 3){
            if(!state.hasDragged){
                state.hasDragged = true;
                state.selectedPlanets = [];
            }
            state.boxEndX = mx;
            state.boxEndY = my;
            render();
        }
    }

    function handleMouseUp(e) {
        if(!state.isMouseDown || state.spectateMode) return;
        state.isMouseDown = false;

        if(state.hasDragged){
            const minX = Math.min(state.boxStartX, state.boxEndX);
            const maxX = Math.max(state.boxStartX, state.boxEndX);
            const minY = Math.min(state.boxStartY, state.boxEndY);
            const maxY = Math.max(state.boxStartY, state.boxEndY);
            
            state.selectedPlanets = state.planets.filter(p=>
                p.camp === state.playerCampKey &&
                p.x >= minX && p.x <= maxX &&
                p.y >= minY && p.y <= maxY
            );
            state.hasDragged = false;
            render();
            return { type:"selection", planets: state.selectedPlanets };
        } else {
            return handleCanvasClick(e);
        }
    }

    function handleCanvasClick(evt) {
        if(state.spectateMode) return;
        const rect = state.canvas.getBoundingClientRect();
        const mx = evt.clientX - rect.left;
        const my = evt.clientY - rect.top;

        // Shift+点击：多选切换
        if(evt.shiftKey) {
            const hitPlanet = state.planets.find(p=>Math.hypot(p.x-mx,p.y-my)<20);
            if(hitPlanet && hitPlanet.camp === state.playerCampKey) {
                const index = state.selectedPlanets.findIndex(p=>p.uid === hitPlanet.uid);
                if(index >= 0) {
                    state.selectedPlanets.splice(index, 1);
                } else {
                    state.selectedPlanets.push(hitPlanet);
                }
                // 清除武器选中，因为进入星球多选模式
                state.selectedWeapon = null;
                render();
                return { type:"selection", planets: state.selectedPlanets };
            }
            // 没有点中己方星球则不操作
            return;
        }

        const clickedWeapon = findWeaponAtPos(mx, my);
        if(clickedWeapon && clickedWeapon.camp === state.playerCampKey){
            state.selectedWeapon = clickedWeapon;
            state.selectedPlanets = [];
            render();
            return { type:"weapon_select", weapon: clickedWeapon };
        }

        const hitPlanet = state.planets.find(p=>Math.hypot(p.x-mx,p.y-my)<20);
        if(!hitPlanet){
            state.selectedWeapon = null;
            state.selectedPlanets = [];
            render();
            return { type:"clear" };
        }

        if(state.selectedWeapon){
            return handleWeaponMove(hitPlanet);
        }

        if(state.selectedPlanets.length === 0){
            state.selectedPlanets = [hitPlanet];
            render();
            return { type:"planet_select", planet: hitPlanet };
        } else if(state.selectedPlanets.length === 1){
            return handleSinglePlanetAction(hitPlanet);
        } else {
            return handleMultiPlanetAction(hitPlanet);
        }
    }

    function handleWeaponMove(targetPlanet) {
        // 只允许移动型武器移动
        if(state.selectedWeapon.type !== 'mobile'){
            state.selectedWeapon = null;
            render();
            return { success:false, msg:"阴霾和寂域不可移动" };
        }
        if(state.weaponMovedThisTurn){
            state.selectedWeapon = null;
            render();
            return { success:false, msg:"本回合已移动过武器，每回合只能移动一次" };
        }

        // 移动到任意星球，不再检查相邻
        state.selectedWeapon.planetId = targetPlanet.uid;
        // 修复bug：仅对非己方星球扣20兵力
        if(targetPlanet.camp !== state.selectedWeapon.camp) {
            targetPlanet.troop = Math.max(1, targetPlanet.troop - 20);
        }
        state.weaponMovedThisTurn = true;
        state.selectedWeapon = null;
        state.selectedPlanets = [];
        render();
        return { success:true };
    }

    function handleSinglePlanetAction(target) {
        const source = state.selectedPlanets[0];
        if(source.uid === target.uid){
            state.selectedPlanets = [];
            render();
            return { type:"deselect" };
        }
        if(source.camp !== state.playerCampKey){
            state.selectedPlanets = [];
            render();
            return { success:false };
        }

        // 进攻/调兵现在基于路径相连（同框选逻辑）
        if(target.camp === state.playerCampKey){
            // 调兵到己方星球：需要路径直接相连
            if(!arePlayerPlanetsConnected(source, target)) {
                state.selectedPlanets = [];
                render();
                return { success:false };
            }
            moveTroops(source, target);
        } else {
            // 攻击敌方/中立：寻找与目标相邻的己方前线星球，且源星球能通过己方路径到达该前线
            const frontier = state.planets.filter(p =>
                p.camp === state.playerCampKey &&
                state.links.some(ln =>
                    (ln.a.uid === p.uid && ln.b.uid === target.uid) ||
                    (ln.b.uid === p.uid && ln.a.uid === target.uid)
                )
            );
            const connectedFrontier = frontier.filter(f => arePlayerPlanetsConnected(source, f));
            if(connectedFrontier.length === 0) {
                state.selectedPlanets = [];
                render();
                return { success:false };
            }
            if(source.troop <= 0) {
                state.selectedPlanets = [];
                render();
                return { success:false };
            }
            executeAttack(source, target);
            checkDefeat();
        }

        state.selectedPlanets = [];
        render();
        return { success:true };
    }

    function handleMultiPlanetAction(target) {
        const ratio = getSendRatio();

        if(target.camp === state.playerCampKey){
            const validPlanets = state.selectedPlanets.filter(p =>
                p.camp === state.playerCampKey &&
                p.uid !== target.uid &&
                arePlayerPlanetsConnected(p, target)
            );
            for(let from of validPlanets){
                const sendTroop = Math.floor(from.troop * ratio);
                if(sendTroop > 0){
                    from.troop -= sendTroop;
                    target.troop += sendTroop;
                }
            }
        } else {
            const frontier = state.planets.filter(p =>
                p.camp === state.playerCampKey &&
                state.links.some(ln =>
                    (ln.a.uid === p.uid && ln.b.uid === target.uid) ||
                    (ln.b.uid === p.uid && ln.a.uid === target.uid)
                )
            );
            const validPlanets = state.selectedPlanets.filter(p => {
                if(p.camp !== state.playerCampKey || p.troop <= 0) return false;
                return frontier.some(f => arePlayerPlanetsConnected(p, f));
            });

            if(validPlanets.length === 0){
                state.selectedPlanets = [];
                render();
                return { success:false };
            }

            let totalAttack = 0;
            const attackingPlanets = [];
            for(let from of validPlanets){
                const sendTroop = Math.floor(from.troop * ratio);
                if(sendTroop > 0){
                    totalAttack += sendTroop;
                    attackingPlanets.push({planet: from, send: sendTroop});
                }
            }

            if(totalAttack <= 0){
                state.selectedPlanets = [];
                render();
                return { success:false };
            }

            attackingPlanets.forEach(item => { item.planet.troop -= item.send; });

            const targetWeapons = state.weapons.filter(w=>w.planetId===target.uid);
            let guardBonus = 0, weakenEffect = 0;
            targetWeapons.forEach(w=>{
                if(target.camp === w.camp){
                    guardBonus += w.guardBonus;
                    weakenEffect += w.weaken;
                }
            });

            const effectiveAttack = Math.max(0, totalAttack - weakenEffect);
            const defendTroop = target.troop + guardBonus;
            const result = effectiveAttack - defendTroop;

            if(result > 0){
                state.statKills += target.troop;
                const oldCamp = target.camp;
                target.camp = state.playerCampKey;
                target.troop = result;
                onPlanetCaptured(target, oldCamp, state.playerCampKey);
                checkConquestWin();
            } else {
                state.statKills += Math.min(totalAttack, target.troop);
                target.troop = Math.max(1, target.troop - totalAttack);
            }
            checkDefeat();
        }

        state.selectedPlanets = [];
        render();
        return { success:true };
    }

    function moveTroops(from, to) {
        const ratio = getSendRatio();
        const sendTroop = Math.floor(from.troop * ratio);
        if(sendTroop <= 0) return { success:false };
        from.troop -= sendTroop;
        to.troop += sendTroop;
        return { success:true };
    }

    function executeAttack(from, to) {
        const ratio = getSendRatio();
        let attackTroop = Math.floor(from.troop * ratio);
        from.troop -= attackTroop;
        const oldCamp = to.camp;

        const targetWeapons = state.weapons.filter(w=>w.planetId===to.uid);
        let guardBonus = 0, weakenEffect = 0;
        targetWeapons.forEach(w=>{
            if(to.camp === w.camp){
                guardBonus += w.guardBonus;
                weakenEffect += w.weaken;
            }
        });

        const defendTroop = to.troop + guardBonus;
        const effectiveAttack = Math.max(0, attackTroop - weakenEffect);
        const result = effectiveAttack - defendTroop;

        if(result > 0){
            state.statKills += to.troop;
            to.camp = from.camp;
            to.troop = result;
            onPlanetCaptured(to, oldCamp, from.camp);
            checkConquestWin();
        } else {
            state.statKills += Math.min(attackTroop, to.troop);
            to.troop = Math.max(1, to.troop - attackTroop);
        }
    }

    function onPlanetCaptured(planet, oldCamp, newCamp) {
        if(planet.planetName==="麦拉芬蒙河" && oldCamp==="EARTH" && newCamp==="ROBOT" && !state.maiaRiverTriggered){
            state.maiaRiverTriggered = true;
            triggerEvent("麦拉芬蒙河战败", "机器人攻陷了战略要地麦拉芬蒙河。");
        }
        if(planet.isHome){
            if(newCamp===state.playerCampKey && oldCamp!==state.playerCampKey){
                triggerEvent("母星占领", `我军占领了敌方母星：${planet.planetName}！`);
            } else if(oldCamp===state.playerCampKey && newCamp!==state.playerCampKey && planet.originalCamp===state.playerCampKey){
                triggerEvent("母星沦陷", `警报！我方母星 ${planet.planetName} 已被敌人占领！`);
            }
        }
        checkEliminations();
    }

    function checkEliminations() {
        CAMP_KEYS.forEach(ck=>{
            if(state.planets.filter(p=>p.camp===ck).length===0 && !state.eliminationsTriggered.has(ck)){
                state.eliminationsTriggered.add(ck);
                if(ck !== state.playerCampKey){
                    triggerEvent("阵营覆灭", CAMPS[ck].eliminationMessages.defeated);
                }
            }
        });
    }

    function checkHomeFallEvents() {
        state.planets.forEach(p=>{
            if(p.isHome && p.originalCamp && p.originalCamp !== state.playerCampKey){
                if(p.camp !== p.originalCamp && !state.homeFallTriggered.has(p.originalCamp)){
                    state.homeFallTriggered.add(p.originalCamp);
                    triggerEvent("母星陷落", CAMPS[p.originalCamp].homeFall);
                }
            }
        });
    }

    function checkConquestWin() {
        if(state.planets.filter(p=>p.isHome && p.camp && p.camp!==state.playerCampKey).length === 0){
            endGame("conquest");
        }
    }

    function checkDefeat() {
        if(!state.spectateMode && state.planets.filter(p=>p.camp===state.playerCampKey).length === 0){
            endGame("defeat");
        }
    }

    function getSendRatio() {
        return state.sendRatio || 1.0;
    }

    function setSendRatio(val) {
        state.sendRatio = parseFloat(val || "1.0");
    }

    function performStrategicDraw() {
        if(state.spectateMode) return { success:false, msg:"观战模式无法使用" };
        if(state.turn < 10) return { success:false, msg:"前10回合无法使用战略机遇" };
        if(state.turn - state.lastDrawTurn < 10){
            return { success:false, msg:`冷却中，还需等待${10-(state.turn-state.lastDrawTurn)}回合` };
        }

        const myPlanets = state.planets.filter(p=>p.camp===state.playerCampKey && p.troop>=30);
        if(myPlanets.length === 0) return { success:false, msg:"没有星球兵力达到30" };

        const payer = myPlanets[Math.floor(Math.random()*myPlanets.length)];
        payer.troop -= 30;

        const campEvents = STRATEGIC_EVENTS[state.playerCampKey];
        const isPositive = Math.random() < 0.5;
        const pool = isPositive ? campEvents.positive : campEvents.negative;
        const event = pool[Math.floor(Math.random()*pool.length)];

        const targetPlanet = state.planets.filter(p=>p.camp===state.playerCampKey)
            [Math.floor(Math.random()*state.planets.filter(p=>p.camp===state.playerCampKey).length)];
        if(!targetPlanet) return { success:false };

        const effectAmt = isPositive
            ? Math.floor(Math.random()*25) + 25
            : Math.floor(Math.random()*20) + 5;
        
        if(isPositive) targetPlanet.troop += effectAmt;
        else targetPlanet.troop = Math.max(1, targetPlanet.troop - effectAmt);

        state.lastDrawTurn = state.turn;
        const finalDesc = event.desc.replace(/{planet}/g, targetPlanet.planetName);
        const change = isPositive ? `+${effectAmt}` : `-${effectAmt}`;

        triggerEvent(
            `战略机遇：${event.title} (${isPositive?'正面':'负面'})`,
            `${finalDesc}\n目标：${targetPlanet.planetName}\n兵力变化：${change}（当前：${targetPlanet.troop}）`
        );

        render();
        return { success:true };
    }

    function randomizeEnemyStrength() {
        const enemyCamps = CAMP_KEYS.filter(ck=>ck !== state.playerCampKey);
        state.aiStrengthFactors = {};
        enemyCamps.forEach(ck=>{
            state.aiStrengthFactors[ck] = Math.floor(Math.random()*4);
        });
        triggerEvent("随机强度分配", "各敌方阵营已获得不同的额外兵力增长。");
        return state.aiStrengthFactors;
    }

    function getStrengthDisplayText() {
        const enemyCamps = CAMP_KEYS.filter(ck=>ck !== state.playerCampKey);
        if(Object.keys(state.aiStrengthFactors).length===0 || enemyCamps.every(ck=>!state.aiStrengthFactors[ck])){
            return "各阵营强度：未分配";
        }
        let text = "各阵营强度：";
        enemyCamps.forEach(ck=>{
            text += `${CAMPS[ck].name}+${state.aiStrengthFactors[ck]||0} `;
        });
        return text;
    }

    function aiActionNeutralOnly(campKey, threshold) {
        const aiPlanets = state.planets.filter(p=>p.camp===campKey);
        aiPlanets.forEach(ownPlanet => {
            if(ownPlanet.troop < threshold) return;
            let targets = [];
            state.links.forEach(ln=>{
                if(ln.a.uid===ownPlanet.uid && ln.b.camp===null && !state.blockedLinks.has(ln.idPair)) targets.push(ln.b);
                else if(ln.b.uid===ownPlanet.uid && ln.a.camp===null && !state.blockedLinks.has(ln.idPair)) targets.push(ln.a);
            });
            if(targets.length===0) return;
            targets.sort((a,b)=>a.troop-b.troop);
            const target = targets[0];
            const send = Math.floor(ownPlanet.troop * 0.7);
            ownPlanet.troop -= send;
            const res = send - target.troop;
            if(res > 0){ target.camp = campKey; target.troop = res; }
            else { target.troop = Math.max(1, target.troop - send); }
        });

        const campDef = CAMPS[campKey];
        if(campDef.weaponType==='mobile' && !state.weapons.some(w=>w.camp===campKey && w.type==='mobile')){
            let buildPlanet = aiPlanets.find(p=>p.isHome) || aiPlanets.reduce((a,b)=>a.troop>b.troop?a:b);
            if(buildPlanet.troop >= 180){
                buildPlanet.troop -= 180;
                state.weapons.push({
                    id: Math.random().toString(36).slice(2,8),
                    camp: campKey, type: 'mobile',
                    planetId: buildPlanet.uid,
                    guardBonus: campDef.guardBonus,
                    weaken: campDef.weaken, decay: 0
                });
            }
        }
    }

    function aiWeaponLogic() {
        CAMP_KEYS.filter(c=>c!==state.playerCampKey).forEach(campKey => {
            const campDef = CAMPS[campKey];
            const aiPlanets = state.planets.filter(p=>p.camp===campKey);
            if(aiPlanets.length===0) return;

            if(campDef.weaponType === 'mobile'){
                const existing = state.weapons.find(w=>w.camp===campKey && w.type==='mobile');
                if(!existing){
                    let buildPlanet = aiPlanets.find(p=>p.isHome) || aiPlanets.reduce((a,b)=>a.troop>b.troop?a:b);
                    if(buildPlanet.troop >= 180){
                        buildPlanet.troop -= 180;
                        state.weapons.push({
                            id: Math.random().toString(36).slice(2,8),
                            camp: campKey, type: 'mobile',
                            planetId: buildPlanet.uid,
                            guardBonus: campDef.guardBonus,
                            weaken: campDef.weaken, decay: 0
                        });
                    }
                } else {
                    let bestTarget = null, bestScore = -Infinity;
                    aiPlanets.forEach(p=>{
                        const hasEnemyAdj = state.links.some(ln=>
                            (ln.a.uid===p.uid && ln.b.camp!==campKey && !state.blockedLinks.has(ln.idPair)) ||
                            (ln.b.uid===p.uid && ln.a.camp!==campKey && !state.blockedLinks.has(ln.idPair))
                        );
                        if(hasEnemyAdj && p.troop > bestScore){
                            bestScore = p.troop;
                            bestTarget = p;
                        }
                    });
                    if(!bestTarget) bestTarget = aiPlanets.reduce((a,b)=>a.troop>b.troop?a:b);
                    existing.planetId = bestTarget.uid;
                }
            } else if(campDef.weaponType === 'deploy'){
                if(state.turn % 5 === 0 && aiPlanets.length > 0){
                    let target = aiPlanets.find(p => {
                        const count = state.weapons.filter(w=>w.camp===campKey && w.planetId===p.uid).length;
                        return count < 4 && state.links.some(ln =>
                            (ln.a.uid===p.uid && ln.b.camp!==campKey && !state.blockedLinks.has(ln.idPair)) ||
                            (ln.b.uid===p.uid && ln.a.camp!==campKey && !state.blockedLinks.has(ln.idPair))
                        );
                    });
                    if(!target) target = aiPlanets.find(p =>
                        state.weapons.filter(w=>w.camp===campKey && w.planetId===p.uid).length < 4
                    ) || aiPlanets.reduce((a,b) => a.troop > b.troop ? a : b);
                    
                    const payer = aiPlanets.reduce((a,b) => a.troop > b.troop ? a : b);
                    if(payer.troop >= 150 && target){
                        payer.troop -= 150;
                        state.weapons.push({
                            id: Math.random().toString(36).slice(2,8),
                            camp: campKey, type: 'deploy',
                            planetId: target.uid,
                            guardBonus: campDef.guardBonus,
                            weaken: campDef.weaken,
                            decay: campDef.decay || 0
                        });
                    }
                }
            }
        });
    }

    function aiTransferTroops(campKey) {
        const aiPlanets = state.planets.filter(p=>p.camp===campKey);
        if(aiPlanets.length<2) return;

        const frontPlanets = aiPlanets.filter(p=>
            state.links.some(ln=>
                (ln.a.uid===p.uid && ln.b.camp!==campKey && !state.blockedLinks.has(ln.idPair)) ||
                (ln.b.uid===p.uid && ln.a.camp!==campKey && !state.blockedLinks.has(ln.idPair))
            )
        );
        if(frontPlanets.length===0) return;

        aiPlanets.forEach(p=>{
            if(frontPlanets.includes(p) || p.troop<=10) return;
            let bestTarget = null, bestDist = Infinity;
            frontPlanets.forEach(fp=>{
                const ln = state.links.find(l=>
                    (l.a.uid===p.uid && l.b.uid===fp.uid) ||
                    (l.b.uid===p.uid && l.a.uid===fp.uid)
                );
                if(ln && !state.blockedLinks.has(ln.idPair)){
                    const d = Math.hypot(p.x-fp.x, p.y-fp.y);
                    if(d < bestDist){ bestDist = d; bestTarget = fp; }
                }
            });
            if(bestTarget){
                const transfer = Math.floor(p.troop * 0.7);
                p.troop -= transfer;
                bestTarget.troop += transfer;
            }
        });

        const mobileWeapon = state.weapons.find(w=>w.camp===campKey && w.type==='mobile');
        if(mobileWeapon){
            const strongestFront = frontPlanets.reduce((a,b)=>a.troop>b.troop?a:b, frontPlanets[0]);
            if(strongestFront) mobileWeapon.planetId = strongestFront.uid;
        }
    }

    function lightAssaultEvent() {
        const neutralPlanets = state.planets.filter(p=>p.camp===null);
        if(neutralPlanets.length===0) return;

        let totalPower = 0;
        state.planets.forEach(p=>{ if(p.camp) totalPower += p.troop; });
        const assaultPower = Math.floor(totalPower * 0.4);
        const targetCount = Math.min(neutralPlanets.length, Math.floor(state.currentConfig.planetTotal * 0.1));
        const selectedTargets = neutralPlanets.sort(()=>Math.random()-0.5).slice(0, targetCount);
        const avgTroop = Math.floor(assaultPower / targetCount);

        selectedTargets.forEach(p=>{ p.camp = "LIGHT"; p.troop = avgTroop; });
        const lightHome = state.planets.find(p=>p.isHome && p.camp==="LIGHT");
        if(lightHome) lightHome.troop += Math.floor(assaultPower * 0.3);

        triggerEvent("光能突袭", "光能者大军突然降临，占领了多个星球！西斯舰队开始全面反攻。");
    }

    function nextTurn() {
        const diff = getDifficultyParams();

        state.weapons.forEach(w=>{
            if(w.type==='deploy' && w.decay>0){
                const p = state.planets.find(p=>p.uid===w.planetId);
                if(p && p.camp !== w.camp) p.troop = Math.max(1, p.troop - w.decay);
            }
        });

        CAMP_KEYS.filter(ck=>ck!==state.playerCampKey).forEach(ck=>aiTransferTroops(ck));
        state.planets.forEach(p=>{
            if(p.camp && p.camp!==state.playerCampKey){
                aiAction(p, diff.aiThreshold, state.deterrenceActive ? state.playerCampKey : null);
            }
        });

        if(state.deterrenceActive){
            const playerHome = state.planets.find(p=>p.isHome && p.camp===state.playerCampKey);
            if(!playerHome){ endGame("defeat"); return; }
        }

        if(!state.deterrenceActive){
            state.planets.forEach(p=>{
                if(p.camp===state.playerCampKey) p.troop += 1;
                if(p.camp===state.playerCampKey && p.resource) p.troop += 2;
            });
        }
        state.planets.forEach(p=>{
            if(p.camp && p.camp!==state.playerCampKey) p.troop += 1;
            if(p.camp && p.camp!==state.playerCampKey && p.resource) p.troop += 2;
        });

        CAMP_KEYS.forEach(ck=>{
            if(ck!==state.playerCampKey && state.aiStrengthFactors[ck]){
                state.planets.forEach(p=>{ if(p.camp===ck) p.troop += state.aiStrengthFactors[ck]; });
            }
        });

        if(diff.aiExtraGrowth){
            state.planets.forEach(p=>{ if(p.camp && p.camp!==state.playerCampKey) p.troop += 1; });
        }

        aiWeaponLogic();
        checkPowerBalance();

        if(state.gameMode==="light_assault" && state.turn === 20){ lightAssaultEvent(); }

        if(state.deterrenceActive){
            state.deterrenceTurnsLeft--;
            if(state.deterrenceTurnsLeft <= 0){ endGame("deterrence"); return; }
        }

        checkHomeFallEvents();
        if(!state.spectateMode) checkDefeat();

        state.weaponMovedThisTurn = false;
        state.turn++;
        state.selectedWeapon = null;
        state.selectedPlanets = [];

        notifyStateChange();
        render();
    }

    function aiAction(ownPlanet, threshold, onlyCamp=null) {
        if(ownPlanet.troop < threshold) return;

        let targets = [];
        state.links.forEach(ln=>{
            if(ln.a.uid===ownPlanet.uid && ln.b.camp!==ownPlanet.camp && !state.blockedLinks.has(ln.idPair)){
                if(onlyCamp===null || ln.b.camp===onlyCamp) targets.push(ln.b);
            }
            else if(ln.b.uid===ownPlanet.uid && ln.a.camp!==ownPlanet.camp && !state.blockedLinks.has(ln.idPair)){
                if(onlyCamp===null || ln.a.camp===onlyCamp) targets.push(ln.a);
            }
        });
        if(targets.length===0) return;

        const playerHome = state.planets.find(p=>p.isHome && p.camp===state.playerCampKey);
        const homeTarget = targets.find(t=>t.uid===playerHome?.uid);
        if(homeTarget) targets = [homeTarget];
        else {
            const resTargets = targets.filter(t=>t.resource);
            if(resTargets.length > 0){
                resTargets.sort((a,b)=>a.troop-b.troop);
                targets = [resTargets[0]];
            } else {
                targets.sort((a,b)=>a.troop-b.troop);
            }
        }

        const target = targets[0];
        const oldCamp = target.camp;
        const ratio = (ownPlanet.troop > target.troop*2) ? 0.9 : 0.7;
        const send = Math.floor(ownPlanet.troop * ratio);
        ownPlanet.troop -= send;

        const targetWeapons = state.weapons.filter(w=>w.planetId===target.uid);
        let guardBonus = 0, weaken = 0;
        targetWeapons.forEach(w=>{
            if(target.camp === w.camp){
                guardBonus += w.guardBonus;
                weaken += w.weaken;
            }
        });

        const effectiveAttack = Math.max(0, send - weaken);
        const defendTroop = target.troop + guardBonus;
        const res = effectiveAttack - defendTroop;

        if(res > 0){
            target.camp = ownPlanet.camp;
            target.troop = res;
            onPlanetCaptured(target, oldCamp, ownPlanet.camp);
            checkConquestWin();
            if(!state.spectateMode) checkDefeat();
        } else {
            target.troop = Math.max(1, target.troop - send);
        }
    }

    function checkPowerBalance() {
        if(state.turn <= 40 || state.weakWarningTriggered) return;
        const power = {};
        CAMP_KEYS.forEach(ck=>{
            power[ck] = state.planets.filter(p=>p.camp===ck).reduce((s,p)=>s+p.troop, 0);
        });
        const entries = Object.entries(power).filter(([k,v])=>v>0 && k!==state.playerCampKey);
        if(entries.length===0) return;

        const playerPower = power[state.playerCampKey] || 0;
        if(entries.every(([_,v])=>v > playerPower * 1.5)){
            state.weakWarningTriggered = true;
            triggerEvent("势力衰弱", "我方总兵力已远逊于各个敌对势力，形势危急！");
        }
    }

    function activateFinal() {
        if(state.spectateMode) return { success:false, msg:"观战模式无法启动" };
        if(state.deterrenceActive) return { success:false, msg:"终结手段已经启动！" };

        const camp = getCampWeaponDef(state.playerCampKey);
        if(!state.weapons.some(w=>w.camp===state.playerCampKey)){
            return { success:false, msg:`需要先建造/部署${camp.lwName}` };
        }

        const planet = state.selectedPlanets.length===1 ? state.selectedPlanets[0] : null;
        if(!planet || planet.camp !== state.playerCampKey){
            return { success:false, msg:"选中己方星球启动" };
        }
        if(planet.troop < 400) return { success:false, msg:"需要400兵力" };

        planet.troop -= 400;
        state.deterrenceActive = true;
        state.deterrenceTurnsLeft = 5;
        triggerEvent("终结手段启动", "所有敌人将联合进攻，我方停止增长，持续5回合。守住母星即可获胜！");

        render();
        return { success:true };
    }

    function endGame(victoryType) {
        if(state.spectateMode) return;
        const camp = CAMPS[state.playerCampKey];
        const playerOwned = state.planets.filter(p=>p.camp===state.playerCampKey).length;
        const scoreRaw = Math.round(playerOwned*9 + state.statKills*0.22 + state.turn*2);

        let title = "", resultText = "", campMessage = "";
        if(victoryType === "conquest"){
            title = "征服胜利";
            resultText = "占领全部敌方母星，一统银河！";
            campMessage = camp.victorySpeech.conquest;
        } else if(victoryType === "deterrence"){
            title = "威慑胜利";
            resultText = "启动终极武器强制停战";
            campMessage = camp.victorySpeech.deterrence;
        } else {
            title = "败北";
            resultText = "你的最后一颗星球沦陷了，银河称霸梦碎";
            campMessage = camp.victorySpeech.defeat;
        }

        state.deterrenceActive = false;
        if(callbacks.onGameEnd){
            callbacks.onGameEnd({
                title, resultText, campMessage,
                planetCount: playerOwned,
                kills: state.statKills,
                turns: state.turn,
                score: scoreRaw,
                isDefeat: victoryType === "defeat"
            });
        }
    }

    function startSpectate() {
        state.spectateMode = true;
    }

    function triggerEvent(title, message) {
        if(callbacks.onEvent){
            callbacks.onEvent(title, message);
        }
    }

    function notifyStateChange() {
        if(callbacks.onStateChange){
            callbacks.onStateChange(getPublicState());
        }
    }

    function getPublicState() {
        return {
            turn: state.turn,
            playerCampKey: state.playerCampKey,
            selectedPlanets: [...state.selectedPlanets],
            selectedWeapon: state.selectedWeapon,
            weapons: [...state.weapons],
            deterrenceActive: state.deterrenceActive,
            deterrenceTurnsLeft: state.deterrenceTurnsLeft,
            spectateMode: state.spectateMode,
            statKills: state.statKills
        };
    }

    function getTipsText() {
        const camp = CAMPS[state.playerCampKey];
        let tip = `【${camp.name}军备】\n大型武器：${camp.lwName}（${camp.weaponType==='mobile'?'移动型·一次性建造':'部署型·可多次部署'}）\n终结手段：${camp.finName}（消耗400兵力）\n`;
        if(camp.weaponType==='mobile'){
            tip += `建造消耗180兵力，保卫+20、削弱30\n点击武器图标再点任意星球移动（敌方-20兵力，己方无损）\n每回合限移动1次`;
        } else {
            tip += `每次部署消耗150兵力，可在己方星球部署（每星球上限4个）\n己方星球保卫+20，敌方进攻削弱15\n敌方控制时每回合损兵5（可叠加）`;
        }
        tip += `\n◆ 资源星球：每回合额外+2兵力\n🎴 战略机遇：每10回合抽一次，消耗30兵力\n📦 拖拽框选或Shift+点击多选己方星球，再点目标集体调兵/进攻（补给线连通即可）`;
        return tip;
    }

    function getDrawButtonState() {
        if(state.turn < 10){
            return { text: "战略机遇 (第10回合解锁)", disabled: true };
        }
        const remaining = 10 - (state.turn - state.lastDrawTurn);
        if(remaining <= 0){
            return { text: "战略机遇 (可用)", disabled: false };
        } else {
            return { text: `战略机遇 (冷却 ${remaining} 回合)`, disabled: true };
        }
    }

    function getWeaponStatusText() {
        const camp = getCampWeaponDef(state.playerCampKey);
        const myWeapons = state.weapons.filter(w=>w.camp===state.playerCampKey);

        if(state.deterrenceActive){
            return `终结手段已启动！剩余${state.deterrenceTurnsLeft}回合`;
        } else if(myWeapons.length === 0){
            return "武器状态：无";
        } else {
            if(camp.weaponType==='mobile'){
                const w = myWeapons[0];
                const planet = state.planets.find(p=>p.uid===w.planetId);
                return `${camp.lwName}：已建造 (位于${planet?planet.planetName:'?'})`;
            } else {
                return `${camp.lwName}：已部署${myWeapons.length}个`;
            }
        }
    }

    return {
        init,
        restart,
        resizeCanvas,
        render,
        nextTurn,
        buildWeapon,
        activateFinal,
        performStrategicDraw,
        randomizeEnemyStrength,
        getStrengthDisplayText,
        getTipsText,
        getDrawButtonState,
        getWeaponStatusText,
        getPublicState,
        getCampWeaponDef,
        setSendRatio,
        startSpectate,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    };
})();