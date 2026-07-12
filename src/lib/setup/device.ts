export type Platform = "ios-safari" | "ios-inapp" | "android" | "desktop";

export type SetupScreen =
  | "install"
  | "wrong-browser"
  | "enable-notifications"
  | "test-push"
  | "done";

export interface SetupSignals {
  platform: Platform;
  standalone: boolean;
  subscribed: boolean;
  testPushConfirmed: boolean;
}

// Non-Safari iOS browsers (Chrome/Firefox/in-app webviews) cannot install a
// PWA to the Home Screen, which is the only way iOS allows web push.
const IOS_NON_SAFARI =
  /Instagram|FBAN|FBAV|FB_IAB|Twitter|TikTok|Snapchat|Line\/|GSA\/|CriOS|FxiOS|EdgiOS|OPT\//;

export function getPlatform(ua: string): Platform {
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  if (!isIOS) return /Android/.test(ua) ? "android" : "desktop";
  return IOS_NON_SAFARI.test(ua) ? "ios-inapp" : "ios-safari";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (
    "standalone" in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function selectSetupScreen(s: SetupSignals): SetupScreen {
  if (s.platform === "ios-inapp") return "wrong-browser";
  if (s.platform === "ios-safari" && !s.standalone) return "install";
  if (!s.subscribed) return "enable-notifications";
  if (!s.testPushConfirmed) return "test-push";
  return "done";
}
