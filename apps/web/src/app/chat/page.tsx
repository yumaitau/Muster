export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">AI chat</h1>
      <p className="mt-3 max-w-2xl text-sm">Ask read-only questions about finance reports, messages, tasks and campaigns.</p>
      <form action="/api/chat" method="post" className="panel mt-8 grid max-w-2xl gap-4 p-6">
        <textarea name="question" required className="min-h-32 rounded-md border border-[var(--line)] bg-transparent p-3" placeholder="What needs the committee's attention this week?" />
        <button className="button w-fit" type="submit">Ask</button>
      </form>
    </section>
  );
}
