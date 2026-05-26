import type { AutonomyTier, Capability } from "@muster/connector-sdk";

export function resolveAutonomy(roleCeiling: AutonomyTier, capabilityFloor: AutonomyTier): AutonomyTier {
  return Math.min(roleCeiling, capabilityFloor) as AutonomyTier;
}

export function requiresHumanApproval(roleCeiling: AutonomyTier, capability: Pick<Capability, "autonomyFloor" | "requiresApproval">) {
  if (capability.requiresApproval) {
    return true;
  }
  return resolveAutonomy(roleCeiling, capability.autonomyFloor) < capability.autonomyFloor;
}
