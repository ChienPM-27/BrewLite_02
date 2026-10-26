import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('report/main_full.tex', 'r', encoding='utf-8') as f:
    full = f.read()

# All tagged sections to extract and sync to subfiles
sections = [
    ('chapters/cover', 'report/chapters/cover.tex'),
    ('chapters/ch1-introduction', 'report/chapters/ch1-introduction.tex'),
    ('chapters/ch2-requirements', 'report/chapters/ch2-requirements.tex'),
    ('chapters/ch3-architecture', 'report/chapters/ch3-architecture.tex'),
    ('chapters/ch4-database', 'report/chapters/ch4-database.tex'),
    ('chapters/feature-auth', 'report/chapters/feature-auth.tex'),
    ('chapters/feature-catalog', 'report/chapters/feature-catalog.tex'),
    ('chapters/feature-detail', 'report/chapters/feature-detail.tex'),
    ('chapters/feature-cart', 'report/chapters/feature-cart.tex'),
    ('chapters/feature-order', 'report/chapters/feature-order.tex'),
    ('chapters/feature-payment', 'report/chapters/feature-payment.tex'),
    ('chapters/feature-history', 'report/chapters/feature-history.tex'),
    ('chapters/ch6-advanced-logic', 'report/chapters/ch6-advanced-logic.tex'),
    ('chapters/ch7-implementation', 'report/chapters/ch7-implementation.tex'),
    ('chapters/ch8-evaluation', 'report/chapters/ch8-evaluation.tex'),
    ('appendices/appendix-a', 'report/appendices/appendix-a.tex'),
    ('appendices/appendix-b', 'report/appendices/appendix-b.tex'),
    ('appendices/appendix-c', 'report/appendices/appendix-c.tex'),
]

for tag, file_path in sections:
    start_tag = f'% ====== BEGIN INLINE: {tag} ======'
    end_tag = f'% ====== END INLINE: {tag} ======'
    
    assert start_tag in full, f"Start tag '{start_tag}' not found in main_full.tex!"
    assert end_tag in full, f"End tag '{end_tag}' not found in main_full.tex!"
    
    s_idx = full.find(start_tag) + len(start_tag)
    e_idx = full.find(end_tag)
    
    content = full[s_idx:e_idx].strip() + "\n"
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Synced {file_path} from main_full.tex")

# Verify ch5-features.tex
ch5_path = 'report/chapters/ch5-features.tex'
ch5_intro_tag = '% ====== BEGIN INLINE: chapters/ch5-features ======'
ch5_intro_end = '% ====== END INLINE: chapters/ch5-features ======'
s_idx = full.find(ch5_intro_tag) + len(ch5_intro_tag)
e_idx = full.find(ch5_intro_end)
ch5_intro = full[s_idx:e_idx].strip()

ch5_content = ch5_intro + """

\\input{chapters/feature-auth}
\\input{chapters/feature-catalog}
\\input{chapters/feature-detail}
\\input{chapters/feature-cart}
\\input{chapters/feature-order}
\\input{chapters/feature-payment}
\\input{chapters/feature-history}
"""
with open(ch5_path, 'w', encoding='utf-8') as f:
    f.write(ch5_content)
print(f"Synced {ch5_path}")

# Now build the modular main.tex
# Extract preamble from main_full.tex (up to \begin{document})
doc_start = r"\begin{document}"
preamble = full[:full.find(doc_start)].strip()

modular_main = preamble + """

\\begin{document}

% 1. Trang bìa (Cover Page)
\\include{chapters/cover}

% 2. Phần đầu tài liệu (Front Matter)
\\pagenumbering{roman}
\\setcounter{page}{1}

\\tableofcontents
\\newpage
\\listoffigures
\\newpage
\\listoftables
\\newpage

% 3. Nội dung chính các chương (Main Content)
\\pagenumbering{arabic}
\\setcounter{page}{1}

\\include{chapters/ch1-introduction}
\\include{chapters/ch2-requirements}
\\include{chapters/ch3-architecture}
\\include{chapters/ch4-database}
\\include{chapters/ch5-features}
\\include{chapters/ch6-advanced-logic}
\\include{chapters/ch7-implementation}
\\include{chapters/ch8-evaluation}

% 4. Phụ lục (Appendices)
\\appendix
\\include{appendices/appendix-a}
\\include{appendices/appendix-b}
\\include{appendices/appendix-c}

\\end{document}
"""

with open('report/main.tex', 'w', encoding='utf-8') as f:
    f.write(modular_main.strip() + "\n")

print("Created modular report/main.tex successfully!")
