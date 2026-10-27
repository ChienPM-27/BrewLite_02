# Makefile for BrewLite LaTeX Report (XeLaTeX)

LATEX = xelatex
FLAGS = -interaction=nonstopmode -synctex=1
TARGET = main

all: $(TARGET).pdf

$(TARGET).pdf: $(TARGET).tex chapters/*.tex appendices/*.tex
	$(LATEX) $(FLAGS) $(TARGET).tex
	$(LATEX) $(FLAGS) $(TARGET).tex

clean:
	rm -f *.aux *.log *.toc *.out *.fls *.fdb_latexmk *.synctex.gz *.lot *.lof *.xdv
	rm -f chapters/*.aux appendices/*.aux

distclean: clean
	rm -f $(TARGET).pdf

.PHONY: all clean distclean
