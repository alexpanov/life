import { Panel } from "../components/presentation";
import {
  Button,
  gridSm,
  Package,
} from "../../../../packages/design/src/index";
import { H1, H4 } from "../../../../packages/design/src/type";
import type { PageActions, GameView } from "../ui-types";
export function InventoryPage({
  view,
  open,
}: PageActions & { view: GameView }) {
  return (
    <>
      <div className="page-heading">
        <small>ACTUAL LOOT / PERMANENT RECORD</small>
        <H1>Inventory.</H1>
        <p>{view.inventory.length} items acquired.</p>
        <Button onClick={() => open("loot")}>Add existing item</Button>
      </div>
      <div className={gridSm}>
        {view.inventory.map((item, index) => (
          <Panel key={`${item.name}-${index}`}>
            <Package />
            <H4>{item.name}</H4>
            <small>{item.source}</small>
          </Panel>
        ))}
      </div>
    </>
  );
}
