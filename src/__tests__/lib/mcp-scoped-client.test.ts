/**
 * Tests for src/lib/supabase/scoped.ts
 *
 * @vitest-environment node
 *
 * The minted token is what makes RLS apply to MCP requests, so we assert its
 * claims precisely: HS256, sub = userId, role/aud = "authenticated", and a
 * short TTL. The signing secret is the env test-default.
 */
import { jwtVerify, decodeProtectedHeader, errors as joseErrors } from "jose";
import { mintUserAccessToken } from "@/lib/supabase/scoped";

const TEST_SECRET = new TextEncoder().encode(
  "test-jwt-secret-at-least-32-chars-long!!"
);

describe("mintUserAccessToken", () => {
  it("signs an HS256 token with the Supabase-authenticated claims", async () => {
    const iat = 1_700_000_000;
    const token = await mintUserAccessToken("user-123", iat);

    expect(decodeProtectedHeader(token).alg).toBe("HS256");

    const { payload } = await jwtVerify(token, TEST_SECRET, {
      audience: "authenticated",
      currentDate: new Date(iat * 1000),
    });
    expect(payload.sub).toBe("user-123");
    expect(payload.role).toBe("authenticated");
    expect(payload.aud).toBe("authenticated");
    expect(payload.iat).toBe(iat);
    expect(payload.exp).toBe(iat + 300);
  });

  it("produces a token that fails verification under a different secret", async () => {
    const token = await mintUserAccessToken("user-123");
    await expect(
      jwtVerify(token, new TextEncoder().encode("a-totally-different-secret-value!!!"))
    ).rejects.toBeInstanceOf(joseErrors.JWSSignatureVerificationFailed);
  });

  it("scopes the token to the given user (sub differs per user)", async () => {
    const iat = 1_700_000_000;
    const a = await mintUserAccessToken("user-a", iat);
    const b = await mintUserAccessToken("user-b", iat);
    expect(a).not.toEqual(b);
    const opts = { currentDate: new Date(iat * 1000) };
    const { payload: pa } = await jwtVerify(a, TEST_SECRET, opts);
    const { payload: pb } = await jwtVerify(b, TEST_SECRET, opts);
    expect(pa.sub).toBe("user-a");
    expect(pb.sub).toBe("user-b");
  });
});
