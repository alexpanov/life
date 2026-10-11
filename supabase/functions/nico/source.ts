import { handleNicoEdge } from "../../../packages/infrastructure/src/nico-edge.ts";

declare const Deno: {
  readonly serve: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
  readonly env: {
    readonly get: (name: string) => string | undefined;
  };
};

Deno.serve((request) =>
  handleNicoEdge(request, (name) => Deno.env.get(name)),
);
