# DeceptiTech NLP Service

Self-contained FastAPI server that loads the `checkpoint-1386` model and exposes the REST API expected by the extension (`POST /predict`). Run this service locally before scanning pages to get NLP-backed results.

## Prerequisites

- Python 3.9+ (64-bit recommended for PyTorch)
- The checkpoint files from `../checkpoint-1386`

## Quick start

```powershell
cd "C:\Users\deep0\OneDrive\Desktop\UPES\Semester 7\Major Project\Finalized Project\working-extension\nlp_service"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

Keep this terminal running while you use the extension. The content script calls `http://127.0.0.1:8000/predict` with payloads of the form:

```json
{ "texts": ["snippet 1", "snippet 2"], "top_k": 3 }
```

The server responds with probability distributions for each snippet:

```json
[
  [
    { "category": "Urgency", "confidence": 0.91 },
    { "category": "Scarcity", "confidence": 0.06 }
  ],
  [
    { "category": "Misdirection", "confidence": 0.78 },
    { "category": "Forced Action", "confidence": 0.11 }
  ]
]
```

## Custom model path

Set the `MODEL_PATH` environment variable if you move or rename the checkpoint folder:

```powershell
$env:MODEL_PATH="D:\models\checkpoint-1386"
uvicorn server:app --host 127.0.0.1 --port 8000
```

## Notes

- The server loads the model once at startup. For large models, this can take several seconds.
- The optional `top_k` request field lets you control how many categories are returned per snippet. If omitted, all labels are included in descending confidence order.
- The extension automatically falls back to heuristic detections when this service is offline.

