#!/usr/bin/env python3
"""Normalize the public Google Sheet extract into dashboard-ready artifacts.

Input is the compact aggregate extract produced from the Target, Current and
Last year tabs. Branch IDs remain strings so joins never depend on number
formatting in Google Sheets.
"""

import csv
import json
import re
import sys
from pathlib import Path


SOURCE_SHEET_ID = "1mtjBRN84PQDXhGzWRgQ82ImHJrKml29z7cftl-15crc"
PERIODS = {
    "current": ("current", "2026-08-01"),
    "previous": ("current", "2026-07-01"),
    "lastYear": ("last_year", "2025-08-01"),
}


def amount(value):
    return round(float(value or 0), 2)


def clean_name(value, store_id):
    return re.sub(rf"^ID{re.escape(store_id)}\s*:\s*", "", str(value).strip(), flags=re.I)


def main(source_path, output_dir):
    source = json.loads(Path(source_path).read_text(encoding="utf-8"))
    target_rows = source["target"][1:]
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    sales_maps = {
        key: {str(row[0]).strip(): amount(row[1]) for row in source[key][1:]}
        for key in PERIODS
    }

    stores = []
    for month, store_id, name, bu, rm, am, target in target_rows:
        store_id = str(store_id).strip()
        current = sales_maps["current"].get(store_id, 0)
        previous = sales_maps["previous"].get(store_id, 0)
        last_year = sales_maps["lastYear"].get(store_id, 0)
        target_value = amount(target)
        stores.append({
            "storeId": store_id,
            "storeName": clean_name(name, store_id),
            "sourceStoreName": str(name).strip(),
            "bu": str(bu).strip(),
            "rm": str(rm).strip(),
            "am": str(am).strip(),
            "target": target_value,
            "currentSales": current,
            "previousMonthSales": previous,
            "lastYearSales": last_year,
            "targetAchievement": round(current / target_value, 6) if target_value else None,
            "momGrowth": round((current - previous) / previous, 6) if previous else None,
            "yoyGrowth": round((current - last_year) / last_year, 6) if last_year else None,
        })

    payload = {
        "metadata": {
            "sourceSheetId": SOURCE_SHEET_ID,
            "targetMonth": "2026-08-01",
            "currentMonth": "2026-08-01",
            "currentLatestDate": "2026-08-12",
            "currentPeriodType": "MTD",
            "previousMonth": "2026-07-01",
            "lastYearMonth": "2025-08-01",
            "targetRule": "latest month in Target tab only",
            "comparisonNote": "Current sales are MTD through 2026-08-12; previous month and last-year aggregates use their selected source periods.",
            "storeCount": len(stores),
            "rmCount": len({row["rm"] for row in stores}),
            "amCount": len({row["am"] for row in stores}),
        },
        "stores": stores,
    }
    (output / "apple-watch-dashboard.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    with (output / "aw_store_targets.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["target_month", "store_id", "store_name", "rm", "am", "target"])
        writer.writerows([
            "2026-08-01", row["storeId"], row["sourceStoreName"], row["rm"], row["am"], row["target"]
        ] for row in stores)

    with (output / "aw_monthly_sales.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["source_set", "sales_month", "store_id", "sales"])
        for key, (source_set, sales_month) in PERIODS.items():
            for store_id, sales in sorted(sales_maps[key].items(), key=lambda pair: int(pair[0])):
                writer.writerow([source_set, sales_month, store_id, sales])


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: build-apple-watch-data.py SOURCE_JSON OUTPUT_DIR")
    main(sys.argv[1], sys.argv[2])
