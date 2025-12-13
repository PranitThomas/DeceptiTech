# DeceptiTech - Unveiling Dark Patterns with AI-Driven Detection & Analysis

<div align="center">

![DeceptiTech Logo](https://img.shields.io/badge/DeceptiTech-Dark%20Pattern%20Detector-blue?style=for-the-badge)

**An AI-driven browser extension that detects, classifies, and explains dark patterns directly within web pages in real-time.**

[Features](#features) • [Examples](#-real-world-examples) • [Installation](#installation--setup) • [Usage](#usage) • [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Dark Pattern Categories](#dark-pattern-categories)
- [Real-World Examples](#-real-world-examples)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Architecture](#architecture)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

DeceptiTech is an advanced browser extension that combines **DOM monitoring**, **heuristic rules**, and **transformer-based NLP classification** to detect manipulative interface elements on web pages. It provides users with clear, actionable insights into deceptive design patterns, helping protect consumers from manipulative practices.

### Key Capabilities

- **Real-time Detection**: Scans web pages as you browse
- **Multi-Layer Analysis**: Combines heuristic rules, DOM structure analysis, and AI classification
- **Intelligent Filtering**: Uses Qwen2.5-1.5B-Instruct model to verify and filter false positives
- **Human-Readable Explanations**: AI-generated descriptions for each detected pattern
- **Professional Reports**: Export detailed PDF reports of findings
- **Continuous Monitoring**: Automatically detects new patterns as pages update

---

## ✨ Features

### Core Detection Features

- ✅ **Real-time Pattern Detection**: Automatically scans web pages for dark patterns
- ✅ **8 Pattern Categories**: Detects Urgency, Scarcity, Social Proof, Forced Action, Misdirection, Obstruction, Sneaking, and positive patterns
- ✅ **Multi-Method Detection**:
  - Heuristic keyword matching
  - DOM structure analysis (pre-checked boxes, hidden inputs, etc.)
  - AI-powered verification via Qwen2.5-1.5B-Instruct
- ✅ **Confidence Scoring**: Each detection includes a confidence percentage
- ✅ **Smart Deduplication**: Prevents duplicate detections of the same pattern

### User Interface Features

- 🎨 **Modern React UI**: Beautiful, responsive interface with animations
- 🌓 **Dark/Light Theme**: Toggle between themes
- 📊 **Visual Analytics**: Interactive charts showing pattern distribution
- 🔍 **Filtering & Sorting**: Filter by category, sort by confidence
- 📄 **PDF Export**: Generate professional reports with charts and detailed analysis
- 🔔 **Notifications**: Chrome notifications for new pattern detections

### AI & NLP Features

- 🤖 **Qwen2.5-1.5B-Instruct Integration**: Uses Ollama for pattern verification
- 📝 **AI-Generated Explanations**: Context-aware descriptions for each pattern
- ✅ **False Positive Filtering**: AI verification reduces noise from legitimate UI elements
- 🎯 **Context Understanding**: Distinguishes between dark patterns and legitimate compliance text

### Technical Features

- 🔄 **DOM Monitoring**: MutationObserver tracks page changes in real-time
- 💾 **Dataset Building**: Automatically updates training dataset with verified patterns
- 🚀 **Performance Optimized**: Efficient scanning with batching and caching
- 🔒 **Privacy-First**: All processing happens locally (Ollama runs on your machine)

---

## 🎭 Dark Pattern Categories

DeceptiTech detects the following categories of dark patterns:

### 1. **Urgency** ⏰
Creates artificial time pressure to rush decisions.
- Countdown timers
- "Limited time" offers
- "Expires soon" messaging
- "Act fast" language

### 2. **Scarcity** 📦
Creates false impressions of limited availability.
- "Only X left" indicators
- Low stock warnings
- "Exclusive" availability claims
- Fake inventory counters

### 3. **Social Proof** 👥
Uses fabricated or misleading social signals.
- Fake purchase notifications
- Exaggerated user counts
- "X people viewing" counters
- Fabricated testimonials

### 4. **Forced Action** 🚫
Compels users to take unwanted actions.
- Required account creation
- Mandatory information sharing
- Blocked functionality
- "Must" language

### 5. **Misdirection** 🔄
Steers users toward unwanted choices.
- Confusing button labels
- Hidden decline options
- Visual hierarchy manipulation
- Shaming language ("No thanks, I like working harder")

### 6. **Obstruction** 🚧
Makes cancellation or opt-out intentionally difficult.
- Phone-only cancellation
- Hidden unsubscribe links
- Complex cancellation flows
- "Contact support" requirements

### 7. **Sneaking** 👁️
Hides important information or actions.
- Pre-checked boxes
- Hidden fees at checkout
- Auto-renewal by default
- Buried terms and conditions

### 8. **Not Dark Pattern** ✅
Identifies good design practices for comparison.

---

## 🌐 Real-World Examples

DeceptiTech has successfully detected dark patterns on major websites. Here are some real-world examples:

### 1️⃣ IndiGo – Pre-checked Consent Checkbox (Sneaking)

**Pattern Type:** Sneaking 👁️

**Description:**
Sneaking Dark Pattern detected on IndiGo booking page:

Automatically pre-checked consent checkbox forces users to agree to data processing and terms without explicit consent, hiding critical privacy implications.

**Screenshot:**
<!-- Add image URL here -->
![IndiGo Pre-checked Checkbox](working-extension/Project%20Results/Indigo.png)

*Caption: Pre-checked consent checkbox on IndiGo booking page that automatically opts users into data processing without explicit consent.*

---

### 2️⃣ Joom – Limited Stock & Countdown Messaging (Urgency)

**Pattern Type:** Urgency ⏰

**Description:**
Urgency Dark Pattern detected on Joom product page:

Artificial scarcity and time-based pressure tactics ("limited stock", "price will rise") are used to rush user decisions without sufficient evaluation.

**Screenshot:**
<!-- Add image URL here -->
![Joom Urgency Pattern](working-extension/Project%20Results/Joom.png)

*Caption: Countdown timer and limited stock messaging on Joom product page creating artificial urgency.*

---

### 3️⃣ LinkedIn – Data Usage for AI Training (Sneaking)

**Pattern Type:** Sneaking 👁️

**Description:**
Sneaking pattern detected via DOM inspection:

Checkboxes are automatically checked before user interaction, obscuring consent actions and increasing the risk of unintended commitments.

**Screenshots:**
<!-- Add image URLs here -->
![LinkedIn AI Training Consent 1](working-extension/Project%20Results/Linkdn.png)

*Caption: Pre-checked checkbox for AI training data usage on LinkedIn settings page.*

![LinkedIn AI Training Consent 2](working-extension/Project%20Results/Linkdn1.png)

*Caption: DOM inspection revealing automatically checked consent options for data processing.*

---

### 4️⃣ Mailchimp – Obfuscated Opt-In Identifier (Sneaking)

**Pattern Type:** Sneaking 👁️

**Description:**
Sneaking Dark Pattern detected on Mailchimp signup page:

Marketing opt-in is enabled by default using obfuscated identifiers, reducing transparency and increasing the likelihood of unnoticed consent.

**Screenshot:**
<!-- Add image URL here -->
![Mailchimp Opt-In Pattern](working-extension/Project%20Results/malchimp.png)

*Caption: Obfuscated marketing opt-in checkbox with unclear identifiers on Mailchimp signup form.*

---

### 5️⃣ Temu – Fake Scarcity & "Only X Left" Messaging (Scarcity)

**Pattern Type:** Scarcity 📦

**Description:**
Scarcity Dark Pattern detected on Temu product page:

Exaggerated low-stock indicators and sales counters create a false sense of urgency to manipulate purchasing behavior.

**Screenshot:**
<!-- Add image URL here -->
![Temu Scarcity Pattern](working-extension/Project%20Results/temu.png)

*Caption: Fake scarcity indicators showing "Only X left" and exaggerated sales counters on Temu product page.*

---

### 6️⃣ ThreadShade – Fake Purchase Notifications (Social Proof)

**Pattern Type:** Social Proof 👥

**Description:**
Social Proof Dark Pattern detected on ThreadShade:

Real-time purchase popups ("Someone from India purchased…") leverage peer pressure and fabricated activity signals to influence user trust and urgency.

**Screenshot:**
<!-- Add image URL here -->
![ThreadShade Social Proof](working-extension/Project%20Results/Threadshade.png)

*Caption: Fake purchase notification popup showing fabricated purchase activity to create false social proof on ThreadShade.*

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ (for NLP service)
- **Ollama** (for AI model)
- **Chrome/Chromium** browser (Chrome, Edge, Brave, etc.)

### Step 1: Setup Ollama

1. **Install Ollama** (if not already installed):
   - Visit [ollama.ai](https://ollama.ai) and download for your OS
   - Follow installation instructions

2. **Pull the Required Model**:
   ```bash
   ollama pull qwen2.5:1.5b-instruct
   ```
   
   Wait for the download to complete (~700MB). This model will be used for pattern verification and explanation generation.

### Step 2: Setup Python NLP Service

1. **Navigate to the NLP service directory**:
   ```bash
   cd working-extension/nlp_service
   ```

2. **Create a virtual environment** (recommended):
   
   **Windows:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
   
   **macOS/Linux:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt --upgrade
   ```

4. **Start the server**:
   ```bash
   python start_server.py
   ```
   
   Or use the provided script:
   ```bash
   # Windows
   start_server_windows.bat
   ```
   
   The server will run on `http://127.0.0.1:8001`

### Step 3: Build the Browser Extension

1. **Navigate to the extension root**:
   ```bash
   cd working-extension
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```
   
   This will:
   - Build the React frontend
   - Copy extension files to `dist/` directory
   - Prepare the extension for loading

### Step 4: Load Extension in Browser

1. **Open Chrome/Edge/Brave** and navigate to:
   ```
   chrome://extensions/
   ```
   or
   ```
   edge://extensions/
   ```

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `dist` folder from the `working-extension` directory
   - The extension should now appear in your extensions list

4. **Verify installation**:
   - You should see the DeceptiTech icon in your browser toolbar
   - Click it to open the popup interface

---

## 📖 Usage

### Basic Scanning

1. **Navigate to any webpage** you want to scan
2. **Click the DeceptiTech icon** in your browser toolbar
3. **Click "Scan Current Page"** in the popup
4. **View results** in the popup or side panel

### Using the Widget (Injected UI)

1. **Navigate to a webpage**
2. **Look for the DeceptiTech widget** in the bottom-right corner
3. **Click "Scan Current Page"** on the widget
4. **View results** in the side panel that opens

### Understanding Results

- **Pattern Cards**: Each detected pattern shows:
  - Category badge
  - Text snippet from the page
  - Confidence percentage
  - AI-generated explanation
  - Detailed analysis (click to expand)

- **Summary Section**:
  - Total pattern count
  - Category distribution chart
  - Visual breakdown by type

- **Filtering**:
  - Filter by category using the dropdown
  - Sort by confidence (high to low or low to high)

### Exporting Reports

1. **After scanning**, click the **"PDF"** button in the results panel
2. **A professional PDF report** will be generated including:
   - Cover page with URL and date
   - Executive summary with charts
   - Detailed analysis of each pattern
   - Category breakdowns

### Continuous Monitoring

After the initial scan, DeceptiTech automatically:
- Monitors the page for new patterns (every 60 seconds)
- Detects DOM keyword patterns immediately (every 5 seconds)
- Sends notifications when new patterns are found
- Updates the dataset with verified patterns

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Content    │    │  Background  │    │    Popup    │  │
│  │    Script    │◄──►│   Service    │◄──►│     UI      │  │
│  │              │    │    Worker    │    │             │  │
│  └──────┬───────┘    └──────┬───────┘    └─────────────┘  │
│         │                    │                               │
│         │ DOM Analysis       │ Message Routing              │
│         │ Heuristic Rules    │ Storage Management           │
│         │ Pattern Detection  │ NLP API Calls                │
│         │                    │                               │
└─────────┼────────────────────┼───────────────────────────────┘
          │                    │
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              NLP Service (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Qwen2.5-1.5B-Instruct (via Ollama)                  │  │
│  │  • Pattern Verification                              │  │
│  │  • Description Generation                            │  │
│  │  • Dataset Updates                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Detection Pipeline

1. **DOM Layer**: Scans page structure for suspicious elements
   - Pre-checked boxes
   - Hidden inputs
   - Auto-selected options
   - Keyword matching in text

2. **Heuristic Layer**: Keyword-based pattern detection
   - Category-specific keyword matching
   - Confidence scoring
   - Pattern classification

3. **NLP Verification Layer**: AI-powered verification
   - Sends candidates to Qwen2.5-1.5B-Instruct
   - Filters false positives
   - Generates explanations
   - Updates confidence scores

4. **Enrichment Layer**: Adds descriptions and metadata
   - AI-generated short descriptions
   - JSON-based detailed descriptions
   - Category-specific insights

### Communication Flow

```
Content Script → Background Script → NLP Service (Ollama)
                ↓
            Popup/UI
```

- **Content Script**: Performs DOM analysis and pattern detection
- **Background Script**: Handles API calls to NLP service (avoids CORS)
- **Popup/UI**: Displays results and handles user interactions

---

## 🛠️ Technical Stack

### Frontend
- **React 18.2** - UI framework
- **Vite 4.5** - Build tool
- **Framer Motion 10.16** - Animations
- **Chart.js 4.4** - Data visualization
- **jsPDF 2.5** - PDF generation
- **html2canvas 1.4** - Screenshot capture

### Backend
- **FastAPI 0.110+** - API framework
- **Uvicorn** - ASGI server
- **httpx 0.24+** - HTTP client
- **Ollama** - LLM runtime
- **Qwen2.5-1.5B-Instruct** - AI model

### Browser APIs
- **Chrome Extensions API (Manifest V3)**
- **MutationObserver** - DOM monitoring
- **Chrome Storage API** - Data persistence
- **Chrome Notifications API** - User alerts

### Detection Methods
- **Heuristic Rules**: Keyword-based pattern matching
- **DOM Analysis**: Structural pattern detection
- **NLP Classification**: Transformer-based AI verification
- **Confidence Scoring**: Multi-factor confidence calculation

---

## 📁 Project Structure

```
working-extension/
├── src/                          # React source code
│   ├── ui/
│   │   ├── App.jsx              # Main application component
│   │   ├── PatternList.jsx      # Pattern display component
│   │   ├── Summary.jsx          # Summary and charts
│   │   └── styles.css           # UI styles
│   ├── main.jsx                 # React entry point
│   └── index.css                # Base styles
│
├── dist/                         # Built extension (load this in browser)
│   ├── assets/                  # Compiled JS/CSS
│   ├── background.js            # Service worker
│   ├── content.js               # Content script
│   ├── popup.html               # Extension popup
│   ├── popup.js                 # Popup script
│   └── manifest.json            # Extension manifest
│
├── nlp_service/                 # Python NLP backend
│   ├── server.py                # FastAPI server
│   ├── start_server.py          # Server launcher
│   ├── requirements.txt         # Python dependencies
│   └── processed_not balanced_dataset.csv  # Training dataset
│
├── data/                        # Static data
│   └── pattern-descriptions.json  # Category descriptions
│
├── scripts/                     # Build scripts
│   └── copy-extension.js        # File copying utility
│
├── background.js                # Background service worker (source)
├── content.js                   # Content script (source)
├── manifest.json                # Extension manifest
├── vite.config.js              # Vite configuration
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

---

## 💻 Development

### Prerequisites for Development

- Node.js 16+ and npm
- Python 3.8+ with virtual environment support
- Ollama installed and running
- Chrome/Chromium browser

### Development Workflow

1. **Start the NLP service** (in one terminal):
   ```bash
   cd nlp_service
   .venv\Scripts\activate  # Windows
   # or
   source .venv/bin/activate  # macOS/Linux
   python start_server.py
   ```

2. **Start development server** (in another terminal):
   ```bash
   cd working-extension
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Load extension**:
   - Build the extension
   - Load `dist/` folder in Chrome as unpacked extension
   - Make changes and rebuild to see updates

### Key Configuration Files

- **`manifest.json`**: Extension configuration and permissions
- **`vite.config.js`**: Build configuration
- **`content.js`**: Main detection logic
- **`nlp_service/server.py`**: NLP API endpoints

### Adding New Pattern Categories

1. **Update `content.js`**:
   - Add category to `DARK_PATTERN_CATEGORIES`
   - Add keywords and metadata

2. **Update `data/pattern-descriptions.json`**:
   - Add detailed description
   - Add examples

3. **Update UI components**:
   - Add to category filter dropdowns
   - Update chart colors if needed

### Testing

1. **Use the test page**:
   - Open `test-page.html` in your browser
   - Scan for known dark patterns

2. **Test on real websites**:
   - E-commerce sites (often have urgency/scarcity)
   - Subscription services (often have sneaking/obstruction)
   - News sites (often have misdirection)

### Debugging

1. **Content Script**:
   - Open DevTools on any webpage
   - Check Console for `[DeceptiTech]` logs

2. **Background Script**:
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"
   - Check console for errors

3. **NLP Service**:
   - Check terminal output for API logs
   - Verify Ollama is running: `ollama list`

---

## 🔧 Troubleshooting

### Common Issues

#### Extension Won't Load

- **Check manifest.json syntax**: Ensure valid JSON
- **Check browser console**: Look for errors
- **Verify build completed**: Ensure `dist/` folder exists

#### No Patterns Detected

- **Check content script**: Verify it's running (check console)
- **Check NLP service**: Ensure server is running on port 8001
- **Check Ollama**: Verify model is downloaded (`ollama list`)
- **Check permissions**: Ensure extension has required permissions

#### NLP Service Not Responding

- **Check if server is running**: `curl http://127.0.0.1:8001/docs`
- **Check Ollama**: `ollama list` should show `qwen2.5:1.5b-instruct`
- **Check port conflicts**: Ensure port 8001 is available
- **Check virtual environment**: Ensure dependencies are installed

#### Slow Performance

- **Reduce batch size**: Edit `CONFIG.BATCH_MAX_ITEMS` in `content.js`
- **Increase timeout**: Edit `CONFIG.NLP_REQUEST_TIMEOUT_MS`
- **Disable monitoring**: Stop continuous monitoring if not needed

#### False Positives

- **Adjust confidence threshold**: Edit `CONFIG.CONFIDENCE_THRESHOLD`
- **Check prefilter rules**: Review blacklist in `verifyPatternsWithT5`
- **Verify NLP service**: Ensure Qwen2.5 is properly filtering

### Getting Help

1. **Check console logs**: Look for `[DeceptiTech]` prefixed messages
2. **Review error messages**: Check both browser console and NLP service logs
3. **Verify setup**: Ensure all prerequisites are installed correctly
4. **Test components**: Verify each component (Ollama, NLP service, extension) separately

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Areas for Contribution

- **New pattern categories**: Add detection for additional dark patterns
- **Improved heuristics**: Better keyword matching and rules
- **UI improvements**: Better visualizations and user experience
- **Performance optimization**: Faster scanning and lower resource usage
- **Documentation**: Improve guides and examples
- **Testing**: Add test cases and improve coverage

### Code Style

- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test changes before submitting

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **React** and **Framer Motion** for the UI framework
- **Chart.js** for data visualization
- **jsPDF** for report generation
- **FastAPI** for the backend API
- **Ollama** and **Qwen2.5** for AI capabilities
- **Chrome Extensions API** for browser integration
- The dark patterns research community for pattern definitions

---

## ⚠️ Important Notes

### Model Files & GitHub Limits

Due to GitHub's file size limits, trained model files may not be included in this repository. The specific model used is **DeBERTa v2**, but the current implementation uses **Qwen2.5-1.5B-Instruct** via Ollama.

If you need to use DeBERTa v2 instead:
- Download or retrain the model locally
- Update `nlp_service/server.py` to use DeBERTa instead of Ollama
- Ensure model weights are in the `nlp_service` directory

### Privacy & Data

- All processing happens **locally** on your machine
- No data is sent to external servers (except Ollama API calls to localhost)
- Pattern detections are stored locally in browser storage
- Dataset updates are optional and stored locally

### Performance Considerations

- **First scan**: May take 5-10 seconds (depends on page complexity)
- **Subsequent scans**: Faster due to caching
- **NLP verification**: Adds 1-3 seconds per batch (depends on Ollama performance)
- **Memory usage**: ~700MB for Qwen2.5 model, ~100MB for extension

---

<div align="center">

**DeceptiTech** - Protecting users from deceptive web design patterns.

Made with ❤️ for consumer protection and ethical design.

[Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues) • [Documentation](https://github.com/your-repo/wiki)

</div>
