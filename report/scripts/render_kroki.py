import os
import glob
import urllib.request
import time
import zipfile
import re

def render_diagram(puml_path):
    with open(puml_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Render SVG
    svg_req = urllib.request.Request(
        'https://kroki.io/plantuml/svg',
        data=text.encode('utf-8'),
        headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain; charset=utf-8'}
    )
    with urllib.request.urlopen(svg_req, timeout=30) as resp:
        svg_content = resp.read().decode('utf-8')

    error_markers = [
        "GraphvizJsRuntimeException",
        "An error has occured",
        "This URL does not look like HUFFMAN data",
        "Cannot invoke"
    ]
    for m in error_markers:
        if m in svg_content:
            raise RuntimeError(f"PlantUML error in SVG ({m}) for {puml_path}")

    if '<svg' not in svg_content:
        raise RuntimeError(f"Bad SVG for {puml_path}: no <svg tag")

    # Render PNG
    png_req = urllib.request.Request(
        'https://kroki.io/plantuml/png',
        data=text.encode('utf-8'),
        headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain; charset=utf-8'}
    )
    with urllib.request.urlopen(png_req, timeout=30) as resp:
        png_content = resp.read()

    if not png_content.startswith(b'\x89PNG\r\n\x1a\n'):
        raise RuntimeError(f"Bad PNG for {puml_path}")

    return svg_content, png_content

def main():
    pumls = glob.glob('docs/**/*.puml', recursive=True)
    print(f"Total PUML files to process: {len(pumls)}")
    
    figures_dir = 'report/figures'
    os.makedirs(figures_dir, exist_ok=True)
    
    success_count = 0
    for i, puml in enumerate(pumls, 1):
        base_name = os.path.splitext(os.path.basename(puml))[0]
        puml_dir = os.path.dirname(puml)
        
        doc_svg = os.path.join(puml_dir, f"{base_name}.svg")
        doc_png = os.path.join(puml_dir, f"{base_name}.png")
        fig_svg = os.path.join(figures_dir, f"{base_name}.svg")
        fig_png = os.path.join(figures_dir, f"{base_name}.png")
        
        print(f"[{i}/{len(pumls)}] Rendering {base_name} via Kroki...")
        try:
            svg_data, png_data = render_diagram(puml)
            
            # Save SVG in docs and report/figures
            with open(doc_svg, 'w', encoding='utf-8') as f:
                f.write(svg_data)
            with open(fig_svg, 'w', encoding='utf-8') as f:
                f.write(svg_data)
                
            # Save PNG in docs and report/figures
            with open(doc_png, 'wb') as f:
                f.write(png_data)
            with open(fig_png, 'wb') as f:
                f.write(png_data)
                
            print(f"      -> SUCCESS (SVG: {len(svg_data):,} chars, PNG: {len(png_data):,} bytes)")
            success_count += 1
        except Exception as e:
            print(f"      -> ERROR: {e}")
            
        time.sleep(0.3)
        
    print(f"\nRendered {success_count}/{len(pumls)} diagrams successfully!")

    # Update overleaf zip
    zip_path = 'brewlite-report-overleaf.zip'
    report_dir = 'report'
    print(f"Updating {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(report_dir):
            dirs[:] = [d for d in dirs if d not in ['scripts', '__pycache__']]
            for file in files:
                if file.endswith(('.aux', '.log', '.out', '.toc', '.synctex.gz', '.fdb_latexmk', '.fls', '.xdv', '.bbl', '.blg')):
                    continue
                if file == 'main_full.tex':
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, report_dir)
                zf.write(full_path, rel_path)
    print(f"Updated {zip_path}: {os.path.getsize(zip_path):,} bytes")

if __name__ == '__main__':
    main()
