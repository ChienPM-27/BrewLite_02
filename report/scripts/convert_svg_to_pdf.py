import os
import sys
import re
import subprocess
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

def parse_svg_dimensions(svg_path):
    try:
        tree = ET.parse(svg_path)
        root = tree.getroot()
        w = root.attrib.get('width', '')
        h = root.attrib.get('height', '')
        vb = root.attrib.get('viewBox', '')
        
        # Clean px or pt
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
        print(f"Error parsing {svg_path}: {e}")
        return 1000, 800

def convert_svg_to_pdf(browser_exe, svg_path, out_pdf_path, temp_html_dir):
    w, h = parse_svg_dimensions(svg_path)
    
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()

    # Remove xml declaration if present
    svg_content = re.sub(r'<\?xml[^>]*\?>', '', svg_content).strip()
    # Remove doctype
    svg_content = re.sub(r'<!DOCTYPE[^>]*>', '', svg_content).strip()

    # Build HTML with exact @page size matching SVG dimensions
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
{svg_content}
</body>
</html>"""

    base_name = os.path.splitext(os.path.basename(svg_path))[0]
    temp_html = os.path.join(temp_html_dir, f"{base_name}.html")
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

    os.makedirs(os.path.dirname(out_pdf_path), exist_ok=True)
    user_data_dir = os.path.join(temp_html_dir, f"profile_{base_name}")
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
    
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    except subprocess.TimeoutExpired:
        print(f"Timeout for {base_name}, retrying with basic headless...")
        cmd[1] = "--headless"
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        except subprocess.TimeoutExpired:
            print(f"Failed timeout on retry for {base_name}")
            return False

    return os.path.exists(out_pdf_path) and os.path.getsize(out_pdf_path) > 0

def main():
    browser = find_browser()
    if not browser:
        print("ERROR: No suitable browser (Edge/Chrome) found for SVG to PDF conversion.")
        sys.exit(1)
        
    print(f"Using browser: {browser}")

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    figures_dir = os.path.join(repo_root, "report", "figures")
    temp_dir = os.path.join(repo_root, "report", "scripts", "_temp")
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)

    svg_files = [
        # Use Cases
        "docs/usecase-diagrams/usecase-auth.svg",
        "docs/usecase-diagrams/usecase-cart.svg",
        "docs/usecase-diagrams/usecase-order.svg",
        "docs/usecase-diagrams/usecase-order-history.svg",
        "docs/usecase-diagrams/usecase-payment.svg",
        "docs/usecase-diagrams/usecase-product-catalog.svg",
        "docs/usecase-diagrams/usecase-product-detail.svg",
        # Activity
        "docs/activity-diagrams/activity-auth.svg",
        "docs/activity-diagrams/activity-cart.svg",
        "docs/activity-diagrams/activity-order.svg",
        "docs/activity-diagrams/activity-order-history.svg",
        "docs/activity-diagrams/activity-payment.svg",
        "docs/activity-diagrams/activity-product-catalog.svg",
        "docs/activity-diagrams/activity-product-detail.svg",
        # Sequence
        "docs/auth/sequence-auth.svg",
        "docs/cart/sequence-cart.svg",
        "docs/order/sequence-order.svg",
        "docs/order-history/sequence-order-history.svg",
        "docs/payment/sequence-payment.svg",
        "docs/product-catalog/sequence-product-catalog.svg",
        "docs/product-detail/sequence-product-detail.svg",
        # Architecture
        "docs/architecture/component-architecture.svg",
        "docs/architecture/deployment-docker.svg",
        "docs/architecture/class-diagram-backend.svg",
        "docs/architecture/order-state-machine.svg",
        "docs/architecture/database-erd.svg"
    ]

    success_count = 0
    for rel_path in svg_files:
        full_svg = os.path.join(repo_root, rel_path)
        if not os.path.exists(full_svg):
            print(f"[MISSING] {rel_path}")
            continue
            
        base_name = os.path.splitext(os.path.basename(rel_path))[0]
        out_pdf = os.path.join(figures_dir, f"{base_name}.pdf")
        
        ok = convert_svg_to_pdf(browser, full_svg, out_pdf, temp_dir)
        if ok:
            sz = os.path.getsize(out_pdf)
            print(f"[OK] {base_name}.svg -> report/figures/{base_name}.pdf ({sz} bytes)")
            success_count += 1
        else:
            print(f"[FAIL] {rel_path} -> {out_pdf}")

    try:
        os.rmdir(temp_dir)
    except:
        pass

    print(f"\nDone: {success_count}/{len(svg_files)} converted successfully.")

if __name__ == "__main__":
    main()
