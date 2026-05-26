export default function SetupPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Set up Muster</h1>
      <p className="mt-3 max-w-2xl text-sm">Create the first organisation and owner account for this self-hosted deployment.</p>
      <form action="/api/setup" method="post" className="panel mt-8 grid max-w-xl gap-4 p-6">
        <label className="grid gap-2 text-sm font-semibold">
          Organisation name
          <input name="orgName" required placeholder="Northside Soccer Club" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Owner email
          <input name="email" type="email" required placeholder="treasurer@example.org" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Owner name
          <input name="name" required placeholder="Alex Morgan" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Password
          <input name="password" type="password" required minLength={8} />
        </label>
        <button className="button w-fit" type="submit">Create organisation</button>
      </form>
    </section>
  );
}
