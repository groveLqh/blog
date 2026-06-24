import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  "Content-Type": "application/json",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("visitors api error: missing Supabase configuration");
        return res.status(200).json({ count: null, total: null });
      }

      const { visitor_id } = req.body;

      if (!visitor_id) {
        return res.status(200).json({ count: null, total: null });
      }

      const authHeaders = {
        ...headers,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apiKey: SUPABASE_SERVICE_ROLE_KEY,
      };

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/visitors`, {
        method: "POST",
        headers: {
          ...authHeaders,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ visitor_id }),
      });

      if (!insertRes.ok && insertRes.status !== 409) {
        console.error(
          "visitors api error: failed to record visitor",
          await insertRes.text(),
        );
      }

      const countRes = await fetch(
        `${SUPABASE_URL}/rest/v1/visitors?select=count`,
        {
          headers: {
            ...authHeaders,
            Prefer: "count=exact",
          },
        },
      );

      if (!countRes.ok) {
        console.error(
          "visitors api error: failed to read visitor count",
          await countRes.text(),
        );
        return res.status(200).json({ count: null, total: null });
      }

      const countHeader = countRes.headers.get("content-range");
      const total = Number(countHeader?.split("/")[1] ?? 0);

      const orderedVisitorsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/visitors?select=visitor_id,created_at&order=created_at.asc&order=id.asc`,
        {
          headers: authHeaders,
        },
      );

      if (!orderedVisitorsRes.ok) {
        console.error(
          "visitors api error: failed to read visitor order",
          await orderedVisitorsRes.text(),
        );
        return res.status(200).json({ count: null, total });
      }

      const orderedVisitors = (await orderedVisitorsRes.json()) as Array<{
        visitor_id?: string;
      }>;
      const count = orderedVisitors.findIndex(
        (row) => row.visitor_id === visitor_id,
      );

      return res.status(200).json({
        count: count === -1 ? null : count + 1,
        total,
      });
    } catch (error) {
      console.error("visitors api error:", error);
      return res.status(200).json({ count: null, total: null });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
