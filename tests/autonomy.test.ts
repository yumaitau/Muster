import { describe, expect, it } from "vitest";
import { requiresHumanApproval, resolveAutonomy } from "@muster/core";

describe("autonomy gate", () => {
  it("uses the lower value of the role ceiling and capability floor", () => {
    expect(resolveAutonomy(3, 1)).toBe(1);
    expect(resolveAutonomy(0, 2)).toBe(0);
  });

  it("always honours a capability approval requirement", () => {
    expect(requiresHumanApproval(3, { autonomyFloor: 0, requiresApproval: true })).toBe(true);
    expect(requiresHumanApproval(3, { autonomyFloor: 0, requiresApproval: false })).toBe(false);
    expect(requiresHumanApproval(0, { autonomyFloor: 2, requiresApproval: false })).toBe(true);
  });
});
