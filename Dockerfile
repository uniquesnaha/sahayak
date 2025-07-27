FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install python-dotenv

COPY . .

# Optional: Set env var (if you want Docker to know path at runtime)
ENV GOOGLE_APPLICATION_CREDENTIALS="vital-stack-450920-n3-916d21258b14.json"

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]