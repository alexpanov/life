import type { ReactNode } from "react";
import { Cpu, Radio, UserRound } from "../../../../packages/design/src/index";
import {
  senderLabels,
  type MessageSource,
} from "../../../../packages/design/src/tokens";
import { H3 } from "../../../../packages/design/src/type";
export function Sender({
  source = "system",
  name,
}: {
  source?: MessageSource;
  name?: string;
}) {
  const Icon =
    source === "niko" ? UserRound : source === "dispatch" ? Radio : Cpu;
  return (
    <span className={`sender ${source}`}>
      <Icon size={14} />
      {name
        ? `${name} / GAME DISPATCH`
        : source === "niko"
          ? "Niko · Your sidekick"
          : senderLabels[source]}
    </span>
  );
}
export function Panel({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      {title && (
        <header className="panel-head">
          <H3>{title}</H3>
          {action}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Field({
  name,
  label,
  value = "",
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={type === "text" ? 600 : undefined}
      />
    </label>
  );
}
export function Area({
  name,
  label,
  value = "",
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <label className="field">
      {label}
      <textarea
        name={name}
        defaultValue={value}
        maxLength={name === "json" ? 2000000 : 2000}
        rows={4}
      />
    </label>
  );
}
