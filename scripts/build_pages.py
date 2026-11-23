"""Build the GitHub Pages artifact without copying repository documentation."""

import argparse
import re
from html import escape
from pathlib import Path
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
PUBLIC_EXTENSIONS = {
    ".html", ".css", ".js", ".mjs", ".json",
    ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico",
    ".woff", ".woff2", ".ttf", ".mp3", ".mp4", ".webm", ".ogg",
}


def build(root: Path, destination: Path) -> None:
    template = (root / "scripts" / "pages-index.html").read_text(encoding="utf-8")
    source = root / "use-case"
    if source.is_symlink():
        raise ValueError(f"Use-case root must not be a symlink: {source}")
    destination.mkdir(parents=True, exist_ok=False)
    links = []
    for case in sorted(source.iterdir()):
        if case.name.startswith("."):
            continue
        if case.is_symlink():
            raise ValueError(f"Use-case path must not be a symlink: {case}")
        if not case.is_dir():
            continue
        if not SLUG.fullmatch(case.name):
            raise ValueError(f"Invalid use-case slug: {case.name}")
        if not (case / "index.html").is_file():
            raise ValueError(f"Missing use-case entry point: {case / 'index.html'}")
        for asset in case.rglob("*"):
            relative = asset.relative_to(root)
            if any(part.startswith(".") for part in relative.parts):
                continue
            if asset.is_symlink():
                raise ValueError(f"Use-case asset must not be a symlink: {asset}")
            if asset.is_file() and asset.suffix.lower() in PUBLIC_EXTENSIONS:
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                copyfile(asset, target)
        label = escape(case.name.replace("-", " ").capitalize())
        links.append(f'<li><a href="use-case/{case.name}/">{label}</a></li>')

    catalog = (
        "<ul>\n" + "\n".join(links) + "\n</ul>"
        if links else "<p>No use cases have been published yet.</p>"
    )
    (destination / "index.html").write_text(
        template.replace("<!-- USE_CASE_CATALOG -->", catalog), encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path, help="A new output directory outside use-case/")
    args = parser.parse_args()
    destination = args.destination.resolve()
    if destination.is_relative_to(ROOT / "use-case"):
        parser.error("destination must be outside use-case/")
    try:
        build(ROOT, destination)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Pages build failed: {exc}\n")
