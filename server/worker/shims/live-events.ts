/**
 * Bundle-time replacement for `services/live-events.ts` (see worker/build.mjs).
 *
 * On Node the service is an in-process EventEmitter that the live-events
 * WebSocket server subscribes to. A Worker isolate has no long-lived process,
 * so publishing hands the event to the company's LiveEventsRoom Durable Object
 * (worker/live-events.ts), which holds the browsers' WebSockets. The sink is
 * request-scoped (AsyncLocalStorage, set by the /api/* middleware); a publish
 * outside a request is dropped, like an emit with no listener.
 *
 * Same exports as the real module. Subscribing in-process has no consumer on
 * the Worker (the WebSocket server that did is Node-only) and returns a no-op.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { LiveEvent, LiveEventType } from "@paperclipai/shared";

type LiveEventPayload = Record<string, unknown>;
type LiveEventListener = (event: LiveEvent) => void;
export type LiveEventSink = (event: Omit<LiveEvent, "id">) => void;

export const liveEventSink = new AsyncLocalStorage<LiveEventSink>();

let nextEventId = 0;

function toLiveEvent(input: { companyId: string; type: LiveEventType; payload?: LiveEventPayload }): LiveEvent {
  nextEventId += 1;
  return {
    id: nextEventId,
    companyId: input.companyId,
    type: input.type,
    createdAt: new Date().toISOString(),
    payload: input.payload ?? {},
  };
}

export function publishLiveEvent(input: { companyId: string; type: LiveEventType; payload?: LiveEventPayload }) {
  const event = toLiveEvent(input);
  // The room assigns the id the browsers see (monotonic per company).
  const { id: _localId, ...forRoom } = event;
  liveEventSink.getStore()?.(forRoom);
  return event;
}

export function publishGlobalLiveEvent(input: { type: LiveEventType; payload?: LiveEventPayload }) {
  // Node's WebSocket server only subscribes per company, so global events never
  // reach a browser there either; nothing to forward.
  return toLiveEvent({ companyId: "*", type: input.type, payload: input.payload });
}

export function subscribeCompanyLiveEvents(_companyId: string, _listener: LiveEventListener) {
  return () => {};
}

export function subscribeGlobalLiveEvents(_listener: LiveEventListener) {
  return () => {};
}
