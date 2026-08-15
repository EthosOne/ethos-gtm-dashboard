const CLOSED_STAGES = new Set(["Closed Won", "Closed Lost"]);

export function isClosedStage(stage: string | undefined | null): boolean {
  return !!stage && CLOSED_STAGES.has(stage);
}

/**
 * Stops all active Instantly sequences for a contact by email, across every
 * campaign in the workspace (search is not scoped to a single campaign_id).
 * Deletes the matching lead(s) so no further emails go out — used when a
 * contact moves to Closed Won/Lost, since the deal outcome makes further
 * outreach pointless or harmful regardless of which campaign enrolled them.
 */
export async function stopInstantlyOutreach(email: string): Promise<{ stopped: number; errors: string[] }> {
  const instantlyKey = process.env.INSTANTLY_API_KEY;
  if (!instantlyKey || !email) return { stopped: 0, errors: [] };

  const errors: string[] = [];
  let stopped = 0;

  const listRes = await fetch("https://api.instantly.ai/api/v2/leads/list", {
    method: "POST",
    headers: { Authorization: `Bearer ${instantlyKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ search: email, limit: 10 }),
  });
  if (!listRes.ok) {
    errors.push(`leads/list failed: ${listRes.status}`);
    return { stopped, errors };
  }
  const { items } = (await listRes.json()) as { items?: { id: string; email: string }[] };
  const matches = (items ?? []).filter((it) => it.email?.toLowerCase() === email.toLowerCase());

  for (const lead of matches) {
    const delRes = await fetch(`https://api.instantly.ai/api/v2/leads/${lead.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${instantlyKey}` },
    });
    if (delRes.ok) {
      stopped++;
    } else {
      errors.push(`delete ${lead.id} failed: ${delRes.status}`);
    }
  }

  return { stopped, errors };
}
