import * as O from "../../../packages/foundation/src/option";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router";
import {
  Compass,
  UserRound,
  Radio,
  ArrowRight,
  Plus,
  MapPin,
  Shield,
  Download,
  Pause,
} from "lucide-react";
import {
  serializeGame,
  selectGame,
  getHandoff,
  getTemplate,
  parseImport,
  type Command,
  type QuestOffer,
  type QuestCategory,
} from "../../../packages/core/src/index";
import type { GameController } from "../../../packages/application/src/controller";
import { Sender, Panel, Field, Area } from "./components/presentation";
import { download } from "./download";
import type { Modal } from "./ui-types";
import { RealmsPage } from "./pages/RealmsPage";
import { BoardPage } from "./pages/BoardPage";
import { SkillsPage } from "./pages/SkillsPage";
import { InventoryPage } from "./pages/InventoryPage";
export { Sender } from "./components/presentation";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import { browserContext } from "./repository";
export function App({ controller }: { controller: GameController }) {
  const store = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
    ),
    navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null),
    [selectedId, setSelectedId] = useState(""),
    [offer, setOffer] = useState<QuestOffer | null>(null),
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
    if (view?.player.settings.driving) {
      setModal(null);
      setOffer(null);
    }
  }, [view?.player.settings.driving]);
  useEffect(() => {
    if (!view?.player.settings.autoCalls || view.player.settings.driving)
      return;
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
    view?.player.settings.driving,
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
  const { player, realm, campaign } = view,
    game = store.game.value;
  const mission = O.match(
      view.mission,
      () => null,
      (q) => q,
    ),
    candidate = O.match(
      view.candidate,
      () => null,
      (q) => q,
    ),
    lastQuest = O.match(
      view.lastQuest,
      () => null,
      (q) => q,
    );
  const checkin = O.match(
    player.checkin,
    () => null,
    (c) => c,
  );
  const selectedQuest = player.campaigns
      .flatMap((c) => c.quests)
      .find((q) => q.id === selectedId),
    selectedRealm = player.realms.find((r) => r.id === selectedId),
    selectedSkill = player.skills.find((s) => s.id === selectedId);
  function send(command: Command) {
    try {
      const result = controller.send(command);
      setError("");
      setOffer(
        O.match(
          result.offer,
          () => null,
          (offer) => offer,
        ),
      );
      if (O.isSome(result.destination))
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
  const offeredQuest =
    offer?.kind === "existing"
      ? player.campaigns
          .flatMap((c) => c.quests)
          .find((q) => q.id === offer.questId)
      : offer?.quest;
  const home = (
    <>
      <div className="page-heading">
        <Sender />
        <small>
          {realm.name} / {realm.home ? "HOME REALM" : "FIELD OPERATIONS"}
        </small>
        <h1>
          {player.operation.phase === "review"
            ? "Take a breath."
            : "How are you feeling?"}
        </h1>
        <p>
          {player.operation.phase === "review"
            ? "What matters most now?"
            : "Let’s pick one quest for you."}
        </p>
      </div>
      {player.operation.phase === "review" ? (
        <Panel>
          <small>
            {lastQuest?.status === "done"
              ? "MISSION COMPLETE"
              : lastQuest?.status === "impossible"
                ? "DEAD END CLOSED"
                : "QUEST SET ASIDE"}
          </small>
          <h2 className="text-2xl my-3">
            {lastQuest?.title || "Report received."}
          </h2>
          <div className="actions">
            {mission && (
              <Button
                onClick={() =>
                  send({ type: "choose-mission", questId: mission.id })
                }
              >
                Resume current mission
              </Button>
            )}
            <Button onClick={() => send({ type: "finish-review" })}>
              Pick next quest
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                send({ type: "finish-review" });
                navigate("/realms");
              }}
            >
              Stand down
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          <div className="mood-grid">
            {(
              [
                ["ready", "Ready", "A mission to get done."],
                ["curious", "Curious", "Something worth noticing."],
                ["quiet", "Quiet", "Room to breathe."],
                ["tired", "Low energy", "Keep it small."],
              ] as const
            ).map(([mood, label, copy]) => (
              <button
                key={mood}
                className={`mood ${checkin?.mood === mood ? "chosen" : ""}`}
                aria-pressed={checkin?.mood === mood}
                onClick={() => send({ type: "check-in", mood })}
              >
                <Compass size={20} />
                <strong>{label}</strong>
                <span>{copy}</span>
              </button>
            ))}
          </div>
          <Panel>
            {offer && offeredQuest ? (
              <>
                <small>
                  {offer.kind === "proposal"
                    ? "OPTIONAL LEAD"
                    : "ONE NEXT MOVE"}
                </small>
                <h2 className="text-2xl my-3">{offeredQuest.title}</h2>
                <p>{offeredQuest.nextMove}</p>
                <div className="actions">
                  <Button onClick={() => send({ type: "accept-offer", offer })}>
                    Take quest
                    <ArrowRight size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => send({ type: "dismiss-offer", offer })}
                  >
                    Not now
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl">
                  {view.quests.some((q) => q.status === "pending") && !checkin
                    ? "One move at a time."
                    : "Pray for a quest."}
                </h2>
                <p>
                  Choose how you feel, revisit a realm, or add a quest of your
                  own.
                </p>
                <div className="actions">
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/realms")}
                  >
                    Open realms
                  </Button>
                  <Button variant="ghost" onClick={() => open("quest")}>
                    <Plus size={14} />
                    Add quest
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </>
      )}
    </>
  );
  const realms = <RealmsPage view={view} send={send} open={open} />;
  const board = (
    <BoardPage
      view={view}
      send={send}
      open={open}
      missionId={mission?.id || ""}
    />
  );
  const skills = <SkillsPage view={view} send={send} open={open} />;
  const inventory = <InventoryPage view={view} send={send} open={open} />;
  const workshop = (
    <>
      <div className="page-heading">
        <small>YOUR WORLD / YOUR RULES</small>
        <h1>Workshop.</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Niko">
          <p>Resettable memory. Your quests and rewards stay intact.</p>
          <Button variant="secondary" onClick={() => open("memory")}>
            Open memory
          </Button>
        </Panel>
        <Panel title="Save and restore">
          <p>
            Progress stays in this browser. Export before switching devices.
          </p>
          <div className="actions">
            <Button
              onClick={() => download("questos-save.json", serializeGame(game))}
            >
              <Download size={14} />
              Export save
            </Button>
            <Button variant="secondary" onClick={() => open("import")}>
              Import JSON
            </Button>
          </div>
        </Panel>
        <Panel title="ChatGPT bridge">
          <p>
            Copy your current state and Niko’s context. No live model is
            connected.
          </p>
          <Button variant="secondary" onClick={() => open("handoff")}>
            Open handoff
          </Button>
        </Panel>
        <Panel title="Share a quest">
          <p>
            Templates have fresh progress. Share the clean starter for a new
            game.
          </p>
          <div className="actions">
            <Button
              variant="secondary"
              onClick={() =>
                download(
                  "questos-campaign.json",
                  JSON.stringify(getTemplate(game, tick), null, 2),
                )
              }
            >
              Export dungeon
            </Button>
            <Button variant="ghost" asChild>
              <a
                href={`${import.meta.env.BASE_URL}starter/`}
                target="_blank"
                rel="noreferrer"
              >
                Clean starter
              </a>
            </Button>
          </div>
        </Panel>
        <Panel title="Dispatch">
          <p>Optional fictional transmissions. You decide when to answer.</p>
          <Button
            variant="secondary"
            onClick={() => send({ type: "transmission" })}
          >
            <Radio size={15} />
            Receive transmission
          </Button>
          <label className="checkline">
            <input
              type="checkbox"
              checked={player.settings.autoCalls}
              onChange={(e) =>
                send({
                  type: "settings",
                  settings: { autoCalls: e.target.checked },
                })
              }
            />
            Occasional transmissions while open
          </label>
          <label className="checkline">
            <input
              type="checkbox"
              checked={player.settings.sound}
              onChange={(e) =>
                send({
                  type: "settings",
                  settings: { sound: e.target.checked },
                })
              }
            />
            Read answered transmissions aloud
          </label>
        </Panel>
        <Panel title="Players">
          <p>Independent profiles on this device.</p>
          <Button variant="secondary" onClick={() => open("profiles")}>
            Manage players
          </Button>
        </Panel>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <div inert={player.settings.driving}>
        <header className="topbar">
          <button className="brand" onClick={() => navigate("/")}>
            <Compass size={30} />
            <span>
              QUEST<span className="text-cyan-200">/</span>OS
              <small>ORBITAL COMMAND / FIELD OPERATIONS</small>
            </span>
          </button>
          <Button variant="ghost" onClick={() => open("profiles")}>
            <UserRound size={15} />
            {player.name}
          </Button>
        </header>
        <nav className="navigation" aria-label="Main navigation">
          {[
            ["/", "Home"],
            ["/realms", "Realms"],
            ["/board", "Quests"],
            ["/skills", "Skills"],
            ["/inventory", "Inventory"],
            ["/workshop", "Workshop"],
          ].map(([path, label]) => (
            <NavLink key={path} to={path!} end={path === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="layout">
          <div className="utility">
            <span>
              <MapPin size={13} />
              {realm.name} / {campaign.name}
            </span>
            <Button
              variant="ghost"
              onClick={() =>
                send({ type: "settings", settings: { driving: true } })
              }
            >
              <Shield size={14} />
              Driving mode
            </Button>
          </div>
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
          <aside className="niko-panel">
            <UserRound className="niko-avatar" size={30} />
            <div>
              <Sender source="niko" />
              <p>{view.guidance}</p>
            </div>
            <Button variant="ghost" onClick={() => open("memory")}>
              Memory
            </Button>
          </aside>
          {mission && (
            <section className="mission-strip">
              <div>
                <small>YOUR ONE MISSION</small>
                <h3>{mission.title}</h3>
              </div>
              <div className="actions">
                <Button
                  onClick={() =>
                    send({ type: "choose-mission", questId: mission.id })
                  }
                >
                  Resume
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => send({ type: "set-aside" })}
                >
                  <Pause size={13} />
                  Set aside
                </Button>
              </div>
            </section>
          )}
          {(error || store.notice) && (
            <div
              className={`notice ${error ? "error" : ""}`}
              role={error ? "alert" : "status"}
            >
              <Sender />
              <p>{error || store.notice}</p>
            </div>
          )}
          <Routes>
            <Route path="/" element={home} />
            <Route path="/realms" element={realms} />
            <Route path="/board" element={board} />
            <Route path="/skills" element={skills} />
            <Route path="/inventory" element={inventory} />
            <Route path="/workshop" element={workshop} />
            <Route path="*" element={home} />
          </Routes>
          <footer>
            <span>
              QUESTOS v0.4 /{" "}
              {store.storage === "saved" ? "LOCAL SAVE" : "SESSION"}
            </span>
            <Button variant="ghost" onClick={() => open("about")}>
              Field manual
            </Button>
          </footer>
        </main>
      </div>
      {player.settings.driving && (
        <div className="drive-screen">
          <Shield size={54} />
          <h1>Eyes on the road.</h1>
          <p>Controls are paused until you are safely parked.</p>
          <Button
            onClick={() =>
              send({ type: "settings", settings: { driving: false } })
            }
          >
            I’m parked
          </Button>
        </div>
      )}
      <Dialog
        open={!!candidate && !modal && !player.settings.driving}
        onClose={() => send({ type: "retain-mission" })}
        title="Choose one next move"
      >
        <Sender />
        {mission && <p>Current mission: {mission.title}</p>}
        <h3 className="text-xl my-4">{candidate?.title}</h3>
        <p>{candidate?.nextMove}</p>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={() => send({ type: "retain-mission" })}
          >
            {mission ? "Stay on current mission" : "Leave on board"}
          </Button>
          <Button
            onClick={() => {
              if (candidate)
                send({ type: "choose-mission", questId: candidate.id });
            }}
          >
            {mission ? "Switch to this quest" : "Take this quest"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={modal !== null && !player.settings.driving}
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
          <p role="alert" className="text-red-300">
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
              <h3>{selectedQuest?.title}</h3>
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
              {player.sidekick.snippets.map((n) => (
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
                  className="mr-2 mb-3"
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
              <h3>Your world. Your quest.</h3>
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
            <Button className="mt-5" type="submit">
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
