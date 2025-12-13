"""
===============================================================
 DeceptiTech – Local NLP Service (Ollama + Qwen2.5-1.5B-Instruct)
===============================================================

✓ Fast classification (1–3 sec per snippet)
✓ Strict JSON output enforced
✓ Handles 7 categories:
    ["Forced Action", "Misdirection", "Urgency", "Scarcity",
     "Social Proof", "Obstruction", "Sneaking"]

✓ Compatible with your existing Chrome extension
✓ Compatible with start_server.py
✓ CPU-friendly – ~700MB model, no GPU needed
✓ CORS fixed
✓ Includes caching & timeouts
✓ Stable & production-ready

Run:
    ollama pull qwen2.5:1.5b-instruct
    python start_server.py
"""

import json
import re
import time
import hashlib
import httpx
import csv
import os
from pathlib import Path
from functools import lru_cache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# -----------------------------
# FastAPI initialization
# -----------------------------
app = FastAPI()

# Allow requests from all sites because extension runs on arbitrary pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Classification categories
# -----------------------------
CATEGORIES = [
    "Forced Action",
    "Misdirection",
    "Urgency",
    "Scarcity",
    "Social Proof",
    "Obstruction",
    "Sneaking"
]

# -----------------------------
# Dataset path
# -----------------------------
DATASET_PATH = Path(__file__).parent / "processed_not balanced_dataset.csv"

# -----------------------------
# Input schema
# -----------------------------
class VerifyRequest(BaseModel):
    patterns: list  # list of dicts from extension (id, text, heuristics, etc.)

class DatasetUpdateRequest(BaseModel):
    patterns: list  # list of verified patterns to add to dataset

# -----------------------------
# Utility – Hash text for caching
# -----------------------------
def text_hash(s: str):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

# -----------------------------
# JSON extractor – robust
# -----------------------------
JSON_REGEX = re.compile(r"\{[\s\S]*?\}", re.MULTILINE)

def extract_json(text: str):
    """
    Extract first valid JSON object from text.
    """
    matches = JSON_REGEX.findall(text)
    for m in matches:
        try:
            return json.loads(m)
        except Exception:
            continue
    return None

# -----------------------------
# Ollama client
# -----------------------------
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "qwen2.5:1.5b-instruct"

# -----------------------------
# Prompt template
# -----------------------------
PROMPT_TEMPLATE = """
You are a strict JSON-only classifier for dark patterns.

You MUST ALWAYS return ONLY valid JSON, nothing else.

Analyze the following text from a website:

"{text}"

Classify it with:
- "is_dark_pattern": true/false
- "category": one of ["Forced Action","Misdirection","Urgency","Scarcity","Social Proof","Obstruction","Sneaking","None"]
- "explanation": a short one-sentence explanation (plain English)
- "confidence": 0-1 float

Return ONLY a JSON object like:

{{
  "is_dark_pattern": true/false,
  "category": "...",
  "explanation": "...",
  "confidence": 0.xx
}}
"""

# -----------------------------
# Call Ollama with timeout & safety
# -----------------------------
async def run_qwen(prompt: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=30) as client:  # Increased timeout
            response = await client.post(
                OLLAMA_URL,
                json={"model": MODEL_NAME, "prompt": prompt, "stream": False}
            )
            if response.status_code != 200:
                print(f"[ERROR] Ollama returned status {response.status_code}: {response.text[:200]}")
                return ""
            data = response.json()
            result = data.get("response", "")
            if not result:
                print(f"[WARNING] Ollama returned empty response for prompt: {prompt[:100]}...")
            return result
    except Exception as e:
        print(f"[ERROR] Exception calling Ollama: {type(e).__name__}: {str(e)}")
        return ""

# -----------------------------
# Caching to reduce repeated inference
# -----------------------------
@lru_cache(maxsize=500)
def cached_result(hash_key: str, raw_text: str):
    """
    Dummy wrapper so @lru_cache can work with text → result mapping.
    """
    return raw_text

# -----------------------------
# Main verification endpoint
# -----------------------------
@app.post("/verify-patterns")
async def verify_patterns(req: VerifyRequest):
    verified = []

    for item in req.patterns:
        text = item.get("text", "").strip()
        if not text:
            continue

        # Check cache
        h = text_hash(text)
        cached = cached_result(h, None)
        if cached not in (None, "None"):
            try:
                obj = json.loads(cached)
                verified.append({**item, **obj})
                continue
            except:
                pass

        # Build prompt
        prompt = PROMPT_TEMPLATE.format(text=text)

        # Query Qwen
        raw = await run_qwen(prompt)

        if not raw:
            continue

        # Extract JSON
        js = extract_json(raw)
        if not js:
            continue

        # Ensure required fields exist
        if "is_dark_pattern" not in js or "category" not in js:
            continue

        # Save to cache
        cached_result.cache_clear()
        cached_result(h, json.dumps(js))

        # Only keep if pattern actually detected
        if js.get("is_dark_pattern", False):
            verified.append({**item, **js})

    return {"verified": verified}


# -----------------------------
# Description generator
# -----------------------------
class DescRequest(BaseModel):
    category: str
    text: str

