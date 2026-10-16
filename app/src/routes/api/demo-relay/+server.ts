// A stand-in for the Sola Relay, for the homepage `$data` demo only.
//
// `$data` posts { source, ... } to a relay and reads { rows } back. On the
// homepage that request goes here instead, so the demo runs the real `$data`
// code against a real network call without needing anyone's database. The rows
// are sample data. In an app, the same line reaches your own Sola Relay.

import { json } from '@sveltejs/kit';

const MONTHLY_REVENUE: Array<[string, number]> = [
  ['Jun', 152300],
  ['Jul', 161800],
  ['Aug', 169400],
  ['Sep', 184200]
];

const NODES = ['node-a', 'node-b', 'node-c', 'node-d'];

export async function POST({ request }) {
  let body: { source?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send a JSON body with a "source".' }, { status: 400 });
  }
  const source = typeof body?.source === 'string' ? body.source : '';
  const updatedAt = new Date().toISOString().slice(11, 19);

  if (source === 'sheet://demo-finance') {
    const rows = MONTHLY_REVENUE.map(([month, mrr]) => ({ month, mrr, updatedAt }));
    return json({ rows, rowCount: rows.length });
  }

  if (source === 'postgres-primary:nodes') {
    // Load drifts with the clock so a refresh visibly changes the numbers.
    const bucket = Math.floor(Date.now() / 5000);
    const rows = NODES.map((name, i) => {
      const cpu = 30 + ((bucket * 7 + i * 11) % 45);
      return { name, status: cpu > 62 ? 'busy' : 'ready', cpu, updatedAt };
    });
    return json({ rows, rowCount: rows.length });
  }

  return json(
    { error: `Unknown demo source "${source}". The demo endpoint serves only the two sources shown on the homepage.` },
    { status: 404 }
  );
}
