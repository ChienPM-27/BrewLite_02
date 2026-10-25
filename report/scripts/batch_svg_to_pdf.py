import os
import glob
import subprocess
import tempfile
import re
import xml.etree.ElementTree as ET

EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
]

def find_browser():
    for p in EDGE_PATHS:
        if os.path.exists(p):
            return p
    return None

def parse_svg_dimensions(svg_content):
    try:
        root = ET.fromstring(svg_content)
        w = root.attrib.get('width', '')
        h = root.attrib.get('height', '')
        vb = root.attrib.get('viewBox', '')
        
        w_val = None
        h_val = None
        if w:
            m = re.search(r'([\d.]+)', w)
            if m:
                w_val = float(m.group(1))
        if h:
            m = re.search(r'([\d.]+)', h)
            if m:
                h_val = float(m.group(1))
                
        if (not w_val or not h_val) and vb:
            parts = [float(p) for p in vb.replace(',', ' ').split() if p.strip()]
            if len(parts) == 4:
                w_val = parts[2]
                h_val = parts[3]
                
        if not w_val or not h_val:
            w_val = 1000
            h_val = 800
            
        return w_val, h_val
    except Exception as e:
        return 1000, 800

def convert_svg_to_pdf(browser_exe, svg_path, out_pdf_path):
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()

    w, h = parse_svg_dimensions(svg_content)
    clean_svg = re.sub(r'<\?xml[^>]*\?>', '', svg_content).strip()
    clean_svg = re.sub(r'<!DOCTYPE[^>]*>', '', clean_svg).strip()
    
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{ size: {w}px {h}px; margin: 0; }}
html, body {{ margin: 0; padding: 0; width: {w}px; height: {h}px; overflow: hidden; background: transparent; }}
svg {{ width: 100%; height: 100%; display: block; }}
</style>
</head>
<body>{clean_svg}</body>
</html>"""

    temp_dir = tempfile.mkdtemp()
    temp_html = os.path.join(temp_dir, "page.html")
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html)
        
    user_data = os.path.join(temp_dir, "u")
    os.makedirs(user_data, exist_ok=True)
    
    cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--user-data-dir={user_data}",
        f"--print-to-pdf={os.path.abspath(out_pdf_path)}",
        os.path.abspath(temp_html)
    ]
    try:
        subprocess.run(cmd, timeout=15)
    except:
        cmd[1] = "--headless"
        subprocess.run(cmd, timeout=15)

def main():
    browser = find_browser()
    if not browser:
        print("No browser found")
        return
        
    svgs = glob.glob('report/figures/*.svg')
    print(f"Converting {len(svgs)} SVGs to PDFs in report/figures/...")
    for svg in svgs:
        base = os.path.splitext(os.path.basename(svg))[0]
        if base == 'database-uml':
            continue
        out_pdf = os.path.join('report/figures', f"{base}.pdf")
        convert_svg_to_pdf(browser, svg, out_pdf)
        print(f"Converted {base}.pdf ({os.path.getsize(out_pdf) if os.path.exists(out_pdf) else 0} bytes)")

if __name__ == '__main__':
    main()
