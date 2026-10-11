import { ArrowRight, Plus } from "lucide-react";
import { Panel } from "../components/presentation";
import { Button } from "../components/ui/button";
import type { PageActions, GameView } from "../ui-types";
export function RealmsPage({
  view,
  send,
  open,
}: PageActions & { view: GameView }) {
  const { player, realm } = view;
  return (
    <>
      <div className="page-heading">
        <small>RETURN WHEN YOU ARE READY</small>
        <h1>Your realms.</h1>
        <p>Places, dungeons, and unfinished business.</p>
        <Button onClick={() => open("realm")}>
          <Plus size={15} />
          New realm
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {player.realms.map((r) => (
          <details key={r.id} className="quiet-details">
            <summary>{r.name}</summary>
            <small>
              {r.id === realm.id ? "CURRENT" : r.home ? "HOME" : "REALM"}
            </small>
            <h2 className="text-2xl my-3">{r.name}</h2>
            <p>{r.location}</p>
            <div className="actions">
              <Button
                variant="secondary"
                onClick={() => send({ type: "enter-realm", realmId: r.id })}
              >
                Return to realm
              </Button>
              <Button variant="ghost" onClick={() => open("realm", r.id)}>
                Edit
              </Button>
            </div>
          </details>
        ))}
      </div>
      <Panel
        title={`${realm.name} / Dungeons`}
        action={
          <Button variant="ghost" onClick={() => open("dungeon")}>
            <Plus size={14} />
            New
          </Button>
        }
      >
        {view.dungeons.map((d) => (
          <div key={d.id} className="dungeon">
            <h3>{d.name}</h3>
            <p>{d.subtitle}</p>
            <Button
              variant="secondary"
              onClick={() => send({ type: "open-dungeon", campaignId: d.id })}
            >
              Open dungeon
              <ArrowRight size={14} />
            </Button>
          </div>
        ))}
      </Panel>
    </>
  );
}
