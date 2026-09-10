export {};

import type { Actor } from "../auth/actor.js";

declare global {
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}
