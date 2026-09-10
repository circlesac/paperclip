export {};

import type { Actor } from "./actor.js";

declare global {
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}
