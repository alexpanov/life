import { initializeTelegram, interactionSurface } from "./telegram";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { createGameController } from "../../../packages/application/src/controller";
import {
  browserRepository,
  browserContext,
  browserSnippetArchive,
} from "./repository";
import { Website } from "./Website";
import "./styles.css";
const key = location.pathname.includes("/starter/")
  ? "questos.starter.v1"
  : "questos.v1";
const surface = interactionSurface(location.pathname);
initializeTelegram(surface, window.Telegram?.WebApp);
const controller = createGameController(
  browserRepository(key),
  browserContext,
  browserSnippetArchive(key),
  surface,
);
const root = document.getElementById("root");
if (!root) throw Error("Missing application root.");
createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <Website
        controller={controller}
        initiallyPlaying={location.hash.length > 1}
      />
    </HashRouter>
  </StrictMode>,
);
void controller.load();
if ("serviceWorker" in navigator)
  void navigator.serviceWorker
    .register(
      `${import.meta.env.BASE_URL}${location.pathname.includes("/starter/") ? "starter/" : ""}sw.js`,
    )
    .catch(() => {});
