import { describe, expect, it } from "vitest";
import { inboundAddressForSlug, orgSlugFromInboundAddress, parseInboundEmail } from "../apps/web/src/lib/inbound-email";

describe("inbound email parsing", () => {
  it("extracts pdf attachments for Xero upload", async () => {
    const raw = [
      "From: Supplier <billing@example.com>",
      "To: finance+northside@inbound.muster.local",
      "Subject: April invoice",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="abc"',
      "",
      "--abc",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Please see attached.",
      "--abc",
      "Content-Type: application/pdf",
      "Content-Disposition: attachment; filename=\"invoice.pdf\"",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from("%PDF-1.4 test").toString("base64"),
      "--abc--"
    ].join("\r\n");

    const parsed = await parseInboundEmail(raw);

    expect(parsed.to).toContain("finance+northside@inbound.muster.local");
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0]).toEqual(expect.objectContaining({ mimeType: "application/pdf" }));
    expect(parsed.attachments[0]?.fileName).toContain("April invoice");
  });

  it("maps finance aliases to organisation slugs", () => {
    expect(inboundAddressForSlug("northside")).toBe("finance+northside@inbound.muster.local");
    expect(orgSlugFromInboundAddress("finance+northside@inbound.muster.local")).toBe("northside");
  });
});
