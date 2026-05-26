import { registerConnector } from "@muster/core";
import { xeroConnector } from "@muster/connector-xero";

let registered = false;

export function bootstrapConnectors() {
  if (!registered) {
    registerConnector(xeroConnector);
    registered = true;
  }
}
