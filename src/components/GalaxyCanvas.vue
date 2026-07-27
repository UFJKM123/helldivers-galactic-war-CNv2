<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { GameViewModel } from "../composables/useGame";

const props = defineProps<{ game: GameViewModel }>();
const canvas = ref<HTMLCanvasElement | null>(null);

function onMouseDown(event: MouseEvent): void {
  props.game.handleMouseDown(event);
}
function onMouseMove(event: MouseEvent): void {
  props.game.handleMouseMove(event);
}
function onMouseUp(event: MouseEvent): void {
  props.game.handleMouseUp(event);
}

onMounted(() => {
  if (!canvas.value) return;
  props.game.initialize(canvas.value);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
});

onUnmounted(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <div class="canvas-wrap">
    <canvas
      ref="canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
    />
  </div>
</template>
