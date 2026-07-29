<script setup lang="ts">
import { ref, computed } from "vue";
import type { GameViewModel } from "../composables/useGame";
import { CAMPS, CAMP_KEYS } from "../game/config";
import type { CampKey } from "../game/types";

const props = defineProps<{ game: GameViewModel }>();
const { t } = props.game as GameViewModel & { t?: (path: string) => string };
const campOptions = [
  ["EARTH", "menu.camp_earth"],
  ["TERM", "menu.camp_term"],
  ["LIGHT", "menu.camp_light"],
  ["ROBOT", "menu.camp_robot"],
] as const;

const showStats = ref(false);
const showStrengthDialog = ref(false);
const strengthInputs = ref<Record<string, number>>({});

interface FactionStat {
  campKey: CampKey | null;
  campName: string;
  color: string;
  planetCount: number;
  troopCount: number;
}

const factionStats = computed<FactionStat[]>(() => {
  const planets = props.game.state.value?.planets ?? [];
  const stats: FactionStat[] = [];
  CAMP_KEYS.forEach((ck) => {
    const campPlanets = planets.filter((p) => p.camp === ck);
    stats.push({
      campKey: ck,
      campName: CAMPS[ck].name,
      color: CAMPS[ck].color,
      planetCount: campPlanets.length,
      troopCount: campPlanets.reduce((sum, p) => sum + p.troop, 0),
    });
  });
  const neutralPlanets = planets.filter((p) => p.camp === null);
  if (neutralPlanets.length > 0) {
    stats.push({
      campKey: null,
      campName: "中立",
      color: "#888888",
      planetCount: neutralPlanets.length,
      troopCount: neutralPlanets.reduce((sum, p) => sum + p.troop, 0),
    });
  }
  return stats;
});

const enemyCampKeys = computed(() =>
  CAMP_KEYS.filter((ck) => ck !== props.game.options.playerCampKey)
);

function openStrengthDialog() {
  const inputs: Record<string, number> = {};
  enemyCampKeys.value.forEach((ck) => {
    inputs[ck] = 0;
  });
  strengthInputs.value = inputs;
  showStrengthDialog.value = true;
}

function confirmStrength() {
  const success = props.game.setStrengthFactors(strengthInputs.value);
  if (success) {
    showStrengthDialog.value = false;
  }
}
</script>

