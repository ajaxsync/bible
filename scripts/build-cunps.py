#!/usr/bin/env python3
"""
从 cunp（繁体和合本）生成 cunps（简体和合本）。

使用 OpenCC 繁体→简体（t2s）。和合本简体与繁体在用语上高度对应，
业界常用 OpenCC 转换作为阅读版本。

依赖: pip install opencc-python-reimplemented

用法:
  python scripts/build-cunps.py
  python scripts/build-cunps.py --book 1 --chapter 1
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from opencc import OpenCC
except ImportError:
    print("请先安装: pip install opencc-python-reimplemented", file=sys.stderr)
    raise SystemExit(1)

cc = OpenCC("t2s")


def convert_value(obj):
    if isinstance(obj, str):
        return cc.convert(obj)
    if isinstance(obj, list):
        return [convert_value(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_value(val) for key, val in obj.items()}
    return obj


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    cunp_dir = root / "public" / "json" / "cunp"
    out_dir = root / "public" / "json" / "cunps"

    parser = argparse.ArgumentParser()
    parser.add_argument("--book", type=int, default=None)
    parser.add_argument("--chapter", type=int, default=None)
    args = parser.parse_args()

    if not cunp_dir.is_dir():
        print(f"错误: 找不到 {cunp_dir}", file=sys.stderr)
        return 1

    count = 0
    for book_dir in sorted(cunp_dir.iterdir(), key=lambda p: int(p.name)):
        if not book_dir.is_dir() or not book_dir.name.isdigit():
            continue
        if args.book is not None and int(book_dir.name) != args.book:
            continue

        for src in sorted(book_dir.glob("*.json")):
            if src.name == "log.txt":
                continue
            stem = src.stem
            if args.chapter is not None:
                base = str(args.chapter)
                if stem != base and stem != f"{base}.jin":
                    continue

            data = json.loads(src.read_text(encoding="utf-8"))
            converted = convert_value(data)

            dest = out_dir / book_dir.name / src.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(json.dumps(converted, ensure_ascii=False, indent=2), encoding="utf-8")
            count += 1
            print(f"OK {book_dir.name}/{src.name}")

    print(f"\n完成: 生成 {count} 个文件 -> {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
