# 🚀 DeceptiTech Quick Start Guide

## Prerequisites Check

- ✅ Node.js installed (`node --version`)
- ✅ Python installed (`python --version`)
- ✅ Chrome browser installed

## 🎯 3-Step Setup

### Step 1: Install Dependencies

```bash
# Install extension dependencies
cd working-extension
npm install

# Install NLP service dependencies
cd nlp_service
python -m venv .venv
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### Step 2: Build Extension

```bash
# From working-extension directory
cd working-extension
npm run build
node scripts/copy-extension.js
```

### Step 3: Start Services

**Terminal 1 - Start NLP Service:**
```bash
cd working-extension/nlp_service
.venv\Scripts\activate  # Windows (or source .venv/bin/activate on Linux/Mac)
python start_server.py
```

**Terminal 2 - Load Extension:**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `working-extension/dist` folder

## ✅ Verify Everything Works

1. **Check NLP Service**: Open `http://127.0.0.1:8001/` - should show `{"status":"ok"}`
2. **Check Extension**: Look for DeceptiTech icon in Chrome toolbar
3. **Test Scan**: 
   - Open `working-extension/test-page.html`
   - Click DeceptiTech widget
   - Click "Scan Current Page"
   - Should see detected patterns

## 🎉 You're Ready!

The extension will now:
- ✅ Detect dark patterns on web pages
- ✅ Preserve correctly identified patterns (especially Scarcity & Obstruction)
- ✅ Show proper descriptions for Urgency and Obstruction
- ✅ Verify patterns with FLAN-T5 model

## 📚 Full Documentation

See `SETUP_AND_RUN.md` for detailed instructions and troubleshooting.

---

**Important:** Keep the NLP service running while using the extension!

