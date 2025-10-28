FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y tesseract-ocr libgl1 poppler-utils && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# command to run the app. 
# use 0.0.0.0 to make it accessible outside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]