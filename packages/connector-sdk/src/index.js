export function defineCapability(capability) {
    return capability;
}
export function defineConnector(connector) {
    const capabilityIds = new Set();
    for (const capability of connector.capabilities) {
        if (capabilityIds.has(capability.id)) {
            throw new Error(`Duplicate capability id ${capability.id}`);
        }
        capabilityIds.add(capability.id);
    }
    return connector;
}
//# sourceMappingURL=index.js.map