import { Send } from "lucide-react";
import { getMessagesData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { messages, deliveries } = await getMessagesData();
  return (
    <section>
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="mt-3 max-w-2xl text-sm">Compose once and fan out through approved connected channels.</p>
      <form action="/api/messages" method="post" className="panel mt-8 grid max-w-2xl gap-4 p-6">
        <input name="subject" required placeholder="Subject" />
        <textarea name="body" required className="min-h-32 rounded-md border border-[var(--line)] bg-transparent p-3" placeholder="Message" />
        <div className="flex flex-wrap gap-4 text-sm">
          <label><input name="channels" type="checkbox" value="sms" /> SMS</label>
          <label><input name="channels" type="checkbox" value="email" /> Email</label>
          <label><input name="channels" type="checkbox" value="facebook" /> Facebook</label>
          <label><input name="channels" type="checkbox" value="instagram" /> Instagram</label>
        </div>
        <button className="button w-fit" type="submit"><Send size={16} /> Queue message</button>
      </form>

      <h2 className="mt-8 text-xl font-bold">Outbound messages</h2>
      <div className="panel mt-3 divide-y divide-[var(--line)]">
        {messages.map((message) => (
          <div key={message.id} className="p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{message.subject}</strong>
              <span className="text-sm">{message.status}</span>
            </div>
            <p className="mt-2 text-sm">{message.body}</p>
            <p className="mt-2 text-xs">Channels: {message.targetChannels.join(", ")}</p>
            <div className="mt-3 grid gap-2 text-xs">
              {deliveries.filter((delivery) => delivery.messageId === message.id).map((delivery) => (
                <span key={delivery.id}>{delivery.capabilityId}: {delivery.status}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
