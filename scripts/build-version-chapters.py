#!/usr/bin/env python3
"""
从 cunp 整章结构 + verses 逐节 JSON 中的 versions 字段，生成其他译本整章 JSON。

用法:
  python scripts/build-version-chapters.py
  python scripts/build-version-chapters.py --versions ccb,esv
  python scripts/build-version-chapters.py --book 1 --chapter 1

默认路径（可通过参数覆盖）:
  --cunp-dir    ../bible/public/json/cunp  或 biblebase/public/json/cunp
  --verses-dir  biblebase/public/json/verses
  --output-dir  bible/public/json
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

# 与 biblebase src/data/lib/consts.rb 一致
VERSIONS = {
    "cunp": {"label": "和合本", "lang": "cht"},
    "cnv": {"label": "新譯本", "lang": "cht"},
    "ccb": {"label": "当代译本", "lang": "chs"},
    "csbs": {"label": "标准译本", "lang": "chs"},
    "esv": {"label": "ESV", "lang": "en"},
    "nasb": {"label": "NASB", "lang": "en"},
    "niv": {"label": "NIV", "lang": "en"},
    "nlt": {"label": "NLT", "lang": "en"},
    "nkjv": {"label": "NKJV", "lang": "en"},
}


def default_paths() -> tuple[Path, Path, Path]:
    root = Path(__file__).resolve().parent.parent
    biblebase = root.parent / "biblebase"
    cunp = root / "public" / "json" / "cunp"
    if not cunp.exists() and (biblebase / "public" / "json" / "cunp").exists():
        cunp = biblebase / "public" / "json" / "cunp"
    verses = biblebase / "public" / "json" / "verses"
    output = root / "public" / "json"
    return cunp, verses, output


def load_verse_text(verses_dir: Path, book: int, chapter: int, verse: int, version: str) -> str | None:
    path = verses_dir / str(book) / str(chapter) / f"{verse}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    entry = next(iter(data.values()))
    block = entry.get("versions", {}).get(version)
    return block.get("text") if block else None


def build_chapter(cunp_data: dict, verses_dir: Path, version: str) -> tuple[dict, list[int]]:
    result = copy.deepcopy(cunp_data)
    book = result["book"]
    chapter = result["chapter"]
    missing: list[int] = []

    for section in result.get("sections", []):
        contents = section.get("contents")
        if not contents:
            continue
        for item in contents:
            verse_num = item.get("verseNum")
            if verse_num is None:
                continue
            raw = item.get("verseText", "")
            if not str(raw).strip():
                continue

            text = load_verse_text(verses_dir, book, chapter, verse_num, version)
            if text is None:
                missing.append(verse_num)
                continue

            # 保留原 cunp 在节号后的空格习惯
            suffix = " " if item.get("hasVerseLabel") and not text.endswith(" ") else ""
            item["verseText"] = text + suffix

    return result, missing


def iter_cunp_files(cunp_dir: Path, book: int | None, chapter: int | None):
    if book is not None and chapter is not None:
        yield cunp_dir / str(book) / f"{chapter}.json"
        return
    for book_dir in sorted(cunp_dir.iterdir(), key=lambda p: int(p.name)):
        if not book_dir.is_dir() or not book_dir.name.isdigit():
            continue
        if book is not None and int(book_dir.name) != book:
            continue
        for f in sorted(book_dir.glob("*.json"), key=lambda p: p.stem):
            if chapter is not None and f.stem != str(chapter) and not f.stem.endswith(f"{chapter}.jin"):
                if f.stem.replace(".jin", "") != str(chapter):
                    continue
            yield f


def main() -> int:
    default_cunp, default_verses, default_out = default_paths()

    parser = argparse.ArgumentParser(description="Generate full-chapter JSON for Bible versions")
    parser.add_argument("--cunp-dir", type=Path, default=default_cunp)
    parser.add_argument("--verses-dir", type=Path, default=default_verses)
    parser.add_argument("--output-dir", type=Path, default=default_out)
    parser.add_argument("--versions", default=",".join(v for v in VERSIONS if v != "cunp"))
    parser.add_argument("--book", type=int, default=None)
    parser.add_argument("--chapter", type=int, default=None)
    args = parser.parse_args()

    if not args.cunp_dir.is_dir():
        print(f"错误: cunp 目录不存在: {args.cunp_dir}", file=sys.stderr)
        return 1
    if not args.verses_dir.is_dir():
        print(f"错误: verses 目录不存在: {args.verses_dir}", file=sys.stderr)
        print("请确保 biblebase 仓库的 public/json/verses 可用。", file=sys.stderr)
        return 1

    targets = [v.strip() for v in args.versions.split(",") if v.strip()]
    for v in targets:
        if v not in VERSIONS:
            print(f"未知版本: {v}", file=sys.stderr)
            return 1

    total_written = 0
    total_missing = 0

    for cunp_file in iter_cunp_files(args.cunp_dir, args.book, args.chapter):
        if not cunp_file.exists() or cunp_file.name == "log.txt":
            continue

        cunp_data = json.loads(cunp_file.read_text(encoding="utf-8"))
        rel = cunp_file.relative_to(args.cunp_dir)

        for version in targets:
            out_dir = args.output_dir / version / rel.parent
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file = args.output_dir / version / rel

            built, missing = build_chapter(cunp_data, args.verses_dir, version)
            out_file.write_text(json.dumps(built, ensure_ascii=False, indent=2), encoding="utf-8")
            total_written += 1
            total_missing += len(missing)

            if missing:
                print(f"  [{version}] {rel}: 缺 {len(missing)} 节 {missing[:5]}{'...' if len(missing) > 5 else ''}")

        print(f"OK {rel}")

    print(f"\n完成: 写入 {total_written} 个文件, 累计缺失节数 {total_missing}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
