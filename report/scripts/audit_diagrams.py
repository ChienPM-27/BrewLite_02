import glob
import re
import os

print(f"{'File':45} | {'Width':6} | {'Height':6} | {'Ratio':6} | Status")
print("-" * 80)

for f in sorted(glob.glob('report/figures/*.svg')):
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    m = re.search(r'viewBox="([^"]+)"', content)
    if m:
        parts = m.group(1).split()
        if len(parts) == 4:
            w, h = float(parts[2]), float(parts[3])
            ratio = w / h
            fname = os.path.basename(f)
            if ratio > 1.3 or w > 1800:
                status = 'CRITICAL (Too Wide / Pancake)'
            elif ratio > 1.05 or w > 1300:
                status = 'WARN (Wide)'
            else:
                status = 'OK (Compact Portrait/Square)'
            print(f"{fname:45} | {w:6.0f} | {h:6.0f} | {ratio:6.2f} | {status}")
