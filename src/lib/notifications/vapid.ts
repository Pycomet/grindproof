/**
 * Converts a base64url-encoded VAPID public key into a Uint8Array.
 *
 * `PushManager.subscribe()` accepts `applicationServerKey` as either a
 * base64url string or a BufferSource. Passing the raw string throws
 * `InvalidCharacterError`/`InvalidAccessError` on WebKit versions that never
 * added string support (iOS Safari's implementation has historically only
 * accepted a BufferSource). Converting to a Uint8Array here is universally
 * compatible and costs nothing on browsers that do support the string form.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
