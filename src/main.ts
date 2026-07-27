import { createApp } from "vue";
import "./styles/main.css";
import { localeReady } from "./i18n";

void localeReady.then(async () => {
  const { default: App } = await import("./App.vue");
  createApp(App).mount("#app");
});
