import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "@/lib/notifications/vapid";

describe("urlBase64ToUint8Array", () => {
  it("converts a base64url VAPID key into a Uint8Array", () => {
    // "hello" base64url-encoded, no padding
    const result = urlBase64ToUint8Array("aGVsbG8");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
  });

  it("handles base64url characters (- and _) not present in standard base64", () => {
    // Bytes chosen so the standard-base64 encoding would contain '+' and '/'.
    const bytes = new Uint8Array([251, 255, 191]);
    const standardBase64 = Buffer.from(bytes).toString("base64"); // "+/+/"-ish
    const urlSafe = standardBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = urlBase64ToUint8Array(urlSafe);
    expect(Array.from(result)).toEqual(Array.from(bytes));
  });

  it("pads input that is missing base64 padding characters", () => {
    // Length 1 mod 4 after padding-removal would be invalid, but real VAPID
    // keys never produce that; this checks lengths needing 1 and 2 '=' pads.
    const oneChar = urlBase64ToUint8Array("YQ"); // "a", needs "==" originally
    expect(Array.from(oneChar)).toEqual([97]);

    const twoChar = urlBase64ToUint8Array("YWI"); // "ab", needs "=" originally
    expect(Array.from(twoChar)).toEqual([97, 98]);
  });

  it("round-trips a realistic 65-byte VAPID public key", () => {
    const original = new Uint8Array(65);
    for (let i = 0; i < original.length; i++) original[i] = i * 3 + 1;
    const encoded = Buffer.from(original)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = urlBase64ToUint8Array(encoded);
    expect(result.length).toBe(65);
    expect(Array.from(result)).toEqual(Array.from(original));
  });
});
