<script setup lang="ts">
import type { GameViewModel } from "../composables/useGame";
import { CAMPS } from "../game/config";

const props = defineProps<{ game: GameViewModel }>();
const { t } = props.game as GameViewModel & { t?: (path: string) => string };
const campOptions = [
  ["EARTH", "menu.camp_earth"],
  ["TERM", "menu.camp_term"],
  ["LIGHT", "menu.camp_light"],
  ["ROBOT", "menu.camp_robot"],
] as const;
</script>

<template>
  <aside class="ui-panel">
    <div class="ui-content">
      <h1>{{ t?.("info.title") ?? "绝地潜兵银河战争" }}</h1>
      <div class="xdisplay">
        <label class="info-line" for="language-select">{{ props.game.language.value === "en-us" ? "Language" : "语言" }}</label>
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
      <div class="info-line"><label for="game-mode-select">{{ t?.("menu.game_mode") ?? "游戏模式：" }}</label></div>
      <select id="game-mode-select" v-model="props.game.options.gameMode" @change="props.game.restart()">
        <option value="normal">{{ t?.("menu.game_mode_normal") ?? "普通模式" }}</option>
        <option value="light_assault">{{ t?.("menu.game_mode_illuminate_assault") ?? "光能突袭" }}</option>
        <option value="democracy_dark">{{ t?.("menu.game_mode_democracy_obscured") ?? "迟来介入" }}</option>
      </select>
      <div class="diff-row">
        <label class="sr-only" for="difficulty-select">{{ t?.("menu.difficulty_select_normal") ?? "难度" }}</label>
        <select id="difficulty-select" v-model="props.game.options.difficulty" @change="props.game.restart()">
          <option value="easy">{{ t?.("menu.difficulty_select_easy") ?? "简单" }}</option>
          <option value="normal">{{ t?.("menu.difficulty_select_normal") ?? "一般" }}</option>
          <option value="hard">{{ t?.("menu.difficulty_select_hard") ?? "困难" }}</option>
        </select>
        <button class="btn-deploy" @click="props.game.randomizeEnemyStrength">{{ t?.("menu.random_intensity") ?? "随机强度" }}</button>
      </div>
      <div class="info-line strength-display">{{ props.game.getStrengthDisplay() }}</div>
      <button @click="props.game.restart()">{{ t?.("menu.restart_campaign") ?? "重新开局" }}</button>

      <hr />
      <div class="info-line">{{ t?.("menu.turn_number_display") ?? "回合：" }} <span>{{ props.game.state.value?.turn ?? 1 }}</span></div>
      <div class="info-line">{{ t?.("menu.selected_object_display") ?? "选中对象：" }} <span>{{ props.game.selectedCount.value }}</span></div>
      <div class="info-line">{{ t?.("menu.planet_name_display") ?? "星球名称：" }} <span>{{ props.game.selectedNames.value }}</span></div>
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
      <div v-if="props.game.errorMessage.value" class="error-message" @click="props.game.clearError">{{ props.game.errorMessage.value }}</div>
    </div>
    <div class="signature">{{ t?.("info.developer") ?? "作者" }}</div>
  </aside>
</template>
