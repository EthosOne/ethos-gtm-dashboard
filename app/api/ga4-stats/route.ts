import { NextResponse } from "next/server";

const EMPTY = {
  activeUsers30d: 0,
  demoBookedEvents30d: 0,
  ethosoneSessions30d: 0,
  twlrSessions30d: 0,
  ethosoneUsers30d: 0,
  twlrUsers30d: 0,
};

async function getAccessToken() {
  const clientId = process.env.GA4_CLIENT_ID;
  const clientSecret = process.env.GA4_CLIENT_SECRET;
  const refreshToken = process.env.GA4_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token as string | undefined;
}

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return NextResponse.json(EMPTY);

  const token = await getAccessToken();
  if (!token) return NextResponse.json(EMPTY);

  const runReport = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json();
  };

  const [usersReport, eventsReport, hostnameReport] = await Promise.all([
    runReport({
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }],
    }),
    runReport({
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "demo_booked" } },
      },
    }),
    runReport({
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "hostName" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    }),
  ]);

  const activeUsers30d = Number(
    usersReport?.rows?.[0]?.metricValues?.[0]?.value ?? 0
  );
  const demoBookedEvents30d = Number(
    eventsReport?.rows?.[0]?.metricValues?.[0]?.value ?? 0
  );

  let ethosoneSessions30d = 0;
  let twlrSessions30d = 0;
  let ethosoneUsers30d = 0;
  let twlrUsers30d = 0;
  for (const row of hostnameReport?.rows ?? []) {
    const host = String(row.dimensionValues?.[0]?.value ?? "");
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    const users = Number(row.metricValues?.[1]?.value ?? 0);
    if (host.includes("theworklifereporter.com")) {
      twlrSessions30d += sessions;
      twlrUsers30d += users;
    } else if (host.includes("ethosone.ai")) {
      ethosoneSessions30d += sessions;
      ethosoneUsers30d += users;
    }
  }

  return NextResponse.json({
    activeUsers30d,
    demoBookedEvents30d,
    ethosoneSessions30d,
    twlrSessions30d,
    ethosoneUsers30d,
    twlrUsers30d,
  });
}