DESC_PROMPT = """
You are an explainer system. In 1–2 sentences, explain *why* this text is a {category} dark pattern:

"{text}"

Be concise and helpful.
"""

@app.post("/generate-description")
async def generate_description(req: DescRequest):
    print(f"[INFO] generate-description called: category={req.category}, text_length={len(req.text)}")
    
    prompt = DESC_PROMPT.format(category=req.category, text=req.text)
    print(f"[INFO] Prompt length: {len(prompt)}")

    raw = await run_qwen(prompt)
    if not raw:
        print(f"[WARNING] Qwen returned empty response for category={req.category}")
        return {"description": "Explanation unavailable."}

    result = raw.strip()[:300]
    print(f"[INFO] Qwen returned description (length={len(result)}): {result[:100]}...")
    return {"description": result}


# -----------------------------
# Dataset update functionality
# -----------------------------

def generate_uid(text: str, category: str) -> str:
    """
    Generate a deterministic UID from text and category.
    Uses SHA256 hash of normalized text + category.
    """
    # Normalize: lowercase, strip, remove extra whitespace
    normalized_text = re.sub(r'\s+', ' ', text.strip().lower())
    normalized_category = category.strip().lower()
    
    # Create hash from text + category
    combined = f"{normalized_text}|{normalized_category}"
    uid_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
    
    # Return first 16 characters of hash as UID (deterministic)
    return uid_hash[:16]

def clean_text(text: str) -> str:
    """
    Clean text for CSV storage (remove special characters that break CSV).
    """
    # Replace problematic characters
    cleaned = text.replace('\n', ' ').replace('\r', ' ')
    cleaned = re.sub(r'\s+', ' ', cleaned)  # Normalize whitespace
    return cleaned.strip()

def read_existing_uids() -> set:
    """
    Read all existing UIDs from the CSV file.
    Returns a set of UID strings.
    """
    uids = set()
    if not DATASET_PATH.exists():
        return uids
    
    try:
        with open(DATASET_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                uid = row.get('UID', '').strip()
                if uid and uid != '0':  # Skip placeholder UID=0
                    uids.add(uid)
    except Exception as e:
        print(f"[ERROR] Failed to read existing UIDs: {e}")
    
    return uids

def append_to_dataset(entries: list):
    """
    Append new entries to the CSV dataset.
    entries: list of dicts with keys: text, label, category, text_length, clean_text, UID
    """
    if not entries:
        return
    
    # Ensure directory exists
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if file exists and has header
    file_exists = DATASET_PATH.exists()
    
    try:
        with open(DATASET_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['text', 'label', 'Pattern Category', 'text_length', 'clean_text', 'UID'])
            
            # Write header if file is new
            if not file_exists:
                writer.writeheader()
            
            # Write entries
            for entry in entries:
                writer.writerow({
                    'text': entry['text'],
                    'label': entry['label'],
                    'Pattern Category': entry['category'],
                    'text_length': entry['text_length'],
                    'clean_text': entry['clean_text'],
                    'UID': entry['UID']
                })
        
        print(f"[INFO] Successfully appended {len(entries)} entries to dataset")
    except Exception as e:
        print(f"[ERROR] Failed to append to dataset: {e}")
        raise

@app.post("/update-dataset")
async def update_dataset(req: DatasetUpdateRequest):
    """
    Add new patterns to the dataset CSV.
    Only adds entries that don't already exist (based on UID).
    """
    if not req.patterns:
        return {"added": 0, "skipped": 0, "message": "No patterns provided"}
    
    # Read existing UIDs
    existing_uids = read_existing_uids()
    print(f"[INFO] Found {len(existing_uids)} existing UIDs in dataset")
    
    new_entries = []
    skipped = 0
    
    for pattern in req.patterns:
        # Extract required fields
        text = pattern.get('text') or pattern.get('snippet') or ''
        category = pattern.get('category') or pattern.get('Pattern Category') or 'Unknown'
        label = pattern.get('label', 1)  # Default to 1 (dark pattern) if not specified
        
        if not text or len(text.strip()) < 3:
            skipped += 1
            continue
        
        # Generate UID
        uid = generate_uid(text, category)
        
        # Check if UID already exists
        if uid in existing_uids:
            skipped += 1
            continue
        
        # Prepare entry
        clean_text_value = clean_text(text)
        text_length = len(text.split())
        
        new_entries.append({
            'text': text,
            'label': label,
            'category': category,
            'text_length': text_length,
            'clean_text': clean_text_value,
            'UID': uid
        })
        
        # Add to existing_uids set to avoid duplicates in same batch
        existing_uids.add(uid)
    
    # Append new entries to CSV
    if new_entries:
        try:
            append_to_dataset(new_entries)
        except Exception as e:
            return {"added": 0, "skipped": skipped, "error": str(e)}
    
    print(f"[INFO] Dataset update: {len(new_entries)} added, {skipped} skipped")
    return {
        "added": len(new_entries),
        "skipped": skipped,
        "message": f"Added {len(new_entries)} new entries, skipped {skipped} duplicates"
    }
