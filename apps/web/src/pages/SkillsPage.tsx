import { Activity } from "lucide-react";
import { Panel } from "../components/presentation";
import { Button } from "../components/ui/button";
import type { PageActions, GameView } from "../ui-types";
export function SkillsPage({
  view,
  send,
  open,
}: PageActions & { view: GameView }) {
  return (
    <>
      <div className="page-heading">
        <small>PRACTICE / RECOVER / RETURN</small>
        <h1>Your skills.</h1>
        <p>Potential records practice. Readiness changes with time.</p>
        <Button onClick={() => open("skill")}>New skill</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {view.skills.map((s) => (
          <Panel key={s.id} title={s.name}>
            <div className="skill-level">
              <Activity />
              <strong>{s.currentLevel}</strong>
              <span>LEVEL / {s.potentialLevel} POTENTIAL</span>
            </div>
            <progress value={s.readiness} max="100" />
            <p>
              {Math.round(s.readiness)}% readiness · {s.xp} XP{" "}
              {s.paused ? "· Recovery mode" : ""}
            </p>
            <div className="actions">
              <Button
                disabled={s.paused}
                onClick={() => open("practice", s.id)}
              >
                Log practice
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  send({
                    type: "pause-skill",
                    skillId: s.id,
                    paused: !s.paused,
                  })
                }
              >
                {s.paused ? "Resume" : "Recovery"}
              </Button>
              <Button variant="ghost" onClick={() => open("skill", s.id)}>
                Settings
              </Button>
              {s.sessions.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => send({ type: "undo-practice", skillId: s.id })}
                >
                  Undo last
                </Button>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
