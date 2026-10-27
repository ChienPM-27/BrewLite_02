import os
import glob
import zlib
import urllib.request
import zipfile

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

def fetch_png(puml_path: str) -> bytes:
    with open(puml_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    encoded = plantuml_encode(text)
    url = f"http://www.plantuml.com/plantuml/png/~1{encoded}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        
    if not content.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError(f"Failed to fetch PNG for {puml_path}: header is {content[:20]}")
    return content

def main():
    pumls = glob.glob('docs/**/*.puml', recursive=True)
    print(f"Found {len(pumls)} PUML files.")
    
    figures_dir = 'report/figures'
    os.makedirs(figures_dir, exist_ok=True)
    
    for i, puml in enumerate(pumls, 1):
        base_name = os.path.splitext(os.path.basename(puml))[0]
        puml_dir = os.path.dirname(puml)
        
        target_doc_png = os.path.join(puml_dir, f"{base_name}.png")
        target_fig_png = os.path.join(figures_dir, f"{base_name}.png")
        
        print(f"[{i}/{len(pumls)}] Exporting PNG: {base_name}...")
        png_data = fetch_png(puml)
        
        with open(target_doc_png, 'wb') as f:
            f.write(png_data)
            
        with open(target_fig_png, 'wb') as f:
            f.write(png_data)
            
        print(f"      -> OK ({len(png_data):,} bytes)")

    print("\nAll 27 PNGs generated successfully in docs/ and report/figures/!")
    
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
