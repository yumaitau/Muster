import type { Capability, Connector } from "@muster/connector-sdk";

const connectors = new Map<string, Connector>();

export function registerConnector(connector: Connector) {
  connectors.set(connector.id, connector);
}

export function listConnectors() {
  return [...connectors.values()];
}

export function getConnector(id: string): Connector {
  const connector = connectors.get(id);
  if (!connector) {
    throw new Error(`Connector ${id} is not registered`);
  }
  return connector;
}

export function getCapability(id: string): Capability {
  for (const connector of connectors.values()) {
    const capability = connector.capabilities.find((item) => item.id === id);
    if (capability) {
      return capability;
    }
  }
  throw new Error(`Capability ${id} is not registered`);
}
