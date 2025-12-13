# DeceptiTech - Complete Setup and Run Guide

## 🚀 Quick Start

This guide will help you set up and run the DeceptiTech Dark Pattern Detection Extension with the NLP verification service.

## Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/downloads/)
- **Chrome/Chromium Browser**
- **Git** (optional, for cloning)

## 📦 Step 1: Install Extension Dependencies

```bash
# Navigate to the extension directory
cd working-extension

# Install Node.js dependencies
npm install
```

## 🤖 Step 2: Set Up NLP Service (Required for Verification)

The NLP service provides pattern verification and description generation. **This is required for proper functionality.**

### Option A: Using Python Virtual Environment (Recommended)

```bash
# Navigate to NLP service directory
cd nlp_service

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Option B: Using System Python

```bash
cd nlp_service
pip install -r requirements.txt
```

## 🏗️ Step 3: Build the Extension

```bash
# Make sure you're in the working-extension directory
cd working-extension

# Build the React UI and extension files
npm run build

# Copy extension files to dist folder
node scripts/copy-extension.js
```

## 🚀 Step 4: Start the NLP Service

**Important:** The NLP service must be running before using the extension.

### Start the Service:

```bash
# Navigate to NLP service directory
cd nlp_service

# Activate virtual environment (if using venv)
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate

# Start the server
python start_server.py
```

**OR** using uvicorn directly:

```bash
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

The service will start on `http://127.0.0.1:8001`

**Keep this terminal window open** - the service must remain running while you use the extension.

### Verify Service is Running:

Open your browser and go to: `http://127.0.0.1:8001/`

You should see: `{"status":"ok","model_path":"..."}`

## 🔌 Step 5: Load Extension in Chrome

1. **Open Chrome Extensions Page:**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - OR: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in the top-right corner

3. **Load the Extension:**
   - Click "Load unpacked" button
   - Navigate to: `working-extension/dist` folder
   - Select the folder and click "Select Folder"

4. **Verify Installation:**
   - You should see "DeceptiTech" extension in the list
   - The extension icon should appear in your Chrome toolbar

## ✅ Step 6: Test the Extension

### Test on a Sample Page:

1. **Open the test page:**
   - Navigate to `working-extension/test-page.html` in Chrome
   - OR create a test page with dark patterns

2. **Start Scanning:**
   - Look for the DeceptiTech widget in the bottom-right corner
   - Click "Scan Current Page" button
   - Wait for the scan to complete

3. **View Results:**
   - Patterns will appear in the side panel
   - Click on any pattern to see detailed information
   - Use filters to sort by category or confidence

### Test on Real Websites:

1. Navigate to any e-commerce or subscription website
2. Click the DeceptiTech widget or extension icon
3. Click "Scan Current Page"
4. Review detected dark patterns

## 📋 Complete Command Sequence

Here's the complete sequence of commands to run everything:

### Terminal 1: Start NLP Service

```bash
cd working-extension/nlp_service
python -m venv .venv
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python start_server.py
```

### Terminal 2: Build Extension (One-time)

```bash
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

### Then:
1. Load extension in Chrome (see Step 5)
2. Keep Terminal 1 running (NLP service)
3. Use the extension in Chrome

## 🔧 Configuration

### NLP Service Configuration

The NLP service runs on port `8001` by default. If you need to change this:

1. Edit `working-extension/nlp_service/start_server.py`
2. Change the port number
3. Update `working-extension/content.js`:
   - Change `NLP_ENDPOINT` to match your port
   - Change `NLP_DESCRIPTION_ENDPOINT` to match your port
   - Change `NLP_VERIFY_ENDPOINT` to match your port

### Extension Configuration

Edit `working-extension/content.js` to adjust:

- `CONFIDENCE_THRESHOLD`: Minimum confidence for patterns (default: 0.6)
- `NLP_ENABLED`: Enable/disable NLP service (default: true)
- `BATCH_INTERVAL_MS`: Time between batch processing (default: 5000ms)

## 🐛 Troubleshooting

### NLP Service Won't Start

**Error: "Could not find checkpoint-1386"**
- Ensure the `checkpoint-1386` folder exists in the project root
- Check that model files are present
- Verify MODEL_PATH environment variable if using custom location

**Error: "Port already in use"**
- Change port in `start_server.py` (line 22)
- Update extension config in `content.js` to match

**Error: "Module not found"**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Extension Won't Load

**Error: "Manifest file is missing or unreadable"**
- Ensure you selected the `dist` folder, not `working-extension` folder
- Run `npm run build` and `node scripts/copy-extension.js` again

**Error: "Content script failed to load"**
- Check browser console for errors
- Verify all files are in the `dist` folder
- Reload the extension

### No Patterns Detected

**Patterns not showing:**
1. Verify NLP service is running (`http://127.0.0.1:8001/`)
2. Check browser console for errors
3. Ensure confidence threshold isn't too high
4. Try scanning a page with known dark patterns

**Verification removing patterns:**
- This is fixed! The verification now preserves:
  - All patterns with confidence >= 0.7
  - Scarcity and Obstruction patterns (always kept if confidence >= 0.7)
  - High-confidence patterns even if verification rejects them

### Description Issues

**Generic descriptions:**
- Ensure NLP service is running
- Check that T5 model loaded successfully (check service logs)
- Verify description endpoint is accessible

## 📊 Features Overview

### Detection Methods

1. **Heuristic Detection**: Keyword-based pattern matching
2. **DOM Analysis**: Form element inspection (checkboxes, radio buttons)
3. **NLP Classification**: Machine learning model classification
4. **Verification Layer**: FLAN-T5 verification to filter false positives

### Pattern Categories

- **Urgency**: Countdown timers, limited-time offers
- **Scarcity**: Low stock, exclusive availability
- **Social Proof**: User counters, popularity indicators
- **Forced Action**: Mandatory actions, blocked progress
- **Misdirection**: Confusing UI, misleading buttons
- **Obstruction**: Hidden cancellation, difficult opt-out
- **Sneaking**: Pre-checked boxes, hidden costs

### Verification Improvements

✅ **Preserves correctly identified patterns**
✅ **Special handling for Scarcity and Obstruction**
✅ **Better descriptions for Urgency and Obstruction**
✅ **Lenient verification (only filters obvious false positives)**

## 🎯 Usage Tips

1. **Keep NLP Service Running**: The extension needs the service for verification and descriptions
2. **Scan Multiple Pages**: Different pages may have different patterns
3. **Check Descriptions**: Click on patterns to see detailed explanations
4. **Export Reports**: Use the PDF export feature to save results
5. **Filter Results**: Use category filters to focus on specific pattern types

## 📝 Notes

- The NLP service must be running for full functionality
- First scan may take longer as models load
- Some patterns may require page interaction to detect
- Verification layer ensures high-quality results

## 🆘 Support

If you encounter issues:

1. Check the browser console (F12) for errors
2. Check NLP service logs in the terminal
3. Verify all prerequisites are installed
4. Ensure all services are running on correct ports
5. Try reloading the extension

---

**DeceptiTech** - Protecting users from deceptive web design patterns.

For more information, see `README.md`

