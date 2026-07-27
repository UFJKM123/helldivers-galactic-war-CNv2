<script setup lang="ts">
import type { GameResult } from "../game/types";

const props = defineProps<{ result: GameResult; translate: (path: string) => string }>();
const emit = defineEmits<{ close: []; spectate: [] }>();
</script>

<template>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-box">
      <h2>{{ result.title }}</h2>
      <div class="score-text">{{ result.resultText }}</div>
      <div class="score-text">{{ result.campMessage }}</div>
      <div class="score-text">{{ props.translate("menu.final_controlled_planets") }} {{ result.planetCount }}</div>
      <div class="score-text">{{ props.translate("menu.enemy_troops_eliminated") }} {{ result.kills }}</div>
      <div class="score-text">{{ props.translate("menu.survived_turns") }} {{ result.turns }}</div>
      <div class="score-text"><b>{{ props.translate("menu.overall_match_score") }} {{ result.score }}</b></div>
      <button v-if="result.isDefeat" class="spectate-button" @click="emit('spectate')">{{ props.translate("menu.spectate_note") }}</button>
      <button @click="emit('close')">{{ props.translate("menu.new_match_note") }}</button>
    </div>
  </div>
</template>
