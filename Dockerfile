FROM python:3.11-slim

WORKDIR /app

# Copy from python_vectorizer directory
COPY python_vectorizer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY python_vectorizer/app.py .

EXPOSE 5001

ENV PORT=5001
CMD ["python", "app.py"]
