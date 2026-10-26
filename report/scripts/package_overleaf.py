import os
import zipfile
import sys

sys.stdout.reconfigure(encoding='utf-8')

zip_path = 'brewlite-report-overleaf.zip'
report_dir = 'report'

print(f"Packaging {zip_path}...")

file_count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(report_dir):
        # Exclude internal scripts, temporary folders, pycache
        dirs[:] = [d for d in dirs if d not in ['scripts', '__pycache__', '_temp']]
        for file in files:
            # Exclude auxiliary build files
            if file.endswith(('.aux', '.log', '.out', '.toc', '.synctex.gz', '.fdb_latexmk', '.fls', '.xdv', '.bbl', '.blg')):
                continue
            if file == 'main_full.tex':
                continue
                
            full_path = os.path.join(root, file)
            # Store relative path inside zip
            rel_path = os.path.relpath(full_path, report_dir)
            zf.write(full_path, rel_path)
            file_count += 1

print(f"Packaged {file_count} files into {zip_path} ({os.path.getsize(zip_path):,} bytes).")
