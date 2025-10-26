# This file stores all the RegEx patterns for OCR extraction
# We use non-capturing groups (?:...) for aliases
# We capture the value with ([<>]?\s*[\d,]+\.?\d*) which finds numbers with/without commas/decimals
OCR_PATTERNS = {
    # --- general ---
    "White blood cells": r"^[\W_]*(?:White blood cells?|WBC|WHITE BLOOD CELL COUNT).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Haemoglobin": r"^[\W_]*(?:H(?:a)?emoglobin|HGB|HEMOGLOBIN).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Platelets": r"^[\W_]*(?:Platelets?|PLT|PLATELET COUNT).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Red blood cells": r"^[\W_]*(?:Red blood cells?|RBC|RED BLOOD CELL COUNT).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Hematocrit": r"^[\W_]*(?:Hematocrit|HCT|HEMATOCRIT).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "PCV": r"^[\W_]*(?:Packed Cell Volume|PCV).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "MCV": r"^[\W_]*(?:MCV).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "MCH": r"^[\W_]*(?:MCH).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "MCHC": r"^[\W_]*(?:MCHC).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "RDW": r"^[\W_]*(?:RDW).*?\s+([<>]?\s*[\d,]+\.?\d*)",

    # --- metabolic ---
    "LDL": r"^[\W_]*(?:LDL Chol|LDL).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Triglycerides": r"^[\W_]*(?:Triglycerides).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "HDL": r"^[\W_]*(?:HDL Chol|HDL).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Total Cholesterol": r"^[\W_]*(?:Total Chol|Total Cholesterol).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Glucose": r"^[\W_]*(?:Glucose|Glicaemia).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    
    # --- electrolytes, proteins ---
    "BUN": r"^[\W_]*(?:BUN).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Creatinine": r"^[\W_]*(?:Creatinine).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Sodium": r"^[\W_]*(?:Sodium).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Potassium": r"^[\W_]*(?:Potassium).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Chloride": r"^[\W_]*(?:Chloride).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Calcium": r"^[\W_]*(?:Calcium).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Protein, Total": r"^[\W_]*(?:Protein, Total|Total Protein).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Albumin": r"^[\W_]*(?:Albumin).*?\s+([<>]?\s*[\d,]+\.?\d*)",

    # --- vitamins ---
    "Vitamin D": r"^[\W_]*(?:Vitamin D \(25 OH\)|Vitamin D).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Magnesium": r"^[\W_]*(?:Magnesium).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "CRP": r"^[\W_]*(?:CRP|C-Reactive Protein).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Ferritin": r"^[\W_]*(?:Ferritin).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Serum Folate": r"^[\W_]*(?:Serum Folate|Folate).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Active B12": r"^[\W_]*(?:Active B12|B12).*?\s+([<>]?\s*[\d,]+\.?\d*)",

    # --- thyroid ---
    "TSH": r"^[\W_]*(?:TSH|Thyroid Stimulating Hormone)(?: \([^)]+\))?.*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "T4": r"^[\W_]*(?:T4)(?!, free)(?: \([^)]+\))?.*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "T4 Total": r"^[\W_]*(?:TT4|Total T4|Thyroxine|T4 Total).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Free T4": r"^[\W_]*(?:Free T4|FT4|T4, free).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "T3": r"^[\W_]*(?:T3)(?!, free)(?: \([^)]+\))?.*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "T3 Total": r"^[\W_]*(?:T3 Total|Total T3|Triiodothyronine).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Free T3": r"^[\W_]*(?:Free T3|FT3|T3, free).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Reverse T3": r"^[\W_]*(?:Reverse T3).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "T4U": r"^[\W_]*(?:T4U|T4 Uptake|Thyroid Uptake).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "FTI": r"^[\W_]*(?:FTI|Free Thyroxine Index).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "TBG": r"^[\W_]*(?:TBG|Thyroxine-Binding Globulin).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Anti-Thyroglobulin": r"^[\W_]*(?:Anti-\s?Thyroglobulin|Anti-TG|Anti-Thyroglobulin Abs|Anti-Thyroglobulin Antibody).*?\s+([<>]?\s*[\d,]+\.?\d*)",
    "Anti-Thyroperoxidase": r"^[\W_]*(?:Anti-Thyroperoxidase|Anti-TPO|Anti-Thyroidperoxidase abs|Anti-Thyroid Peroxidase Antibody|Anti Thyroperoxidase).*?\s+([<>]?\s*[\d,]+\.?\d*)",
}