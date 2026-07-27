export type CampKey = "EARTH" | "TERM" | "LIGHT" | "ROBOT";
export type Difficulty = "easy" | "normal" | "hard";
export type GameMode = "normal" | "light_assault" | "democracy_dark";
export type MapSize = "large" | "medium" | "small";
export type WeaponType = "mobile" | "deploy";
export type VictoryType = "conquest" | "deterrence" | "defeat";

export interface Planet {
  x: number;
  y: number;
  camp: CampKey | null;
  originalCamp: CampKey | null;
  isHome: boolean;
  troop: number;
  planetName: string;
  uid: string;
  resource: boolean;
}

export interface Link {
  a: Planet;
  b: Planet;
  idPair: string;
}

export interface Weapon {
  id: string;
  camp: CampKey;
  type: WeaponType;
  planetId: string;
  guardBonus: number;
  weaken: number;
  decay: number;
}

export interface MapConfig {
  planetTotal: number;
  resourceCount: number;
  linksPerPlanet: number;
  canvasPad: number;
  darkTurns: number;
}

export interface CampConfig {
  name: string;
  color: string;
  homeName: string;
  lwName: string;
  finName: string;
  weaponType: WeaponType;
  guardBonus: number;
  weaken: number;
  decay?: number;
  victorySpeech: Record<"conquest" | "deterrence" | "defeat", string>;
  eliminationMessages: Record<"defeated" | "eliminator", string>;
  homeFall: string;
}

export interface StrategicEvent {
  title: string;
  desc: string;

}

export interface StrategicEventPool {
  negative: StrategicEvent[];
  positive: StrategicEvent[];
}

export interface RestartOptions {
  playerCampKey?: CampKey;
  difficulty?: Difficulty;
  gameMode?: GameMode;
  mapSize?: MapSize;
}

export interface EngineCallbacks {
  onEvent?: (title: string, message: string) => void;
  onGameEnd?: (result: GameResult) => void;
  onStateChange?: (state: PublicGameState) => void;
}

export interface GameResult {
  title: string;
  resultText: string;
  campMessage: string;
  planetCount: number;
  kills: number;
  turns: number;
  score: number;
  isDefeat: boolean;
}

export interface PublicGameState {
  turn: number;
  playerCampKey: CampKey;
  planets: Planet[];
  links: Link[];
  selectedPlanets: Planet[];
  selectedWeapon: Weapon | null;
  weapons: Weapon[];
  deterrenceActive: boolean;
  deterrenceTurnsLeft: number;
  spectateMode: boolean;
  statKills: number;
  sendRatio: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  mapSize: MapSize;
}

export interface ActionResult {
  success?: boolean;
  msg?: string;
  type?: string;
  planets?: Planet[];
  planet?: Planet;
  weapon?: Weapon;
}

export interface DrawButtonState {
  text: string;
  disabled: boolean;
}

export interface RandomSource {
  (): number;
}

export interface CanvasSize {
  width: number;
  height: number;
}
