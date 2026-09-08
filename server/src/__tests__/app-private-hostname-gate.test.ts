import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createChatReconciliationCoordinator,
  shouldEnablePrivateHostnameGuard,
} from "../app.ts";

describe("createChatReconciliationCoordinator", () => {
  it("wires periodic publication reconciliation to bounded scheduled refill rather than awaiting provider sends", () => {
    const source = readFileSync(new URL("../app.ts", import.meta.url), "utf8");
    const flush = source.slice(
      source.indexOf("const flushChatPublications ="),
      source.indexOf("const flushChatPublications =") + 600,
    );
    expect(flush).toContain("await chatChannels.schedulePendingPublications()");
    expect(flush).not.toContain("chatChannels.processPendingPublications()");
    // The service integration tests hold real publication workers while this
    // scheduled method returns; app shutdown must also join those workers.
    expect(source).toContain("await chatChannels.shutdown()");
  });

  it("keeps slow optional recovery from suppressing later publication sweeps", async () => {
    let releaseDelivery!: () => void;
    let releaseSlackStatus!: () => void;
    const deliveryReleased = new Promise<void>((resolve) => {
      releaseDelivery = resolve;
    });
    const slackStatusReleased = new Promise<void>((resolve) => {
      releaseSlackStatus = resolve;
    });
    const reconcileProviderRuntimes = vi.fn(async () => undefined);
    const processPendingDeliveries = vi.fn(async () => deliveryReleased);
    const flushPublications = vi.fn(async () => undefined);
    const processPendingSlackFileUploadReceipts = vi.fn(async () => undefined);
    const processPendingSlackSessionSyncs = vi.fn(
      async () => slackStatusReleased,
    );
    const onError = vi.fn();
    const coordinator = createChatReconciliationCoordinator({
      reconcileProviderRuntimes,
      processPendingDeliveries,
      flushPublications,
      processPendingSlackFileUploadReceipts,
      processPendingSlackSessionSyncs,
      onError,
    });

    coordinator.reconcile();
    await vi.waitFor(() => {
      expect(reconcileProviderRuntimes).toHaveBeenCalledTimes(1);
      expect(processPendingDeliveries).toHaveBeenCalledTimes(1);
      expect(flushPublications).toHaveBeenCalledTimes(1);
      expect(processPendingSlackFileUploadReceipts).toHaveBeenCalledTimes(1);
      expect(processPendingSlackSessionSyncs).toHaveBeenCalledTimes(1);
    });
    coordinator.reconcile();
    await vi.waitFor(() => {
      expect(reconcileProviderRuntimes).toHaveBeenCalledTimes(2);
      expect(flushPublications).toHaveBeenCalledTimes(2);
      expect(processPendingSlackFileUploadReceipts).toHaveBeenCalledTimes(2);
    });
    expect(processPendingDeliveries).toHaveBeenCalledTimes(1);
    expect(processPendingSlackSessionSyncs).toHaveBeenCalledTimes(1);

    releaseDelivery();
    releaseSlackStatus();
    await coordinator.drain();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "joins the independent Slack file receipt lane at shutdown (rejects: %s)",
    async (rejects) => {
      let releaseReceipt!: () => void;
      const receiptReleased = new Promise<void>((resolve) => {
        releaseReceipt = resolve;
      });
      const lookupError = new Error("receipt lookup failed");
      const processPendingSlackFileUploadReceipts = vi
        .fn(async () => undefined)
        .mockImplementationOnce(async () => {
          await receiptReleased;
          if (rejects) throw lookupError;
        });
      const reconcileProviderRuntimes = vi.fn(async () => undefined);
      const processPendingDeliveries = vi.fn(async () => undefined);
      const flushPublications = vi.fn(async () => undefined);
      const processPendingSlackSessionSyncs = vi.fn(async () => undefined);
      const onError = vi.fn();
      const coordinator = createChatReconciliationCoordinator({
        reconcileProviderRuntimes,
        processPendingDeliveries,
        flushPublications,
        processPendingSlackFileUploadReceipts,
        processPendingSlackSessionSyncs,
        onError,
      });
      let draining: Promise<void> | undefined;
      try {
        coordinator.reconcile();
        await vi.waitFor(() => {
          expect(processPendingSlackFileUploadReceipts).toHaveBeenCalledTimes(
            1,
          );
          expect(flushPublications).toHaveBeenCalledTimes(1);
        });
        coordinator.reconcile();
        await vi.waitFor(() => {
          expect(reconcileProviderRuntimes).toHaveBeenCalledTimes(2);
          expect(processPendingDeliveries).toHaveBeenCalledTimes(2);
          expect(flushPublications).toHaveBeenCalledTimes(2);
          expect(processPendingSlackSessionSyncs).toHaveBeenCalledTimes(2);
        });
        expect(processPendingSlackFileUploadReceipts).toHaveBeenCalledTimes(1);

        let drained = false;
        draining = coordinator.drain().then(() => {
          drained = true;
        });
        // Flush the promise queue, not a wall-clock delay: the held receipt
        // must still be part of shutdown's joined work after other lanes end.
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(drained).toBe(false);
        expect(onError).not.toHaveBeenCalled();

        releaseReceipt();
        await draining;
        expect(drained).toBe(true);
        expect(onError).toHaveBeenCalledTimes(rejects ? 1 : 0);
        if (rejects) {
          expect(onError).toHaveBeenCalledWith(
            "Slack file receipts",
            lookupError,
          );
        }

        // A completed or failed lookup releases only its own single-flight
        // slot; the next ordinary reconciliation can recover another receipt.
        coordinator.reconcile();
        await coordinator.drain();
        expect(processPendingSlackFileUploadReceipts).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenCalledTimes(rejects ? 1 : 0);
      } finally {
        releaseReceipt();
        await draining;
        await coordinator.drain();
      }
    },
  );
});

describe("shouldEnablePrivateHostnameGuard", () => {
  it("enables the hostname guard for local_trusted private deployments", () => {
    expect(
      shouldEnablePrivateHostnameGuard({
        deploymentMode: "local_trusted",
        deploymentExposure: "private",
      }),
    ).toBe(true);
  });

  it("does not enable the hostname guard for local_trusted public deployments", () => {
    expect(
      shouldEnablePrivateHostnameGuard({
        deploymentMode: "local_trusted",
        deploymentExposure: "public",
      }),
    ).toBe(false);
  });

  it("enables the hostname guard for authenticated private deployments", () => {
    expect(
      shouldEnablePrivateHostnameGuard({
        deploymentMode: "authenticated",
        deploymentExposure: "private",
      }),
    ).toBe(true);
  });

  it("does not enable the hostname guard for authenticated public deployments", () => {
    expect(
      shouldEnablePrivateHostnameGuard({
        deploymentMode: "authenticated",
        deploymentExposure: "public",
      }),
    ).toBe(false);
  });
});
