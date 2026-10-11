import { useState, type ReactNode } from "react";
import { ArrowUpRight, Compass } from "lucide-react";
import type { GameController } from "../../../packages/application/src/controller";
import * as O from "../../../packages/foundation/src/option";
import { incomingInvitationRepository } from "./invitation";
import { App } from "./App";

/** A personal coin mark, not a claim of registered trademark status. */
export function LifeCoin() {
  return (
    <svg
      className="life-coin"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="14" />
      <circle cx="16" cy="16" r="10.5" strokeDasharray="1 3" />
      <path d="M10 22 16 9l6 13M12.5 17.5h7" />
    </svg>
  );
}

export function Website({
  controller,
  initiallyPlaying = false,
  whenPlaying,
}: {
  controller?: GameController;
  initiallyPlaying?: boolean;
  whenPlaying?: ReactNode;
}) {
  const [invitation] = useState(incomingInvitationRepository);
  const [playing, setPlaying] = useState(initiallyPlaying);
  if (playing) {
    if (whenPlaying) return whenPlaying;
    if (controller) return <App controller={controller} />;
    return (
      <main className="app-shell">
        <p>Opening your game.</p>
      </main>
    );
  }
  return (
    <main className="landing">
      <header className="landing-header">
        <span>
          <Compass size={24} />
          LIFE
          <LifeCoin />
        </span>
        <small>A GOOD LIFE. ONE CLEAR NEXT STEP.</small>
      </header>
      <section className="landing-body" aria-labelledby="landing-title">
        <div className="landing-orbit" aria-hidden="true">
          <span />
          <Compass />
        </div>
        <small className="landing-eyebrow">
          A REAL-WORLD ROLE-PLAYING GAME
        </small>
        <h1 id="landing-title">
          Your life.
          <br />
          <em>Worth playing.</em>
        </h1>
        <p>
          Live the life God has for you, with less pressure.
          <br />
          Niko helps you choose one quest, take the next step, and learn as you
          go.
        </p>
        {O.isSome(invitation) && (
          <p className="invitation-welcome">
            A friend invited you. Welcome to life.
          </p>
        )}
        <button
          className="play-live"
          onClick={() => {
            setPlaying(true);
            window.location.hash = "/";
          }}
        >
          play live
          <sup>
            <LifeCoin />
          </sup>
          <ArrowUpRight size={25} aria-hidden="true" />
        </button>
        <span className="landing-caption">
          Faith. Family. Responsibility. Room to rest.
        </span>
      </section>
      <footer className="landing-footer">
        <span>BUILT BY ALEX PANOV</span>
        <span>REAL LIFE / OPEN WORLD</span>
      </footer>
    </main>
  );
}
