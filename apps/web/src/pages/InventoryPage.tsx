import { Package } from "lucide-react";
import { Panel } from "../components/presentation";
import { Button } from "../components/ui/button";
import type { PageActions, GameView } from "../ui-types";
export function InventoryPage({
  view,
  open,
}: PageActions & { view: GameView }) {
  return (
    <>
      <div className="page-heading">
        <small>ACTUAL LOOT / PERMANENT RECORD</small>
        <h1>Inventory.</h1>
        <p>{view.inventory.length} items acquired.</p>
        <Button onClick={() => open("loot")}>Add existing item</Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {view.inventory.map((item, index) => (
          <Panel key={`${item.name}-${index}`}>
            <Package className="text-cyan-200 mb-4" />
            <h3>{item.name}</h3>
            <small>{item.source}</small>
          </Panel>
        ))}
      </div>
    </>
  );
}
