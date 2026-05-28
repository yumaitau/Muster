import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";

export interface InboundEmailAttachment {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  size: number;
}

export interface ParsedInboundEmail {
  from: string[];
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments: InboundEmailAttachment[];
}

function addresses(value: AddressObject | AddressObject[] | undefined): string[] {
  if (!value) return [];
  const objects = Array.isArray(value) ? value : [value];
  return objects.flatMap((object) => object.value.map((address) => address.address?.toLowerCase()).filter((address): address is string => Boolean(address)));
}

function sanitizeFileName(value: string) {
  const clean = value.replace(/[^a-zA-Z0-9_. -]/g, "_").replace(/\s+/g, " ").trim();
  return clean.slice(0, 120) || "supplier-invoice";
}

function datedFileName(parsed: ParsedMail, originalName: string, extension: string) {
  const date = (parsed.date ?? new Date()).toISOString().slice(0, 10);
  const subject = sanitizeFileName(parsed.subject ?? originalName.replace(/\.[^.]+$/, ""));
  const base = subject.toLowerCase().endsWith(extension) ? subject.slice(0, -extension.length) : subject;
  return sanitizeFileName(`${date} - ${base}`) + extension;
}

export async function parseInboundEmail(raw: string | Uint8Array): Promise<ParsedInboundEmail> {
  const parsed = await simpleParser(typeof raw === "string" ? raw : Buffer.from(raw));
  const pdfAttachments = parsed.attachments.filter((attachment) => {
    const fileName = attachment.filename ?? "";
    return attachment.contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  });

  const attachments: InboundEmailAttachment[] = pdfAttachments.map((attachment) => ({
    fileName: datedFileName(parsed, attachment.filename ?? "supplier-invoice.pdf", ".pdf"),
    mimeType: "application/pdf",
    contentBase64: attachment.content.toString("base64"),
    size: attachment.size
  }));

  if (attachments.length === 0) {
    const body = [
      `From: ${addresses(parsed.from).join(", ")}`,
      `To: ${addresses(parsed.to).join(", ")}`,
      `Subject: ${parsed.subject ?? ""}`,
      "",
      parsed.text || parsed.html || "No readable email body was found."
    ].join("\n");
    attachments.push({
      fileName: datedFileName(parsed, parsed.subject ?? "supplier-invoice-email", ".txt"),
      mimeType: "text/plain",
      contentBase64: Buffer.from(body).toString("base64"),
      size: Buffer.byteLength(body)
    });
  }

  return {
    from: addresses(parsed.from),
    to: addresses(parsed.to),
    subject: parsed.subject ?? "Inbound supplier invoice",
    text: parsed.text ?? "",
    html: parsed.html ? String(parsed.html) : "",
    attachments
  };
}

export function inboundAddressForSlug(slug: string) {
  const domain = process.env.MUSTER_INBOUND_EMAIL_DOMAIN ?? "inbound.muster.local";
  return `finance+${slug}@${domain}`;
}

export function orgSlugFromInboundAddress(address: string) {
  const domain = process.env.MUSTER_INBOUND_EMAIL_DOMAIN ?? "inbound.muster.local";
  const [localPart, addressDomain] = address.toLowerCase().split("@");
  if (!localPart || addressDomain !== domain.toLowerCase()) return null;
  if (localPart.startsWith("finance+")) return localPart.slice("finance+".length);
  return localPart;
}
