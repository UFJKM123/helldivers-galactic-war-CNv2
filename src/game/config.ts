import type {
  CampConfig,
  CampKey,
  MapConfig,
  StrategicEventPool,
} from "./types";
import { useI18n } from "../i18n";

export const CAMP_KEYS = ["EARTH", "TERM", "LIGHT", "ROBOT"] as const satisfies readonly CampKey[];
export const MAP_SIZES = {
  large: { planetTotal: 150, resourceCount: 15, linksPerPlanet: 5, canvasPad: 60, darkTurns: 50 },
  medium: { planetTotal: 100, resourceCount: 10, linksPerPlanet: 4, canvasPad: 80, darkTurns: 40 },
  small: { planetTotal: 60, resourceCount: 6, linksPerPlanet: 3, canvasPad: 100, darkTurns: 30 },
} satisfies Record<string, MapConfig>;

const { t } = useI18n();
const planetText = (key: string): string => t(`planet.${key}`);
const eventText = (key: string): string => t(`event.${key}`);

function createCamp(
  campKey: CampKey,
  color: string,
  weaponType: CampConfig["weaponType"],
  guardBonus: number,
  weaken: number,
  decay?: number,
): CampConfig {
  const key = campKey.toLowerCase();
  return {
    name: planetText(`camp_${key}_name`),
    color,
    homeName: planetText(`camp_${key}_home`),
    lwName: planetText(`camp_${key}_weapon`),
    finName: planetText(`camp_${key}_final`),
    weaponType,
    guardBonus,
    weaken,
    ...(decay === undefined ? {} : { decay }),
    victorySpeech: {
      conquest: eventText(`camp_${key}_victory_conquest`),
      deterrence: eventText(`camp_${key}_victory_deterrence`),
      defeat: eventText(`camp_${key}_victory_defeat`),
    },
    eliminationMessages: {
      defeated: eventText(`camp_${key}_eliminated`),
      eliminator: eventText(`camp_${key}_eliminator`),
    },
    homeFall: eventText(`camp_${key}_home_fall`),
  };
}

export const CAMPS = {
  EARTH: createCamp("EARTH", "#4499ff", "mobile", 20, 30),
  TERM: createCamp("TERM", "#ffcc22", "deploy", 20, 15, 5),
  LIGHT: createCamp("LIGHT", "#9944dd", "deploy", 20, 15, 5),
  ROBOT: createCamp("ROBOT", "#dd2222", "mobile", 20, 30),
} satisfies Record<CampKey, CampConfig>;

const EVENT_COUNTS: Record<CampKey, { negative: number; positive: number }> = {
  EARTH: { negative: 4, positive: 4 },
  TERM: { negative: 3, positive: 3 },
  LIGHT: { negative: 4, positive: 3 },
  ROBOT: { negative: 4, positive: 4 },
};

function createStrategicEvents(campKey: CampKey): StrategicEventPool {
  const key = campKey.toLowerCase();
  const counts = EVENT_COUNTS[campKey];
  return {
    negative: Array.from({ length: counts.negative }, (_, index) => index + 1).map((index) => ({
      title: eventText(`${key}_negative_${index}_title`),
      desc: eventText(`${key}_negative_${index}_desc`),
    })),
    positive: Array.from({ length: counts.positive }, (_, index) => index + 1).map((index) => ({
      title: eventText(`${key}_positive_${index}_title`),
      desc: eventText(`${key}_positive_${index}_desc`),
    })),
  };
}

export const STRATEGIC_EVENTS = {
  EARTH: createStrategicEvents("EARTH"),
  TERM: createStrategicEvents("TERM"),
  LIGHT: createStrategicEvents("LIGHT"),
  ROBOT: createStrategicEvents("ROBOT"),
} satisfies Record<CampKey, StrategicEventPool>;

export const PLANET_NAME_LIST = planetText("planet_names").split("|").filter(Boolean);
