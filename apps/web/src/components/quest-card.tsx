import { ArrowRight, Check } from "lucide-react";
import type { Quest, Command } from "../../../../packages/core/src/index";
import { Button } from "./ui/button";
import { H4 } from "../../../../packages/design/src/type";
export function QuestCard({
  quest: q,
  missionId,
  onCommand,
  onEdit,
  onBlock,
}: {
  quest: Quest;
  missionId: string;
  onCommand: (command: Command) => boolean;
  onEdit: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  return (
    <article key={q.id} className="quest-card">
      <div className="flex justify-between gap-4">
        <div>
          <small>
            {q.category.toUpperCase()} /{" "}
            {q.status === "done"
              ? "SECURED"
              : q.status === "impossible"
                ? "CLOSED"
                : q.id === missionId
                  ? "CURRENT MISSION"
                  : "OPEN"}
          </small>
          <H4>{q.title}</H4>
        </div>
        <span className="xp">{q.xp} XP</span>
      </div>
      <p>{q.nextMove || q.detail || "One real action. Then report back."}</p>
      {q.blockedReason && <p className="text-amber-200">{q.blockedReason}</p>}
      <div className="actions">
        {q.status === "pending" ? (
          <>
            <Button
              variant={q.id === missionId ? "secondary" : "default"}
              onClick={() =>
                onCommand({ type: "propose-mission", questId: q.id })
              }
            >
              {q.id === missionId ? "Resume" : "Take quest"}
              <ArrowRight size={14} />
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                onCommand({ type: "set-status", questId: q.id, status: "done" })
              }
            >
              <Check size={14} />
              Complete
            </Button>
            <Button variant="ghost" onClick={() => onBlock(q.id)}>
              Impossible
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() =>
              onCommand({
                type: "set-status",
                questId: q.id,
                status: "pending",
              })
            }
          >
            Reopen
          </Button>
        )}
        <Button variant="ghost" onClick={() => onEdit(q.id)}>
          Inspect / edit
        </Button>
      </div>
    </article>
  );
}
