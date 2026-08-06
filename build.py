"""Assembles the self-contained index.html from source parts.
Run: python build.py
"""
import pathlib

root = pathlib.Path(__file__).parent

shell = (root / "shell_template.html").read_text(encoding="utf-8")
app_css = (root / "app.css").read_text(encoding="utf-8")
app_js = (root / "app.js").read_text(encoding="utf-8")
react_js = (root / "react.production.min.js").read_text(encoding="utf-8")
react_dom_js = (root / "react-dom.production.min.js").read_text(encoding="utf-8")
fraunces_normal_b64 = (root / "fraunces-normal.b64").read_text(encoding="utf-8").strip()
fraunces_italic_b64 = (root / "fraunces-italic.b64").read_text(encoding="utf-8").strip()

app_css = app_css.replace("__FRAUNCES_NORMAL_B64__", fraunces_normal_b64)
app_css = app_css.replace("__FRAUNCES_ITALIC_B64__", fraunces_italic_b64)

out = shell
out = out.replace("__APP_CSS__", app_css)
out = out.replace("__REACT_JS__", react_js)
out = out.replace("__REACT_DOM_JS__", react_dom_js)
out = out.replace("__APP_JS__", app_js)

(root / "index.html").write_text(out, encoding="utf-8")
size_kb = len(out.encode("utf-8")) / 1024
print(f"Wrote index.html ({size_kb:.0f} KB)")
