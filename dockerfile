FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1 HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["gunicorn", "server:app", "-b", "0.0.0.0:8080"]