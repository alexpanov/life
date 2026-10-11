export class NicoEnergyError extends Error {
  readonly _tag = "NicoEnergyError";
}
/** A controller-local capability. The controller checks object identity before consuming it. */
export interface NicoEnergyReservation {
  readonly heroId: string;
  readonly nicoId: string;
  readonly requestId: string;
  readonly day: number;
}
