<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { GameViewModel } from "../composables/useGame";

const props = defineProps<{ game: GameViewModel }>();
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasWrap = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

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
  resizeObserver = new ResizeObserver(() => props.game.resize());
  if (canvasWrap.value) resizeObserver.observe(canvasWrap.value);
  window.addEventListener("resize", props.game.resize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", props.game.resize);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <div ref="canvasWrap" class="canvas-wrap">
    <canvas
      ref="canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
    />
  </div>
</template>
