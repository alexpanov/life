import { initializeTelegram, interactionSurface } from "./telegram";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { createGameController } from "../../../packages/application/src/controller";
import { readCloudConfig } from "../../../packages/infrastructure/src/public-supabase";
import { createPlayerClient } from "../../../packages/infrastructure/src/player-session";
import {
  browserRepository,
  browserContext,
  browserSnippetArchive,
} from "./repository";
import { PlayerGame, supabasePlayerSession } from "./player-game";
import { Website } from "./Website";
import "./styles.css";

const slot = location.pathname.includes("/starter/") ? "starter" : "game";
const key = slot === "starter" ? "questos.starter.v1" : "questos.v1";
const surface = interactionSurface(location.pathname);
initializeTelegram(surface, window.Telegram?.WebApp);
const cloud = readCloudConfig({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});
const root = document.getElementById("root");
if (!root) throw Error("Missing application root.");
const host = root;

function mountLocal() {
  const controller = createGameController(
    browserRepository(key),
    browserContext,
    browserSnippetArchive(key),
    surface,
  );
  createRoot(host).render(
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
}

if (cloud._tag === "ready") {
  const client = createPlayerClient(cloud.config);
  if (client._tag === "Right") {
    const session = supabasePlayerSession(client.right, slot, surface);
    createRoot(host).render(
      <StrictMode>
        <HashRouter>
          <Website
            initiallyPlaying={location.hash.length > 1}
            whenPlaying={<PlayerGame session={session} />}
          />
        </HashRouter>
      </StrictMode>,
    );
  } else mountLocal();
} else mountLocal();

if ("serviceWorker" in navigator)
  void navigator.serviceWorker
    .register(
      `${import.meta.env.BASE_URL}${slot === "starter" ? "starter/" : ""}sw.js`,
    )
    .catch(() => {});
