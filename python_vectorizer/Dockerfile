FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Expose port (Render provides PORT env var)
EXPOSE 5001

# Start the application
ENV PORT=5001
CMD ["python", "app.py"]
