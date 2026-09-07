import { describe, expect, it, vi } from "vitest";
import {
  createChatReconciliationCoordinator,
  shouldEnablePrivateHostnameGuard,
} from "../app.ts";

describe("createChatReconciliationCoordinator", () => {
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
    const processPendingSlackSessionSyncs = vi.fn(
      async () => slackStatusReleased,
    );
    const onError = vi.fn();
    const coordinator = createChatReconciliationCoordinator({
      reconcileProviderRuntimes,
      processPendingDeliveries,
      flushPublications,
      processPendingSlackSessionSyncs,
      onError,
    });

    coordinator.reconcile();
    await vi.waitFor(() => {
      expect(reconcileProviderRuntimes).toHaveBeenCalledTimes(1);
      expect(processPendingDeliveries).toHaveBeenCalledTimes(1);
      expect(flushPublications).toHaveBeenCalledTimes(1);
      expect(processPendingSlackSessionSyncs).toHaveBeenCalledTimes(1);
    });
    coordinator.reconcile();
    await vi.waitFor(() => {
      expect(reconcileProviderRuntimes).toHaveBeenCalledTimes(2);
      expect(flushPublications).toHaveBeenCalledTimes(2);
    });
    expect(processPendingDeliveries).toHaveBeenCalledTimes(1);
    expect(processPendingSlackSessionSyncs).toHaveBeenCalledTimes(1);

    releaseDelivery();
    releaseSlackStatus();
    await coordinator.drain();
    expect(onError).not.toHaveBeenCalled();
  });
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
