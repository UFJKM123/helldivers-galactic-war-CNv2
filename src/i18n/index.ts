import { computed, readonly, ref } from "vue";

export type Locale = "zh-cn" | "en-us";
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}
const MODULES = ["info", "menu", "event", "planet", "warning"] as const;

const language = ref<Locale>(getInitialLocale());
const translations = ref<TranslationTree>({});
const loading = ref(false);

function getInitialLocale(): Locale {
  const value = new URLSearchParams(window.location.search).get("lang");
  return value === "en-us" ? "en-us" : "zh-cn";
}

function lookup(path: string, tree: TranslationTree): string | undefined {
  const result = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, tree);
  return typeof result === "string" ? result : undefined;
}

async function loadLocale(locale: Locale): Promise<void> {
  loading.value = true;
  try {
    const entries = await Promise.all(
      MODULES.map(async (moduleName) => {
        const response = await fetch(`${import.meta.env.BASE_URL}lang/${locale}/${moduleName}.json`);
        if (!response.ok) throw new Error(`Unable to load ${moduleName} translations`);
        return [moduleName, (await response.json()) as TranslationTree] as const;
      }),
    );
    translations.value = Object.fromEntries(entries);
  } catch {
    if (locale !== "zh-cn") {
      await loadLocale("zh-cn");
    } else {
      translations.value = {};
    }
  } finally {
    loading.value = false;
  }
}

function t(path: string): string {
  return lookup(path, translations.value) ?? `[${path}]`;
}

function setLanguage(nextLanguage: string): void {
  const nextLocale: Locale = nextLanguage === "en-us" ? "en-us" : "zh-cn";
  if (nextLocale === language.value) return;

  const url = new URL(window.location.href);
  url.searchParams.set("lang", nextLocale);
  window.location.assign(url.toString());
}

export function useI18n() {
  const initialized = computed(() => Object.keys(translations.value).length > 0);
  return {
    language: readonly(language),
    loading: readonly(loading),
    initialized,
    t,
    setLanguage,
    loadLocale,
  };
}

export const localeReady = loadLocale(language.value);
