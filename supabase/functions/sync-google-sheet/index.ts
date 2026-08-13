import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SHEET_ID = "1mtjBRN84PQDXhGzWRgQ82ImHJrKml29z7cftl-15crc";
const SHEETS = { target: "Target", current: "Current", lastYear: "Last year" } as const;
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;

type GvizCell = { v?: string | number | null } | null;
type GvizResponse = {
  status: string;
  errors?: Array<{ detailed_message?: string; message?: string }>;
  table?: { rows?: Array<{ c?: GvizCell[] }> };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function querySheet(sheet: string, query: string) {
  const url = new URL(GVIZ_URL);
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", sheet);
  url.searchParams.set("tq", query);
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Google Sheet ${sheet} returned ${response.status}`);

  const text = await response.text();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`Invalid Google response for ${sheet}`);

  const payload = JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  if (payload.status !== "ok") {
    const detail = payload.errors?.[0]?.detailed_message ?? payload.errors?.[0]?.message ?? "query failed";
    throw new Error(`Google Sheet ${sheet}: ${detail}`);
  }
  return payload.table?.rows ?? [];
}

function cell(row: { c?: GvizCell[] }, index: number) {
  return row.c?.[index]?.v ?? null;
}

function monthStart(year: number, month: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function parseThaiDate(value: unknown) {
  const match = String(value ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const buddhistYear = Number(match[3]);
  const year = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;
  if (!day || month < 1 || month > 12 || year < 2000) return null;
  return { day, month, year, iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function dateWindowQuery(day: number, month: number, year: number) {
  const buddhistYear = year + 543;
  const predicates = Array.from({ length: day }, (_, index) => {
    const date = `${String(index + 1).padStart(2, "0")}/${String(month).padStart(2, "0")}/${buddhistYear}`;
    return `R contains '${date}'`;
  });
  return `select N,sum(D) where ${predicates.join(" or ")} group by N`;
}

function salesRows(rows: Array<{ c?: GvizCell[] }>) {
  return rows.flatMap((row) => {
    const rawStoreId = cell(row, 0);
    if (rawStoreId === null || rawStoreId === "") return [];
    const storeId = String(rawStoreId).replace(/,/g, "").replace(/\.0$/, "").trim();
    const sales = Number(cell(row, 1) ?? 0);
    return storeId && Number.isFinite(sales) ? [{ store_id: storeId, sales }] : [];
  });
}

async function recordFailure(message: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return;
  await fetch(`${supabaseUrl}/rest/v1/aw_sync_status?id=eq.true`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ last_attempt_at: new Date().toISOString(), last_error: message.slice(0, 1_000) }),
  }).catch(() => undefined);
}

async function isAuthorized(request: Request) {
  const suppliedToken = request.headers.get("x-sync-token");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!suppliedToken || !supabaseUrl || !serviceRoleKey) return false;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_aw_sync_token`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: suppliedToken }),
  });
  return response.ok && await response.json() === true;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!await isAuthorized(request)) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase environment is not configured");

    const [targetMonthRows, currentCountRows] = await Promise.all([
      querySheet(SHEETS.target, "select max(A)"),
      querySheet(SHEETS.current, "select count(R)"),
    ]);

    const targetPeriod = String(Math.trunc(Number(cell(targetMonthRows[0], 0))));
    if (!/^\d{6}$/.test(targetPeriod)) throw new Error("Target month is missing or invalid");
    const targetYear = Number(targetPeriod.slice(0, 4));
    const targetMonth = Number(targetPeriod.slice(4, 6));
    const currentCount = Math.trunc(Number(cell(currentCountRows[0], 0)));
    if (!currentCount) throw new Error("Current sheet has no dated rows");

    const [rawTargets, currentDateTail] = await Promise.all([
      querySheet(SHEETS.target, `select B,C,D,E,F,G,H where A = ${targetPeriod}`)
        .catch((error) => {
          if (error instanceof Error && error.message.includes("NO_COLUMN: H")) {
            return querySheet(SHEETS.target, `select B,C,D,E,F,G where A = ${targetPeriod}`);
          }
          throw error;
        }),
      querySheet(SHEETS.current, `select R offset ${Math.max(0, currentCount - 2_000)}`),
    ]);

    const latestDate = currentDateTail
      .map((row) => parseThaiDate(cell(row, 0)))
      .filter((value): value is NonNullable<ReturnType<typeof parseThaiDate>> => value !== null)
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .at(-1);
    if (!latestDate) throw new Error("Could not determine latest Current date");
    if (latestDate.year !== targetYear || latestDate.month !== targetMonth) {
      throw new Error(`Latest Current date ${latestDate.iso} does not match Target ${targetPeriod}`);
    }

    const previous = shiftMonth(latestDate.year, latestDate.month, -1);
    const lastYear = { year: latestDate.year - 1, month: latestDate.month };
    const [rawCurrent, rawPrevious, rawLastYear] = await Promise.all([
      querySheet(SHEETS.current, dateWindowQuery(latestDate.day, latestDate.month, latestDate.year)),
      querySheet(SHEETS.current, dateWindowQuery(latestDate.day, previous.month, previous.year)),
      querySheet(SHEETS.lastYear, dateWindowQuery(latestDate.day, lastYear.month, lastYear.year)),
    ]);

    const targets = rawTargets.flatMap((row) => {
      const rawStoreId = cell(row, 0);
      if (rawStoreId === null || rawStoreId === "") return [];
      const storeId = String(rawStoreId).replace(/,/g, "").replace(/\.0$/, "").trim();
      const hasChannelColumn = cell(row, 6) !== null && Number.isFinite(Number(cell(row, 6)));
      const target = Number(cell(row, hasChannelColumn ? 6 : 5) ?? 0);
      if (!storeId || !Number.isFinite(target)) return [];
      return [{
        store_id: storeId,
        store_name: String(cell(row, 1) ?? "").trim(),
        channel: hasChannelColumn ? String(cell(row, 3) ?? "").trim() : "",
        rm: String(cell(row, hasChannelColumn ? 4 : 3) ?? "").trim(),
        am: String(cell(row, hasChannelColumn ? 5 : 4) ?? "").trim(),
        target,
      }];
    });
    if (!targets.length) throw new Error("Latest Target month has no stores");

    const payload = {
      p_target_month: monthStart(targetYear, targetMonth),
      p_current_month: monthStart(latestDate.year, latestDate.month),
      p_previous_month: monthStart(previous.year, previous.month),
      p_last_year_month: monthStart(lastYear.year, lastYear.month),
      p_latest_date: latestDate.iso,
      p_targets: targets,
      p_current: salesRows(rawCurrent),
      p_previous: salesRows(rawPrevious),
      p_last_year: salesRows(rawLastYear),
    };

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sync_aw_dashboard_from_sheet_v2`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    });
    if (!rpcResponse.ok) throw new Error(`Database sync failed: ${await rpcResponse.text()}`);

    return jsonResponse({ ok: true, ...(await rpcResponse.json()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordFailure(message);
    console.error(message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
