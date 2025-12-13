# 🪟 Starting Server on Windows (PowerShell)

## Method 1: Using Batch Script (Easiest)

Simply double-click or run:
```powershell
.\start_server_windows.bat
```

## Method 2: Manual PowerShell Commands

### Step 1: Navigate to Directory
```powershell
cd working-extension\nlp_service
```

### Step 2: Create Virtual Environment (if not exists)
```powershell
python -m venv .venv
```

### Step 3: Activate Virtual Environment
```powershell
.venv\Scripts\Activate.ps1
```

**If you get an execution policy error**, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**OR use the batch file activation:**
```powershell
.venv\Scripts\activate.bat
```

### Step 4: Install Dependencies (if not installed)
```powershell
pip install -r requirements.txt
```

### Step 5: Start Server
```powershell
python start_server.py
```

## Complete PowerShell Sequence

```powershell
# Navigate to directory
cd working-extension\nlp_service

# Create venv if it doesn't exist
if (-not (Test-Path .venv)) {
    python -m venv .venv
}

# Activate venv (PowerShell)
.venv\Scripts\Activate.ps1

# If activation fails, use batch file
# .venv\Scripts\activate.bat

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
python start_server.py
```

## Troubleshooting

### Error: "source is not recognized"
- **Don't use `source`** - that's for Linux/Mac
- Use `.venv\Scripts\Activate.ps1` or `.venv\Scripts\activate.bat`

### Error: "Execution policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "Cannot find .venv"
- Make sure you're in `working-extension\nlp_service` directory
- Create venv: `python -m venv .venv`

### Error: "uvicorn not found"
- Activate venv first
- Install dependencies: `pip install -r requirements.txt`

---

**After server starts, you should see:**
```
[NLP Service] Loading DeBERTa v2 classification model from ...
[NLP Service] Model type: deberta-v2
```

