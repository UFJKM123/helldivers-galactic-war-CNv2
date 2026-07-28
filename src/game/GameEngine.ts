// The original simulation is intentionally kept behavior-equivalent during the migration.
import { CAMPS, CAMP_KEYS, MAP_SIZES, PLANET_NAME_LIST, STRATEGIC_EVENTS } from "./config";
import { renderGalaxy } from "./CanvasRenderer";
import { useI18n } from "../i18n";
import { arePlanetsConnected } from "./rules/connectivity";
import { calculateScore, resolveCombat } from "./rules/combat";
import { getPowerByCamp } from "./rules/power";
import type {
    ActionResult,
    CampKey,
    Difficulty,
    EngineCallbacks,
    GameMode,
    GameResult,
    Link,
    MapConfig,
    MapSize,
    Planet,
    PublicGameState,
    RandomSource,
    RestartOptions,
    VictoryType,
    Weapon,
} from "./types";

export interface GameEngine {
    init(canvas: HTMLCanvasElement, callbacks?: EngineCallbacks): void;
    restart(options?: RestartOptions): void;
    resizeCanvas(): void;
    render(): void;
    nextTurn(): void;
    buildWeapon(): ActionResult;
    activateFinal(): ActionResult;
    performStrategicDraw(): ActionResult;
    randomizeEnemyStrength(): Record<CampKey, number>;
    getStrengthDisplayText(): string;
    getTipsText(): string;
    getDrawButtonState(): { text: string; disabled: boolean };
    getWeaponStatusText(): string;
    getPublicState(): PublicGameState;
    getCampWeaponDef(campKey: CampKey): (typeof CAMPS)[CampKey];
    setSendRatio(value: string): void;
    startSpectate(): void;
    handleMouseDown(event: MouseEvent): void;
    handleMouseMove(event: MouseEvent): void;
    handleMouseUp(event: MouseEvent): ActionResult | undefined;
}

interface InternalState {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    planets: Planet[];
    links: Link[];
    blockedLinks: Set<string>;
    playerCampKey: CampKey;
    difficulty: Difficulty;
    gameMode: GameMode;
    turn: number;
    selectedWeapon: Weapon | null;
    weapons: Weapon[];
    statKills: number;
    lastDrawTurn: number;
    aiStrengthFactors: Partial<Record<CampKey, number>>;
    deterrenceActive: boolean;
    deterrenceTurnsLeft: number;
    eliminationsTriggered: Set<CampKey>;
    maiaRiverTriggered: boolean;
    lastWeakCamp: CampKey | null;
    spectateMode: boolean;
    weakWarningTriggered: boolean;
    currentMapSize: MapSize;
    currentConfig: MapConfig;
    selectedPlanets: Planet[];
    eventQueue: unknown[];
    homeFallTriggered: Set<CampKey>;
    weaponMovedThisTurn: boolean;
    isMouseDown: boolean;
    dragStartX: number;
    dragStartY: number;
    hasDragged: boolean;
    boxStartX: number;
    boxStartY: number;
    boxEndX: number;
    boxEndY: number;
    sendRatio: number;
}

