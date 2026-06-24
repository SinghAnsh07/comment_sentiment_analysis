FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (needed for LightGBM)
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK datasets
RUN python -m nltk.downloader stopwords wordnet

# Copy local serializations
COPY tfidf_vectorizer.pkl /app/tfidf_vectorizer.pkl
COPY lgbm_model.pkl /app/lgbm_model.pkl

# Copy MLflow tracking (optional registry database & runs)
COPY mlflow.db /app/mlflow.db
COPY mlruns/ /app/mlruns/

# Copy compiled React frontend assets
COPY frontend/dist/ /app/frontend/dist/

# Copy Flask app
COPY flask_app/ /app/flask_app/

EXPOSE 8080

ENV PORT=8080
ENV MLFLOW_TRACKING_URI=sqlite:////app/mlflow.db

# Run app.py from inside the flask_app directory
WORKDIR /app/flask_app
CMD ["python", "app.py"]