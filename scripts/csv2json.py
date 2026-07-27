import csv
import json
import sys
import time
from pathlib import Path

if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parents[1]

CSV_DIR = ROOT / "lang_csv"
OUTPUT_DIR = ROOT / "public" / "lang"

if not (ROOT / "lang_csv").exists():
    print("请在项目根目录中运行此工具")
    time.sleep(5)
    sys.exit(1)

for csv_path in sorted(CSV_DIR.glob("*.csv")):
    with csv_path.open(mode="r", encoding="utf-8", newline="") as csv_file:
        rows = list(csv.reader(csv_file))

    if not rows:
        continue

    for index, locale in enumerate(rows[0][1:], start=1):
        translations = {
            row[0]: row[index].replace("\\n", "\n")
            for row in rows[1:]
            if len(row) > index
        }
        output_path = OUTPUT_DIR / locale / f"{csv_path.stem}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open(mode="w", encoding="utf-8") as json_file:
            json.dump(translations, json_file, indent=4, ensure_ascii=False)
