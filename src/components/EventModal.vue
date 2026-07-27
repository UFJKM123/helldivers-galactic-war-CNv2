<script setup lang="ts">
const props = defineProps<{ event: { title: string; message: string }; translate: (path: string) => string }>();
const emit = defineEmits<{ confirm: [] }>();
</script>

<template>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-box">
      <h2>{{ event.title }}</h2>
      <p>{{ event.message }}</p>
      <button @click="emit('confirm')">{{ props.translate("menu.confirm_note") }}</button>
    </div>
  </div>
</template>
