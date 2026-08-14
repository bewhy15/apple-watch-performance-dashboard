"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DashboardRow = {
  target_month: string;
  sales_month: string;
  data_through_date?: string;
  sheet_synced_at?: string;
  store_id: string;
  store_name: string;
  channel: string;
  rm: string;
  am: string;
  target: number;
  current_sales: number;
  previous_sales: number;
  last_year_sales: number;
  target_attainment: number | null;
  mom: number | null;
  yoy: number | null;
  forecast?: number | null;
  forecast_attainment?: number | null;
};

type ViewMode = "stores" | "rm" | "am";
type PageMode = "performance" | "teams";

const SUPABASE_URL = "https://qoazkcserdyczckvhakt.supabase.co";
const SUPABASE_KEY = "sb_publishable_U5bdVQgH0jZdb-phJoljdA_XHbY2oA2";

const demoRows: DashboardRow[] = [
  ["S001", "Studio 7 Central World", "ทีม RM 1", "ทีม AM 1", 135, 121, 109, 102],
  ["S002", "Studio 7 Siam Paragon", "ทีม RM 1", "ทีม AM 1", 126, 108, 103, 99],
  ["S003", "Studio 7 Mega Bangna", "ทีม RM 1", "ทีม AM 2", 112, 96, 88, 82],
  ["S004", "Studio 7 Fashion Island", "ทีม RM 1", "ทีม AM 2", 104, 82, 87, 79],
  ["S005", "Studio 7 Central Ladprao", "ทีม RM 2", "ทีม AM 3", 118, 91, 84, 86],
  ["S006", "Studio 7 Central Rama 9", "ทีม RM 2", "ทีม AM 3", 105, 78, 73, 69],
  ["S007", "Studio 7 Central Pinklao", "ทีม RM 2", "ทีม AM 4", 98, 69, 71, 62],
  ["S008", "Studio 7 The Mall Bangkae", "ทีม RM 2", "ทีม AM 4", 92, 61, 65, 58],
  ["S009", "Studio 7 Central Chiangmai", "ทีม RM 3", "ทีม AM 5", 108, 85, 76, 73],
  ["S010", "Studio 7 Central Phuket", "ทีม RM 3", "ทีม AM 5", 101, 72, 68, 61],
  ["S011", "Studio 7 Central Khonkaen", "ทีม RM 3", "ทีม AM 6", 94, 64, 59, 57],
  ["S012", "Studio 7 Central Hatyai", "ทีม RM 3", "ทีม AM 6", 89, 55, 53, 49],
].map(([store_id, store_name, rm, am, target, current, previous, lastYear]) => {
  const t = Number(target);
  const c = Number(current);
  const p = Number(previous);
  const y = Number(lastYear);
  return {
    target_month: "2026-08-01",
    sales_month: "2026-08-01",
    store_id: String(store_id),
    store_name: String(store_name),
    channel: "AAR",
    rm: String(rm),
    am: String(am),
    target: t,
    current_sales: c,
    previous_sales: p,
    last_year_sales: y,
    target_attainment: t ? c / t : null,
    mom: p ? (c - p) / p : null,
    yoy: y ? (c - y) / y : null,
    data_through_date: "2026-08-12",
    forecast: c / 12 * 31,
    forecast_attainment: t ? (c / 12 * 31) / t : null,
  };
});

