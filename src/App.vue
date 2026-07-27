<script setup lang="ts">
import { useGame } from "./composables/useGame";
import GalaxyCanvas from "./components/GalaxyCanvas.vue";
import GameControlPanel from "./components/GameControlPanel.vue";
import EventModal from "./components/EventModal.vue";
import ResultModal from "./components/ResultModal.vue";

const game = useGame();
</script>

<template>
  <main class="game-shell">
    <GalaxyCanvas :game="game" />
    <GameControlPanel :game="game" />
    <EventModal
      v-if="game.currentEvent.value"
      :event="game.currentEvent.value"
      :translate="game.t"
      @confirm="game.closeEvent"
    />
    <ResultModal
      v-if="game.result.value"
      :result="game.result.value"
      :translate="game.t"
      @close="game.newGame"
      @spectate="game.startSpectate"
    />
  </main>
</template>
