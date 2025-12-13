# 🚀 DeceptiTech - Complete Run Commands

## Quick Start Commands

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

### Step 3: Start NLP Service (Required)

**Terminal 1 - Start NLP Service:**
```bash
cd working-extension/nlp_service
.venv\Scripts\activate  # Windows (or source .venv/bin/activate on Linux/Mac)
python start_server.py
```

**Keep this terminal running!** The service must stay active.

### Step 4: Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select `working-extension/dist` folder

### Step 5: Test the Extension

1. Open `working-extension/test-page.html` in Chrome
2. Click the DeceptiTech widget (bottom-right)
3. Click "Scan Current Page"
4. View detected patterns

## All-in-One Command Sequence

### Windows (PowerShell):

```powershell
# Terminal 1: Start NLP Service
cd working-extension\nlp_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python start_server.py

# Terminal 2: Build Extension (one-time)
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

### Linux/Mac:

```bash
# Terminal 1: Start NLP Service
cd working-extension/nlp_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python start_server.py

# Terminal 2: Build Extension (one-time)
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

## Verification Checklist

✅ **NLP Service Running**: Visit `http://127.0.0.1:8001/` - should show `{"status":"ok"}`  
✅ **Extension Loaded**: DeceptiTech icon visible in Chrome toolbar  
✅ **Patterns Detected**: Scan a page and see patterns in the side panel  
✅ **Descriptions Working**: All categories show proper descriptions:
   - Urgency: "Urgency pattern detected: [snippet]"
   - Obstruction: "Obstruction pattern detected: [snippet]"
   - Scarcity: "Scarcity indicator detected: [snippet]"
   - Forced Action: "Forced action pattern detected: [snippet]"
   - Misdirection: "Misdirection pattern detected: [snippet]"
   - Social Proof: "Social proof pattern detected: [snippet]"
   - Sneaking: "Sneaking pattern detected: [snippet]"

## Features Verified

✅ All 7 categories have fixed descriptions  
✅ All pattern types are being detected  
✅ Verification preserves correctly identified patterns  
✅ Scarcity and Obstruction patterns are protected  
✅ Enhanced keyword detection for all categories  

## Troubleshooting

**Service won't start?**
- Check Python version: `python --version` (need 3.8+)
- Check if port 8001 is available
- Verify checkpoint-1386 folder exists

**Extension won't load?**
- Ensure you selected the `dist` folder (not `working-extension`)
- Check browser console for errors
- Reload the extension

**No patterns detected?**
- Verify NLP service is running
- Check browser console for errors
- Try scanning `test-page.html`

---

**Ready to use!** Keep the NLP service running and start scanning web pages.

