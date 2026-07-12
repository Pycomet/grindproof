import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileRouter } from "@/server/trpc/routers/profile";

const maybeSingleMock = vi.fn();
const upsertMock = vi.fn();

function makeDb() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
      upsert: upsertMock,
    })),
  };
}

function makeCtx() {
  return {
    db: makeDb(),
    user: { id: "user-1", email: "a@b.co", user_metadata: {} },
  } as never;
}

describe("profile setup state", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    upsertMock.mockReset();
  });

  it("returns pending when no profile row exists", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.getSetupState();
    expect(result.setupState).toBe("pending");
  });

  it("returns the stored state", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { setup_state: "completed" },
      error: null,
    });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.getSetupState();
    expect(result.setupState).toBe("completed");
  });

  it("upserts the new state", async () => {
    upsertMock.mockResolvedValue({ error: null });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.setSetupState({ setupState: "dismissed" });
    expect(result.setupState).toBe("dismissed");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", setup_state: "dismissed" })
    );
  });

  it("rejects invalid states", async () => {
    upsertMock.mockResolvedValue({ error: null });
    const caller = profileRouter.createCaller(makeCtx());
    await expect(
      // @ts-expect-error intentionally invalid
      caller.setSetupState({ setupState: "nope" })
    ).rejects.toThrow();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
