# 🔨 DeceptiTech Extension - Build Commands

## Quick Build (All-in-One)

```bash
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

## Step-by-Step Build Process

### Step 1: Navigate to Extension Directory

```bash
cd working-extension
```

### Step 2: Install Dependencies (First Time Only)

```bash
npm install
```

This installs all Node.js dependencies including:
- React
- Vite (build tool)
- Framer Motion
- Chart.js
- jsPDF
- And other dependencies

### Step 3: Build the Extension

```bash
npm run build
```

This command:
- Compiles React components
- Bundles JavaScript files
- Processes CSS
- Outputs to `dist/assets/` folder

### Step 4: Copy Extension Files

```bash
node scripts/copy-extension.js
```

This copies:
- `manifest.json` → `dist/manifest.json`
- `background.js` → `dist/background.js`
- `content.js` → `dist/content.js`
- `popup.html` → `dist/popup.html`
- `popup.js` → `dist/popup.js`
- `data/` folder → `dist/data/`

## Complete Build Sequence

### Windows (PowerShell/CMD):

```powershell
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

### Linux/Mac:

```bash
cd working-extension
npm install
npm run build
node scripts/copy-extension.js
```

## Verify Build Success

After building, check that `dist/` folder contains:

```
dist/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── data/
│   └── pattern-descriptions.json
└── assets/
    ├── main.js
    ├── main.css
    └── [other asset files]
```

## Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `working-extension/dist` folder
5. Extension should appear in your extensions list

## Troubleshooting

### Error: "npm: command not found"
- Install Node.js from https://nodejs.org/
- Verify installation: `node --version` and `npm --version`

### Error: "Cannot find module"
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Build fails
- Check Node.js version (need v16+)
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

### Extension won't load
- Ensure you selected the `dist` folder (not `working-extension`)
- Check browser console for errors
- Verify all files are in `dist/` folder

## Rebuild After Changes

If you modify source files:

```bash
cd working-extension
npm run build
node scripts/copy-extension.js
```

Then reload the extension in Chrome:
1. Go to `chrome://extensions/`
2. Click the reload icon on the DeceptiTech extension

## Production Build

For optimized production build:

```bash
npm run build -- --mode production
```

This creates minified, optimized files.

---

**After building, the extension is ready to load in Chrome!**

