import os
import sys
import zlib
import urllib.request
import re
import tempfile
import subprocess
import xml.etree.ElementTree as ET

DIAGRAMS = [
    {
        "puml": r"docs/database-uml.puml",
        "svg": r"docs/database-uml.svg",
        "pdf": None
    },
    {
        "puml": r"docs/architecture/class-diagram-backend.puml",
        "svg": r"docs/architecture/class-diagram-backend.svg",
        "pdf": r"report/figures/class-diagram-backend.pdf"
    },
    {
        "puml": r"docs/architecture/component-architecture.puml",
        "svg": r"docs/architecture/component-architecture.svg",
        "pdf": r"report/figures/component-architecture.pdf"
    },
    {
        "puml": r"docs/architecture/database-erd.puml",
        "svg": r"docs/architecture/database-erd.svg",
        "pdf": r"report/figures/database-erd.pdf"
    },
    {
        "puml": r"docs/architecture/deployment-docker.puml",
        "svg": r"docs/architecture/deployment-docker.svg",
        "pdf": r"report/figures/deployment-docker.pdf"
    },
    {
        "puml": r"docs/architecture/order-state-machine.puml",
        "svg": r"docs/architecture/order-state-machine.svg",
        "pdf": r"report/figures/order-state-machine.pdf"
    }
]

def plantuml_encode(text: str) -> str:
    utf8_data = text.encode('utf-8')
    deflated = zlib.compress(utf8_data, 9)[2:-4]
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    
    def encode_3bytes(b1, b2, b3):
        c1 = b1 >> 2
        c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
        c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
        c4 = b3 & 0x3F
        return alphabet[c1] + alphabet[c2] + alphabet[c3] + alphabet[c4]
    
    res = []
    i = 0
    n = len(deflated)
    while i < n:
        b1 = deflated[i]
        b2 = deflated[i+1] if i + 1 < n else 0
        b3 = deflated[i+2] if i + 2 < n else 0
        
        encoded_block = encode_3bytes(b1, b2, b3)
        if i + 2 < n:
            res.append(encoded_block)
        elif i + 1 < n:
            res.append(encoded_block[:3])
        else:
            res.append(encoded_block[:2])
        i += 3
        
    return "".join(res)

def fetch_svg(puml_path: str) -> str:
    with open(puml_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    encoded = plantuml_encode(text)
    url = f"http://www.plantuml.com/plantuml/svg/~1{encoded}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode('utf-8')
        
    if "GraphvizJsRuntimeException" in content or "An error has occured" in content:
        raise RuntimeError(f"PlantUML returned error SVG for {puml_path}")
    if not ("<svg" in content):
        raise ValueError(f"Response is not SVG: {content[:200]}")
        
    return content

def find_browser():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]
    for p in candidates:
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
        print(f"Error parsing SVG dimensions: {e}")
        return 1000, 800

def convert_svg_to_pdf(browser_exe, svg_content, out_pdf_path):
    w, h = parse_svg_dimensions(svg_content)
    
    clean_svg = re.sub(r'<\?xml[^>]*\?>', '', svg_content).strip()
    clean_svg = re.sub(r'<!DOCTYPE[^>]*>', '', clean_svg).strip()
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {{
  size: {w}px {h}px;
  margin: 0;
}}
html, body {{
  margin: 0;
  padding: 0;
  width: {w}px;
  height: {h}px;
  overflow: hidden;
  background-color: transparent;
}}
svg {{
  width: 100%;
  height: 100%;
  display: block;
}}
</style>
</head>
<body>
{clean_svg}
</body>
</html>"""

    temp_dir = tempfile.mkdtemp()
    temp_html = os.path.join(temp_dir, "index.html")
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    os.makedirs(os.path.dirname(out_pdf_path), exist_ok=True)
    user_data_dir = os.path.join(temp_dir, "profile")
    os.makedirs(user_data_dir, exist_ok=True)
    
    cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--user-data-dir={user_data_dir}",
        f"--print-to-pdf={os.path.abspath(out_pdf_path)}",
        os.path.abspath(temp_html)
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    if res.returncode != 0 or not os.path.exists(out_pdf_path) or os.path.getsize(out_pdf_path) == 0:
        cmd[1] = "--headless"
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)

def main():
    browser_exe = find_browser()
    if not browser_exe:
        print("Error: No Chromium-based browser found!")
        sys.exit(1)
        
    print(f"Using browser: {browser_exe}")
    
    for item in DIAGRAMS:
        puml_file = item["puml"]
        svg_file = item["svg"]
        pdf_file = item["pdf"]
        
        print(f"\nProcessing {puml_file}...")
        svg_content = fetch_svg(puml_file)
        
        # Save SVG
        os.makedirs(os.path.dirname(svg_file), exist_ok=True)
        with open(svg_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"  -> Saved clean SVG: {svg_file} ({len(svg_content)} bytes)")
        
        # Convert to PDF if requested
        if pdf_file:
            convert_svg_to_pdf(browser_exe, svg_content, pdf_file)
            pdf_size = os.path.getsize(pdf_file) if os.path.exists(pdf_file) else 0
            print(f"  -> Converted to PDF: {pdf_file} ({pdf_size} bytes)")

    print("\nAll diagrams successfully re-rendered and updated!")

if __name__ == "__main__":
    main()