const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function monthLabel(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function dateLabel(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function calculateForecast(sales: number, dataThroughDate?: string) {
  if (!dataThroughDate) return 0;
  const date = new Date(`${dataThroughDate.slice(0, 10)}T00:00:00`);
  const elapsedDays = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return elapsedDays ? sales / elapsedDays * daysInMonth : 0;
}

function aggregate(rows: DashboardRow[], key: "channel" | "rm" | "am") {
  const groups = new Map<string, DashboardRow>();
  rows.forEach((row) => {
    const name = row[key] || "ไม่ระบุ";
    const current = groups.get(name) ?? {
      ...row,
      store_id: name,
      store_name: name,
      target: 0,
      current_sales: 0,
      previous_sales: 0,
      last_year_sales: 0,
      target_attainment: null,
      mom: null,
      yoy: null,
      forecast: 0,
      forecast_attainment: null,
    };
    current.target += row.target;
    current.current_sales += row.current_sales;
    current.previous_sales += row.previous_sales;
    current.last_year_sales += row.last_year_sales;
    current.target_attainment = current.target ? current.current_sales / current.target : null;
    current.mom = current.previous_sales ? (current.current_sales - current.previous_sales) / current.previous_sales : null;
    current.yoy = current.last_year_sales ? (current.current_sales - current.last_year_sales) / current.last_year_sales : null;
    current.forecast = calculateForecast(current.current_sales, row.data_through_date);
    current.forecast_attainment = current.target ? (current.forecast ?? 0) / current.target : null;
    groups.set(name, current);
  });
  return [...groups.values()];
}

function Delta({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return <span className="muted">—</span>;
  const positive = value >= 0;
  return <span className={positive ? "delta positive" : "delta negative"} aria-label={`${positive ? "เพิ่มขึ้น" : "ลดลง"} ${percent.format(Math.abs(value))}`}>{positive ? "↑" : "↓"} {percent.format(Math.abs(value))}</span>;
}

function TeamRankingTable({ kind, rows, sourceRows }: { kind: "channel" | "rm" | "am"; rows: DashboardRow[]; sourceRows: DashboardRow[] }) {
  const sectionLabel = kind === "channel" ? "รูปแบบสาขา (Channel)" : kind.toUpperCase();
  return (
    <section className="team-section" aria-labelledby={`${kind}-ranking-title`}>
      <div className="team-section-title">
        <h2 id={`${kind}-ranking-title`}>อันดับ {sectionLabel}</h2>
        <span>{rows.length} {kind === "channel" ? "รูปแบบ" : kind.toUpperCase()}</span>
      </div>
      <div className="table-wrap" role="region" aria-label={`ตารางอันดับ ${sectionLabel}`}>
        <table className="team-table">
          <caption className="sr-only">อันดับ {sectionLabel} เปรียบเทียบ Target ยอดขาย Forecast MoM และ YoY</caption>
          <thead><tr><th scope="col">อันดับ</th><th scope="col">{sectionLabel}</th><th scope="col">Target</th><th scope="col">ยอดขาย</th><th scope="col">%AC</th><th scope="col">Forecast</th><th scope="col">% Forecast</th><th scope="col">MoM</th><th scope="col">YoY</th></tr></thead>
          <tbody>{rows.map((row, index) => {
            const attainment = row.target_attainment ?? 0;
            const memberText = kind === "channel"
              ? `${sourceRows.filter((item) => item.channel === row.store_name).length} สาขา`
              : kind === "rm"
                ? `${new Set(sourceRows.filter((item) => item.rm === row.store_name).map((item) => item.am).filter(Boolean)).size} AM`
                : `RM ${row.rm}`;
            return <tr key={`${kind}-${row.store_id}`}>
              <td><span className={`rank rank-${index + 1}`}>{index + 1}</span></td>
              <td><div className="store-name">{row.store_name}</div><div className="store-meta">{memberText}</div></td>
              <td>{number.format(row.target)}</td>
              <td className="sales">{number.format(row.current_sales)}</td>
              <td><div className={attainment >= 1 ? "attain good" : attainment >= .75 ? "attain warn" : "attain low"}><b>{percent.format(attainment)}</b><div><i style={{ width: `${Math.min(attainment * 100, 100)}%` }} /></div></div></td>
              <td>{number.format(row.forecast ?? 0)}</td>
              <td><b className={(row.forecast_attainment ?? 0) >= 1 ? "done" : "remaining"}>{row.forecast_attainment === null || row.forecast_attainment === undefined ? "—" : percent.format(row.forecast_attainment)}</b></td>
              <td><Delta value={row.mom} /></td>
              <td><Delta value={row.yoy} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardClient() {
  const dashboardRef = useRef<HTMLElement>(null);
  const [rows, setRows] = useState<DashboardRow[]>(demoRows);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rm, setRm] = useState("ทั้งหมด");
  const [am, setAm] = useState("ทั้งหมด");
  const [view, setView] = useState<ViewMode>("stores");
  const [page, setPage] = useState<PageMode>("performance");
  const [query, setQuery] = useState("");
  const [snapshotStatus, setSnapshotStatus] = useState<"idle" | "capturing" | "saved" | "error">("idle");
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const loadDashboardRows = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setRefreshStatus("loading");
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/aw_dashboard_rows?select=*&order=target_attainment.desc.nullslast`, {
        headers: { apikey: SUPABASE_KEY, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("fetch failed");

      const data = await response.json() as DashboardRow[];
      if (!data.length) throw new Error("empty dashboard data");

      setRows(data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" && !["target_month", "sales_month", "data_through_date", "sheet_synced_at", "store_id", "store_name", "channel", "rm", "am"].includes(key) ? Number(value) : value])) as DashboardRow));
      setIsDemo(false);
      setLastRefreshedAt(new Date());
      setRefreshStatus("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRefreshStatus("error");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialRefresh = window.setTimeout(() => void loadDashboardRows(controller.signal), 0);
    const refreshInterval = window.setInterval(() => void loadDashboardRows(), 60 * 1_000);
    return () => {
      controller.abort();
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
    };
  }, [loadDashboardRows]);

  const rms = useMemo(() => ["ทั้งหมด", ...new Set(rows.map((row) => row.rm).filter(Boolean))], [rows]);
  const ams = useMemo(() => ["ทั้งหมด", ...new Set(rows.filter((row) => rm === "ทั้งหมด" || row.rm === rm).map((row) => row.am).filter(Boolean))], [rows, rm]);

  const filtered = useMemo(() => rows.filter((row) =>
    (rm === "ทั้งหมด" || row.rm === rm) &&
    (am === "ทั้งหมด" || row.am === am) &&
    (!query || `${row.store_id} ${row.store_name}`.toLowerCase().includes(query.toLowerCase()))
  ), [rows, rm, am, query]);

  const visible = useMemo(() => {
    const data = view === "stores" ? filtered : aggregate(filtered, view);
    return [...data].sort((a, b) => (b.target_attainment ?? -1) - (a.target_attainment ?? -1));
  }, [filtered, view]);

  const totals = useMemo(() => filtered.reduce((sum, row) => ({
    target: sum.target + row.target,
    sales: sum.sales + row.current_sales,
    previous: sum.previous + row.previous_sales,
    lastYear: sum.lastYear + row.last_year_sales,
  }), { target: 0, sales: 0, previous: 0, lastYear: 0 }), [filtered]);

  const targetRate = totals.target ? totals.sales / totals.target : null;
  const mom = totals.previous ? (totals.sales - totals.previous) / totals.previous : null;
  const yoy = totals.lastYear ? (totals.sales - totals.lastYear) / totals.lastYear : null;
  const dataThroughDate = rows[0]?.data_through_date;
  const sheetSyncedAt = rows[0]?.sheet_synced_at ? new Date(rows[0].sheet_synced_at) : null;
  const forecast = calculateForecast(totals.sales, dataThroughDate);
  const forecastRate = totals.target ? forecast / totals.target : null;
  const title = view === "stores" ? "ผลการดำเนินงานรายร้าน" : view === "rm" ? "อันดับ RM" : "อันดับ AM";
  const rmRanking = useMemo(() => aggregate(filtered, "rm").sort((a, b) => (b.target_attainment ?? -1) - (a.target_attainment ?? -1)), [filtered]);
  const amRanking = useMemo(() => aggregate(filtered, "am").sort((a, b) => (b.target_attainment ?? -1) - (a.target_attainment ?? -1)), [filtered]);
  const channelRanking = useMemo(() => aggregate(filtered, "channel")
    .filter((row) => row.store_name !== "ไม่ระบุ")
    .sort((a, b) => (b.target_attainment ?? -1) - (a.target_attainment ?? -1)), [filtered]);

  async function saveSnapshot() {
    const dashboard = dashboardRef.current;
    if (!dashboard || snapshotStatus === "capturing") return;

    setSnapshotStatus("capturing");
    dashboard.classList.add("snapshot-mode");
    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const { toBlob } = await import("html-to-image");
      const width = dashboard.scrollWidth;
      const height = dashboard.scrollHeight;
      const maxPixels = 24_000_000;
      const safeRatio = Math.sqrt(maxPixels / Math.max(width * height, 1));
      const pixelRatio = Math.max(.75, Math.min(window.devicePixelRatio || 1, 2, safeRatio));
      const blob = await toBlob(dashboard, {
        backgroundColor: "#f4f7f6",
        cacheBust: true,
        pixelRatio,
        width,
        height,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.snapshotIgnore === "true"),
      });
      if (!blob) throw new Error("Unable to create snapshot");

      const filename = `apple-watch-dashboard-${dataThroughDate ?? "latest"}-${page === "teams" ? "rm-am" : view}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const shareData = { files: [file], title: "Apple Watch Performance Dashboard" };

      const isMobileDevice = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobileDevice && navigator.share && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          setSnapshotStatus("saved");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setSnapshotStatus("idle");
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setSnapshotStatus("saved");
    } catch (error) {
      console.error("Snapshot failed", error);
      setSnapshotStatus("error");
    } finally {
      dashboard.classList.remove("snapshot-mode");
    }
  }

  return (
    <main ref={dashboardRef}>
      <header className="hero">
        <div>
          <div className="eyebrow"><span className="watch-dot" /> APPLE WATCH PERFORMANCE</div>
          <h1>Target • MoM • YoY</h1>
          <p>ภาพรวมยอดขาย Apple Watch · ข้อมูลถึง {dateLabel(dataThroughDate)}</p>
        </div>
        <div className="hero-status" role="status" aria-live="polite"><span className={loading ? "pulse" : "status-dot"} aria-hidden="true" />{loading ? "กำลังอัปเดต" : "ข้อมูลถึงวันที่"}<strong>{loading ? "โปรดรอสักครู่" : dateLabel(dataThroughDate)}</strong></div>
      </header>

      <nav className="page-nav" aria-label="เลือกหน้า Dashboard" data-snapshot-ignore="true">
        <button type="button" className={page === "performance" ? "active" : ""} aria-current={page === "performance" ? "page" : undefined} onClick={() => setPage("performance")}>Dashboard หลัก</button>
        <button type="button" className={page === "teams" ? "active" : ""} aria-current={page === "teams" ? "page" : undefined} onClick={() => setPage("teams")}>ภาพรวม RM &amp; AM</button>
      </nav>

      <section className="filters" aria-label="ตัวกรองรายงาน">
        <label><span>RM</span><select value={rm} onChange={(event) => { setRm(event.target.value); setAm("ทั้งหมด"); }}>{rms.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>AM</span><select value={am} onChange={(event) => setAm(event.target.value)}>{ams.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="search"><span>ค้นหาร้าน</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อร้าน หรือ ID ร้าน" /></label>
        <div className="filter-actions" data-snapshot-ignore="true">
          <button type="button" className="reset" onClick={() => { setRm("ทั้งหมด"); setAm("ทั้งหมด"); setQuery(""); }}>ล้างตัวกรอง</button>
          <button type="button" className="refresh" onClick={() => void loadDashboardRows()} disabled={loading || snapshotStatus === "capturing"}>
            <span aria-hidden="true">↻</span> {loading ? "กำลังรีเฟรช…" : "รีเฟรชข้อมูล"}
          </button>
          <button type="button" className="snapshot" onClick={saveSnapshot} disabled={snapshotStatus === "capturing"}>
            <span aria-hidden="true">▣</span> {snapshotStatus === "capturing" ? "กำลังสร้างรูปทั้งหน้า…" : "บันทึกทั้งหน้า"}
          </button>
        </div>
      </section>

      <div className={`refresh-message ${refreshStatus}`} role="status" aria-live="polite" data-snapshot-ignore="true">
        {refreshStatus === "success" && lastRefreshedAt ? `Sheet ซิงก์ล่าสุด ${sheetSyncedAt ? `${time.format(sheetSyncedAt)} น.` : "แล้ว"} · ตรวจหน้าจอ ${time.format(lastRefreshedAt)} น. · อัตโนมัติทุก 1 นาที` : refreshStatus === "error" ? "ดึงข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง" : "Supabase ดึง Google Sheet ทุก 5 นาที · หน้าเว็บตรวจใหม่ทุก 1 นาที"}
      </div>
      <div className={`snapshot-message ${snapshotStatus}`} role="status" aria-live="polite" data-snapshot-ignore="true">
        {snapshotStatus === "saved" ? "บันทึกรูป Dashboard ทั้งหน้าเรียบร้อยแล้ว" : snapshotStatus === "error" ? "ไม่สามารถบันทึกรูปได้ กรุณาลองใหม่" : ""}
      </div>

      {isDemo && <div className="demo-banner"><strong>โหมดตัวอย่าง</strong> รอสิทธิ์เข้าถึง Google Sheet เพื่อแทนที่ด้วยข้อมูลจริง โดย Target จะแสดงเฉพาะเดือนล่าสุด</div>}

      {page === "performance" ? <><section className="kpis">
        <article><span>Target เดือนล่าสุด</span><strong>{number.format(totals.target)}</strong><small>{monthLabel(rows[0]?.target_month)}</small></article>
        <article><span>ยอดขายเดือนนี้</span><strong>{number.format(totals.sales)}</strong><small>{filtered.length} ร้าน</small></article>
        <article className="accent"><span>เทียบ Target</span><strong>{targetRate === null ? "—" : percent.format(targetRate)}</strong><div className="progress"><i style={{ width: `${Math.min((targetRate ?? 0) * 100, 100)}%` }} /></div></article>
        <article><span>MoM</span><strong><Delta value={mom} /></strong><small>เทียบเดือนก่อน</small></article>
        <article><span>YoY</span><strong><Delta value={yoy} /></strong><small>เทียบเดือนเดียวกันปีก่อน</small></article>
        <article><span>Forecast ปิดเดือน</span><strong>{number.format(forecast)}</strong><small>จาก Pace ถึง {dateLabel(dataThroughDate)}</small></article>
        <article className={forecastRate !== null && forecastRate >= 1 ? "forecast-good" : "forecast-risk"}><span>% Forecast</span><strong>{forecastRate === null ? "—" : percent.format(forecastRate)}</strong><small>Forecast เทียบ Target</small></article>
      </section>

      <section className="report">
        <div className="report-head">
          <div><p>RANKING & PERFORMANCE</p><h2>{title}</h2></div>
          <div className="tabs" role="tablist" aria-label="มุมมองรายงาน">
            <button type="button" role="tab" aria-selected={view === "stores"} aria-controls="performance-table" className={view === "stores" ? "active" : ""} onClick={() => setView("stores")}>รายร้าน</button>
            <button type="button" role="tab" aria-selected={view === "rm"} aria-controls="performance-table" className={view === "rm" ? "active" : ""} onClick={() => setView("rm")}>RM</button>
            <button type="button" role="tab" aria-selected={view === "am"} aria-controls="performance-table" className={view === "am" ? "active" : ""} onClick={() => setView("am")}>AM</button>
          </div>
        </div>
        <div className="table-wrap" id="performance-table" role="tabpanel" tabIndex={0} aria-label={title}>
          <table>
            <caption className="sr-only">{title} เปรียบเทียบเป้าหมาย ยอดขาย MoM และ YoY</caption>
            <thead><tr><th scope="col">#</th><th scope="col">{view === "stores" ? "ร้านค้า" : view.toUpperCase()}</th><th scope="col">Target</th><th scope="col">ยอดขาย</th><th scope="col">%AC</th><th scope="col">Forecast</th><th scope="col">% Forecast</th><th scope="col">ต้องทำอีก</th><th scope="col">MoM</th><th scope="col">YoY</th></tr></thead>
            <tbody>{visible.map((row, index) => {
              const attainment = row.target_attainment ?? 0;
              return <tr key={row.store_id}>
                <td><span className={`rank rank-${index + 1}`}>{index + 1}</span></td>
                <td><div className="store-name">{row.store_name}</div>{view === "stores" && <div className="store-meta">{row.store_id} · {row.rm} · {row.am}</div>}</td>
                <td>{number.format(row.target)}</td>
                <td className="sales">{number.format(row.current_sales)}</td>
                <td><div className={attainment >= 1 ? "attain good" : attainment >= .75 ? "attain warn" : "attain low"}><b>{percent.format(attainment)}</b><div><i style={{ width: `${Math.min(attainment * 100, 100)}%` }} /></div></div></td>
                <td>{number.format(row.forecast ?? calculateForecast(row.current_sales, row.data_through_date))}</td>
                <td><b className={(row.forecast_attainment ?? 0) >= 1 ? "done" : "remaining"}>{row.forecast_attainment === null || row.forecast_attainment === undefined ? "—" : percent.format(row.forecast_attainment)}</b></td>
                <td><b className={row.current_sales >= row.target ? "done" : "remaining"}>{row.current_sales >= row.target ? "ถึงเป้า" : number.format(row.target - row.current_sales)}</b></td>
                <td><Delta value={row.mom} /></td>
                <td><Delta value={row.yoy} /></td>
              </tr>;
            })}{visible.length === 0 ? <tr><td className="empty-state" colSpan={10}>ไม่พบข้อมูลที่ตรงกับตัวกรอง ลองเปลี่ยน RM, AM หรือคำค้นหา</td></tr> : null}</tbody>
          </table>
        </div>
      </section></> : <section className="teams-report">
        <div className="teams-report-head"><div><p>RM &amp; AM PERFORMANCE</p><h1>ภาพรวม RM และ AM</h1></div><span>เรียงตาม %AC สูงสุด · ข้อมูลถึง {dateLabel(dataThroughDate)}</span></div>
        <TeamRankingTable kind="channel" rows={channelRanking} sourceRows={filtered} />
        <TeamRankingTable kind="rm" rows={rmRanking} sourceRows={filtered} />
        <TeamRankingTable kind="am" rows={amRanking} sourceRows={filtered} />
      </section>}
      <footer>Apple Watch Dashboard · Target ล่าสุดเท่านั้น · อัปเดตจาก Google Sheet ผ่าน Supabase</footer>
    </main>
  );
}
