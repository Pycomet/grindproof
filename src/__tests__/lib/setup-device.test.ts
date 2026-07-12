import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getPlatform,
  isStandalone,
  selectSetupScreen,
  type SetupSignals,
} from "@/lib/setup/device";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

describe("getPlatform", () => {
  it("detects iPhone Safari", () => {
    expect(getPlatform(IPHONE_SAFARI)).toBe("ios-safari");
  });
  it("detects iOS in-app/non-Safari browsers as ios-inapp", () => {
    expect(getPlatform(IPHONE_INSTAGRAM)).toBe("ios-inapp");
    expect(getPlatform(IPHONE_CHROME)).toBe("ios-inapp");
  });
  it("detects Android and desktop", () => {
    expect(getPlatform(ANDROID_CHROME)).toBe("android");
    expect(getPlatform(MAC_CHROME)).toBe("desktop");
  });
});

describe("selectSetupScreen", () => {
  const base: SetupSignals = {
    platform: "ios-safari",
    standalone: false,
    subscribed: false,
    testPushConfirmed: false,
  };

  it("sends iOS in-app browsers to wrong-browser regardless of other signals", () => {
    expect(selectSetupScreen({ ...base, platform: "ios-inapp" })).toBe("wrong-browser");
  });
  it("sends uninstalled iPhone Safari users to install", () => {
    expect(selectSetupScreen(base)).toBe("install");
  });
  it("sends installed-but-unsubscribed users to enable-notifications", () => {
    expect(selectSetupScreen({ ...base, standalone: true })).toBe("enable-notifications");
  });
  it("does not require install on android/desktop", () => {
    expect(selectSetupScreen({ ...base, platform: "android" })).toBe("enable-notifications");
    expect(selectSetupScreen({ ...base, platform: "desktop" })).toBe("enable-notifications");
  });
  it("sends subscribed users to test-push until confirmed", () => {
    expect(
      selectSetupScreen({ ...base, standalone: true, subscribed: true })
    ).toBe("test-push");
  });
  it("returns done when everything is verified", () => {
    expect(
      selectSetupScreen({
        ...base,
        standalone: true,
        subscribed: true,
        testPushConfirmed: true,
      })
    ).toBe("done");
  });
});

describe("isStandalone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window.navigator as any).standalone;
  });

  it("returns true when matchMedia reports (display-mode: standalone) matches", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    expect(isStandalone()).toBe(true);
  });

  it("returns true via legacy fallback when matchMedia reports no match but navigator.standalone is true", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    Object.defineProperty(window.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isStandalone()).toBe(true);
  });

  it("returns false when neither matchMedia nor navigator.standalone signal standalone mode", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    Object.defineProperty(window.navigator, "standalone", {
      value: false,
      configurable: true,
    });
    expect(isStandalone()).toBe(false);
  });
});
