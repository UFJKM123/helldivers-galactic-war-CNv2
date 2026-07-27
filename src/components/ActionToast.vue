<script setup lang="ts">
const props = defineProps<{ message: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Transition name="toast">
    <div v-if="props.message" class="toast" role="status" aria-live="polite">
      <span class="toast-mark" aria-hidden="true">!</span>
      <span class="toast-message">{{ props.message }}</span>
      <button class="toast-close" type="button" aria-label="关闭提示" @click="emit('close')">×</button>
    </div>
  </Transition>
</template>
