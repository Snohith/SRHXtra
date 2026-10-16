async function getHealth(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    if (!res.ok) return `API responded ${res.status}`;
    const data = (await res.json()) as { status: string; db: string };
    return `API: ${data.status} / DB: ${data.db}`;
  } catch {
    return "API unreachable (is apps/api running?)";
  }
}

export default async function Home() {
  const health = await getHealth();
  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <h1>SRH News — Admin Dashboard</h1>
      <p>Foundation scaffold (Step 1). Internal tools live here.</p>
      <p>
        <strong>{health}</strong>
      </p>
      <ul>
        <li>
          API health: <code>http://localhost:4000/health</code>
        </li>
        <li>
          Public site: <code>http://localhost:3000</code>
        </li>
      </ul>
    </main>
  );
}
