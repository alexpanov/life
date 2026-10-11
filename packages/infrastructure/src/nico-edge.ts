import {
  handleNicoGateway,
  type ModelFetch,
  type ModelGatewayEnv,
} from "./model-gateway.ts";

const ACTION = /^(?:\/functions\/v1)?\/(?:api\/)?nico\/(status|propose)$/;

/**
 * Map the Supabase function URL onto the paths the Sites worker already uses.
 * An unmatched path is left alone so the gateway rejects it.
 */
export function nicoEdgeRequest(request: Request): Request {
  const url = new URL(request.url);
  const path =
    url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const action = ACTION.exec(path)?.[1];
  if (action !== "status" && action !== "propose") return request;
  if (path === `/api/nico/${action}`) return request;
  const next = new URL(request.url);
  next.pathname = `/api/nico/${action}`;
  return new Request(next, request);
}

const ENV_NAMES = [
  "LIFE_LLM_PROTOCOL",
  "LIFE_LLM_ENDPOINT",
  "LIFE_LLM_MODEL",
  "LIFE_LLM_API_KEY",
  "LIFE_LLM_ALLOWED_USER_ID",
] as const;

export type EdgeEnvName = (typeof ENV_NAMES)[number];

export function modelEnvFromEdge(
  read: (name: EdgeEnvName) => string | undefined,
): ModelGatewayEnv {
  return {
    LIFE_LLM_PROTOCOL: read("LIFE_LLM_PROTOCOL"),
    LIFE_LLM_ENDPOINT: read("LIFE_LLM_ENDPOINT"),
    LIFE_LLM_MODEL: read("LIFE_LLM_MODEL"),
    LIFE_LLM_API_KEY: read("LIFE_LLM_API_KEY"),
    LIFE_LLM_ALLOWED_USER_ID: read("LIFE_LLM_ALLOWED_USER_ID"),
  };
}

/** Same gateway as the Sites worker. The request cannot prove the caller. */
export function handleNicoEdge(
  request: Request,
  read: (name: EdgeEnvName) => string | undefined,
  fetcher?: ModelFetch,
): Promise<Response> {
  const edgeRequest = nicoEdgeRequest(request);
  const env = modelEnvFromEdge(read);
  return fetcher
    ? handleNicoGateway(edgeRequest, env, fetcher)
    : handleNicoGateway(edgeRequest, env);
}
