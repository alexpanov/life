import { Plus, Compass } from "lucide-react";
import { Panel, Sender } from "../components/presentation";
import { Button } from "../components/ui/button";
import { QuestCard } from "../components/quest-card";
import type { PageActions, GameView } from "../ui-types";
export function BoardPage({
  view,
  send,
  open,
  missionId,
}: PageActions & { view: GameView; missionId: string }) {
  const { realm, campaign } = view;
  return (
    <>
      <div className="page-heading">
        <Sender />
        <small>
          {realm.name} / {campaign.name}
        </small>
        <h1>{campaign.subtitle || campaign.name}</h1>
        <p>
          {view.progress.done} / {view.progress.total} main objectives secured ·{" "}
          {view.xp} XP · Rank {view.rank}
        </p>
        <Button onClick={() => open("quest")}>
          <Plus size={15} />
          Add quest
        </Button>
      </div>
      <Panel title="Quest board">
        {campaign.quests.length ? (
          campaign.quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              missionId={missionId}
              onCommand={send}
              onEdit={(id) => open("quest", id)}
              onBlock={(id) => open("blocked", id)}
            />
          ))
        ) : (
          <div className="empty">
            <Compass size={32} />
            <h2>Pray for a quest.</h2>
            <p>Or create one real-world objective.</p>
          </div>
        )}
      </Panel>
    </>
  );
}
