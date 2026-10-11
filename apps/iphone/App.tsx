import { createMemorySnippetArchive } from "../../packages/application/src/snippet-archive";
import { Action, Panel, styles } from "./ui";
import { Body, H1, H2, H3, H4, Label } from "./type";
import { useGameFonts } from "./fonts";
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
  createMemorySnippetArchive(),
  "iphone",
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
  const [fontsReady, fontError] = useGameFonts();
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
  if ((!fontsReady && fontError == null) || !O.isSome(store.game))
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
          <H1>Eyes on the road.</H1>
          <Body>Park before using game controls.</Body>
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
              <Body>
                Your unreadable save is preserved. Share the original before
                replacing it.
              </Body>
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
              <H1>{"One quest.\nOne real move."}</H1>
              <Panel companion>
                <Label voice="companion">NIKO / YOUR SIDEKICK</Label>
                <Body voice="companion">{view.guidance}</Body>
              </Panel>
              {player.operation.phase === "review" ? (
                <Panel>
                  <H2>Take a breath.</H2>
                  <Body>What matters next?</Body>
                  <Action onPress={() => send({ type: "finish-review" })}>
                    Choose the next quest
                  </Action>
                </Panel>
              ) : (
                <Panel>
                  <H2>How are you feeling?</H2>
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
                  <H4>{offerTitle}</H4>
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
                  <H4>{mission.value.title}</H4>
                  <Body>{mission.value.nextMove || mission.value.detail}</Body>
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
                  <H2>
                    {view.quests.some((q) => q.status === "pending")
                      ? "Choose what matters."
                      : "Pray for a quest."}
                  </H2>
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
              <H1>{"Places worth\nreturning to."}</H1>
              {player.realms.map((realm) => (
                <Panel key={realm.id}>
                  <H4>
                    {realm.name}
                    {realm.home ? " · home" : ""}
                  </H4>
                  <Body>{realm.location}</Body>
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
              <H3>Dungeons in {view.realm.name}</H3>
              {view.dungeons.map((dungeon) => (
                <Panel key={dungeon.id}>
                  <H4>{dungeon.name}</H4>
                  <Body>{dungeon.subtitle}</Body>
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
              <H1>Your next move.</H1>
              <Action onPress={() => open("quest")}>Write a quest</Action>
              {!view.quests.length && (
                <Body>
                  Pray for a quest. When something matters, write it here.
                </Body>
              )}
              {view.quests.map((quest) => (
                <Panel key={quest.id}>
                  <Text style={styles.label}>
                    {quest.status.toUpperCase()} / {quest.xp} XP
                  </Text>
                  <H4>{quest.title}</H4>
                  <Body>{quest.nextMove || quest.detail}</Body>
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
              <H1>Keep showing up.</H1>
              {view.skills.map((skill) => (
                <Panel key={skill.id}>
                  <H4>{skill.name}</H4>
                  <Body>
                    Level {skill.currentLevel} · Potential{" "}
                    {skill.potentialLevel} · Readiness{" "}
                    {Math.round(skill.readiness)}%
                  </Body>
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
              <H3>Inventory</H3>
              {view.inventory.map((item, index) => (
                <Body key={`${index}_${item}`}>
                  {item.name} · {item.source}
                </Body>
              ))}
            </>
          )}
          {screen === "Niko" && (
            <>
              <Panel companion>
                <Label voice="companion">NIKO / YOUR SIDEKICK</Label>
                <Body voice="companion">
                  I learn from the steps you take. Tell me what helps.
                </Body>
              </Panel>
              <Body>
                Learning stays on this iPhone. No language model is connected in
                this build.
              </Body>
              {player.sidekick.snippets
                .filter((note) => O.isNone(note.deletedAt))
                .map((note) => (
                  <Panel key={note.id}>
                    <Body>{note.text}</Body>
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
            <H2>
              {O.match(
                candidate,
                () => "",
                (quest) => quest.title,
              )}
            </H2>
            <Body>Give this quest your attention now?</Body>
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
            <H2>
              {formName === "memory"
                ? "What should Niko remember?"
                : `Name your ${formName}`}
            </H2>
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
