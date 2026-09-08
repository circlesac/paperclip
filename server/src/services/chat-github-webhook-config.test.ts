import { describe, expect, it, vi } from "vitest";
import { resyncGitHubAppWebhook } from "./chat-github-webhook-config.js";

const webhookUrl =
  "https://paperclip.example:8443/api/chat-webhooks/public-id/github";
const appToken = "test-app-jwt-private";
const webhookSecret = "test-webhook-secret-private";
const config = { url: webhookUrl, content_type: "json", insecure_ssl: "0" };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

function resync(fetch: typeof globalThis.fetch, url = webhookUrl) {
  return resyncGitHubAppWebhook({
    fetch,
    appToken,
    webhookSecret,
    webhookUrl: url,
  });
}

describe("GitHub App webhook reconnect", () => {
  it.each(["0", 0])(
    "reconciles only callback settings and accepts secure SSL %s",
    async (ssl) => {
      const fetch = vi.fn(async () =>
        json({ ...config, insecure_ssl: ssl, secret: "********" }),
      );
      await expect(resync(fetch)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/app/hook/config",
        {
          method: "PATCH",
          redirect: "error",
          signal: expect.any(AbortSignal),
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${appToken}`,
            "content-type": "application/json",
            "x-github-api-version": "2022-11-28",
          },
          body: JSON.stringify({ ...config, secret: webhookSecret }),
        },
      );
    },
  );

  it.each([302, 401, 403, 429, 500])(
    "does not expose provider bodies on HTTP %s",
    async (status) => {
      const fetch = vi.fn(async () =>
        json({ message: `${appToken} ${webhookSecret}` }, status),
      );
      const failure = await resync(fetch).catch(
        (error: Error) => error.message,
      );
      expect(failure).toContain(`HTTP ${status}`);
      expect(failure).not.toContain(appToken);
      expect(failure).not.toContain(webhookSecret);
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("does not leak fetch/timeout details or automatically retry an uncertain mutation", async () => {
    const fetch = vi.fn(async () => {
      throw new Error(`${appToken} ${webhookSecret}`);
    });
    await expect(resync(fetch)).rejects.toThrow(
      "configuration could not be confirmed",
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([
    { ...config, url: "https://unexpected.example/private-secret" },
    { ...config, content_type: "form" },
    { ...config, insecure_ssl: "1" },
    { ...config, insecure_ssl: false },
    {},
  ])(
    "fails closed when the applied configuration does not match",
    async (value) => {
      await expect(resync(async () => json(value))).rejects.toThrow(
        "did not confirm the expected secure Paperclip webhook",
      );
    },
  );

  it.each(["not-json-private-secret", "[]", "null", " ".repeat(32_769)])(
    "rejects unreadable/oversized successful bodies without echoing them",
    async (body) => {
      await expect(resync(async () => new Response(body))).rejects.toThrow(
        "GitHub returned an unreadable webhook configuration",
      );
    },
  );

  it.each([
    "http://paperclip.example/hook",
    "https://user:password@paperclip.example/hook",
    "https://paperclip.example/hook?private=secret",
    "https://paperclip.example/hook#secret",
  ])(
    "rejects unsafe callback inputs before sending credentials",
    async (url) => {
      const fetch = vi.fn(async () => json(config));
      await expect(resync(fetch, url)).rejects.toThrow(
        "configuration is incomplete",
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
