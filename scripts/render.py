#!/usr/bin/env python3
"""render.py – đọc students/<id>/*.yaml → sinh website tĩnh vào dist/

    python scripts/render.py                      # nếu students/ chỉ có 1 người
    python scripts/render.py nguyen_quang_khai    # chỉ định người cần render
"""
import json
import re
import shutil
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = ROOT / "template"
STUDENTS_DIR = ROOT / "students"
DIST_DIR = ROOT / "dist"

# Tần số dây buông của guitar, dây 6 → dây 1 (Mi La Rê Son Si Mi)
OPEN_HZ = {6: 82.41, 5: 110.0, 4: 146.83, 3: 196.0, 2: 246.94, 1: 329.63}


def md(text):
    """Định dạng tối giản: **đậm**, *nghiêng*, `chữ máy`. Luôn escape HTML trước."""
    s = str(escape(text or ""))
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    return Markup(s)


def make_env(sizes):
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True,
                      trim_blocks=True, lstrip_blocks=True)
    env.filters["md"] = md

    def img(rel, alt="", cls="", lazy=True):
        w, h = sizes.get(rel, (None, None))
        dims = f' width="{w}" height="{h}"' if w else ""
        c = f' class="{escape(cls)}"' if cls else ""
        lz = ' loading="lazy" decoding="async"' if lazy else ""
        return Markup(f'<img src="assets/img/{escape(rel)}" alt="{escape(alt)}"{c}{dims}{lz}>')

    env.globals["img"] = img
    env.globals["open_hz"] = OPEN_HZ
    return env


def render_student(student_id):
    src = STUDENTS_DIR / student_id
    with open(src / "data.yaml", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    for p in data["projects"]:
        with open(src / f"bai{p['id']}.yaml", encoding="utf-8") as f:
            p["product"] = yaml.safe_load(f)

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True)
    shutil.copytree(TEMPLATE_DIR / "assets", DIST_DIR / "assets")
    shutil.copytree(src / "images", DIST_DIR / "assets" / "img",
                    ignore=shutil.ignore_patterns("sizes.json"))
    sizes_file = src / "images" / "sizes.json"
    sizes = json.loads(sizes_file.read_text()) if sizes_file.exists() else {}
    env = make_env(sizes)

    def write(name, tpl, **extra):
        html = env.get_template(tpl).render(**data, **extra)
        (DIST_DIR / name).write_text(html, encoding="utf-8")
        print(f"  [OK] {name}")

    projects = data["projects"]
    write("index.html", "index.html.j2", page="home")
    write("projects.html", "projects.html.j2", page="projects")
    for i, p in enumerate(projects):
        write(f"bai-{p['id']}.html", "project.html.j2", page="projects", project=p,
              prev_p=projects[i - 1] if i > 0 else None,
              next_p=projects[i + 1] if i < len(projects) - 1 else None)
    write("conclusion.html", "conclusion.html.j2", page="conclusion")
    write("404.html", "404.html.j2", page="none")


def main():
    ids = sorted(d.name for d in STUDENTS_DIR.iterdir() if (d / "data.yaml").exists())
    if len(sys.argv) > 1:
        student_id = sys.argv[1]
    elif len(ids) == 1:
        student_id = ids[0]
    else:
        sys.exit(f"Có {len(ids)} sinh viên trong students/: {ids} — hãy chỉ định 1 người.")
    if student_id not in ids:
        sys.exit(f"Không tìm thấy students/{student_id}/data.yaml")
    print(f"=== Rendering: {student_id} → dist/ ===")
    render_student(student_id)


if __name__ == "__main__":
    main()
