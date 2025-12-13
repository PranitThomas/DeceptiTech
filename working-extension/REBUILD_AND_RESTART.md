# 🔄 Rebuild Extension & Restart Server

## Quick Commands

### Step 1: Rebuild Extension

```bash
cd working-extension
npm run build
```

The `postbuild` script will automatically copy files to `dist/`.

### Step 2: Restart NLP Server

**Stop the current server** (Ctrl+C in the terminal running the server), then:

```bash
cd working-extension/nlp_service
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
python start_server.py
```

## Complete Rebuild Sequence

### Terminal 1: Rebuild Extension

```bash
cd working-extension
npm run build
```

**After build completes:**
1. Go to Chrome → `chrome://extensions/`
2. Find "DeceptiTech" extension
3. Click the **reload icon** (circular arrow) to reload the extension

### Terminal 2: Restart NLP Server

```bash
# Stop current server (Ctrl+C if running)

# Navigate to NLP service
cd working-extension/nlp_service

# Activate virtual environment
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac

# Start server
python start_server.py
```

## Verify Everything Works

1. **Check Server**: Visit `http://127.0.0.1:8001/` - should show model info
2. **Check Extension**: Reload extension in Chrome
3. **Test Scan**: Open a test page and scan for patterns

## Troubleshooting

### Extension Not Updating
- Make sure you clicked the **reload icon** on the extension card
- Or remove and re-add the extension

### Server Won't Start
- Check if port 8001 is already in use
- Verify virtual environment is activated
- Check Python version: `python --version` (need 3.8+)

### Build Errors
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

---

**After rebuilding and restarting, your changes will be active!**