export function createGameEngine(random: RandomSource = Math.random): GameEngine {
    const { t } = useI18n();
    const translate = (key: string, values: Record<string, string | number> = {}): string => {
        let text = t(`warning.game_${key}`);
        Object.entries(values).forEach(([name, value]) => {
            text = text.replaceAll(`{${name}}`, String(value));
        });
        return text;
    };

    const state: InternalState = {
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
        currentConfig: MAP_SIZES.large,
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

    let callbacks: EngineCallbacks = {};

    function init(canvas: HTMLCanvasElement, cb: EngineCallbacks = {}) {
        state.canvas = canvas;
        state.ctx = canvas.getContext("2d");
        callbacks = { ...callbacks, ...cb };
        resizeCanvas();
    }

    function getDifficultyParams() {
        switch (state.difficulty) {
            case "easy": return { neutMin: 4, neutMax: 14, aiThreshold: 20, aiExtraGrowth: false };
            case "hard": return { neutMin: 12, neutMax: 38, aiThreshold: 5, aiExtraGrowth: true };
            default: return { neutMin: 6, neutMax: 22, aiThreshold: 10, aiExtraGrowth: false };
        }
    }

    function resizeCanvas() {
        if (!state.canvas || !state.ctx) return;
        const width = state.canvas.parentElement?.clientWidth || window.innerWidth - 340;
        const height = state.canvas.parentElement?.clientHeight || window.innerHeight;
        state.canvas.width = Math.max(1, width);
        state.canvas.height = Math.max(1, height);
        if(state.planets.length) render();
    }

    function restart(options: RestartOptions = {}) {
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
        const canvas = state.canvas;
        if (!canvas) return;
        const W = canvas.width, H = canvas.height, pad = state.currentConfig.canvasPad;
        const corners = [{x:pad,y:pad},{x:W-pad,y:pad},{x:pad,y:H-pad},{x:W-pad,y:H-pad}];
        const shuffled = [...CAMP_KEYS].sort(() => random() - 0.5);
        
        shuffled.forEach((ck,idx)=>{
            state.planets.push({
                x:corners[idx].x, y:corners[idx].y,
                camp:ck, originalCamp:ck, isHome:true, troop:70,
                planetName:CAMPS[ck].homeName,
                uid:random().toString(36).slice(2,10),
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
                isHome:false, troop:10, planetName:translate("maia_river_name"),
                uid:random().toString(36).slice(2,10), resource:false
            });
        }

        const diff = getDifficultyParams();
        let namePool = [...PLANET_NAME_LIST].sort(()=>random()-0.5);
        const totalNormal = state.currentConfig.planetTotal - 5;
        const resourceIndices = new Set();
        while(resourceIndices.size < state.currentConfig.resourceCount){
            resourceIndices.add(Math.floor(random()*totalNormal));
        }

        for(let i=0;i<totalNormal;i++){
            let x = 0;
            let y = 0;
            do{
                x = pad + random()*(W-pad*2);
                y = pad + random()*(H-pad*2);
            } while(state.planets.some(p=>Math.hypot(p.x-x,p.y-y)<40));
            
            const initT = Math.floor(random()*(diff.neutMax-diff.neutMin)) + diff.neutMin;
            const pname = namePool.shift() ?? translate("planet_name_fallback", { index: i });
            state.planets.push({
                x, y, camp:null, originalCamp:null,
                isHome:false, troop:initT, planetName:pname,
                uid:random().toString(36).slice(2,10),
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
        // 第一步：确保每个星球至少有一条航道
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

        // 第二步：BFS 找出所有连通分量，确保整个星图连通
        const visited = new Set<string>();
        const components: Planet[][] = [];

        state.planets.forEach(p=>{
            if(visited.has(p.uid)) return;
            const component: Planet[] = [];
            const queue = [p];
            visited.add(p.uid);
            while(queue.length > 0){
                const current = queue.shift()!;
                component.push(current);
                state.links.forEach(l=>{
                    if(l.a.uid===current.uid && !visited.has(l.b.uid)){
                        visited.add(l.b.uid);
                        queue.push(l.b);
                    } else if(l.b.uid===current.uid && !visited.has(l.a.uid)){
                        visited.add(l.a.uid);
                        queue.push(l.a);
                    }
                });
            }
            components.push(component);
        });

        // 如果有多个连通分量，用最短距离的边连接它们
        for(let i=1; i<components.length; i++){
            let bestDist = Infinity;
            let bestA: Planet | null = null;
            let bestB: Planet | null = null;
            components[0].forEach(a=>{
                components[i].forEach(b=>{
                    const d = Math.hypot(a.x-b.x, a.y-b.y);
                    if(d < bestDist){ bestDist = d; bestA = a; bestB = b; }
                });
            });
            if(bestA && bestB){
                const idPair = [bestA.uid, bestB.uid].sort().join("_");
                if(!state.links.some(l=>l.idPair===idPair)){
                    state.links.push({a: bestA, b: bestB, idPair});
                }
                components[0].push(...components[i]);
            }
        }
    }

    function render() {
        if (!state.ctx || !state.canvas) return;
        renderGalaxy(state.ctx, {
            width: state.canvas.width,
            height: state.canvas.height,
            links: state.links,
            planets: state.planets,
            weapons: state.weapons,
            blockedLinks: state.blockedLinks,
            selectedPlanets: state.selectedPlanets,
            selectedWeapon: state.selectedWeapon,
            isMouseDown: state.isMouseDown,
            hasDragged: state.hasDragged,
            boxStartX: state.boxStartX,
            boxStartY: state.boxStartY,
            boxEndX: state.boxEndX,
            boxEndY: state.boxEndY,
        });
    }

    function getCampWeaponDef(campKey: CampKey) {
        return CAMPS[campKey];
    }

    function buildWeapon() {
        if(state.spectateMode) return { success:false, msg:translate("spectate_unavailable") };

        const camp = getCampWeaponDef(state.playerCampKey);
        const planet = state.selectedPlanets.length===1 ? state.selectedPlanets[0] : null;

        if(!planet || planet.camp !== state.playerCampKey){
            return { success:false, msg:translate("select_friendly_planet") };
        }

        if(camp.weaponType === 'mobile'){
            if(state.weapons.some(w=>w.camp===state.playerCampKey && w.type==='mobile')){
                return { success:false, msg:translate("weapon_built", { weapon: camp.lwName }) };
            }
            if(planet.troop < 180) return { success:false, msg:translate("need_troops", { amount: 180 }) };
            
            planet.troop -= 180;
            state.weapons.push({
                id: random().toString(36).slice(2,8),
                camp: state.playerCampKey,
                type: 'mobile',
                planetId: planet.uid,
                guardBonus: camp.guardBonus,
                weaken: camp.weaken,
                decay: 0
            });
        } else {
            if(planet.troop < 150) return { success:false, msg:translate("need_troops", { amount: 150 }) };
            const existingCount = state.weapons.filter(w=>
                w.camp===state.playerCampKey && w.planetId===planet.uid
            ).length;
            if(existingCount >= 4){
                return { success:false, msg:translate("planet_weapon_limit", { weapon: camp.lwName }) };
            }
            planet.troop -= 150;
            state.weapons.push({
                id: random().toString(36).slice(2,8),
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

    function findWeaponAtPos(mx: number, my: number): Weapon | null {
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

    function arePlayerPlanetsConnected(a: Planet, b: Planet): boolean {
        return arePlanetsConnected(state.links, state.blockedLinks, state.playerCampKey, a, b);
    }

    function handleMouseDown(e: MouseEvent) {
        if(state.spectateMode) return;
        if(e.button !== 0) return;
        const canvas = state.canvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        state.dragStartX = e.clientX - rect.left;
        state.dragStartY = e.clientY - rect.top;
        state.boxStartX = state.boxEndX = state.dragStartX;
        state.boxStartY = state.boxEndY = state.dragStartY;
        state.isMouseDown = true;
        state.hasDragged = false;
    }

    function handleMouseMove(e: MouseEvent) {
        if(!state.isMouseDown || state.spectateMode) return;
        const canvas = state.canvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
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

    function handleMouseUp(e: MouseEvent): ActionResult | undefined {
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

    function handleCanvasClick(evt: MouseEvent): ActionResult | undefined {
        if(state.spectateMode) return;
        const canvas = state.canvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
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

    function handleWeaponMove(targetPlanet: Planet): ActionResult {
        // 只允许移动型武器移动
        const weapon = state.selectedWeapon;
        if (!weapon) return { success: false };
        if(weapon.type !== 'mobile'){
            state.selectedWeapon = null;
            render();
            return { success:false, msg:translate("mobile_weapon_immobile") };
        }
        if(state.weaponMovedThisTurn){
            state.selectedWeapon = null;
            render();
            return { success:false, msg:translate("weapon_already_moved") };
        }

        // 移动到任意星球，不再检查相邻
        weapon.planetId = targetPlanet.uid;
        // 修复bug：仅对非己方星球扣20兵力
        if(targetPlanet.camp !== weapon.camp) {
            targetPlanet.troop = Math.max(1, targetPlanet.troop - 20);
        }
        state.weaponMovedThisTurn = true;
        state.selectedWeapon = null;
        state.selectedPlanets = [];
        render();
        return { success:true };
    }

    function handleSinglePlanetAction(target: Planet): ActionResult {
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

    function handleMultiPlanetAction(target: Planet): ActionResult {
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

    function moveTroops(from: Planet, to: Planet): ActionResult {
        const ratio = getSendRatio();
        const sendTroop = Math.floor(from.troop * ratio);
        if(sendTroop <= 0) return { success:false };
        from.troop -= sendTroop;
        to.troop += sendTroop;
        return { success:true };
    }

    function executeAttack(from: Planet, to: Planet): void {
        const ratio = getSendRatio();
        let attackTroop = Math.floor(from.troop * ratio);
        from.troop -= attackTroop;
        const oldCamp = to.camp;
        const attackingCamp = from.camp;
        if (!attackingCamp) return;

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
            to.camp = attackingCamp;
            to.troop = result;
            onPlanetCaptured(to, oldCamp, attackingCamp);
            checkConquestWin();
        } else {
            state.statKills += Math.min(attackTroop, to.troop);
            to.troop = Math.max(1, to.troop - attackTroop);
        }
    }

    function onPlanetCaptured(planet: Planet, oldCamp: CampKey | null, newCamp: CampKey, isPlayerAction: boolean = true) {
        if(planet.planetName === translate("maia_river_name") && oldCamp === "EARTH" && newCamp === "ROBOT" && !state.maiaRiverTriggered){
            state.maiaRiverTriggered = true;
            triggerEvent(translate("maia_river_defeat_title"), translate("maia_river_defeat_message"));
        }
        if(planet.isHome && isPlayerAction){
            if(newCamp===state.playerCampKey && oldCamp!==state.playerCampKey){
                triggerEvent(translate("enemy_home_captured_title"), translate("enemy_home_captured_message", { planet: planet.planetName }));
                // 标记已触发，避免回合末 checkHomeFallEvents 重复弹出 home_fall_title
                if(planet.originalCamp) state.homeFallTriggered.add(planet.originalCamp);
            }
        }
        checkEliminations();
    }

    function checkEliminations() {
        CAMP_KEYS.forEach(ck=>{
            if(state.planets.filter(p=>p.camp===ck).length===0 && !state.eliminationsTriggered.has(ck)){
                state.eliminationsTriggered.add(ck);
                if(ck !== state.playerCampKey){
                    triggerEvent(translate("faction_eliminated"), CAMPS[ck].eliminationMessages.defeated);
                }
            }
        });
    }

    function checkHomeFallEvents() {
        state.planets.forEach(p=>{
            if(p.isHome && p.originalCamp && !state.homeFallTriggered.has(p.originalCamp)){
                if(p.camp !== p.originalCamp){
                    state.homeFallTriggered.add(p.originalCamp);
                    if(p.originalCamp === state.playerCampKey){
                        // AI 占领了玩家母星
                        triggerEvent(translate("home_lost_title"), translate("home_lost_message", { planet: p.planetName }));
                    } else {
                        // AI 之间的母星沦陷
                        triggerEvent(translate("home_fall_title"), CAMPS[p.originalCamp].homeFall);
                    }
                }
            }
        });
    }

    function checkConquestWin() {
        const hasEnemyPlanet = state.planets.some(p=> p.camp && p.camp !== state.playerCampKey);
        if(!hasEnemyPlanet){
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

    function setSendRatio(val: string) {
        state.sendRatio = parseFloat(val || "1.0");
    }

    function performStrategicDraw() {
        if(state.spectateMode) return { success:false, msg:translate("strategic_unavailable") };
        if(state.turn < 10) return { success:false, msg:translate("strategic_locked") };
        if(state.turn - state.lastDrawTurn < 10){
            return { success:false, msg:translate("strategic_cooldown", { turns: 10 - (state.turn - state.lastDrawTurn) }) };
        }

        const myPlanets = state.planets.filter(p=>p.camp===state.playerCampKey && p.troop>=30);
        if(myPlanets.length === 0) return { success:false, msg:translate("no_planet_troops") };

        const payer = myPlanets[Math.floor(random()*myPlanets.length)];
        payer.troop -= 30;

        const campEvents = STRATEGIC_EVENTS[state.playerCampKey];
        const isPositive = random() < 0.5;
        const pool = isPositive ? campEvents.positive : campEvents.negative;
        const event = pool[Math.floor(random()*pool.length)];

        const targetPlanet = state.planets.filter(p=>p.camp===state.playerCampKey)
            [Math.floor(random()*state.planets.filter(p=>p.camp===state.playerCampKey).length)];
        if(!targetPlanet) return { success:false };

        const effectAmt = isPositive
            ? Math.floor(random()*50) + 50
            : Math.floor(random()*20) + 5;
        
        if(isPositive) targetPlanet.troop += effectAmt;
        else targetPlanet.troop = Math.max(1, targetPlanet.troop - effectAmt);

        state.lastDrawTurn = state.turn;
        const finalDesc = event.desc.replace(/{planet}/g, targetPlanet.planetName);
        const change = isPositive ? `+${effectAmt}` : `-${effectAmt}`;

        triggerEvent(
            translate("strategic_title", { title: event.title, result: isPositive ? translate("positive") : translate("negative") }),
            translate("strategic_details", { description: finalDesc, planet: targetPlanet.planetName, change, troops: targetPlanet.troop })
        );

        render();
        return { success:true };
    }

    function randomizeEnemyStrength(): Record<CampKey, number> {
        const enemyCamps = CAMP_KEYS.filter(ck=>ck !== state.playerCampKey);
        state.aiStrengthFactors = {};
        enemyCamps.forEach(ck=>{
            state.aiStrengthFactors[ck] = Math.floor(random()*4);
        });
        triggerEvent(translate("random_strength_title"), translate("random_strength_message"));
        return { ...state.aiStrengthFactors } as Record<CampKey, number>;
    }

    function getStrengthDisplayText() {
        const enemyCamps = CAMP_KEYS.filter(ck=>ck !== state.playerCampKey);
        if(Object.keys(state.aiStrengthFactors).length===0 || enemyCamps.every(ck=>!state.aiStrengthFactors[ck])){
            return translate("strength_unassigned");
        }
        let text = `${translate("strength_prefix")} `;
        enemyCamps.forEach(ck=>{
            text += `${CAMPS[ck].name}+${state.aiStrengthFactors[ck]||0} `;
        });
        return text;
    }

    function aiActionNeutralOnly(campKey: CampKey, threshold: number): void {
        const aiPlanets = state.planets.filter(p=>p.camp===campKey);
        aiPlanets.forEach(ownPlanet => {
            if(ownPlanet.troop < threshold) return;
            const targets: Planet[] = [];
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
                    id: random().toString(36).slice(2,8),
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
                            id: random().toString(36).slice(2,8),
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
                            id: random().toString(36).slice(2,8),
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

    function aiTransferTroops(campKey: CampKey): void {
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
            let bestTargetUid: string | null = null, bestDist = Infinity;
            frontPlanets.forEach(fp=>{
                const ln = state.links.find(l=>
                    (l.a.uid===p.uid && l.b.uid===fp.uid) ||
                    (l.b.uid===p.uid && l.a.uid===fp.uid)
                );
                if(ln && !state.blockedLinks.has(ln.idPair)){
                    const d = Math.hypot(p.x-fp.x, p.y-fp.y);
                    if(d < bestDist){ bestDist = d; bestTargetUid = fp.uid; }
                }
            });
            const bestTarget = bestTargetUid
                ? frontPlanets.find((planet) => planet.uid === bestTargetUid)
                : undefined;
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
        const selectedTargets = neutralPlanets.sort(()=>random()-0.5).slice(0, targetCount);
        const avgTroop = Math.floor(assaultPower / targetCount);

        selectedTargets.forEach(p=>{ p.camp = "LIGHT"; p.troop = avgTroop; });
        const lightHome = state.planets.find(p=>p.isHome && p.camp==="LIGHT");
        if(lightHome) lightHome.troop += Math.floor(assaultPower * 0.3);

        triggerEvent(translate("light_assault_title"), translate("light_assault_message"));
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
                state.planets.forEach(p=>{ if(p.camp===ck) p.troop += state.aiStrengthFactors[ck] ?? 0; });
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

    function aiAction(ownPlanet: Planet, threshold: number, onlyCamp: CampKey | null = null): void {
        if(ownPlanet.troop < threshold) return;

        let targets: Planet[] = [];
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
        const attackingCamp = ownPlanet.camp;
        if (!attackingCamp) return;
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
            target.camp = attackingCamp;
            target.troop = res;
            onPlanetCaptured(target, oldCamp, attackingCamp, false);
            checkConquestWin();
            if(!state.spectateMode) checkDefeat();
        } else {
            target.troop = Math.max(1, target.troop - send);
        }
    }

    function checkPowerBalance() {
        if(state.turn <= 40 || state.weakWarningTriggered) return;
        const power = getPowerByCamp(state.planets, CAMP_KEYS);
        CAMP_KEYS.forEach(ck=>{
            power[ck] = state.planets.filter(p=>p.camp===ck).reduce((s,p)=>s+p.troop, 0);
        });
        const entries = Object.entries(power).filter(([k,v])=>v>0 && k!==state.playerCampKey);
        if(entries.length===0) return;

        const playerPower = power[state.playerCampKey] || 0;
        if(entries.every(([_,v])=>v > playerPower * 1.5)){
            state.weakWarningTriggered = true;
            triggerEvent(translate("power_weak_title"), translate("power_weak_message"));
        }
    }

    function activateFinal() {
        if(state.spectateMode) return { success:false, msg:translate("final_unavailable") };
        if(state.deterrenceActive) return { success:false, msg:translate("final_already_active") };

        const camp = getCampWeaponDef(state.playerCampKey);
        if(!state.weapons.some(w=>w.camp===state.playerCampKey)){
            return { success:false, msg:translate("final_need_weapon", { weapon: camp.lwName }) };
        }

        const planet = state.selectedPlanets.length===1 ? state.selectedPlanets[0] : null;
        if(!planet || planet.camp !== state.playerCampKey){
            return { success:false, msg:translate("final_select_planet") };
        }
        if(planet.troop < 400) return { success:false, msg:translate("need_troops", { amount: 400 }) };

        planet.troop -= 400;
        state.deterrenceActive = true;
        state.deterrenceTurnsLeft = 5;
        triggerEvent(translate("final_started_title"), translate("final_started_message"));

        render();
        return { success:true };
    }

    function endGame(victoryType: VictoryType): void {
        if(state.spectateMode) return;
        const camp = CAMPS[state.playerCampKey];
        const playerOwned = state.planets.filter(p=>p.camp===state.playerCampKey).length;
        const scoreRaw = calculateScore(playerOwned, state.statKills, state.turn);

        let title = "", resultText = "", campMessage = "";
        if(victoryType === "conquest"){
            title = translate("conquest_title");
            resultText = translate("conquest_result");
            campMessage = camp.victorySpeech.conquest;
        } else if(victoryType === "deterrence"){
            title = translate("deterrence_title");
            resultText = translate("deterrence_result");
            campMessage = camp.victorySpeech.deterrence;
        } else {
            title = translate("defeat_title");
            resultText = translate("defeat_result");
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

    function triggerEvent(title: string, message: string): void {
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
            planets: [...state.planets],
            links: [...state.links],
            selectedPlanets: [...state.selectedPlanets],
            selectedWeapon: state.selectedWeapon,
            weapons: [...state.weapons],
            deterrenceActive: state.deterrenceActive,
            deterrenceTurnsLeft: state.deterrenceTurnsLeft,
            spectateMode: state.spectateMode,
            statKills: state.statKills,
            sendRatio: state.sendRatio,
            gameMode: state.gameMode,
            difficulty: state.difficulty,
            mapSize: state.currentMapSize,
        };
    }

    function getTipsText() {
        const camp = CAMPS[state.playerCampKey];
        const tipKey = camp.weaponType === "mobile" ? "tips_mobile" : "tips_deploy";
        return translate(tipKey, { camp: camp.name, weapon: camp.lwName, final: camp.finName }) + translate("tips_common");
    }

    function getDrawButtonState() {
        if(state.turn < 10){
            return { text: translate("draw_locked"), disabled: true };
        }
        const remaining = 10 - (state.turn - state.lastDrawTurn);
        if(remaining <= 0){
            return { text: translate("draw_available"), disabled: false };
        } else {
            return { text: translate("draw_cooldown", { turns: remaining }), disabled: true };
        }
    }

    function getWeaponStatusText() {
        const camp = getCampWeaponDef(state.playerCampKey);
        const myWeapons = state.weapons.filter(w=>w.camp===state.playerCampKey);

        if(state.deterrenceActive){
            return translate("deterrence_status", { turns: state.deterrenceTurnsLeft });
        } else if(myWeapons.length === 0){
            return translate("weapon_status_none");
        } else {
            if(camp.weaponType==='mobile'){
                const w = myWeapons[0];
                const planet = state.planets.find(p=>p.uid===w.planetId);
                return translate("weapon_status_built", { weapon: camp.lwName, planet: planet?.planetName ?? "?" });
            } else {
                return translate("weapon_status_deployed", { weapon: camp.lwName, count: myWeapons.length });
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
        handleMouseUp,
    };
}
