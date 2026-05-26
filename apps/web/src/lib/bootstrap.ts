import { registerConnector } from "@muster/core";
import { canvaConnector } from "@muster/connector-canva";
import { clicksendConnector } from "@muster/connector-clicksend";
import { metaConnector } from "@muster/connector-meta";
import { mondayConnector } from "@muster/connector-monday";
import { xeroConnector } from "@muster/connector-xero";

let registered = false;

export function bootstrapConnectors() {
  if (!registered) {
    registerConnector(xeroConnector);
    registerConnector(clicksendConnector);
    registerConnector(metaConnector);
    registerConnector(canvaConnector);
    registerConnector(mondayConnector);
    registered = true;
  }
}
