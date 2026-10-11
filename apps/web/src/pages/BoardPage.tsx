import { Link } from "react-router";
import { Button } from "../components/ui/button";
import type { PageActions, GameView } from "../ui-types";
export function BoardPage({
  view,
  open,
  missionId,
}: PageActions & { view: GameView; missionId: string }) {
  const { campaign, realm } = view;
  return (
    <>
      <div className="page-heading">
        <small>{realm.name}</small>
        <h1>Quests.</h1>
        <Button onClick={() => open("quest")}>Add quest</Button>
      </div>
      <nav className="menu-links" aria-label="Quests">
        {campaign.quests.map((q) => (
          <Link key={q.id} to={`/quest/${q.id}`}>
            <span>
              {q.title}
              <small>
                {q.status === "done"
                  ? "Completed"
                  : q.status === "impossible"
                    ? "Closed"
                    : q.id === missionId
                      ? "Current quest"
                      : "Open"}
              </small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>
      {!campaign.quests.length && (
        <p>Pray for a quest. Or add something you want to do.</p>
      )}
    </>
  );
}
