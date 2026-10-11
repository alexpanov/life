import { attachBrowserInsights } from "./background-insights";
import { Effect } from "effect";
import {
  executeFrontendRoutine,
  frontendRoutineRequest,
} from "../../../packages/application/src/frontend-routines";
import * as O from "../../../packages/foundation/src/option";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router";
import {
  Button,
  Compass,
  dangerText,
  formSave,
  playerSwitch,
} from "../../../packages/design/src/index";
import {
  serializeGame,
  selectGame,
  getHandoff,
  parseImport,
  type Command,
  type QuestCategory,
} from "../../../packages/core/src/index";
import type { GameController } from "../../../packages/application/src/controller";
import { Sender, Field, Area } from "./components/presentation";
import { H3, Label } from "../../../packages/design/src/type";
import { download } from "./download";
import type { Modal } from "./ui-types";
import { HomePage } from "./pages/HomePage";
import { QuestPage } from "./pages/QuestPage";
export { Sender } from "./components/presentation";
import { Dialog } from "./components/ui/dialog";
import { browserContext } from "./repository";
export function App({ controller }: { controller: GameController }) {
  useEffect(() => attachBrowserInsights(controller), [controller]);
  const store = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
    ),
    navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null),
    [selectedId, setSelectedId] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<unknown>(null),
    [call, setCall] = useState<{ caller: string; text: string } | null>(null),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const view = O.isSome(store.game) ? selectGame(store.game.value, tick) : null;
  useEffect(() => {
    if (!view?.player.settings.autoCalls) return;
    const timer = setInterval(() => {
      if (document.hidden || modal) return;
      if (
        Date.now() - view.player.lastCallAt >=
        view.player.settings.callIntervalMinutes * 60000
      ) {
        const result = controller.send({ type: "transmission" });
        if (O.isSome(result.transmission)) {
          setCall(result.transmission.value);
          setModal("call");
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [
    controller,
    view?.player.settings.autoCalls,
    view?.player.lastCallAt,
    view?.player.settings.callIntervalMinutes,
    modal,
  ]);
  if (!view || !O.isSome(store.game))
    return (
      <main className="loading">
        <Compass />
        <p>Opening your world…</p>
      </main>
    );
  const { player } = view,
    game = store.game.value;
  const selectedQuest = player.campaigns
      .flatMap((c) => c.quests)
      .find((q) => q.id === selectedId),
    selectedRealm = player.realms.find((r) => r.id === selectedId),
    selectedSkill = player.skills.find((s) => s.id === selectedId);
  function send(command: Command) {
    try {
      const result =
        command.type === "import" || command.type === "transmission"
          ? controller.send(command)
          : Effect.runSync(
              executeFrontendRoutine(
                controller,
                frontendRoutineRequest(crypto.randomUUID(), command),
              ),
            ).outcome;
      setError("");
      const started =
        ["choose-mission", "propose-mission", "accept-offer"].includes(
          command.type,
        ) &&
        result.state.players.find((p) => p.id === result.state.activePlayerId)
          ?.operation.phase === "execute";
      if (started) navigate("/");
      else if (O.isSome(result.destination))
        navigate(
          result.destination.value === "home"
            ? "/"
            : `/${result.destination.value}`,
        );
      if (O.isSome(result.transmission)) {
        setCall(result.transmission.value);
        setModal("call");
      }
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Action could not be completed.",
      );
      return false;
    }
  }
  function open(kind: Modal, id = "") {
    setSelectedId(id);
    setModal(kind);
    setError("");
    setPreview(null);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      text = (key: string) => String(data.get(key) || ""),
      number = (key: string) => Number(data.get(key) || 0);
    let command: Command | undefined;
    if (modal === "quest") {
      const quest = {
        title: text("title"),
        detail: text("detail"),
        nextMove: text("nextMove"),
        destination: text("destination"),
        category: text("category") as QuestCategory,
        xp: number("xp"),
        loot: text("loot"),
      };
      command = selectedQuest
        ? { type: "edit-quest", questId: selectedQuest.id, quest }
        : { type: "add-quest", quest };
    }
    if (modal === "realm")
      command = selectedRealm
        ? {
            type: "edit-realm",
            realmId: selectedRealm.id,
            name: text("name"),
            location: text("location"),
            home: data.get("home") === "on",
          }
        : {
            type: "add-realm",
            name: text("name"),
            location: text("location"),
            home: data.get("home") === "on",
          };
    if (modal === "dungeon")
      command = {
        type: "add-dungeon",
        name: text("name"),
        subtitle: text("subtitle"),
      };
    if (modal === "skill")
      command = selectedSkill
        ? {
            type: "edit-skill",
            skillId: selectedSkill.id,
            name: text("name"),
            halfLifeDays: number("halfLifeDays"),
            graceDays: number("graceDays"),
          }
        : {
            type: "add-skill",
            name: text("name"),
            halfLifeDays: number("halfLifeDays"),
          };
    if (modal === "practice" && selectedSkill)
      command = {
        type: "practice",
        skillId: selectedSkill.id,
        note: text("note"),
      };
    if (modal === "profiles")
      command = { type: "add-player", name: text("name") };
    if (modal === "memory") command = { type: "remember", text: text("note") };
    if (modal === "loot") command = { type: "add-loot", name: text("name") };
    if (modal === "blocked" && selectedQuest)
      command = {
        type: "set-status",
        questId: selectedQuest.id,
        status: "impossible",
        reason: text("reason"),
      };
    if (modal === "import") {
      try {
        const data = parseImport(text("json"), browserContext());
        const dry = controller.getSnapshot().game;
        if (O.isNone(dry)) throw Error("Game unavailable.");
        setPreview(data);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid JSON.");
      }
      return;
    }
    if (command && send(command)) setModal(null);
  }
  const home = <HomePage view={view} send={send} />;
  return (
    <div className="app-shell">
      <div>
        <header className="topbar">
          <Link className="brand" to="/">
            life
          </Link>
        </header>
        <main className="layout">
          {store.storage !== "saved" && (
            <div className="storage-warning" role="status">
              <Sender />
              <p>{store.notice}</p>
              {store.storage === "recovery" && (
                <div className="actions">
                  <Button
                    onClick={() =>
                      download(
                        "questos-recovery.json",
                        O.getOrElse(store.original, () => ""),
                      )
                    }
                  >
                    Export original
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      download("questos-loaded.json", serializeGame(game))
                    }
                  >
                    Export loaded
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => controller.acceptRecovery()}
                  >
                    Use loaded save
                  </Button>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <p>{error}</p>
            </div>
          )}
          <Routes>
            <Route path="/" element={home} />
            <Route
              path="/quest/:questId"
              element={<QuestPage view={view} send={send} open={open} />}
            />
            <Route path="*" element={home} />
          </Routes>
        </main>
      </div>
      <nav className="home-bar" aria-label="Main navigation">
        <NavLink to="/" end>
          <Label>Home</Label>
        </NavLink>
      </nav>
      <Dialog
        open={modal !== null}
        onClose={() => {
          setModal(null);
          window.speechSynthesis?.cancel();
        }}
        title={
          modal === "memory"
            ? "Niko / memory"
            : modal === "quest"
              ? "Quest details"
              : modal === "reset"
                ? "Reset Niko’s memory?"
                : modal === "call"
                  ? "Transmission"
                  : modal === "handoff"
                    ? "ChatGPT handoff"
                    : modal === "profiles"
                      ? "Local players"
                      : modal === "import"
                        ? "Import / review first"
                        : modal === "about"
                          ? "Field manual"
                          : `QuestOS / ${modal || ""}`
        }
      >
        <Sender
          source={modal === "call" ? "dispatch" : "system"}
          name={modal === "call" ? call?.caller : undefined}
        />
        {error && (
          <p role="alert" className={dangerText}>
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          {modal === "quest" && (
            <>
              <Field
                name="title"
                label="Objective"
                value={selectedQuest?.title}
                required
              />
              <Field
                name="nextMove"
                label="One next move"
                value={selectedQuest?.nextMove}
              />
              <Area
                name="detail"
                label="Details"
                value={selectedQuest?.detail}
              />
              <Field
                name="destination"
                label="Destination"
                value={selectedQuest?.destination}
              />
              {selectedQuest?.destination && (
                <a
                  className="map-link"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedQuest.destination)}`}
                >
                  Search map — location not verified
                </a>
              )}
              <label className="field">
                Type
                <select
                  name="category"
                  defaultValue={selectedQuest?.category || "main"}
                >
                  <option value="main">Main</option>
                  <option value="side">Side quest</option>
                  <option value="bonus">Bonus</option>
                </select>
              </label>
              <Field
                name="xp"
                label="XP"
                type="number"
                value={selectedQuest?.xp ?? 50}
              />
              <Field name="loot" label="Loot" value={selectedQuest?.loot} />
            </>
          )}
          {modal === "realm" && (
            <>
              <Field
                name="name"
                label="Realm name"
                value={selectedRealm?.name}
                required
              />
              <Field
                name="location"
                label="Place"
                value={selectedRealm?.location}
              />
              <label className="checkline">
                <input
                  type="checkbox"
                  name="home"
                  defaultChecked={selectedRealm?.home}
                />
                Home realm
              </label>
            </>
          )}
          {modal === "dungeon" && (
            <>
              <Field name="name" label="Dungeon name" required />
              <Field name="subtitle" label="Main mission" />
            </>
          )}
          {modal === "skill" && (
            <>
              <Field
                name="name"
                label="Skill name"
                value={selectedSkill?.name}
                required
              />
              <Field
                name="halfLifeDays"
                label="Readiness half-life (days)"
                value={selectedSkill?.halfLifeDays ?? 28}
                type="number"
              />
              {selectedSkill && (
                <Field
                  name="graceDays"
                  label="Grace period (days)"
                  value={selectedSkill.graceDays}
                  type="number"
                />
              )}
              <p>Game tuning, not a fitness assessment.</p>
            </>
          )}
          {modal === "practice" && (
            <>
              <p>
                Log a session you actually completed. +40 XP, once per local
                calendar day.
              </p>
              <Area name="note" label="Practice note" />
            </>
          )}
          {modal === "blocked" && (
            <>
              <H3>{selectedQuest?.title}</H3>
              <p>Close a dead end without an XP penalty.</p>
              <Area name="reason" label="What blocked this quest?" />
            </>
          )}
          {modal === "loot" && (
            <Field name="name" label="Item already acquired" required />
          )}
          {modal === "memory" && (
            <>
              <div className="niko-quote">
                <Sender source="niko" />
                <p>
                  I learn from your choices and results. Tell me what helps you
                  finish.
                </p>
              </div>
              <Area name="note" label="One thing to remember" />
              {player.sidekick.snippets
                .filter((n) => O.isNone(n.deletedAt))
                .map((n) => (
                  <p key={n.id}>{n.text}</p>
                ))}
              <p>
                {player.sidekick.reviews.length} recent outcomes remembered.
                Notes are retained for your ChatGPT handoff; local rules do not
                interpret free text.
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModal("reset")}
              >
                Reset memory
              </Button>
            </>
          )}
          {modal === "reset" && (
            <>
              <p>
                Clear learned preferences, observations, and notes. Quests, XP,
                inventory, and skills stay intact.
              </p>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  send({ type: "reset-memory" });
                  setModal(null);
                }}
              >
                Reset memory
              </Button>
            </>
          )}
          {modal === "profiles" && (
            <>
              {game.players.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  className={playerSwitch}
                  onClick={() => {
                    send({ type: "switch-player", playerId: p.id });
                    setModal(null);
                  }}
                >
                  {p.name}
                </Button>
              ))}
              <Field name="name" label="New player name" required />
            </>
          )}
          {modal === "import" && (
            <>
              <p>
                Paste a save, dungeon template, extension, or ChatGPT patch.
                Review before applying.
              </p>
              <Area name="json" label="JSON" />
              {preview !== null && (
                <div className="import-preview">
                  <pre>{JSON.stringify(preview, null, 2)}</pre>
                  <p>
                    Full saves replace all local profiles. Export your current
                    save first.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      download(
                        "questos-before-import.json",
                        serializeGame(game),
                      )
                    }
                  >
                    Export current save
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (send({ type: "import", data: preview })) {
                        setPreview(null);
                        setModal(null);
                      }
                    }}
                  >
                    Apply reviewed import
                  </Button>
                </div>
              )}
            </>
          )}
          {modal === "handoff" && (
            <>
              <p>
                No live model is connected. Copy this into ChatGPT, then review
                and import its JSON response.
              </p>
              <textarea
                aria-label="ChatGPT handoff"
                readOnly
                className="handoff"
                value={getHandoff(game, tick)}
              />
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(getHandoff(game, tick))
                    .catch(() =>
                      setError(
                        "Clipboard blocked. Select the text and copy it.",
                      ),
                    );
                }}
              >
                Copy handoff
              </Button>
            </>
          )}
          {modal === "call" && call && (
            <>
              <p className="call-copy">{call.text}</p>
              <p>Fictional dispatch. No quest was added automatically.</p>
              {player.settings.sound && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if ("speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      window.speechSynthesis.speak(
                        new SpeechSynthesisUtterance(call.text),
                      );
                    }
                  }}
                >
                  Read aloud
                </Button>
              )}
            </>
          )}
          {modal === "about" && (
            <>
              <H3>Your world. Your quest.</H3>
              <p>
                Choose one real objective, act, then report. Return to realms
                later. Impossible quests close without penalty.
              </p>
              <p>
                Niko learns locally from your choices. You can reset his memory.
                There is no connected LLM, background location tracking, or
                shared cloud save.
              </p>
              <p>
                Field XP records completed work. Skill potential records
                practice. Readiness fades with time and returns with practice.
              </p>
              <p>
                Export a save before clearing browser data or changing devices.
                Starter saves are separate.
              </p>
            </>
          )}
          {modal && !["reset", "handoff", "call", "about"].includes(modal) && (
            <Button className={formSave} type="submit">
              {modal === "import"
                ? "Review JSON"
                : modal === "memory"
                  ? "Remember"
                  : modal === "practice"
                    ? "Session completed"
                    : modal === "profiles"
                      ? "Create player"
                      : "Save"}
            </Button>
          )}
        </form>
      </Dialog>
    </div>
  );
}
