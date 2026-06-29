#!/usr/bin/env python3
"""
从 biblebase 复制 verses 逐节 JSON，仅保留对照阅读用到的译本。

默认保留：cnv, ccb, csbs, esv, nasb（与 src/data/versions.js 中 COMPARE_* 一致）

用法:
  python scripts/copy-verses.py
  python scripts/copy-verses.py --versions cnv,ccb,esv
  python scripts/copy-verses.py --source-dir ../biblebase/public/json/verses
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DEFAULT_COMPARE_IDS = ("cnv", "ccb", "csbs", "esv", "nasb")


def default_paths() -> tuple[Path, Path]:
    root = Path(__file__).resolve().parent.parent
    source = root.parent / "biblebase" / "public" / "json" / "verses"
    output = root / "public" / "json" / "verses"
    return source, output


def slim_verse(data: dict, keep: set[str]) -> dict | None:
    if not data:
        return None
    verse_key, entry = next(iter(data.items()))
    versions = entry.get("versions") or {}
    slim_versions = {}
    for vid in keep:
        block = versions.get(vid)
        if not block:
            continue
        text = block.get("text")
        if text is None:
            continue
        slim_versions[vid] = {"text": text}
    if not slim_versions:
        return None
    return {verse_key: {"versions": slim_versions}}


def copy_verses(source: Path, output: Path, keep: set[str]) -> tuple[int, int, int]:
    if not source.is_dir():
        print(f"错误: 源目录不存在: {source}", file=sys.stderr)
        print("请确保 biblebase 仓库位于 ../biblebase", file=sys.stderr)
        sys.exit(1)

    written = 0
    skipped = 0
    total_bytes = 0

    for src in sorted(source.rglob("*.json")):
        rel = src.relative_to(source)
        dest = output / rel

        try:
            raw = json.loads(src.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as err:
            print(f"跳过（无法读取）: {rel} ({err})", file=sys.stderr)
            skipped += 1
            continue

        slim = slim_verse(raw, keep)
        if slim is None:
            skipped += 1
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(slim, ensure_ascii=False, separators=(",", ":"))
        dest.write_text(payload, encoding="utf-8")
        total_bytes += len(payload.encode("utf-8"))
        written += 1

    return written, skipped, total_bytes


def main() -> None:
    default_source, default_output = default_paths()
    parser = argparse.ArgumentParser(description="复制 verses 并仅保留对照译本")
    parser.add_argument("--source-dir", type=Path, default=default_source)
    parser.add_argument("--output-dir", type=Path, default=default_output)
    parser.add_argument(
        "--versions",
        default=",".join(DEFAULT_COMPARE_IDS),
        help=f"逗号分隔的译本 ID（默认: {','.join(DEFAULT_COMPARE_IDS)}）",
    )
    args = parser.parse_args()

    keep = {v.strip() for v in args.versions.split(",") if v.strip()}
    if not keep:
        print("错误: --versions 不能为空", file=sys.stderr)
        sys.exit(1)

    print(f"源: {args.source_dir}")
    print(f"输出: {args.output_dir}")
    print(f"保留译本: {', '.join(sorted(keep))}")

    written, skipped, total_bytes = copy_verses(args.source_dir, args.output_dir, keep)
    mb = total_bytes / 1024 / 1024
    print(f"完成: 写入 {written} 个文件，跳过 {skipped} 个，合计约 {mb:.1f} MB")


if __name__ == "__main__":
    main()
