import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import List, Dict

MASTER_MODEL_FEATURES = [
    "Gender", "Hemoglobin", "MCH", "MCHC", "MCV", 
    "sex", "age", "TSH", "T3", "TT4", "T4U", "FTI", "TBG", 
    'Fasting_Blood_Glucose', 'HbA1c', 'Triglyceride_Levels', 'LDL_Cholesterol', 
    'HDL_Cholesterol', 'CRP_Levels', 'Insulin_Levels', 'HOMA_IR', 'OGTT', 
    'Creatinine_Levels', 'eGFR', 'Uric_Acid_Levels', 'Fructosamine_Levels',
    'ALT', 'AST', 'C_Peptide', 'Proinsulin_Levels' 
]


def extract_table_data(img: np.ndarray) -> List[List[str]]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    
    # table line detection
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    table_structure = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
    
    contours, _ = cv2.findContours(table_structure, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    # filter and sort contours for cells
    cells = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w > 50 and h > 20 and w < img.shape[1] - 10 and h < img.shape[0] - 10:
            cells.append((x, y, w, h))
    
    cells = sorted(cells, key=lambda cell: (cell[1], cell[0]))
    
    rows = []
    current_row = []
    current_y = None
    y_tolerance = 10
    
    for cell in cells:
        x, y, w, h = cell
        
        if current_y is None:
            current_y = y
            current_row.append(cell)
        elif abs(y - current_y) <= y_tolerance:
            current_row.append(cell)
        else:
            current_row.sort(key=lambda c: c[0])
            rows.append(current_row)
            current_row = [cell]
            current_y = y
    
    if current_row:
        current_row.sort(key=lambda c: c[0])
        rows.append(current_row)
    
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    table_data = []
    
    for row in rows:
        row_data = []
        for cell in row:
            x, y, w, h = cell
            padding = 5
            x_start = max(0, x + padding)
            y_start = max(0, y + padding)
            x_end = min(pil_img.width, x + w - padding)
            y_end = min(pil_img.height, y + h - padding)
            
            if x_start >= x_end or y_start >= y_end:
                row_data.append("")
                continue

            cell_img = pil_img.crop((x_start, y_start, x_end, y_end))
            text = pytesseract.image_to_string(cell_img, config='--psm 6').strip()
            row_data.append(text)
        
        table_data.append(row_data)
    
    return table_data


def parse_image_data(img: np.ndarray) -> Dict[str, str]:
    table_data = extract_table_data(img)
    
    ocr_lookup = {} 
    
    for row in table_data:
        row_text = " | ".join([cell.strip() for cell in row if cell.strip()])
        
        if not row_text:
            continue
            
        parts = row_text.split('|')
        
        if len(parts) < 2:
            continue

        key_raw = parts[0].strip()
        
        value_column = ""
        for i in range(1, len(parts)):
            potential_value = parts[i].strip()
            if potential_value:
                value_column = potential_value
                break
        
        if not key_raw:
            continue
            
        if not value_column:
            continue

        key_normalized = key_raw.replace(' ', '_').replace('.', '_').replace('-', '_').strip()
        key_normalized = ''.join(c for c in key_normalized if c.isalnum() or c == '_')
        
        while '__' in key_normalized:
            key_normalized = key_normalized.replace('__', '_')
        
        key_lower = key_normalized.lower()
        
        #common OCR misinterpretations (add more if needed)
        if 'hba1c' in key_lower or 'hbaic' in key_lower or 'hbal1c' in key_lower or 'hbalic' in key_lower:
            key_normalized = 'HbA1c'
        elif key_lower == 'gender':
            key_normalized = 'Gender'
        elif key_lower == 'sex':
            key_normalized = 'sex'
        elif key_lower in ['fti', 'ft']:
            key_normalized = 'FTI'
        elif 'hdl' in key_lower and 'cholester' in key_lower:
            key_normalized = 'HDL_Cholesterol'
        elif 'ldl' in key_lower and ('cholester' in key_lower or 'chnolester' in key_lower or 'cholestrol' in key_lower):
            key_normalized = 'LDL_Cholesterol'
        elif 'proinsulin' in key_lower and 'level' in key_lower:
            key_normalized = 'Proinsulin_Levels'
        elif 'insulin' in key_lower and 'level' in key_lower and 'proinsulin' not in key_lower:
            key_normalized = 'Insulin_Levels'
        elif 'fasting' in key_lower and ('blood' in key_lower or 'blooa' in key_lower or 'biood' in key_lower) and 'glucose' in key_lower:
            key_normalized = 'Fasting_Blood_Glucose'
        elif 'fructosamine' in key_lower and 'level' in key_lower:
            key_normalized = 'Fructosamine_Levels'
        
        value_parts = value_column.split()
        
        if value_parts:
            value_candidate = value_parts[0]
            
            value_candidate = value_candidate.replace('<', '').replace('>', '').replace(',', '').replace('%', '')

            numeric_part = ''
            for char in value_candidate:
                if char.isdigit() or char == '.':
                    numeric_part += char
                else:
                    break
            
            if numeric_part:
                value_candidate = numeric_part

            is_numeric = False
            try:
                float(value_candidate)
                is_numeric = True
            except ValueError:
                pass
            
            if is_numeric or key_normalized in ["sex", "age", "Gender"]:
                
                if key_normalized.lower() in ['age', 'sex', 'gender']:
                    ocr_lookup[key_normalized] = value_candidate.upper()
                else:
                    ocr_lookup[key_normalized] = value_candidate
        
    final_results = {}
    for feature in MASTER_MODEL_FEATURES:
        key = feature
        
        if key in ocr_lookup:
            final_results[key] = ocr_lookup[key]
        elif feature == "Gender" and ocr_lookup.get('sex'):
            final_results['Gender'] = ocr_lookup['sex']
        else:
            final_results[key] = "Not Found"

    return final_results