# DeBERTa v2 Model Setup Guide

## Model Information

The checkpoint-1386 folder contains a **DeBERTa v2** (DebertaV2ForSequenceClassification) model trained for dark pattern detection.

### Model Architecture
- **Type**: DeBERTa v2 (DebertaV2ForSequenceClassification)
- **Hidden Size**: 768
- **Layers**: 12
- **Attention Heads**: 12
- **Max Position Embeddings**: 512
- **Vocabulary Size**: 128,100

### Labels
The model classifies text into 8 categories:
1. Forced Action (0)
2. Misdirection (1)
3. Not Dark Pattern (2)
4. Obstruction (3)
5. Scarcity (4)
6. Sneaking (5)
7. Social Proof (6)
8. Urgency (7)

## Installation

### Prerequisites
- Python 3.8 or higher
- PyTorch 2.0 or higher
- Transformers 4.35.0 or higher

### Install Dependencies

```bash
cd working-extension/nlp_service
python -m venv .venv
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### Verify Installation

```bash
python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; print('DeBERTa dependencies OK')"
```

## Running the Server

### Start the NLP Service

```bash
cd working-extension/nlp_service
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
python start_server.py
```

The server will:
1. Load the DeBERTa v2 model from `checkpoint-1386`
2. Load the FLAN-T5 model for description generation
3. Start the FastAPI server on `http://127.0.0.1:8001`

### Verify Model Loading

When the server starts, you should see:
```
[NLP Service] Loading DeBERTa v2 classification model from [path]
[NLP Service] Model type: deberta-v2
[NLP Service] Model architecture: DebertaV2ForSequenceClassification
[NLP Service] Available labels: ['Forced Action', 'Misdirection', 'Not Dark Pattern', ...]
```

## Model Performance

### Input Format
- **Max Length**: 512 tokens (DeBERTa v2 limit)
- **Truncation**: Automatic for longer texts
- **Padding**: Automatic batching

### Output Format
- **Confidence Scores**: Softmax probabilities
- **Top-K**: Configurable (default: all labels)

## Troubleshooting

### Model Not Loading

**Error: "Could not find checkpoint-1386"**
- Ensure `checkpoint-1386` folder is in the project root
- Check that all model files are present:
  - `model.safetensors` or `pytorch_model.bin`
  - `config.json`
  - `tokenizer.json` or `vocab.txt`
  - `tokenizer_config.json`

**Error: "CUDA out of memory"**
- DeBERTa v2 requires ~1.5GB GPU memory
- Use CPU mode if GPU is unavailable
- Reduce batch size in predictions

### Performance Issues

**Slow inference:**
- DeBERTa v2 is larger than ALBERT, expect slightly slower inference
- Use GPU if available for faster processing
- Batch multiple requests together

**Memory issues:**
- Ensure at least 4GB RAM available
- Close other applications
- Consider using model quantization if needed

## Model Files

Required files in `checkpoint-1386/`:
- ✅ `model.safetensors` - Model weights (704MB)
- ✅ `config.json` - Model configuration
- ✅ `tokenizer.json` - Tokenizer (8.3MB)
- ✅ `tokenizer_config.json` - Tokenizer config
- ✅ `special_tokens_map.json` - Special tokens
- ✅ `spm.model` - SentencePiece model (2.4MB)

Optional files:
- `optimizer.pt` - Training optimizer state (not needed for inference)
- `scheduler.pt` - Learning rate scheduler (not needed for inference)
- `trainer_state.json` - Training metadata (not needed for inference)

## API Endpoints

### POST /predict
Classify text snippets using DeBERTa v2.

**Request:**
```json
{
  "texts": ["Only 3 left in stock!", "Must create account to continue"]
}
```

**Response:**
```json
[
  [
    {"category": "Scarcity", "confidence": 0.92},
    {"category": "Urgency", "confidence": 0.15}
  ],
  [
    {"category": "Forced Action", "confidence": 0.88}
  ]
]
```

### POST /generate-description
Generate descriptions using FLAN-T5 (separate from DeBERTa).

### POST /verify-patterns
Verify patterns using FLAN-T5 (separate from DeBERTa).

## Notes

- DeBERTa v2 provides better accuracy than ALBERT for sequence classification
- The model supports relative position embeddings for better context understanding
- Tokenization uses SentencePiece (SPM) model
- Model is case-sensitive (do_lower_case: false)

---

For more information, see the main `SETUP_AND_RUN.md` guide.

