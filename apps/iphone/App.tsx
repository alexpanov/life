import { Action, Panel, styles } from "./ui";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGameController } from "../../packages/application/src/controller";
import { persistenceFromStorage } from "../../packages/application/src/persistence";
import {
  selectGame,
  serializeGame,
  type Command,
  type Mood,
  type QuestOffer,
} from "../../packages/core/src/index";
import * as O from "../../packages/foundation/src/option";
import { tokens } from "../../packages/design/src/tokens";

const controller = createGameController(
  persistenceFromStorage(AsyncStorage, "questos.v1"),
  () => {
    const date = new Date();
    return {
      now: date.getTime(),
      eventId: `${date.getTime()}_${Math.random().toString(36).slice(2)}`,
      localDay: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    };
  },
);
type Screen = "Home" | "Realms" | "Quests" | "Skills" | "Niko";
type Form = "quest" | "realm" | "dungeon" | "skill" | "memory";
const screens: Screen[] = ["Home", "Realms", "Quests", "Skills", "Niko"];
const moods: Mood[] = ["ready", "curious", "quiet", "tired"];

function Game() {
  const store = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [screen, setScreen] = useState<Screen>("Home");
  const [form, setForm] = useState<O.Option<Form>>(O.none());
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [offer, setOffer] = useState<O.Option<QuestOffer>>(O.none());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    void controller.load();
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  function send(command: Command) {
    try {
      const result = controller.send(command);
      setOffer(result.offer);
      if (O.isSome(result.destination))
        setScreen(
          result.destination.value === "board"
            ? "Quests"
            : result.destination.value === "realms"
              ? "Realms"
              : "Home",
        );
    } catch (error) {
      Alert.alert(
        "QuestOS",
        error instanceof Error
          ? error.message
          : "Could not complete that action.",
      );
    }
  }
  function open(next: Form) {
    setTitle("");
    setDetail("");
    setForm(O.some(next));
  }
  function submit() {
    if (!O.isSome(form) || !title.trim()) return;
    const kind = form.value;
    const commands: Record<Form, Command> = {
      quest: {
        type: "add-quest",
        quest: { title, nextMove: detail, category: "side", xp: 100 },
      },
      realm: { type: "add-realm", name: title, location: detail },
      dungeon: { type: "add-dungeon", name: title, subtitle: detail },
      skill: { type: "add-skill", name: title, halfLifeDays: 14 },
      memory: { type: "remember", text: title },
    };
    try {
      controller.send(commands[kind]);
      setForm(O.none());
    } catch (error) {
      Alert.alert(
        "QuestOS",
        error instanceof Error ? error.message : "Check your entry.",
      );
    }
  }
  if (!O.isSome(store.game))
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.label}>QUESTOS / CONNECTING</Text>
      </SafeAreaView>
    );
  const snapshot = store.game.value;
  const view = selectGame(snapshot, now);
  const { player, mission, candidate } = view;
  const formName = O.match(
    form,
    () => "",
    (value) => value,
  );
  const offerTitle = O.match(
    offer,
    () => "",
    (value) =>
      value.kind === "proposal"
        ? (value.quest.title ?? "A small next move")
        : (player.campaigns
            .flatMap((c) => c.quests)
            .find((q) => q.id === value.questId)?.title ?? "An open quest"),
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          QUESTOS <Text style={styles.coin}>ϟ</Text>
        </Text>
        <Text style={styles.label}>
          {view.xp} XP · {view.rank}
        </Text>
      </View>
      <View style={styles.tabs}>
        {screens.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: screen === item }}
            onPress={() => setScreen(item)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, screen === item && styles.tabActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {player.settings.driving ? (
        <Panel>
          <Text style={styles.heading}>Eyes on the road.</Text>
          <Text style={styles.body}>Park before using game controls.</Text>
          <Action
            onPress={() =>
              send({ type: "settings", settings: { driving: false } })
            }
          >
            I’m parked
          </Action>
        </Panel>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>
            {view.realm.name.toUpperCase()} / {screen.toUpperCase()}
          </Text>
          {!!store.notice && (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {store.notice}
            </Text>
          )}
          {store.storage === "recovery" && (
            <Panel>
              <Text style={styles.body}>
                Your unreadable save is preserved. Share the original before
                replacing it.
              </Text>
              <Action
                onPress={() => {
                  if (O.isSome(store.original))
                    void Share.share({ message: store.original.value });
                }}
              >
                Share recovery data
              </Action>
              <Action
                subdued
                onPress={() =>
                  Alert.alert(
                    "Replace unreadable save?",
                    "Export the recovery data first. This saves the recovered game.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Replace",
                        style: "destructive",
                        onPress: () => controller.acceptRecovery(),
                      },
                    ],
                  )
                }
              >
                Use recovered game
              </Action>
            </Panel>
          )}
          {screen === "Home" && (
            <>
              <Text style={styles.hero}>{"One quest.\nOne real move."}</Text>
              <Panel companion>
                <Text style={styles.nikoLabel}>◈ NIKO / YOUR SIDEKICK</Text>
                <Text style={styles.niko}>{view.guidance}</Text>
              </Panel>
              {player.operation.phase === "review" ? (
                <Panel>
                  <Text style={styles.heading}>Take a breath.</Text>
                  <Text style={styles.body}>What matters next?</Text>
                  <Action onPress={() => send({ type: "finish-review" })}>
                    Choose the next quest
                  </Action>
                </Panel>
              ) : (
                <Panel>
                  <Text style={styles.heading}>How are you feeling?</Text>
                  <View style={styles.wrap}>
                    {moods.map((mood) => (
                      <Action
                        key={mood}
                        subdued
                        onPress={() => send({ type: "check-in", mood })}
                      >
                        {mood}
                      </Action>
                    ))}
                  </View>
                </Panel>
              )}
              {O.isSome(offer) && (
                <Panel>
                  <Text style={styles.label}>A POSSIBLE NEXT MOVE</Text>
                  <Text style={styles.heading}>{offerTitle}</Text>
                  <Action
                    onPress={() => {
                      if (O.isSome(offer))
                        send({ type: "accept-offer", offer: offer.value });
                    }}
                  >
                    Take this quest
                  </Action>
                  <Action
                    subdued
                    onPress={() => {
                      if (O.isSome(offer))
                        send({ type: "dismiss-offer", offer: offer.value });
                    }}
                  >
                    Not now
                  </Action>
                </Panel>
              )}
              {O.isSome(mission) ? (
                <Panel>
                  <Text style={styles.label}>ACTIVE QUEST</Text>
                  <Text style={styles.heading}>{mission.value.title}</Text>
                  <Text style={styles.body}>
                    {mission.value.nextMove || mission.value.detail}
                  </Text>
                  <Action
                    onPress={() =>
                      send({
                        type: "set-status",
                        questId: mission.value.id,
                        status: "done",
                      })
                    }
                  >
                    Quest complete
                  </Action>
                  <Action subdued onPress={() => send({ type: "set-aside" })}>
                    Set aside
                  </Action>
                </Panel>
              ) : (
                <Panel>
                  <Text style={styles.heading}>
                    {view.quests.some((q) => q.status === "pending")
                      ? "Choose what matters."
                      : "Pray for a quest."}
                  </Text>
                  <Action onPress={() => setScreen("Quests")}>
                    Open quest board
                  </Action>
                  <Action subdued onPress={() => open("quest")}>
                    Write a quest
                  </Action>
                </Panel>
              )}
            </>
          )}
          {screen === "Realms" && (
            <>
              <Text style={styles.hero}>{"Places worth\nreturning to."}</Text>
              {player.realms.map((realm) => (
                <Panel key={realm.id}>
                  <Text style={styles.heading}>
                    {realm.name}
                    {realm.home ? " · home" : ""}
                  </Text>
                  <Text style={styles.body}>{realm.location}</Text>
                  <Action
                    subdued
                    onPress={() =>
                      send({ type: "enter-realm", realmId: realm.id })
                    }
                  >
                    {realm.id === view.realm.id
                      ? "You are here"
                      : "Enter realm"}
                  </Action>
                </Panel>
              ))}
              <Action onPress={() => open("realm")}>Discover a realm</Action>
              <Text style={styles.heading}>Dungeons in {view.realm.name}</Text>
              {view.dungeons.map((dungeon) => (
                <Panel key={dungeon.id}>
                  <Text style={styles.heading}>{dungeon.name}</Text>
                  <Text style={styles.body}>{dungeon.subtitle}</Text>
                  <Action
                    subdued
                    onPress={() =>
                      send({ type: "open-dungeon", campaignId: dungeon.id })
                    }
                  >
                    Open dungeon
                  </Action>
                </Panel>
              ))}
              <Action subdued onPress={() => open("dungeon")}>
                Create a dungeon
              </Action>
            </>
          )}
          {screen === "Quests" && (
            <>
              <Text style={styles.hero}>Your next move.</Text>
              <Action onPress={() => open("quest")}>Write a quest</Action>
              {!view.quests.length && (
                <Text style={styles.body}>
                  Pray for a quest. When something matters, write it here.
                </Text>
              )}
              {view.quests.map((quest) => (
                <Panel key={quest.id}>
                  <Text style={styles.label}>
                    {quest.status.toUpperCase()} / {quest.xp} XP
                  </Text>
                  <Text style={styles.heading}>{quest.title}</Text>
                  <Text style={styles.body}>
                    {quest.nextMove || quest.detail}
                  </Text>
                  {quest.status === "pending" ? (
                    <>
                      <Action
                        onPress={() =>
                          send({ type: "propose-mission", questId: quest.id })
                        }
                      >
                        {player.focusQuestId === quest.id
                          ? "Current mission"
                          : "Choose this quest"}
                      </Action>
                      <View style={styles.wrap}>
                        <Action
                          subdued
                          onPress={() =>
                            send({
                              type: "set-status",
                              questId: quest.id,
                              status: "done",
                            })
                          }
                        >
                          Complete
                        </Action>
                        <Action
                          subdued
                          onPress={() =>
                            Alert.alert(
                              "Close this quest?",
                              "Niko will learn from this. There is no penalty.",
                              [
                                { text: "Keep open", style: "cancel" },
                                {
                                  text: "Close quest",
                                  onPress: () =>
                                    send({
                                      type: "set-status",
                                      questId: quest.id,
                                      status: "impossible",
                                      reason: "Closed by player",
                                    }),
                                },
                              ],
                            )
                          }
                        >
                          Can’t do it
                        </Action>
                      </View>
                    </>
                  ) : (
                    <Action
                      subdued
                      onPress={() =>
                        send({
                          type: "set-status",
                          questId: quest.id,
                          status: "pending",
                        })
                      }
                    >
                      Reopen quest
                    </Action>
                  )}
                </Panel>
              ))}
            </>
          )}
          {screen === "Skills" && (
            <>
              <Text style={styles.hero}>Keep showing up.</Text>
              {view.skills.map((skill) => (
                <Panel key={skill.id}>
                  <Text style={styles.heading}>{skill.name}</Text>
                  <Text style={styles.body}>
                    Level {skill.currentLevel} · Potential{" "}
                    {skill.potentialLevel} · Readiness{" "}
                    {Math.round(skill.readiness)}%
                  </Text>
                  <Action
                    onPress={() =>
                      send({
                        type: "practice",
                        skillId: skill.id,
                        note: "Practice logged on iPhone",
                      })
                    }
                  >
                    Log practice
                  </Action>
                  <Action
                    subdued
                    onPress={() =>
                      send({
                        type: "pause-skill",
                        skillId: skill.id,
                        paused: !skill.paused,
                      })
                    }
                  >
                    {skill.paused ? "Resume practice" : "Take recovery time"}
                  </Action>
                </Panel>
              ))}
              <Action subdued onPress={() => open("skill")}>
                Add a skill
              </Action>
              <Text style={styles.heading}>Inventory</Text>
              {view.inventory.map((item, index) => (
                <Text key={`${index}_${item}`} style={styles.body}>
                  {item.name} · {item.source}
                </Text>
              ))}
            </>
          )}
          {screen === "Niko" && (
            <>
              <Panel companion>
                <Text style={styles.nikoLabel}>◈ NIKO / YOUR SIDEKICK</Text>
                <Text style={styles.niko}>
                  I learn from the steps you take. Tell me what helps.
                </Text>
              </Panel>
              <Text style={styles.body}>
                Learning stays on this iPhone. No language model is connected in
                this build.
              </Text>
              {player.sidekick.snippets.map((note) => (
                <Panel key={note.id}>
                  <Text style={styles.body}>{note.text}</Text>
                </Panel>
              ))}
              <Action onPress={() => open("memory")}>
                Tell Niko something
              </Action>
              <Action
                subdued
                onPress={() =>
                  Alert.alert(
                    "Reset Niko’s memory?",
                    "Your quests, XP, and skills remain.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Reset memory",
                        style: "destructive",
                        onPress: () => send({ type: "reset-memory" }),
                      },
                    ],
                  )
                }
              >
                Reset memory
              </Action>
              <Action
                subdued
                onPress={() => {
                  void Share.share({
                    message: serializeGame(snapshot),
                    title: "QuestOS save",
                  });
                }}
              >
                Share save
              </Action>
              <Action
                subdued
                onPress={() =>
                  send({ type: "settings", settings: { driving: true } })
                }
              >
                Driving mode
              </Action>
            </>
          )}
        </ScrollView>
      )}
      <Modal
        visible={O.isSome(candidate)}
        transparent
        animationType="fade"
        onRequestClose={() => send({ type: "retain-mission" })}
      >
        <View style={styles.overlay}>
          <Panel>
            <Text style={styles.label}>CHOOSE YOUR PRIORITY</Text>
            <Text style={styles.heading}>
              {O.match(
                candidate,
                () => "",
                (quest) => quest.title,
              )}
            </Text>
            <Text style={styles.body}>Give this quest your attention now?</Text>
            <Action
              onPress={() => {
                if (O.isSome(candidate))
                  send({ type: "choose-mission", questId: candidate.value.id });
              }}
            >
              Make this my mission
            </Action>
            <Action subdued onPress={() => send({ type: "retain-mission" })}>
              Keep my current direction
            </Action>
          </Panel>
        </View>
      </Modal>
      <Modal
        visible={O.isSome(form)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setForm(O.none())}
      >
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>
              QUESTOS / NEW {formName.toUpperCase()}
            </Text>
            <Text style={styles.heading}>
              {formName === "memory"
                ? "What should Niko remember?"
                : `Name your ${formName}`}
            </Text>
            <TextInput
              accessibilityLabel="Name or memory"
              value={title}
              onChangeText={setTitle}
              placeholder="Start here…"
              placeholderTextColor={tokens.color.muted}
              style={styles.input}
              maxLength={formName === "memory" ? 600 : 100}
              multiline={formName === "memory"}
            />
            {(formName === "quest" ||
              formName === "realm" ||
              formName === "dungeon") && (
              <TextInput
                accessibilityLabel={
                  formName === "quest" ? "Next move" : "Details"
                }
                value={detail}
                onChangeText={setDetail}
                placeholder={
                  formName === "quest"
                    ? "One concrete next move…"
                    : "Location or details…"
                }
                placeholderTextColor={tokens.color.muted}
                style={styles.input}
                multiline
                maxLength={500}
              />
            )}
            <Action onPress={submit}>Save</Action>
            <Action subdued onPress={() => setForm(O.none())}>
              Cancel
            </Action>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Game />
    </SafeAreaProvider>
  );
}
