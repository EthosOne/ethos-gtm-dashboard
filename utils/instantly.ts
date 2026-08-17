const CLOSED_STAGES = new Set(["Closed Won", "Closed Lost"]);

export function isClosedStage(stage: string | undefined | null): boolean {
  return !!stage && CLOSED_STAGES.has(stage);
}

/**
 * Stops the active Instantly sequence for a contact by deleting their lead,
 * so no further emails go out — used when a contact moves to Closed
 * Won/Lost, since the deal outcome makes further outreach pointless
 * regardless of which sequence enrolled them.
 *
 * Prefers scoping the lookup to instantlyCampaignId (set by enroll-campaign
 * at enrollment time) since that's an exact match. Falls back to a
 * workspace-wide email search for contacts enrolled before that field
 * existed (e.g. via force-nurture-sync).
 */
export async function stopInstantlyOutreach(
  email: string,
  instantlyCampaignId?: string | null
): Promise<{ stopped: number; errors: string[] }> {
  const instantlyKey = process.env.INSTANTLY_API_KEY;
  if (!instantlyKey || !email) return { stopped: 0, errors: [] };

  const errors: string[] = [];
  let stopped = 0;

  const listBody = instantlyCampaignId
    ? { campaign: instantlyCampaignId, search: email, limit: 10 }
    : { search: email, limit: 10 };

  const listRes = await fetch("https://api.instantly.ai/api/v2/leads/list", {
    method: "POST",
    headers: { Authorization: `Bearer ${instantlyKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(listBody),
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
