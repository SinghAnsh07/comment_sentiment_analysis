# YouTube Comment Sentiment Analysis

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![MLflow](https://img.shields.io/badge/MLflow-Tracking-0194E2.svg)](https://mlflow.org/)
[![DVC](https://img.shields.io/badge/DVC-Data%20Version%20Control-945DD6.svg)](https://dvc.org/)
[![Flask](https://img.shields.io/badge/Flask-API-000000.svg)](https://flask.palletsprojects.com/)

## Project Overview

An end-to-end machine learning system that performs real-time sentiment analysis on YouTube comments using Natural Language Processing (NLP) and a LightGBM classifier. The project features a complete MLOps pipeline with experiment tracking, model versioning, a REST API backend, and an interactive React web dashboard.

### Key Features

- **Advanced NLP Pipeline**: Text preprocessing with lemmatization, stopword removal, and TF-IDF vectorization
- **Production-Ready ML Model**: LightGBM classifier optimized for sentiment classification
- **MLOps Best Practices**: 
  - Experiment tracking with MLflow
  - Data version control with DVC
  - Pipeline orchestration with DVC
  - Model registry integration
- **REST API**: Flask-based API for real-time predictions with CORS support
- **Interactive Web Dashboard**: React and Vite frontend using ReactBits components (Particles background, CountUp analytics, Spotlight cards, and StarBorder tester)
- **Visualization**: Pie charts, word clouds, and sentiment trend lines
- **Containerization**: Deployment-ready with Docker

## Technology Stack

- **ML/DL**: LightGBM, Scikit-learn, NLTK
- **MLOps**: MLflow, DVC
- **API**: Flask, Flask-CORS
- **Frontend**: React (Vite, Framer Motion, Lucide React, OGL)
- **Containerization**: Docker
- **Visualization**: Matplotlib, WordCloud

## Project Structure

```
├── src/
│   ├── data/               # Data ingestion and preprocessing
│   │   ├── data_ingestion.py
│   │   └── data_preprocessing.py
│   ├── model/              # Model building, evaluation, and registration
│   │   ├── model_building.py
│   │   ├── model_evaluation.py
│   │   └── register_model.py
│   └── visualization/      # Visualization scripts
│
├── flask_app/              # Flask API for predictions
│   ├── app.py
│   └── requirements.txt
│
├── frontend/               # React web application
│   ├── src/                # React source files (components, styles)
│   ├── dist/               # Compiled production assets served by Flask
│   ├── package.json
│   └── vite.config.js
│
├── notebooks/              # Jupyter notebooks for EDA
├── dvc.yaml               # DVC pipeline configuration
├── params.yaml            # Hyperparameters and configuration
├── Dockerfile             # Container configuration
└── requirements.txt       # Python dependencies
```

## Getting Started

Follow these steps to set up and run the project locally on your machine.

### Prerequisites

- Python 3.10+
- Node.js (with npm)
- Git

### Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SinghAnsh07/comment_sentiment_analysis.git
   cd comment_sentiment_analysis
   ```

2. Create and activate a virtual environment:
   - On Windows:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

3. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Download the required NLTK datasets:
   ```bash
   python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet')"
   ```

5. Install the frontend dependencies and build the static assets:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

6. Run the Flask application:
   ```bash
   python flask_app/app.py
   ```

7. Access the application:
   Open your browser and navigate to `http://localhost:5000/` to use the interactive dashboard.

## Usage

### Training Pipeline

Run the complete ML pipeline using DVC:

```bash
# Initialize DVC (first time only)
dvc init

# Run the entire pipeline
dvc repro

# Run specific stages
dvc repro data_ingestion
dvc repro model_building
```

### Flask API

Start the Flask API server (runs independently on port 5000):

```bash
python flask_app/app.py
```

API Endpoints:
- `POST /predict`: Single comment sentiment prediction
- `POST /predict_with_timestamps`: Batch predictions with timestamps
- `POST /fetch_comments`: Scrapes comments from YouTube URLs
- `POST /generate_chart`: Generates a pie chart of sentiment counts
- `POST /generate_wordcloud`: Generates a word cloud image
- `POST /generate_trend_graph`: Generates a sentiment trend graph image

### Model Training

Customize hyperparameters in `params.yaml`:

```yaml
model_building:
  ngram_range: [1, 3]
  max_features: 10000
  learning_rate: 0.09
  max_depth: 20
  n_estimators: 367
```

## Model Performance

The LightGBM model achieves competitive performance on YouTube comment sentiment classification with:
- Optimized hyperparameters through MLflow experiments
- TF-IDF feature extraction (1-3 grams, 10k features)
- Comprehensive evaluation metrics tracked in MLflow

## Configuration

### MLflow Setup

Configure the MLflow tracking URI in your code or environment:

```python
mlflow.set_tracking_uri("sqlite:///mlflow.db")
```

### DVC Remote Storage

Set up DVC remote (S3 example):

```bash
dvc remote add -d myremote s3://your-bucket/path
dvc push
```

## Docker Deployment

Build and run the Docker container locally:

```bash
docker build -t yt-sentiment-api .
docker run -p 8080:8080 yt-sentiment-api
```

## MLOps Pipeline

The project implements a complete MLOps workflow:

1. **Data Ingestion**: Load and split data
2. **Preprocessing**: Clean and transform text data
3. **Model Building**: Train LightGBM with TF-IDF features
4. **Evaluation**: Generate metrics and confusion matrix
5. **Model Registry**: Register best models in MLflow
6. **Deployment**: Serve via Flask API and React dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

**Ansh Singh**
- GitHub: [@SinghAnsh07](https://github.com/SinghAnsh07)

## Acknowledgments

- Project structure based on Cookiecutter Data Science
- MLflow for experiment tracking
- DVC for data version control