<template>
  <aside class="ui-panel">
    <div class="ui-content">
      <h1>{{ t?.("info.title") ?? "绝地潜兵银河战争" }}</h1>
      <div class="xdisplay">
        <label class="info-line" for="language-select">{{ props.game.language.value === "en-us" ? "Language" : "Language" }}</label>
        <select id="language-select" :value="props.game.language.value" @change="props.game.handleLanguageChange(($event.target as HTMLSelectElement).value)">
          <option value="zh-cn">简体中文</option>
          <option value="en-us">English</option>
        </select>
      </div>

      <div class="info-line"><label for="camp-select">{{ t?.("menu.choose_camp") ?? "选择操控阵营：" }}</label></div>
      <select id="camp-select" v-model="props.game.options.playerCampKey" @change="props.game.restart()">
        <option v-for="[value, label] in campOptions" :key="value" :value="value">{{ t?.(label) ?? CAMPS[value].name }}</option>
      </select>
      <div class="xdisplay">
        <label class="info-line" for="map-size-select">{{ t?.("menu.map_size") ?? "星图规模：" }}</label>
        <select id="map-size-select" v-model="props.game.options.mapSize" @change="props.game.restart()">
          <option value="large">{{ t?.("menu.size_large") ?? "大" }}</option>
          <option value="medium">{{ t?.("menu.size_medium") ?? "中" }}</option>
          <option value="small">{{ t?.("menu.size_small") ?? "小" }}</option>
        </select>
      </div>
      <div class="mode-diff-row">
        <div class="mode-diff-col">
          <div class="info-line"><label for="game-mode-select">{{ t?.("menu.game_mode") ?? "游戏模式：" }}</label></div>
          <select id="game-mode-select" v-model="props.game.options.gameMode" @change="props.game.restart()">
            <option value="normal">{{ t?.("menu.game_mode_normal") ?? "普通模式" }}</option>
            <option value="light_assault">{{ t?.("menu.game_mode_illuminate_assault") ?? "光能突袭" }}</option>
            <option value="democracy_dark">{{ t?.("menu.game_mode_democracy_obscured") ?? "迟来介入" }}</option>
          </select>
        </div>
        <div class="mode-diff-col">
          <div class="info-line"><label for="difficulty-select">{{ props.game.language.value === "zh-cn" ? "难度：" : "Difficulty:" }}</label></div>
          <select id="difficulty-select" v-model="props.game.options.difficulty" @change="props.game.restart()">
            <option value="easy">{{ t?.("menu.difficulty_select_easy") ?? "简单" }}</option>
            <option value="normal">{{ t?.("menu.difficulty_select_normal") ?? "一般" }}</option>
            <option value="hard">{{ t?.("menu.difficulty_select_hard") ?? "困难" }}</option>
          </select>
        </div>
      </div>
      <div class="diff-row">
        <button class="btn-deploy" @click="props.game.randomizeEnemyStrength">{{ t?.("menu.random_intensity") ?? "随机强度" }}</button>
        <button class="btn-deploy" @click="openStrengthDialog">{{ t?.("menu.set_strength") ?? "设定强度" }}</button>
      </div>
      <div class="info-line strength-display">{{ props.game.getStrengthDisplay() }}</div>
      <button @click="props.game.restart()">{{ t?.("menu.restart_campaign") ?? "重新开局" }}</button>

      <hr />
      <div class="info-line">{{ t?.("menu.turn_number_display") ?? "回合：" }} <span>{{ props.game.state.value?.turn ?? 1 }}</span></div>
      <div class="info-line">{{ t?.("menu.selected_object_display") ?? "选中对象：" }} <span>{{ props.game.selectedCount.value }}</span></div>
      <div class="info-line">{{ t?.("menu.planet_name_display") ?? "星球名称：" }} <span>{{ props.game.selectedNames.value }}</span></div>
      <div class="stats-toggle" @click="showStats = !showStats">
        <span class="stats-toggle-icon">{{ showStats ? "▾" : "▸" }}</span>
        <span>{{ t?.("menu.faction_stats") ?? "阵营统计" }}</span>
      </div>
      <div v-if="showStats" class="stats-panel">
        <div class="stat-row stat-header">
          <span class="stat-color-placeholder"></span>
          <span class="stat-name"></span>
          <span class="stat-planets">{{ t?.("menu.stats_planets") ?? "星球" }}</span>
          <span class="stat-troops">{{ t?.("menu.stats_troops") ?? "兵力" }}</span>
        </div>
        <div v-for="stat in factionStats" :key="stat.campKey ?? 'neutral'" class="stat-row">
          <span class="stat-color" :style="{ background: stat.color }"></span>
          <span class="stat-name">{{ stat.campName }}</span>
          <span class="stat-planets">{{ stat.planetCount }}</span>
          <span class="stat-troops">{{ stat.troopCount.toLocaleString() }}</span>
        </div>
      </div>
      <div class="send-selector">
        <label for="send-ratio-select">{{ t?.("menu.deployment_ratio") ?? "派兵比例：" }}</label>
        <select id="send-ratio-select" :value="props.game.sendRatio.value" @change="props.game.setSendRatio(($event.target as HTMLSelectElement).value)">
          <option value="0.5">{{ t?.("menu.deployment_ratio_50%_troops") ?? "50% 兵力" }}</option>
          <option value="1.0">{{ t?.("menu.deployment_ratio_all_troops") ?? "全部兵力" }}</option>
        </select>
      </div>

      <hr />
      <div class="info-line"><b>{{ t?.("menu.armament_directive") ?? "军备指令" }}</b></div>
      <button class="btn-weapon" @click="props.game.buildWeapon">{{ t?.("menu.construct_heavy_weapons") ?? "建造大型武器" }}</button>
      <button class="btn-endgame" @click="props.game.activateFinal">{{ t?.("menu.initiate_final_measure") ?? "启动终结手段" }}</button>
      <div class="info-line">{{ props.game.getWeaponStatus() }}</div>
      <div v-if="props.game.state.value?.deterrenceActive" class="deterrence-status">威慑期间我方兵力停止增长，剩余 {{ props.game.state.value.deterrenceTurnsLeft }} 回合</div>

      <hr />
      <button class="btn-deploy" :disabled="props.game.getDrawButtonState().disabled" @click="props.game.drawStrategicEvent">{{ props.game.getDrawButtonState().text }}</button>
      <div class="tips">{{ t?.("menu.strategic_opportunity_note") ?? "消耗30兵力，每10回合可发动一次" }}</div>
      <hr />
      <button class="btn-turn" @click="props.game.nextTurn">{{ t?.("menu.end_turn") ?? "结束回合" }}</button>
      <div class="tips">{{ props.game.getTips() }}</div>
    </div>
    <div class="signature">
      <div>{{ t?.("info.developer") ?? "作者" }}</div>
      <div class="xdisplay">
        <a href="https://github.com/UFJKM123/helldivers-galactic-war-CNv2">Github</a>
        <div>{{ t?.("info.version") ?? "版本" }}</div>
      </div>
    </div>
  </aside>

  <!-- 设定强度弹窗 -->
  <div v-if="showStrengthDialog" class="modal" role="dialog" aria-modal="true" @click.self="showStrengthDialog = false">
    <div class="modal-box strength-modal">
      <h2>{{ t?.("menu.set_strength_title") ?? "设定阵营强度" }}</h2>
      <p class="strength-hint">{{ t?.("menu.set_strength_hint") ?? "每个阵营每回合额外增加的兵力值" }}</p>
      <div v-for="ck in enemyCampKeys" :key="ck" class="strength-input-row">
        <span class="stat-color" :style="{ background: CAMPS[ck].color }"></span>
        <span class="strength-label">{{ CAMPS[ck].name }}</span>
        <input type="number" min="0" max="99" v-model.number="strengthInputs[ck]" class="strength-input" />
      </div>
      <div class="strength-buttons">
        <button class="btn-weapon" @click="confirmStrength">{{ t?.("menu.confirm_note") ?? "确定" }}</button>
        <button class="btn-deploy" @click="showStrengthDialog = false">{{ t?.("menu.cancel") ?? "取消" }}</button>
      </div>
    </div>
  </div>
</template>
