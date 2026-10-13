import type { KeyboardEvent, ReactNode } from "react";
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
  submitOnEnter = false,
  labelledBy,
  required = false,
  maxLength,
  rows = 4,
}: {
  name: string;
  label: string;
  value?: string;
  submitOnEnter?: boolean;
  labelledBy?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!submitOnEnter) return;
    const native = event.nativeEvent;
    if (native.isComposing || native.keyCode === 229) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (event.repeat) return;
    event.currentTarget.form?.requestSubmit();
  }
  return (
    <label className="field">
      {labelledBy ? null : label}
      <textarea
        name={name}
        defaultValue={value}
        maxLength={maxLength ?? (name === "json" ? 2000000 : 2000)}
        rows={rows}
        required={required}
        aria-labelledby={labelledBy}
        onKeyDown={submitOnEnter ? onKeyDown : undefined}
      />
    </label>
  );
}
