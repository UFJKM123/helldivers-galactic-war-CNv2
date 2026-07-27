import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from "vue";
import { createGameEngine, type GameEngine } from "../game/GameEngine";
import type {
  CampKey,
  Difficulty,
  EngineCallbacks,
  GameMode,
  GameResult,
  MapSize,
  PublicGameState,
  RestartOptions,
} from "../game/types";
import { useI18n } from "../i18n";

const DEFAULT_OPTIONS: Required<RestartOptions> = {
  playerCampKey: "EARTH",
  difficulty: "normal",
  gameMode: "normal",
  mapSize: "large",
};

export function useGame() {
  const engine = shallowRef<GameEngine | null>(null);
  const canvas = ref<HTMLCanvasElement | null>(null);
  const state = ref<PublicGameState | null>(null);
  const eventQueue = ref<Array<{ title: string; message: string }>>([]);
  const result = ref<GameResult | null>(null);
  const errorMessage = ref("");
  const options = reactive<Required<RestartOptions>>({ ...DEFAULT_OPTIONS });
  const sendRatio = ref("1.0");
  const { language, setLanguage, t } = useI18n();

  const currentEvent = computed(() => eventQueue.value[0] ?? null);
  const selectedCount = computed(() => state.value?.selectedPlanets.length ?? 0);
  const selectedNames = computed(() => state.value?.selectedPlanets.map((planet) => planet.planetName).join("、") ?? "-");
  const selectedWeaponName = computed(() => {
    const selectedWeapon = state.value?.selectedWeapon;
    if (!selectedWeapon || !state.value) return "";
    return engine.value?.getCampWeaponDef(state.value.playerCampKey).lwName ?? "";
  });

  function updateState(nextState: PublicGameState): void {
    state.value = nextState;
  }

  function showEvent(title: string, message: string): void {
    eventQueue.value.push({ title, message });
  }

  function showResult(nextResult: GameResult): void {
    result.value = nextResult;
  }

  const callbacks: EngineCallbacks = {
    onEvent: showEvent,
    onGameEnd: showResult,
    onStateChange: updateState,
  };

  function runAction(action: () => { success?: boolean; msg?: string }): void {
    const actionResult = action();
    if (!actionResult.success && actionResult.msg) errorMessage.value = actionResult.msg;
    state.value = engine.value?.getPublicState() ?? state.value;
  }

  function restart(nextOptions: Partial<Required<RestartOptions>> = {}): void {
    Object.assign(options, nextOptions);
    sendRatio.value = "1.0";
    engine.value?.setSendRatio(sendRatio.value);
    engine.value?.restart(options);
    state.value = engine.value?.getPublicState() ?? state.value;
  }

  function initialize(canvasElement: HTMLCanvasElement): void {
    canvas.value = canvasElement;
    const nextEngine = createGameEngine();
    nextEngine.init(canvasElement, callbacks);
    engine.value = nextEngine;
    restart();
  }

  function resize(): void {
    engine.value?.resizeCanvas();
  }

  function setSendRatio(value: string): void {
    sendRatio.value = value;
    engine.value?.setSendRatio(value);
  }

  function nextTurn(): void {
    engine.value?.nextTurn();
  }

  function buildWeapon(): void {
    if (engine.value) runAction(() => engine.value!.buildWeapon());
  }

  function activateFinal(): void {
    if (engine.value) runAction(() => engine.value!.activateFinal());
  }

  function drawStrategicEvent(): void {
    if (engine.value) runAction(() => engine.value!.performStrategicDraw());
  }

  function randomizeEnemyStrength(): void {
    engine.value?.randomizeEnemyStrength();
    state.value = engine.value?.getPublicState() ?? state.value;
  }

  function closeEvent(): void {
    eventQueue.value.shift();
  }

  function closeResult(): void {
    result.value = null;
  }

  function startSpectate(): void {
    closeResult();
    engine.value?.startSpectate();
    state.value = engine.value?.getPublicState() ?? state.value;
  }

  function newGame(): void {
    closeResult();
    restart();
  }

  function handleMouseDown(event: MouseEvent): void {
    engine.value?.handleMouseDown(event);
  }

  function handleMouseMove(event: MouseEvent): void {
    engine.value?.handleMouseMove(event);
  }

  function handleMouseUp(event: MouseEvent): void {
    const actionResult = engine.value?.handleMouseUp(event);
    if (actionResult?.msg) errorMessage.value = actionResult.msg;
    state.value = engine.value?.getPublicState() ?? state.value;
  }

  function clearError(): void {
    errorMessage.value = "";
  }

  function getStrengthDisplay(): string {
    return engine.value?.getStrengthDisplayText() ?? "";
  }

  function getTips(): string {
    return engine.value?.getTipsText() ?? "";
  }

  function getWeaponStatus(): string {
    return engine.value?.getWeaponStatusText() ?? "";
  }

  function getDrawButtonState(): { text: string; disabled: boolean } {
    return engine.value?.getDrawButtonState() ?? { text: t("menu.strategic_opportunity"), disabled: true };
  }

  function handleLanguageChange(nextLanguage: string): void {
    setLanguage(nextLanguage);
  }

  onMounted(() => window.addEventListener("resize", resize));
  onUnmounted(() => window.removeEventListener("resize", resize));

  return {
    canvas,
    state,
    options,
    sendRatio,
    language,
    currentEvent,
    result,
    errorMessage,
    selectedCount,
    selectedNames,
    selectedWeaponName,
    initialize,
    restart,
    nextTurn,
    buildWeapon,
    activateFinal,
    drawStrategicEvent,
    randomizeEnemyStrength,
    closeEvent,
    closeResult,
    startSpectate,
    newGame,
    setSendRatio,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearError,
    getStrengthDisplay,
    getTips,
    getWeaponStatus,
    getDrawButtonState,
    handleLanguageChange,
    t,
  };
}

export type GameViewModel = ReturnType<typeof useGame>;
export type { CampKey, Difficulty, GameMode, MapSize };
