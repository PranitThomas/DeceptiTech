/**
 * DeceptiTech Content Script - Dark Pattern Detection
 */

console.log("DeceptiTech content script loaded");

// ================== CONFIGURATION ==================
const CONFIG = {
  BATCH_INTERVAL_MS: 5000,
  DEDUPE_WINDOW_MS: 5000,
  BATCH_MAX_ITEMS: 200,
  MAX_TEXT_SNIPPET: 300,
  CONFIDENCE_THRESHOLD: 0.6,
  // Optional NLP service. When available, we will enrich detections with model outputs.
  NLP_ENABLED: true,
  NLP_ENDPOINT: "http://127.0.0.1:8001/predict", // Legacy endpoint (not used by qwen2.5 server)
  NLP_DESCRIPTION_ENDPOINT: "http://127.0.0.1:8001/generate-description",
  NLP_VERIFY_ENDPOINT: "http://127.0.0.1:8001/verify-patterns",
  NLP_REQUEST_TIMEOUT_MS: 2500,
  DESCRIPTIONS_JSON_PATH: chrome.runtime.getURL("data/pattern-descriptions.json"),
  IGNORED_TAGS: new Set([
    "script", "style", "noscript", "link", "meta", "svg", "iframe", "img", "video", "audio"
  ])
};

// ================== DARK PATTERN CATEGORIES ==================
const DARK_PATTERN_CATEGORIES = {
  "Forced Action": {
    keywords: ["must", "required", "mandatory", "obligatory", "forced to", "no choice", "have to", "need to", "cannot proceed", "must create", "must sign up", "must register"],
    icon: "🚫",
    color: "#f97316"
  },
  "Misdirection": {
    keywords: ["no thanks", "skip", "decline", "reject", "don't want", "rather not", "not interested", "maybe later", "opt out", "unsubscribe"],
    icon: "🔄",
    color: "#f59e0b"
  },
  "Urgency": {
    keywords: ["hurry", "limited time", "ends soon", "act fast", "don't miss", "expires", "ending today", "last chance", "hurry up", "time running out", "expires in", "deal ends"],
    icon: "⏰",
    color: "#ef4444"
  },
  "Scarcity": {
    keywords: ["only", "left", "few remaining", "limited", "exclusive", "rare", "last one", "almost gone", "running out", "low stock", "limited stock", "only a few"],
    icon: "📦",
    color: "#4a90e2"
  },
  "Social Proof": {
    keywords: ["users", "people", "customers", "viewing", "purchased", "popular", "bought", "joined", "signed up", "others", "viewers", "shoppers", "members"],
    icon: "👥",
    color: "#6366f1"
  },
  "Obstruction": {
    keywords: ["call", "contact", "phone", "support", "difficult", "complicated", "cancel", "unsubscribe", "requires", "must call", "call to cancel", "phone only", "contact support", "speak to", "talk to"],
    icon: "🚧",
    color: "#a3a3a3"
  },
  "Sneaking": {
    keywords: ["auto-renew", "subscription", "recurring", "billing", "hidden", "auto-renewal", "automatically", "will be charged", "continues", "renews", "pre-selected", "pre-checked"],
    icon: "👁️",
    color: "#a855f7"
  }
};

function normalizeCategoryLabel(category) {
  if (!category) return null;
  const direct = category.toString().trim();
  if (DARK_PATTERN_CATEGORIES[direct]) return direct;

  const formatted = direct.replace(/[_-]/g, " ").toLowerCase();
  const titleCase = formatted.split(" ").filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  if (DARK_PATTERN_CATEGORIES[titleCase]) return titleCase;

  return null;
}

// ================== STATE MANAGEMENT ==================
let detectionState = {
  isScanning: false,
  patterns: [],
  dedupeMap: new Map(),
  observer: null,
  uiContainer: null,
  patternDescriptions: null,  // Loaded from JSON
  // Monitoring state
  isMonitoring: false,
  initialScanComplete: false,
  previousPatterns: [], // Store previous scan results for comparison
  lastScanTime: 0,
  monitoringInterval: null,
  domCheckInterval: null,
  bufferTimeout: null
};

// Load detailed descriptions from JSON file
async function loadPatternDescriptions() {
  if (detectionState.patternDescriptions) return detectionState.patternDescriptions;
  try {
    const response = await fetch(CONFIG.DESCRIPTIONS_JSON_PATH);
    if (response.ok) {
      detectionState.patternDescriptions = await response.json();
      console.log("[DeceptiTech] Loaded pattern descriptions from JSON");
    } else {
      console.warn("[DeceptiTech] Could not load pattern descriptions JSON");
      detectionState.patternDescriptions = {};
    }
  } catch (e) {
    console.warn("[DeceptiTech] Error loading pattern descriptions:", e);
    detectionState.patternDescriptions = {};
  }
  return detectionState.patternDescriptions;
}

// Helper function to get category-specific descriptions
function getCategoryDescription(category, snippet) {
  const categoryLower = category.toLowerCase();
  const snippetPreview = (snippet || "").slice(0, 60);
  
  switch(categoryLower) {
    case "urgency":
      return `Urgency pattern detected: ${snippetPreview}`;
    case "obstruction":
      return `Obstruction pattern detected: ${snippetPreview}`;
    case "scarcity":
      return `Scarcity indicator detected: ${snippetPreview}`;
    case "forced action":
      return `Forced action pattern detected: ${snippetPreview}`;
    case "misdirection":
      return `Misdirection pattern detected: ${snippetPreview}`;
    case "social proof":
      return `Social proof pattern detected: ${snippetPreview}`;
    case "sneaking":
      return `Sneaking pattern detected: ${snippetPreview}`;
    default:
      return `${category} pattern detected: ${snippetPreview}`;
  }
}

// Generate short description using Qwen2.5 (via background script)
async function generateShortDescription(category, snippet, pattern = null) {
  // Build fallback description quickly (same fallback logic)
  let fallbackDesc = `Detected ${category.toLowerCase()} pattern`;
  if (pattern) {
    if (pattern.reason) {
      fallbackDesc = pattern.reason;
    } else if (pattern.meta?.domRule) {
      const ruleMeta = DOM_RULE_METADATA[pattern.meta.domRule];
      if (ruleMeta?.reason) {
        fallbackDesc = ruleMeta.reason;
      }
    }
  }

  const categoryLower = category.toLowerCase();
  let snippetText = (snippet || "").trim();
  if (fallbackDesc === `Detected ${category.toLowerCase()} pattern`) {
    if (snippetText) {
      switch(categoryLower) {
        case "urgency":
          fallbackDesc = `Urgency pattern detected: ${snippetText.slice(0, 60)}`; break;
        case "obstruction":
          fallbackDesc = `Obstruction pattern detected: ${snippetText.slice(0, 60)}`; break;
        case "scarcity":
          fallbackDesc = `Scarcity indicator detected: ${snippetText.slice(0, 60)}`; break;
        case "forced action":
          fallbackDesc = `Forced action pattern detected: ${snippetText.slice(0, 60)}`; break;
        case "misdirection":
          fallbackDesc = `Misdirection pattern detected: ${snippetText.slice(0, 60)}`; break;
        case "social proof":
          fallbackDesc = `Social proof pattern detected: ${snippetText.slice(0, 60)}`; break;
        case "sneaking":
          fallbackDesc = `Sneaking pattern detected: ${snippetText.slice(0, 60)}`; break;
        default:
          fallbackDesc = `${category} pattern detected: ${snippetText.slice(0, 60)}`;
      }
    } else {
      // For DOM rule patterns without text, use the pattern type
      if (pattern?.meta?.domRule) {
        const ruleMeta = DOM_RULE_METADATA[pattern.meta.domRule];
        fallbackDesc = ruleMeta?.reason || fallbackDesc;
      }
    }
  }

  if (!CONFIG.NLP_ENABLED) return fallbackDesc;

  // Always prefer the actual snippet text from the page for Qwen
  // Only use reason/details as fallback if snippet is completely empty
  let textToSend = snippetText;
  if (!textToSend || textToSend.length < 3) {
    // Try to get the actual text from pattern details or snippet field
    textToSend = (pattern?.snippet || pattern?.text || pattern?.details || "").trim();
  }
  
  // If we still don't have meaningful text, don't call Qwen
  if (!textToSend || textToSend.length < 3) {
    console.log(`[DeceptiTech] No meaningful text to send to Qwen for "${category}", using fallback`);
    return fallbackDesc;
  }
  
  const promptText = textToSend.slice(0, 250);
  console.log(`[DeceptiTech] Sending to Qwen for "${category}": "${promptText.slice(0, 100)}..."`);

  const payload = {
    category,
    text: promptText, // Server expects 'text', not 'snippet'
    reason: pattern?.reason || null,
    pattern_type: pattern?.meta?.domRule || pattern?.meta?.patternType || null
  };

  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'GENERATE_DESCRIPTION',
      payload: payload
    }, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("[DeceptiTech] background GENERATE_DESCRIPTION error:", chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { success: false, error: 'No response from background' });
      }
    });
  });

  if (!result || !result.success) {
    console.warn("[DeceptiTech] Qwen2.5 description generation failed:", result && result.error);
    return fallbackDesc;
  }

  const description = result.data && typeof result.data.description === "string"
    ? result.data.description.trim()
    : "";

  // Log what Qwen returned for debugging
  console.log(`[DeceptiTech] Qwen2.5 description response for "${category}":`, description || "(empty)");

  // Only use fallback if Qwen returned empty or the specific "unavailable" message
  if (!description || description === "" || /^explanation unavailable\.?$/i.test(description)) {
    console.log(`[DeceptiTech] Using fallback description for "${category}"`);
    return fallbackDesc;
  }

  // Use Qwen's custom explanation
  console.log(`[DeceptiTech] Using Qwen2.5 generated description for "${category}"`);
  return description;
}


// Get detailed description from JSON
function getDetailedDescription(category) {
  const descs = detectionState.patternDescriptions || {};
  const catDesc = descs[category];
  return catDesc?.detailed || `This pattern falls under the ${category} category of dark patterns.`;
}

// Verify patterns using Qwen2.5 verification layer (with prefilter + smarter fallback)
async function verifyPatternsWithT5(patterns) {
  if (!CONFIG.NLP_ENABLED || !patterns || patterns.length === 0) {
    return [];
  }

  // --------- Prefilter blacklist: common noisy UI chrome/navigation strings ----------
  const PREFILTER_BLACKLIST = [
    "skip to content", "open image", "open image in full screen", "privacy policy",
    "terms of service", "contact information", "customer care", "shipping policy",
    "refund policy", "search", "most recent", "close dialog", "product information",
    "other links", // University/institutional navigation sections
    "add to cart", "buy it now", "shop search", "contact us", "connect", "primary",
    "close", "menu", "header", "footer", "other links"
  ];
  const PREFILTER_REGEX = PREFILTER_BLACKLIST.map(s => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, "i"));

  // sanitation / normalization helper
  function looksLikeNoisyUI(text) {
    if (!text) return true;
    const t = text.trim().toLowerCase();
    if (t.length < 4) return true; // too short
    // discard texts that are only non-alphanumeric or numeric tokens
    if (!/[a-zA-Z]/.test(t)) return true;
    
    // Don't filter if it contains dark pattern indicators
    const hasDarkPatternIndicators = /opt.*in.*default|by.*not.*checking|working.*harder|manipulative|deceptive|agree.*to.*be.*opted/i.test(t);
    if (hasDarkPatternIndicators) return false; // Keep it - might be a real dark pattern
    
    // Check if text starts with "other links" - common in university/institutional navigation
    if (t.startsWith("other links")) {
      return true;
    }
    
    // Check if text looks like a navigation list (many capitalized words/phrases in sequence)
    // This catches cases like "Academic Calendar Campus Events NIRF Ranking Report..."
    const words = text.trim().split(/\s+/);
    if (words.length > 5) {
      const capitalizedWords = words.filter(w => w.length > 2 && /^[A-Z]/.test(w));
      // If more than 60% of words are capitalized, it's likely a navigation list
      if (capitalizedWords.length / words.length > 0.6) {
        // Check if it contains institutional/academic terms
        const institutionalTerms = /academic|calendar|campus|events|ranking|report|careers|faculty|scholarships|feedback|disclosures|achievements|openings|corner|downloads|centre|depository|development|goal/i;
        if (institutionalTerms.test(t)) {
          return true; // Likely a university/institutional navigation section
        }
      }
    }
    
    // detect nav-like short phrases (<=3 words) that match blacklist
    const wordCount = t.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 3) {
      // Only reject if it's EXACTLY the blacklist phrase (not part of larger text)
      for (const re of PREFILTER_REGEX) {
        const match = t.match(re);
        if (match && match[0] === t) return true; // Exact match only
      }
    }
    // specific noisy patterns - only if exact match
    if (t === "open image" || t === "skip to content" || t === "privacy policy" || 
        t === "most recent" || t === "close dialog") return true;
    return false;
  }

  // Pre-deduplicate + prepare same as before (keep your existing normalization logic)
  const seenTexts = new Map();
  const patternsToVerify = [];

  for (const p of patterns) {
    const text = (p.snippet || p.text || "").trim();
    if (!text || text.length < 3) continue;

    // Get full text for checking (include details/reason if snippet is short)
    const fullText = text.length < 200 && (p.details || p.reason) 
      ? `${text} ${(p.details || p.reason || "").slice(0, 500)}` 
      : text;
    const lowerText = fullText.toLowerCase();

    // Exception: "Mandatory Disclosures" - legitimate regulatory/institutional compliance term
    // This is not a dark pattern - it's required legal/institutional disclosure
    if (/mandatory.*disclosures?/i.test(lowerText) && text.split(/\s+/).length <= 5) {
      console.log(`[DeceptiTech] "Mandatory Disclosures" excluded (legitimate compliance term): '${text.slice(0,120)}'`);
      continue;
    }

    // Exception: "Other links" navigation sections (common in university/institutional pages)
    // These are not dark patterns - they're just navigation menus
    // Check for navigation lists with multiple institutional/academic terms
    const institutionalTerms = [
      /academic.*calendar/i,
      /campus.*events/i,
      /nirf.*ranking/i,
      /\bfaculty\b/i,
      /scholarships/i,
      /feedback/i,
      /disclosures/i,
      /achievements/i,
      /openings/i,
      /student.*corner/i,
      /corner/i,
      /downloads/i,
      /depository/i,
      /development.*goal/i,
      /naac/i,
      /iqac/i,
      /hill/i
    ];
    const matchedInstitutionalTerms = institutionalTerms.filter(re => re.test(lowerText)).length;
    
    // If text contains "other links" OR has 3+ institutional terms, it's likely a navigation menu
    if (lowerText.startsWith("other links") || 
        lowerText.includes("other links") ||
        (matchedInstitutionalTerms >= 3 && text.split(/\s+/).length > 5)) {
      console.log(`[DeceptiTech] "Other links" navigation section excluded (${matchedInstitutionalTerms} institutional terms): '${text.slice(0,120)}'`);
      continue;
    }

    // Exception: Legitimate travel/transportation mandatory contact requirements
    // These are not dark patterns - they're required for safety/operational purposes
    const isLegitimateTravelRequirement = (
      /mandatory.*travel.*update|travel.*update.*mandatory|required.*for.*travel|contact.*for.*travel.*update|mobile.*for.*travel/i.test(lowerText) ||
      (/flyer.*must.*have.*access/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
      (/must.*have.*access.*mobile/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
      (/mobile.*number.*mandatory.*travel/i.test(lowerText)) ||
      (/mandatory.*travel/i.test(lowerText) && /flyer|passenger|traveler/i.test(lowerText) && /mobile|phone|contact/i.test(lowerText))
    );
    if (isLegitimateTravelRequirement) {
      console.log(`[DeceptiTech] Legitimate travel requirement excluded: '${text.slice(0,120)}'`);
      continue;
    }

    // Exception: Transparent free trial disclosures with full terms
    // These are not dark patterns - they clearly disclose all terms upfront
    // Check if it's a detailed free trial disclosure with transparency indicators
    const hasFreeTrial = /free trial/i.test(lowerText);
    const transparencyIndicators = [
      /you will be charged/i,
      /until you cancel/i,
      /see full offer terms/i,
      /terms and conditions/i,
      /full terms/i,
      /will be notified/i,
      /prior to.*expiration/i,
      /eligible/i,
      /offer is/i,
      /valid payment information/i,
      /date of enrollment/i,
      /subscription.*free/i,
      /enrollment/i,
      /day.*free trial|free trial.*day/i
    ];
    const transparencyCount = transparencyIndicators.filter(re => re.test(lowerText)).length;
    const isTransparentFreeTrial = (
      hasFreeTrial &&
      (fullText.length > 100 || text.length > 100) && // Detailed disclosure
      transparencyCount >= 2 // At least 2 transparency indicators
    );
    if (isTransparentFreeTrial) {
      console.log(`[DeceptiTech] Transparent free trial disclosure excluded (${transparencyCount} indicators, text length: ${fullText.length}): '${text.slice(0,120)}'`);
      continue;
    }

    // PREFILTER: drop obvious UI chrome and nav fragments right away
    // BUT: Don't filter DOM rule patterns - they're structural and reliable
    // Don't filter patterns with dark pattern keywords - they might be real
    const hasDarkPatternKeywords = /opt.*in.*default|by.*not.*checking|working.*harder|manipulative|deceptive/i.test(text);
    const isDomRule = p.meta && p.meta.domRule;
    
    if (!isDomRule && !hasDarkPatternKeywords && looksLikeNoisyUI(text)) {
      console.log(`[DeceptiTech] Prefilter matched blacklist -> rejected: '${text.slice(0,120)}'`);
      continue;
    }

    const normalized = text.toLowerCase().replace(/\s+/g, ' ').slice(0, 200);

    const patternType = p.meta?.domRule || p.meta?.patternType || null;
    const reason = p.reason || (p.meta?.domRule ? DOM_RULE_METADATA[p.meta.domRule]?.reason : null) || null;

    if (!seenTexts.has(normalized)) {
      seenTexts.set(normalized, p);
      patternsToVerify.push({
        text: text,
        category: p.category || "Misdirection",
        confidence: p.confidence || 0.7,
        reason: reason,
        pattern_type: patternType
      });
    } else {
      const existing = seenTexts.get(normalized);
      if ((p.confidence || 0) > (existing.confidence || 0)) {
        seenTexts.set(normalized, p);
        const existingIdx = patternsToVerify.findIndex(pt =>
          pt.text.toLowerCase().replace(/\s+/g, ' ').slice(0, 200) === normalized
        );
        if (existingIdx >= 0) {
          patternsToVerify[existingIdx] = {
            text: text,
            category: p.category || "Misdirection",
            confidence: p.confidence || 0.7,
            reason: reason,
            pattern_type: patternType
          };
        }
      }
    }
  }

  if (patternsToVerify.length === 0) {
    console.log("[DeceptiTech] No valid patterns to verify after deduplication/prefilter");
    return [];
  }

  // Send message to background to call local /verify-patterns
  console.log(`[DeceptiTech] Sending ${patternsToVerify.length} patterns to Qwen2.5 for verification:`, patternsToVerify.map(p => ({ text: p.text.slice(0, 50), category: p.category })));
  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'VERIFY_PATTERNS',
      payload: patternsToVerify
    }, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("[DeceptiTech] background VERIFY_PATTERNS error:", chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { success: false, error: 'No response from background' });
      }
    });
  });
  
  // Log the result for debugging
  if (result && result.success) {
    console.log(`[DeceptiTech] Verification response received:`, result.data);
  }

  if (!result || !result.success) {
    console.warn("[DeceptiTech] Qwen2.5 verification failed:", result && result.error);
    // Fallback rules:
    // - Keep DOM-rule-derived patterns if confidence >= 0.80 (strong structural signal)
    // - Keep heuristic/NLP-only patterns only if very high confidence >= 0.90
    const fallback = patterns.filter(p => {
      if (p.meta && p.meta.domRule) {
        return (p.confidence || 0) >= 0.80;
      }
      return (p.confidence || 0) >= 0.90;
    });
    console.log(`[DeceptiTech] Using fallback logic: ${fallback.length} patterns kept (DOM rules: ${fallback.filter(p => p.meta?.domRule).length})`);
    return fallback;
  }

  const verified = Array.isArray(result.data?.verified) ? result.data.verified : [];
  console.log(`[DeceptiTech] Qwen2.5 verification returned ${verified.length} verified patterns (filtered out ${patternsToVerify.length - verified.length})`);
  
  // If verification returned 0 patterns but we had valid patterns to verify, use fallback logic
  // IMPORTANT: Only keep DOM rule patterns (structural patterns are reliable)
  // Do NOT keep heuristic patterns that Qwen2.5 rejected - Qwen2.5 understands context better
  if (verified.length === 0 && patternsToVerify.length > 0) {
    console.warn("[DeceptiTech] Qwen2.5 returned 0 verified patterns. Using fallback logic for DOM rule patterns only.");
    const fallback = patterns.filter(p => {
      // Exception: Exclude transparent free trial disclosures even from DOM rules
      const text = (p.snippet || p.text || p.details || "").trim();
      if (text) {
        const fullText = text.length < 200 && (p.details || p.reason)
          ? `${text} ${(p.details || p.reason || "").slice(0, 500)}`
          : text;
        const lowerText = fullText.toLowerCase();
        const hasFreeTrial = /free trial/i.test(lowerText);
        const transparencyIndicators = [
          /you will be charged/i,
          /until you cancel/i,
          /see full offer terms/i,
          /terms and conditions/i,
          /full terms/i,
          /will be notified/i,
          /prior to.*expiration/i,
          /eligible/i,
          /offer is/i,
          /valid payment information/i,
          /date of enrollment/i,
          /subscription.*free/i,
          /enrollment/i,
          /day.*free trial|free trial.*day/i
        ];
        const transparencyCount = transparencyIndicators.filter(re => re.test(lowerText)).length;
        const isTransparentFreeTrial = (
          hasFreeTrial &&
          (fullText.length > 100 || text.length > 100) &&
          transparencyCount >= 2
        );
        if (isTransparentFreeTrial) {
          console.log(`[DeceptiTech] Transparent free trial excluded from fallback (${transparencyCount} indicators): '${text.slice(0,120)}'`);
          return false;
        }
      }
      
      // Only keep DOM rule patterns - these are structural and very reliable
      // Qwen2.5 correctly rejects false positives from keyword matching (like "A MUST buy")
      if (p.meta && p.meta.domRule) {
        const confidence = p.confidence || 0;
        // Keep DOM rules with confidence >= 0.75 (structural patterns are reliable)
        if (confidence >= 0.75) {
          console.log(`[DeceptiTech] Fallback keeping DOM rule pattern: ${p.meta.domRule} (confidence: ${confidence})`);
          return true;
        }
      }
      // Do NOT keep heuristic patterns - Qwen2.5 is better at understanding context
      return false;
    });
    console.log(`[DeceptiTech] Fallback kept ${fallback.length} DOM rule patterns (rejected ${patterns.length - fallback.length} heuristic patterns)`);
    return fallback;
  }

  // map back to your original logic (keeps same mapping code)
  const verifiedPatterns = [];
  const usedOriginals = new Set();

  for (const v of verified) {
    const normalizedVerified = (v.text || "").toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalizedVerified) continue;

    // Exception: Transparent free trial disclosures - exclude even if Qwen verified them
    const verifiedText = (v.text || "").trim();
    const verifiedFullText = verifiedText.length < 200 && (v.explanation || v.reason)
      ? `${verifiedText} ${(v.explanation || v.reason || "").slice(0, 500)}`
      : verifiedText;
    const verifiedLowerText = verifiedFullText.toLowerCase();
    
    const hasFreeTrial = /free trial/i.test(verifiedLowerText);
    const transparencyIndicators = [
      /you will be charged/i,
      /until you cancel/i,
      /see full offer terms/i,
      /terms and conditions/i,
      /full terms/i,
      /will be notified/i,
      /prior to.*expiration/i,
      /eligible/i,
      /offer is/i,
      /valid payment information/i,
      /date of enrollment/i,
      /subscription.*free/i,
      /enrollment/i,
      /day.*free trial|free trial.*day/i
    ];
    const transparencyCount = transparencyIndicators.filter(re => re.test(verifiedLowerText)).length;
    const isTransparentFreeTrial = (
      hasFreeTrial &&
      (verifiedFullText.length > 100 || verifiedText.length > 100) &&
      transparencyCount >= 2
    );
    if (isTransparentFreeTrial) {
      console.log(`[DeceptiTech] Transparent free trial disclosure excluded from verified patterns (${transparencyCount} indicators): '${verifiedText.slice(0,120)}'`);
      continue;
    }

    let bestMatch = null;
    let bestMatchIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < patterns.length; i++) {
      if (usedOriginals.has(i)) continue;

      const p = patterns[i];
      const normalizedOriginal = (p.snippet || p.text || "").toLowerCase().replace(/\s+/g, ' ').trim();

      let score = 0;
      if (normalizedOriginal === normalizedVerified) {
        score = 100;
      } else if (normalizedOriginal.includes(normalizedVerified) || normalizedVerified.includes(normalizedOriginal)) {
        score = 80;
      } else {
        const verifiedWords = new Set(normalizedVerified.split(/\s+/).filter(w => w.length > 2));
        const originalWords = new Set(normalizedOriginal.split(/\s+/).filter(w => w.length > 2));
        const commonWords = [...verifiedWords].filter(w => originalWords.has(w)).length;
        score = (commonWords / Math.max(verifiedWords.size, originalWords.size)) * 60;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
        bestMatchIdx = i;
      }
    }

    if (bestMatch && bestScore >= 50) {
      usedOriginals.add(bestMatchIdx);
      verifiedPatterns.push({
        ...bestMatch,
        category: v.category || bestMatch.category,
        reason: v.explanation || v.reason || bestMatch.reason,
        snippet: v.text || bestMatch.snippet || bestMatch.text,
        confidence: Math.max(v.confidence || bestMatch.confidence || 0.8, 0.8),
        verified: true,
        meta: {
          ...bestMatch.meta,
          verificationScore: bestScore,
          verifiedBy: "qwen2.5"
        }
      });
    } else {
      // Create new pattern from verified result
      verifiedPatterns.push({
        id: `verified-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: v.category || "Misdirection",
        reason: v.explanation || `Detected ${(v.category || "Misdirection").toLowerCase()} pattern`,
        snippet: v.text,
        confidence: v.confidence || 0.85,
        verified: true,
        timestamp: new Date().toISOString(),
        meta: {
          verifiedBy: "qwen2.5",
          source: "verification"
        }
      });
    }
  }

  console.log(`[DeceptiTech] Mapped ${verifiedPatterns.length} verified patterns from ${verified.length} Qwen2.5 responses`);
  return verifiedPatterns;
}



// ================== DOM LAYER CONFIGURATION ==================
const DOM_SUSPICIOUS_KEYWORDS = {
  scarcity_urgency: [
    "limited offer", "limited time", "hurry", "ends soon", "deal ends",
    "last chance", "while supplies last", "only \\d+ left", "only \\d+ items",
    "only \\d+ remaining", "only \\d+ available", "few remaining", "limited stock",
    "low stock", "almost gone", "running out", "exclusive", "rare", "last one",
    "last few", "limited quantity", "limited supply", "only a few"
  ],
  obstruction: [
    "call to cancel", "phone only", "contact support", "must call", "requires call",
    "call us to", "phone us to", "contact us to cancel", "dial", "phone number required",
    "call customer service", "difficult to cancel", "hard to cancel", "cannot cancel online",
    "no online cancellation", "must contact", "requires contact", "call only",
    "phone only cancellation", "unsubscribe by phone"
  ],
  subscription_trap: [
    "auto-renew", "free trial", "you will be charged", "subscription"
  ],
  deceptive_opt_out: [
    "no, i don't want", "skip savings", "reject offer", "decline deal",
    "no thanks", "i like working harder", "working harder instead of smarter",
    "opt in by default", "by not checking", "agree to be opted in",
    "not checking the box", "by default", "automatically opted in"
  ],
  hidden_cost: [
    "service fee", "processing fee", "added at checkout", "convenience fee"
  ],
  pressure_language: [
    "exclusive", "selected for you", "sign up now", "act fast", "don’t miss out"
  ],
  countdown: [
    "offer ends in", "expires in", "\\d{1,2}:\\d{2}(:\\d{2})?"
  ],
  social_proof: [
    "purchased", "from.*purchased", "just purchased", "recently purchased",
    "minutes ago", "hours ago", "days ago", "\\d+ (users?|people|customers?) (are|have|viewing|purchased)",
    "bought", "just bought", "recently bought", "customers?.*purchased", "people.*purchased"
  ]
};

const DOM_SUSPICIOUS_REGEX = Object.entries(DOM_SUSPICIOUS_KEYWORDS).reduce((acc, [key, phrases]) => {
  acc[key] = phrases.map(p => new RegExp(p, "i"));
  return acc;
}, {});

const LANGUAGE_LABELS = [
  "english", "en", "eng",
  "spanish", "español", "es",
  "french", "français", "fr",
  "german", "deutsch", "de",
  "italian", "italiano", "it",
  "portuguese", "português", "pt",
  "hindi", "中文", "japanese", "日本語", "korean", "한국어",
  "arabic", "العربية", "russian", "русский",
  "language", "choose language", "select language"
];

const DOM_RULE_METADATA = {
  "auto-ticked-checkbox": {
    category: "Sneaking",
    confidence: 0.9,
    reason: "Form checkbox is pre-selected by default",
    icon: "☑️",
    color: "#a855f7",
    details: candidate => `The checkbox at ${candidate.selector || 'this location'} is checked automatically before user consent.`
  },
  "auto-selected-radio": {
    category: "Misdirection",
    confidence: 0.85,
    reason: "Radio option is auto-selected",
    icon: "🔘",
    color: "#f59e0b",
    details: candidate => `A radio button is pre-selected, steering users toward a particular choice.`
  },
  "auto-selected-option": {
    category: "Misdirection",
    confidence: 0.8,
    reason: "Dropdown option is pre-selected",
    icon: "🔽",
    color: "#f59e0b",
    details: candidate => `A dropdown option is selected in advance, potentially nudging the user.`
  },
  "hidden-active-control": {
    category: "Sneaking",
    confidence: 0.8,
    reason: "Active form control hidden from view",
    icon: "🙈",
    color: "#a855f7",
    details: candidate => `A checked/selected form element is hidden, which can submit choices the user never sees.`
  },
  "hidden-input-field": {
    category: "Sneaking",
    confidence: 0.85,
    reason: "Hidden input field detected",
    icon: "👁️",
    color: "#8b5cf6",
    details: candidate => {
      // Try to get element from candidate or from meta
      const element = candidate.element || candidate.meta?.element;
      if (element) {
        const name = element.getAttribute?.("name") || "";
        const value = element.getAttribute?.("value") || "";
        if (name) {
          return `Hidden input field "${name}" with value "${value}" is being submitted without user knowledge.`;
        }
      }
      return `A hidden input field is being submitted without the user's knowledge or consent.`;
    }
  },
  "suspicious-scarcity_urgency": {
    category: "Urgency",
    confidence: 0.75,
    reason: "Urgency/scarcity language detected",
    icon: "⏰",
    color: "#ef4444",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "scarcity_urgency");
      return match
        ? `Detected urgency/scarcity language "${match.match}" within "${candidate.snippet}".`
        : `Detected urgency/scarcity phrasing within "${candidate.snippet}".`;
    }
  },
  "suspicious-subscription_trap": {
    category: "Sneaking",
    confidence: 0.85, // Increased confidence for opt-in-by-default patterns
    reason: "Recurring billing, auto-renew, or opt-in-by-default terms detected",
    icon: "🔄",
    color: "#a855f7",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "subscription_trap");
      if (match && /opt.*in.*default|by.*not.*checking/i.test(candidate.snippet)) {
        return `Found opt-in-by-default language "${match.match}" which automatically enrolls users without clear consent.`;
      }
      return match
        ? `Found subscription/auto-renew language "${match.match}" which can hide ongoing costs.`
        : `Found subscription/auto-renew language suggesting ongoing charges.`;
    }
  },
  "suspicious-social_proof": {
    category: "Social Proof",
    confidence: 0.88,
    reason: "Social proof notification detected (fake purchase notifications)",
    icon: "👥",
    color: "#3b82f6",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "social_proof");
      if (match) {
        // Check if it's a name-based purchase notification
        if (/from.*purchased|purchased.*ago|just purchased|recently purchased/i.test(candidate.snippet)) {
          return `Fake social proof notification detected: "${candidate.snippet}". These popups often show fake purchase notifications to create false urgency.`;
        }
        return `Social proof pattern detected: "${match.match}" within "${candidate.snippet}".`;
      }
      return `Social proof pattern detected in "${candidate.snippet}" - may be a fake notification to influence purchasing decisions.`;
    }
  },
  "suspicious-deceptive_opt_out": {
    category: "Misdirection",
    confidence: 0.73,
    reason: "Opt-out copy is manipulative",
    icon: "🔄",
    color: "#f59e0b",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "deceptive_opt_out");
      return match
        ? `Opt-out language "${match.match}" may shame or confuse the user.`
        : `Opt-out language may confuse the user or guilt them into acceptance.`;
    }
  },
  "suspicious-hidden_cost": {
    category: "Sneaking",
    confidence: 0.72,
    reason: "Possible hidden fees detected",
    icon: "💸",
    color: "#a855f7",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "hidden_cost");
      return match
        ? `Detected text "${match.match}" that hints at hidden fees.`
        : `Detected text that hints at hidden or unexpected fees.`;
    }
  },
  "suspicious-pressure_language": {
    category: "Forced Action",
    confidence: 0.7,
    reason: "High-pressure language identified",
    icon: "⚠️",
    color: "#f97316",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "pressure_language");
      return match
        ? `High-pressure language "${match.match}" encourages rushed decisions.`
        : `High-pressure language encourages rushed decision-making.`;
    }
  },
  "suspicious-countdown": {
    category: "Urgency",
    confidence: 0.76,
    reason: "Countdown or expiry messaging detected",
    icon: "⏳",
    color: "#ef4444",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "countdown");
      return match
        ? `Countdown or expiry message "${match.match}" creates artificial urgency.`
        : `Countdown or expiry messaging can pressure users with artificial urgency.`;
    }
  },
  "suspicious-obstruction": {
    category: "Obstruction",
    confidence: 0.75,
    reason: "Obstruction pattern detected",
    icon: "🚧",
    color: "#a3a3a3",
    details: candidate => {
      const match = candidate.matches.find(m => m.category === "obstruction");
      return match
        ? `Detected obstruction language "${match.match}" which makes cancellation or opt-out difficult.`
        : `Detected obstruction pattern that makes it difficult for users to cancel or opt-out.`;
    }
  }
};

const DOM_SCAN_CONFIG = {
  tagsToScan: [
    "input", "select", "textarea", "option",
    "button", "a", "p", "span", "div", "li",
    "label", "h1", "h2", "h3", "h4", "h5", "h6"
  ]
};

const domState = {
  candidates: new Map(),
  hasInitialSweep: false
};

// ================== UTILITY FUNCTIONS ==================
function nowTs() { return Date.now(); }

function extractTextSnippet(node) {
  try {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").trim().slice(0, CONFIG.MAX_TEXT_SNIPPET);
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const txt = (node.innerText || node.textContent || "").trim();
      return txt.replace(/\s+/g, " ").slice(0, CONFIG.MAX_TEXT_SNIPPET);
    }
    return "";
  } catch { return ""; }
}

function isVisibleElement(el) {
  if (!(el instanceof Element)) return false;
  try {
    const style = window.getComputedStyle(el);
    if (!style) return false;
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
    if (el.offsetParent === null && style.position !== "fixed" && style.position !== "absolute") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  } catch { return true; }
}

function isIgnoredTag(node) {
  if (!(node instanceof Element)) return false;
  return CONFIG.IGNORED_TAGS.has(node.tagName.toLowerCase());
}

function cssPath(node) {
  try {
    if (!(node instanceof Element)) return "";
    const parts = [];
    let el = node;
    while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName.toLowerCase() !== "html") {
      let name = el.tagName.toLowerCase();
      if (el.id) {
        name += `#${el.id}`;
        parts.unshift(name);
        break;
      } else {
        const parent = el.parentNode;
        if (!parent) parts.unshift(name);
        else {
          const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
          if (siblings.length > 1) {
            const idx = Array.prototype.indexOf.call(parent.children, el) + 1;
            name += `:nth-child(${idx})`;
          }
          parts.unshift(name);
        }
      }
      el = el.parentNode;
    }
    return parts.join(" > ");
  } catch { return ""; }
}

// ================== DOM LAYER HELPERS ==================
const DOM_SCAN_TAG_SET = new Set(DOM_SCAN_CONFIG.tagsToScan);

function detectPriorityTypes(element) {
  const types = [];
  try {
    const tag = element.tagName?.toLowerCase();
    if (!tag) return types;

    if (tag === "input") {
      const inputType = (element.getAttribute("type") || "").toLowerCase();
      
      // Detect hidden input fields (type="hidden") - these are dark patterns
      if (inputType === "hidden") {
        const name = element.getAttribute("name") || "";
        const value = element.getAttribute("value") || "";
        // Check if it's a potentially manipulative hidden field
        const suspiciousNames = /marketing|consent|subscription|renewal|sharing|data|auto|opt|agree/i;
        if (suspiciousNames.test(name) || (value && suspiciousNames.test(value))) {
          types.push("hidden-input-field");
        }
      }
      
      if (inputType === "checkbox" && element.checked) {
        types.push("auto-ticked-checkbox");
      }
      if (inputType === "radio" && element.checked) {
        types.push("auto-selected-radio");
      }
    }

    if (tag === "option" && element.selected) {
      types.push("auto-selected-option");
    }

    if ((tag === "input" || tag === "option") && (element.checked || element.selected)) {
      // Don't mark language selectors as hidden controls
      const text = extractTextSnippet(element);
      if (!isLikelyLanguageSelector(text) && !isVisibleElement(element)) {
        types.push("hidden-active-control");
      }
    }
    
    // Detect hidden/low-opacity elements with manipulative text (like hidden "No thanks" buttons)
    const text = extractTextSnippet(element);
    if (text && text.length > 10) {
      const style = window.getComputedStyle(element);
      const opacity = parseFloat(style.opacity) || 1;
      const isHidden = style.display === "none" || style.visibility === "hidden" || opacity < 0.1;
      const isLowOpacity = opacity > 0 && opacity < 0.3;
      const hasManipulativeText = /no thanks.*like.*working|working.*harder|opt.*in.*default|by.*not.*checking/i.test(text);
      
      if ((isHidden || isLowOpacity) && hasManipulativeText) {
        types.push("hidden-active-control");
      }
    }
  } catch {}
  return types;
}

function detectSuspiciousMatches(text) {
  if (!text) return [];
  const matches = [];
  const lowerText = text.toLowerCase();
  
  for (const [category, regexes] of Object.entries(DOM_SUSPICIOUS_REGEX)) {
    for (const re of regexes) {
      const result = text.match(re);
      if (result && result[0]) {
        matches.push({ category, match: result[0] });
        break;
      }
    }
  }
  
  // Additional scarcity detection (if not already detected)
  if (!matches.some(m => m.category === "scarcity_urgency")) {
    const scarcityMatch = lowerText.match(/only \d+ left|only \d+ remaining|few remaining|limited stock|low stock|almost gone|exclusive|rare|last one|only a few/i);
    if (scarcityMatch) {
      matches.push({ category: "scarcity_urgency", match: scarcityMatch[0] });
    }
  }
  
  // Additional obstruction detection (if not already detected)
  if (!matches.some(m => m.category === "obstruction")) {
    const obstructionMatch = lowerText.match(/call to cancel|phone only|contact support|must call|difficult to cancel|hard to cancel|cannot cancel online|no online cancellation/i);
    if (obstructionMatch) {
      matches.push({ category: "obstruction", match: obstructionMatch[0] });
    }
  }
  
  // Detect opt-in by default patterns (sneaking)
  if (!matches.some(m => m.category === "subscription_trap")) {
    const optInDefaultMatch = lowerText.match(/opt.*in.*by.*default|by.*not.*checking.*agree|not.*checking.*box.*agree|automatically.*opted.*in|by.*default.*opt/i);
    if (optInDefaultMatch) {
      matches.push({ category: "subscription_trap", match: optInDefaultMatch[0] });
    }
  }
  
  // Detect manipulative opt-out language (misdirection)
  if (!matches.some(m => m.category === "deceptive_opt_out")) {
    const manipulativeOptOut = lowerText.match(/no thanks.*like.*working.*harder|working.*harder.*instead.*smarter|i.*like.*working.*harder/i);
    if (manipulativeOptOut) {
      matches.push({ category: "deceptive_opt_out", match: manipulativeOptOut[0] });
    }
  }
  
  return matches;
}

function domFingerprint(element, snippet) {
  const tag = element?.tagName?.toLowerCase?.() || "node";
  const normalizedSnippet = (snippet || "").slice(0, 80).replace(/\s+/g, " ");
  const selectorPortion = cssPath(element).slice(0, 120);
  return `${tag}|${selectorPortion}|${normalizedSnippet}`;
}

function mergeUnique(listA = [], listB = []) {
  const merged = new Set([...listA, ...listB]);
  return Array.from(merged);
}

function mergeMatches(existing = [], incoming = []) {
  const merged = [...existing];
  incoming.forEach(match => {
    if (!merged.some(m => m.category === match.category && m.match === match.match)) {
      merged.push(match);
    }
  });
  return merged;
}

function isLikelyLanguageSelector(snippet = "") {
  const text = snippet.trim().toLowerCase();
  if (!text) return false;
  if (LANGUAGE_LABELS.includes(text)) return true;
  if (text.length <= 20 && LANGUAGE_LABELS.some(label => text.includes(label))) return true;
  if (/language\s*(?:selection|selector|menu)?/.test(text)) return true;
  return false;
}

function evaluateDomCandidate(element) {
  if (!element || !(element instanceof Element)) return null;
  if (!DOM_SCAN_TAG_SET.has(element.tagName.toLowerCase())) return null;

  let snippet = extractTextSnippet(element);
  if (!snippet) {
    const fallback =
      element.getAttribute?.("aria-label") ||
      element.getAttribute?.("value") ||
      element.getAttribute?.("name") ||
      element.id ||
      "";
    snippet = fallback.toString().trim();
  }
  if (!snippet) {
    snippet = element.tagName?.toLowerCase?.() || "element";
  }

  const priorityTypes = detectPriorityTypes(element);
  const matches = detectSuspiciousMatches(snippet);
  
  // Special handling for labels: check for opt-in-by-default patterns even if no matches yet
  const tag = element.tagName?.toLowerCase();
  if (tag === "label" && snippet.length > 20) {
    const labelText = snippet.toLowerCase();
    if (/by.*not.*checking.*agree|not.*checking.*box.*agree|opt.*in.*by.*default|agree.*to.*be.*opted/i.test(labelText)) {
      if (!matches.some(m => m.category === "subscription_trap")) {
        matches.push({ category: "subscription_trap", match: "opt-in by default language" });
      }
    }
  }

  if (priorityTypes.length === 0 && matches.length === 0) return null;

  const candidate = {
    id: domFingerprint(element, snippet),
    selector: cssPath(element),
    snippet,
    priorityTypes,
    matches,
    priority: priorityTypes.length > 0,
    timestamp: nowTs(),
    element: element // Store element reference for accessing attributes
  };

  try {
    candidate.outerHTMLSnippet = (element.outerHTML || "").slice(0, 800);
  } catch {
    candidate.outerHTMLSnippet = "";
  }

  return candidate;
}

function processDomCandidateElement(element) {
  const candidate = evaluateDomCandidate(element);
  if (!candidate) return;

  const existing = domState.candidates.get(candidate.id);
  if (existing) {
    domState.candidates.set(candidate.id, {
      ...existing,
      snippet: candidate.snippet && candidate.snippet.length > existing.snippet.length ? candidate.snippet : existing.snippet,
      selector: existing.selector || candidate.selector,
      priorityTypes: mergeUnique(existing.priorityTypes, candidate.priorityTypes),
      matches: mergeMatches(existing.matches, candidate.matches),
      priority: existing.priority || candidate.priority,
      timestamp: nowTs(),
      outerHTMLSnippet: existing.outerHTMLSnippet || candidate.outerHTMLSnippet
    });
  } else {
    domState.candidates.set(candidate.id, candidate);
  }
}

function collectDomCandidatesForScan() {
  runDomSweep();
  return Array.from(domState.candidates.values());
}

function domCandidateToPatterns(candidate) {
  const patterns = [];
  const ruleTypes = new Set([
    ...candidate.priorityTypes,
    ...candidate.matches.map(m => `suspicious-${m.category}`)
  ]);

  for (const type of ruleTypes) {
    const meta = DOM_RULE_METADATA[type];
    if (!meta) continue;
    if ((type === "auto-selected-option" || type === "auto-selected-radio") && isLikelyLanguageSelector(candidate.snippet)) {
      continue; // ignore language selectors
    }

    const categoryInfo = DARK_PATTERN_CATEGORIES[meta.category] || {};
    patterns.push({
      id: `dom-${candidate.id}-${type}`,
      category: meta.category,
      confidence: meta.confidence ?? 0.7,
      reason: meta.reason,
      details: typeof meta.details === "function" ? meta.details(candidate) : meta.details,
      icon: meta.icon || categoryInfo.icon || "⚠️",
      color: meta.color || categoryInfo.color || "#fbbf24",
      snippet: candidate.snippet,
      selector: candidate.selector,
      timestamp: new Date(candidate.timestamp).toISOString(),
      meta: {
        source: "dom-rule",
        domRule: type,
        matches: candidate.matches,
        element: candidate.element // Pass element reference for attribute access
      }
    });
  }

  return patterns;
}

function runDomSweep() {
  try {
    const selector = DOM_SCAN_CONFIG.tagsToScan.join(',');
    const nodes = document.querySelectorAll(selector);
    nodes.forEach(node => {
      if (isIgnoredTag(node)) return;
      processDomCandidateElement(node);
    });
    domState.hasInitialSweep = true;
  } catch (error) {
    console.warn("DOM sweep error:", error);
  }
}

// ================== HEURISTIC DETECTION ==================
function detectHeuristicPatterns(text, element) {
  const patterns = [];
  const lowerText = text.toLowerCase();
  
  // Exception: "Mandatory Disclosures" - legitimate regulatory/institutional compliance term
  // This is not a dark pattern - it's required legal/institutional disclosure
  if (/mandatory.*disclosures?/i.test(lowerText) && text.split(/\s+/).length <= 5) {
    console.log(`[DeceptiTech] "Mandatory Disclosures" excluded from heuristic patterns (legitimate compliance term): '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }

  // Exception: "Other links" navigation sections (common in university/institutional pages)
  // These are not dark patterns - they're just navigation menus
  // Check for navigation lists with multiple institutional/academic terms
  const institutionalTerms = [
    /academic.*calendar/i,
    /campus.*events/i,
    /nirf.*ranking/i,
    /\bfaculty\b/i,
    /scholarships/i,
    /feedback/i,
    /disclosures/i,
    /achievements/i,
    /openings/i,
    /student.*corner/i,
    /corner/i,
    /downloads/i,
    /depository/i,
    /development.*goal/i,
    /naac/i,
    /iqac/i,
    /hill/i
  ];
  const matchedInstitutionalTerms = institutionalTerms.filter(re => re.test(lowerText)).length;
  
  // If text contains "other links" OR has 3+ institutional terms, it's likely a navigation menu
  if (lowerText.startsWith("other links") || 
      lowerText.includes("other links") ||
      (matchedInstitutionalTerms >= 3 && text.split(/\s+/).length > 5)) {
    console.log(`[DeceptiTech] "Other links" navigation section excluded from heuristic patterns (${matchedInstitutionalTerms} institutional terms): '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }
  
  // Exception: Legitimate travel/transportation mandatory contact requirements
  const isLegitimateTravelRequirement = (
    /mandatory.*travel.*update|travel.*update.*mandatory|required.*for.*travel|contact.*for.*travel.*update|mobile.*for.*travel/i.test(lowerText) ||
    (/flyer.*must.*have.*access/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
    (/must.*have.*access.*mobile/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
    (/mobile.*number.*mandatory.*travel/i.test(lowerText))
  );
  if (isLegitimateTravelRequirement) {
    console.log(`[DeceptiTech] Legitimate travel requirement excluded from heuristic patterns: '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }
  
  for (const [category, config] of Object.entries(DARK_PATTERN_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        patterns.push({
          category,
          confidence: 0.8, // High confidence for keyword matches
          reason: `Contains "${keyword}" - common ${category.toLowerCase()} indicator`,
          details: `The text "${text}" contains language typically used in ${category.toLowerCase()} patterns.`,
          icon: config.icon,
          color: config.color,
          element: element,
          selector: cssPath(element)
        });
      }
    }
  }
  
  return patterns;
}

// ================== UI ELEMENT DETECTION ==================
function detectUIElements(element) {
  const patterns = [];
  const tag = element.tagName.toLowerCase();
  
  // Auto-checked checkboxes
  if (tag === "input" && element.type === "checkbox" && element.checked) {
    patterns.push({
      category: "Sneaking",
      confidence: 0.9,
      reason: "Checkbox is pre-checked without user interaction",
      details: "This checkbox is automatically selected, which is a common sneaking pattern to add unwanted items or services.",
      icon: "☑️",
      color: "#a855f7",
      element: element,
      selector: cssPath(element)
    });
  }
  
  // Auto-selected radio buttons
  if (tag === "input" && element.type === "radio" && element.checked) {
    patterns.push({
      category: "Misdirection",
      confidence: 0.85,
      reason: "Radio button is pre-selected",
      details: "This radio button is automatically selected, potentially steering users toward a specific choice.",
      icon: "🔘",
      color: "#f59e0b",
      element: element,
      selector: cssPath(element)
    });
  }
  
  // Hidden form elements
  if ((tag === "input" || tag === "select") && !isVisibleElement(element)) {
    patterns.push({
      category: "Sneaking",
      confidence: 0.7,
      reason: "Form element is hidden from view",
      details: "This form element is not visible to users, which could be used to collect data without consent.",
      icon: "👁️",
      color: "#a855f7",
      element: element,
      selector: cssPath(element)
    });
  }
  
  return patterns;
}

// ================== ML CLASSIFICATION (SIMULATED) ==================
function classifyWithML(text) {
  // Enhanced pattern detection with confidence scoring
  const patterns = [];
  const lowerText = text.toLowerCase();
  
  // Exception: "Mandatory Disclosures" - legitimate regulatory/institutional compliance term
  // This is not a dark pattern - it's required legal/institutional disclosure
  if (/mandatory.*disclosures?/i.test(lowerText) && text.split(/\s+/).length <= 5) {
    console.log(`[DeceptiTech] "Mandatory Disclosures" excluded from ML classification (legitimate compliance term): '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }

  // Exception: "Other links" navigation sections (common in university/institutional pages)
  // These are not dark patterns - they're just navigation menus
  // Check for navigation lists with multiple institutional/academic terms
  const institutionalTerms = [
    /academic.*calendar/i,
    /campus.*events/i,
    /nirf.*ranking/i,
    /\bfaculty\b/i,
    /scholarships/i,
    /feedback/i,
    /disclosures/i,
    /achievements/i,
    /openings/i,
    /student.*corner/i,
    /corner/i,
    /downloads/i,
    /depository/i,
    /development.*goal/i,
    /naac/i,
    /iqac/i,
    /hill/i
  ];
  const matchedInstitutionalTerms = institutionalTerms.filter(re => re.test(lowerText)).length;
  
  // If text contains "other links" OR has 3+ institutional terms, it's likely a navigation menu
  if (lowerText.startsWith("other links") || 
      lowerText.includes("other links") ||
      (matchedInstitutionalTerms >= 3 && text.split(/\s+/).length > 5)) {
    console.log(`[DeceptiTech] "Other links" navigation section excluded from ML classification (${matchedInstitutionalTerms} institutional terms): '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }
  
  // Exception: Legitimate travel/transportation mandatory contact requirements
  const isLegitimateTravelRequirement = (
    /mandatory.*travel.*update|travel.*update.*mandatory|required.*for.*travel|contact.*for.*travel.*update|mobile.*for.*travel/i.test(lowerText) ||
    (/flyer.*must.*have.*access/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
    (/must.*have.*access.*mobile/i.test(lowerText) && /mandatory.*travel/i.test(lowerText)) ||
    (/mobile.*number.*mandatory.*travel/i.test(lowerText))
  );
  if (isLegitimateTravelRequirement) {
    console.log(`[DeceptiTech] Legitimate travel requirement excluded from ML classification: '${text.slice(0,120)}'`);
    return []; // Return empty - don't create any patterns
  }
  
  // Enhanced pattern detection with confidence scoring
  const patternScores = {};
  
  // Countdown timers
  if (/\d{1,2}:\d{2}(:\d{2})?/.test(text) || lowerText.includes("countdown")) {
    patternScores["Urgency"] = 0.95;
  }
  
  // Stock indicators and scarcity patterns
  if (/only \d+ left|just \d+ remaining|\d+ in stock|only \d+ remaining|only \d+ available|only \d+ items left|only \d+ left in stock/i.test(text)) {
    patternScores["Scarcity"] = 0.9;
  }
  // Text-based scarcity indicators
  if (/only a few|few remaining|limited availability|limited stock|low stock|almost gone|running out|exclusive|rare|last one|last few|limited quantity|limited supply/i.test(lowerText)) {
    patternScores["Scarcity"] = Math.max(patternScores["Scarcity"] || 0, 0.85);
  }
  
  // Social proof indicators
  // Pattern 1: Number-based social proof (e.g., "5 users purchased")
  if (/\d+ (users?|people|customers?) (are|have|viewing|purchased)/i.test(text)) {
    patternScores["Social Proof"] = 0.85;
  }
  
  // Pattern 2: Name-based purchase notifications (e.g., "Satya from India purchased")
  // Common in fake social proof popups
  if (/(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+purchased/i.test(text) ||
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+purchased\s+[^.]+\s+\d+\s+(?:minutes?|hours?|days?)\s+ago/i.test(text) ||
      /purchased\s+[^.]+\s+\d+\s+(?:minutes?|hours?|days?)\s+ago/i.test(text)) {
    patternScores["Social Proof"] = Math.max(patternScores["Social Proof"] || 0, 0.9);
  }
  
  // Pattern 3: Generic purchase notifications with timestamps
  if (/purchased.*\d+\s+(?:minutes?|hours?|days?)\s+ago/i.test(text) && 
      (text.length < 200 || /from\s+[A-Z]|just\s+purchased|recently\s+purchased/i.test(text))) {
    patternScores["Social Proof"] = Math.max(patternScores["Social Proof"] || 0, 0.88);
  }
  
  // Subscription traps
  if (/auto.?renew|recurring|subscription|billing/i.test(text)) {
    patternScores["Sneaking"] = 0.8;
  }
  
  // Forced actions - but exclude travel requirements (already checked above)
  if (/must|required|mandatory|no choice|forced|have to|need to|cannot proceed|must create|must sign|must register/i.test(text)) {
    patternScores["Forced Action"] = 0.9;
  }
  
  // Misdirection patterns
  if (/no thanks|skip|decline|reject|don't want|rather not|not interested|maybe later|opt out/i.test(text)) {
    patternScores["Misdirection"] = 0.85;
  }
  
  // Obstruction patterns - enhanced detection
  if (/call to cancel|phone only|contact support|speak to|talk to|must call|requires call|call us to|phone us to|contact us to cancel|dial|phone number required|call customer service/i.test(lowerText)) {
    patternScores["Obstruction"] = 0.88;
  }
  // Additional obstruction indicators
  if (/difficult to cancel|hard to cancel|cannot cancel online|no online cancellation|must contact|requires contact|call only|phone only cancellation|unsubscribe by phone/i.test(lowerText)) {
    patternScores["Obstruction"] = Math.max(patternScores["Obstruction"] || 0, 0.85);
  }
  
  // Convert scores to patterns
  for (const [category, confidence] of Object.entries(patternScores)) {
    if (confidence >= CONFIG.CONFIDENCE_THRESHOLD) {
      const config = DARK_PATTERN_CATEGORIES[category];
      patterns.push({
        category,
        confidence,
        reason: getCategoryDescription(category, text),
        details: `The text "${text}" shows characteristics of ${category.toLowerCase()} patterns with ${Math.round(confidence * 100)}% confidence.`,
        icon: config?.icon || "🤖",
        color: config?.color || "#666",
        element: null,
        selector: ""
      });
    }
  }
  
  return patterns;
}

// ================== PATTERN DETECTION ==================
function detectPatterns(element) {
  const text = extractTextSnippet(element);
  if (!text || text.length < 3) return [];
  
  const patterns = [];
  
  // Combine heuristic and ML detection
  patterns.push(...detectHeuristicPatterns(text, element));
  patterns.push(...detectUIElements(element));
  patterns.push(...classifyWithML(text));
  
  // Enhanced deduplication: use element selector + text snippet + category
  const uniquePatterns = [];
  const seen = new Map(); // Use Map for better deduplication
  
  for (const pattern of patterns) {
    // Use category + normalized text as primary key to prevent duplicates
    const normalizedText = text.trim().toLowerCase().slice(0, 150);
    const key = `${pattern.category}-${normalizedText}`;
    
    if (!seen.has(key)) {
      seen.set(key, true);
      uniquePatterns.push({
        ...pattern,
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        snippet: text,
        timestamp: new Date().toISOString(),
        selector: pattern.selector || cssPath(element)
      });
    } else {
      // If duplicate found, keep the one with higher confidence
      const existingIndex = uniquePatterns.findIndex(p => {
        const pNorm = (p.snippet || '').trim().toLowerCase().slice(0, 150);
        return `${p.category}-${pNorm}` === key;
      });
      if (existingIndex >= 0 && pattern.confidence > uniquePatterns[existingIndex].confidence) {
        uniquePatterns[existingIndex] = {
          ...pattern,
          id: uniquePatterns[existingIndex].id, // Keep original ID
          snippet: text,
          timestamp: uniquePatterns[existingIndex].timestamp,
          selector: pattern.selector || cssPath(element)
        };
      }
    }
  }
  
  return uniquePatterns;
}

// ================== SCANNING FUNCTIONS ==================
function performFullScan() {
  console.log("Starting full page scan...");
  detectionState.isScanning = true;
  detectionState.patterns = [];
  
  // Scan all text elements
  const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, a, button, label');
  textElements.forEach(element => {
    if (isVisibleElement(element)) {
      const patterns = detectPatterns(element);
      detectionState.patterns.push(...patterns);
    }
  });
  
  // Scan form elements
  const formElements = document.querySelectorAll('input, select, textarea');
  formElements.forEach(element => {
    const patterns = detectUIElements(element);
    detectionState.patterns.push(...patterns);
  });
  
  // Enhanced deduplication: prioritize text content over selector to prevent duplicates
  const uniquePatterns = [];
  const seen = new Map();
  
  detectionState.patterns.forEach(pattern => {
    // Normalize snippet for comparison (lowercase, trim, limit length)
    const normalizedSnippet = (pattern.snippet || '').trim().toLowerCase().slice(0, 150);
    // Use category + normalized text as primary key (ignore selector for same text)
    // This prevents the same text from appearing multiple times even if it's in different elements
    const key = `${pattern.category}-${normalizedSnippet}`;
    
    if (!seen.has(key)) {
      seen.set(key, true);
      uniquePatterns.push(pattern);
    } else {
      // If we've seen this pattern, keep the one with higher confidence
      const existingIndex = uniquePatterns.findIndex(p => {
        const pNorm = (p.snippet || '').trim().toLowerCase().slice(0, 150);
        return `${p.category}-${pNorm}` === key;
      });
      if (existingIndex >= 0 && pattern.confidence > uniquePatterns[existingIndex].confidence) {
        uniquePatterns[existingIndex] = pattern;
      }
    }
  });
  
  detectionState.patterns = uniquePatterns;
  detectionState.isScanning = false;
  
  console.log(`Scan complete. Found ${detectionState.patterns.length} patterns.`);
  
  return detectionState.patterns;
}

// Enrich patterns with Qwen2.5 short descriptions and JSON detailed descriptions
// Update dataset with verified patterns (non-blocking, silent failure)
async function updateDataset(patterns) {
  if (!patterns || patterns.length === 0) {
    return;
  }
  
  // Prepare patterns for dataset update
  // Only include verified patterns (those that passed Qwen verification)
  const datasetPatterns = patterns
    .filter(p => {
      // Only include patterns that have been verified as dark patterns
      // Patterns with verifiedBy metadata or is_dark_pattern=true are verified
      const text = (p.snippet || p.text || '').trim();
      return text.length >= 3 && p.category && p.category !== 'None';
    })
    .map(p => {
      const text = (p.snippet || p.text || p.details || '').trim();
      return {
        text: text,
        category: p.category || 'Unknown',
        label: 1, // All verified patterns are dark patterns (label=1)
        // Include additional metadata if needed
        verifiedBy: p.verifiedBy || 'qwen2.5',
        confidence: p.confidence || 0.5
      };
    });
  
  if (datasetPatterns.length === 0) {
    return;
  }
  
  // Send to background script to update dataset (non-blocking)
  try {
    chrome.runtime.sendMessage({
      type: 'UPDATE_DATASET',
      payload: datasetPatterns
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[DeceptiTech] Dataset update error:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log(`[DeceptiTech] Dataset updated: ${response.data?.added || 0} added, ${response.data?.skipped || 0} skipped`);
      } else {
        console.warn("[DeceptiTech] Dataset update failed:", response?.error);
      }
    });
  } catch (err) {
    console.warn("[DeceptiTech] Dataset update exception (non-critical):", err);
  }
}

async function enrichPatternsWithDescriptions(patterns) {
  // Load JSON descriptions first
  await loadPatternDescriptions();
  
  // Filter out transparent free trial disclosures before description generation
  const filteredPatterns = patterns.filter(pattern => {
    const text = (pattern.snippet || pattern.text || pattern.details || "").trim();
    if (!text) return true;
    
    const fullText = text.length < 200 && (pattern.details || pattern.reason) 
      ? `${text} ${(pattern.details || pattern.reason || "").slice(0, 500)}` 
      : text;
    const lowerText = fullText.toLowerCase();
    
    const hasFreeTrial = /free trial/i.test(lowerText);
    const transparencyIndicators = [
      /you will be charged/i,
      /until you cancel/i,
      /see full offer terms/i,
      /terms and conditions/i,
      /full terms/i,
      /will be notified/i,
      /prior to.*expiration/i,
      /eligible/i,
      /offer is/i,
      /valid payment information/i,
      /date of enrollment/i,
      /subscription.*free/i,
      /enrollment/i,
      /day.*free trial|free trial.*day/i
    ];
    const transparencyCount = transparencyIndicators.filter(re => re.test(lowerText)).length;
    const isTransparentFreeTrial = (
      hasFreeTrial &&
      (fullText.length > 100 || text.length > 100) &&
      transparencyCount >= 2
    );
    
    if (isTransparentFreeTrial) {
      console.log(`[DeceptiTech] Transparent free trial disclosure filtered from descriptions (${transparencyCount} indicators): '${text.slice(0,120)}'`);
      return false;
    }
    return true;
  });
  
  // Generate Qwen2.5 descriptions for all patterns in parallel (batch)
  const descriptionPromises = filteredPatterns.map(async (pattern) => {
    // ALWAYS generate short description using Qwen2.5 (small description visible outside)
    // Use the best available text field (snippet, text, or details)
    const textForQwen = pattern.snippet || pattern.text || pattern.details || "";
    const shortDesc = await generateShortDescription(pattern.category, textForQwen, pattern);
    
    // ALWAYS use JSON file for detailed description (inside description after clicking)
    let detailedDesc = getDetailedDescription(pattern.category);
    
    // If pattern has DOM rule metadata, enhance the detailed description with specific context
    if (pattern.meta?.domRule) {
      const ruleMeta = DOM_RULE_METADATA[pattern.meta.domRule];
      if (ruleMeta?.details) {
        let domDetails = "";
        if (typeof ruleMeta.details === 'function') {
          // Create a candidate-like object for the function
          const candidate = {
            snippet: pattern.snippet,
            selector: pattern.selector,
            matches: pattern.meta.matches || []
          };
          domDetails = ruleMeta.details(candidate);
        } else {
          domDetails = ruleMeta.details;
        }
        // Combine JSON description with DOM-specific details
        detailedDesc = `${domDetails} ${detailedDesc}`;
      }
    }
    
    return {
      ...pattern,
      reason: shortDesc, // Qwen2.5 generated short description
      details: detailedDesc // JSON file detailed description
    };
  });
  
  return Promise.all(descriptionPromises);
}

// ================== COMBINED SCAN PIPELINE ==================
async function runCompleteScan() {
  detectionState.isScanning = true;
  const baseResults = performFullScan();
  detectionState.isScanning = true; // Ensure scanning flag stays true during async steps

  try {
    // Load JSON descriptions early
    await loadPatternDescriptions();
    
    const domCandidates = collectDomCandidatesForScan();
    const domRulePatterns = domCandidates.flatMap(domCandidateToPatterns);

    const uniqueNlpCandidates = [];
    const seenSnippets = new Set();
    for (const candidate of domCandidates) {
      const snippet = (candidate.snippet || "").trim();
      if (!snippet) continue;
      const key = snippet.toLowerCase().slice(0, 200);
      if (seenSnippets.has(key)) continue;
      seenSnippets.add(key);
      uniqueNlpCandidates.push({
        id: candidate.id,
        snippet: candidate.snippet,
        selector: candidate.selector
      });
      if (uniqueNlpCandidates.length >= 60) break;
    }

    console.log(`[DeceptiTech] Sending ${uniqueNlpCandidates.length} text snippets to NLP service...`);
    const nlpAdditions = await enrichPatternsWithNLP(uniqueNlpCandidates).catch((err) => {
      console.warn("[DeceptiTech] NLP enrichment failed:", err);
      return [];
    });
    console.log(`[DeceptiTech] NLP service returned ${nlpAdditions.length} additional patterns`);
    
    const allPatterns = [...baseResults, ...domRulePatterns, ...nlpAdditions];
    
    // Verify patterns using Qwen2.5 verification layer (filters false positives, removes duplicates)
    console.log(`[DeceptiTech] Verifying ${allPatterns.length} patterns with Qwen2.5 verification layer...`);
    const verifiedPatterns = await verifyPatternsWithT5(allPatterns);
    console.log(`[DeceptiTech] Verification complete: ${verifiedPatterns.length} verified dark patterns (${allPatterns.length - verifiedPatterns.length} filtered out)`);
    
    // Enrich verified patterns with Qwen2.5 short descriptions and JSON detailed descriptions
    console.log(`[DeceptiTech] Generating descriptions for ${verifiedPatterns.length} verified patterns...`);
    const enrichedPatterns = await enrichPatternsWithDescriptions(verifiedPatterns);
    
    const merged = dedupeAndMerge(enrichedPatterns);
    detectionState.patterns = merged;
    
    // Update dataset with verified patterns (non-blocking)
    updateDataset(merged).catch(err => {
      console.warn("[DeceptiTech] Dataset update failed (non-critical):", err);
    });
    
    // If this is the initial scan (first time user clicks button), start monitoring after buffer
    if (!detectionState.initialScanComplete) {
      detectionState.initialScanComplete = true;
      detectionState.previousPatterns = JSON.parse(JSON.stringify(merged)); // Deep copy
      detectionState.lastScanTime = Date.now();
      
      console.log("[DeceptiTech] Initial scan complete. Waiting 180 seconds before starting monitoring...");
      
      // Wait 180 seconds before starting monitoring
      detectionState.bufferTimeout = setTimeout(() => {
        console.log("[DeceptiTech] Buffer period complete. Starting DOM monitoring...");
        startMonitoring();
      }, 180000); // 180 seconds
    }
    
    return merged;
  } finally {
    detectionState.isScanning = false;
  }
}

// ================== MONITORING FUNCTIONS ==================
// Compare current patterns with previous to find new ones
function findNewPatterns(currentPatterns, previousPatterns) {
  const previousKeys = new Set();
  previousPatterns.forEach(p => {
    const key = `${p.category}-${(p.snippet || p.text || "").toLowerCase().slice(0, 200)}`;
    previousKeys.add(key);
  });
  
  const newPatterns = currentPatterns.filter(p => {
    const key = `${p.category}-${(p.snippet || p.text || "").toLowerCase().slice(0, 200)}`;
    return !previousKeys.has(key);
  });
  
  return newPatterns;
}

// Check if pattern is from DOM keyword detection (not heuristic/ML)
function isDomKeywordPattern(pattern) {
  return pattern.meta?.source === "dom-rule" || 
         pattern.meta?.domRule?.startsWith("suspicious-") ||
         (pattern.meta?.domRule && DOM_RULE_METADATA[pattern.meta.domRule]);
}

// Perform incremental DOM scan (only check for new patterns)
async function performIncrementalScan() {
  if (detectionState.isScanning) {
    console.log("[DeceptiTech] Scan already in progress, skipping incremental scan");
    return [];
  }
  
  console.log("[DeceptiTech] Performing incremental DOM scan...");
  detectionState.isScanning = true;
  
  try {
    // Only scan DOM candidates (keyword-based detection)
    const domCandidates = collectDomCandidatesForScan();
    const domRulePatterns = domCandidates.flatMap(domCandidateToPatterns);
    
    // Verify only new DOM patterns
    const verifiedPatterns = await verifyPatternsWithT5(domRulePatterns);
    const enrichedPatterns = await enrichPatternsWithDescriptions(verifiedPatterns);
    
    return enrichedPatterns;
  } catch (error) {
    console.error("[DeceptiTech] Incremental scan error:", error);
    return [];
  } finally {
    detectionState.isScanning = false;
  }
}

// Send new patterns to NLP layer and notify user
async function processNewPatterns(newPatterns, isImmediate = false) {
  if (newPatterns.length === 0) {
    console.log("[DeceptiTech] No new patterns detected");
    return;
  }
  
  console.log(`[DeceptiTech] Found ${newPatterns.length} new patterns${isImmediate ? ' (immediate DOM keyword detection)' : ''}`);
  
  // Send to NLP layer (verify and enrich)
  const verified = await verifyPatternsWithT5(newPatterns);
  const enriched = await enrichPatternsWithDescriptions(verified);
  
  if (enriched.length > 0) {
    // Update state
    detectionState.patterns = [...detectionState.patterns, ...enriched];
    detectionState.previousPatterns = JSON.parse(JSON.stringify(detectionState.patterns));
    
    // Notify user
    chrome.runtime.sendMessage({
      type: 'NEW_PATTERNS_DETECTED',
      count: enriched.length,
      patterns: enriched
    });
    
    // Update dataset with new patterns (non-blocking)
    updateDataset(enriched).catch(err => {
      console.warn("[DeceptiTech] Dataset update failed (non-critical):", err);
    });
    
    console.log(`[DeceptiTech] Sent ${enriched.length} new patterns to NLP layer and notified user`);
  }
}

// Start monitoring after initial scan buffer
function startMonitoring() {
  if (detectionState.isMonitoring) {
    console.log("[DeceptiTech] Monitoring already active");
    return;
  }
  
  detectionState.isMonitoring = true;
  console.log("[DeceptiTech] Starting DOM monitoring (60-second intervals)");
  
  // Check DOM every 60 seconds for all new patterns
  detectionState.monitoringInterval = setInterval(async () => {
    if (detectionState.isScanning) {
      console.log("[DeceptiTech] Scan in progress, skipping scheduled check");
      return;
    }
    
    console.log("[DeceptiTech] Scheduled 60-second check - scanning for changes...");
    const currentPatterns = await performIncrementalScan();
    const newPatterns = findNewPatterns(currentPatterns, detectionState.previousPatterns);
    
    if (newPatterns.length > 0) {
      console.log(`[DeceptiTech] Found ${newPatterns.length} new patterns in 60-second interval - sending to NLP`);
      await processNewPatterns(newPatterns, false);
    } else {
      console.log("[DeceptiTech] No new patterns in this interval");
    }
    
    // Update previous patterns for next comparison (use current patterns from state, not just incremental)
    detectionState.previousPatterns = JSON.parse(JSON.stringify(detectionState.patterns));
    detectionState.lastScanTime = Date.now();
  }, 60000); // 60 seconds
  
  // Check DOM changes more frequently to catch new DOM keyword patterns immediately
  detectionState.domCheckInterval = setInterval(async () => {
    if (detectionState.isScanning) return;
    
    // Quick check for new DOM keyword patterns only
    const domCandidates = collectDomCandidatesForScan();
    const domRulePatterns = domCandidates.flatMap(domCandidateToPatterns);
    
    // Compare with previous patterns
    const newDomPatterns = findNewPatterns(domRulePatterns, detectionState.previousPatterns);
    const newDomKeywordPatterns = newDomPatterns.filter(isDomKeywordPattern);
    
    if (newDomKeywordPatterns.length > 0) {
      console.log(`[DeceptiTech] New DOM keyword patterns detected immediately: ${newDomKeywordPatterns.length}`);
      await processNewPatterns(newDomKeywordPatterns, true);
      // Update previous patterns so they're not sent again in the 60-second interval
      detectionState.previousPatterns = JSON.parse(JSON.stringify(detectionState.patterns));
    }
  }, 5000); // Check every 5 seconds for immediate detection
}

// Stop monitoring
function stopMonitoring() {
  if (detectionState.monitoringInterval) {
    clearInterval(detectionState.monitoringInterval);
    detectionState.monitoringInterval = null;
  }
  if (detectionState.domCheckInterval) {
    clearInterval(detectionState.domCheckInterval);
    detectionState.domCheckInterval = null;
  }
  if (detectionState.bufferTimeout) {
    clearTimeout(detectionState.bufferTimeout);
    detectionState.bufferTimeout = null;
  }
  detectionState.isMonitoring = false;
  console.log("[DeceptiTech] Monitoring stopped");
}

// ================== OPTIONAL NLP INFERENCE ==================
// NOTE: This function is deprecated - use verifyPatternsWithT5 instead which uses /verify-patterns via background script
// Keeping for backward compatibility but it will return empty array to avoid CORS issues
async function classifyWithNLPBatch(texts) {
  if (!CONFIG.NLP_ENABLED) {
    console.log("[DeceptiTech] NLP is disabled in config");
    return [];
  }
  if (!texts || texts.length === 0) {
    console.log("[DeceptiTech] No texts to send to NLP service");
    return [];
  }

  // Legacy endpoint /predict no longer exists - return empty to avoid CORS errors
  // Use verifyPatternsWithT5 instead which uses /verify-patterns via background script
  console.log("[DeceptiTech] classifyWithNLPBatch: Legacy /predict endpoint not available. Use verifyPatternsWithT5 instead.");
  return [];
}

async function enrichPatternsWithNLP(candidates) {
  if (!CONFIG.NLP_ENABLED || !candidates || candidates.length === 0) return [];

  // Prepare candidates for verification via background script (avoids CORS)
  const prepared = candidates
    .map(candidate => ({
      text: candidate.snippet ?? candidate.textSnippet ?? "",
      category: "Misdirection", // Default, will be determined by Qwen2.5
      confidence: 0.7,
      selector: candidate.selector || (candidate.element ? cssPath(candidate.element) : ""),
      candidateId: candidate.id || candidate.candidateId || null
    }))
    .filter(item => item.text && item.text.trim().length >= 3);

  if (prepared.length === 0) return [];

  // Call verification via background script to avoid CORS
  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'VERIFY_PATTERNS',
      payload: prepared
    }, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("[DeceptiTech] background VERIFY_PATTERNS error:", chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { success: false, error: 'No response from background' });
      }
    });
  });

  if (!result || !result.success) {
    console.warn("[DeceptiTech] NLP enrichment via verification failed:", result && result.error);
    return [];
  }

  const verified = Array.isArray(result.data?.verified) ? result.data.verified : [];
  
  // Convert verified patterns to the enriched format
  const enriched = verified.map(v => {
    const config = DARK_PATTERN_CATEGORIES[v.category] || {};
    return {
      id: `nlp-${v.candidateId || Date.now()}-${Math.random().toString(36).slice(2)}`,
      category: v.category,
      confidence: v.confidence || 0.7,
      reason: v.explanation || `Detected ${v.category.toLowerCase()} pattern`,
      details: `Detected "${v.category}" pattern with ${Math.round((v.confidence || 0.7) * 100)}% confidence.`,
      icon: config.icon || "🤖",
      color: config.color || "#666",
      snippet: v.text,
      selector: v.selector || "",
      timestamp: new Date().toISOString(),
      meta: {
        source: "nlp",
        verifiedBy: "qwen2.5"
      }
    };
  });

  return enriched;
}

// ================== UI INJECTION ==================
function injectUI() {
  if (detectionState.uiContainer) return;
  
  const containerId = 'deceptitech-widget-root';
  if (document.getElementById(containerId)) return;
  
  const host = document.createElement('div');
  host.id = containerId;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.bottom = '16px';
  host.style.right = '16px';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  
  const shadow = host.attachShadow({ mode: 'open' });
  
  const appMount = document.createElement('div');
  appMount.id = 'app-mount';
  shadow.appendChild(appMount);
  
  // Inject CSS first
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/main.css');
  shadow.appendChild(link);
  
  // Inject the built React bundle
  const script = document.createElement('script');
  script.type = 'module';
  script.src = chrome.runtime.getURL('assets/main.js');
  shadow.appendChild(script);
  
  // Basic styles
  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host, * { box-sizing: border-box; }
    body { margin: 0; }
  `;
  shadow.appendChild(baseStyle);
  
  document.documentElement.appendChild(host);
  detectionState.uiContainer = host;
}

// ================== MESSAGE HANDLING ==================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  try {
    switch (request.type) {
      case 'PERFORM_SCAN':
        // Stop any existing monitoring when user manually scans
        stopMonitoring();
        detectionState.initialScanComplete = false;
        detectionState.previousPatterns = [];
        
        runCompleteScan().then(results => {
          sendResponse({
            success: true,
            patterns: results,
            count: results.length
          });
        }).catch(error => {
          console.error("Error during scan:", error);
          sendResponse({ success: false, error: error?.message || 'Scan failed', patterns: [] });
        });
        return true;
        
      case 'AUTO_SCAN':
        // Disabled - only scan on user button click
        sendResponse({ success: true });
        break;
        
      case 'GET_PATTERNS':
        sendResponse({
          success: true,
          patterns: detectionState.patterns,
          isScanning: detectionState.isScanning
        });
        break;
        
      case 'INJECT_UI':
        injectUI();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
});

function dedupeAndMerge(patterns) {
  const unique = [];
  const seen = new Map();
  
  // Sort by length (longest first) then confidence to keep most complete matches
  const sorted = [...patterns].sort((a, b) => {
    const aLen = (a.snippet || a.text || '').length;
    const bLen = (b.snippet || b.text || '').length;
    if (bLen !== aLen) return bLen - aLen; // Longer first
    return (b.confidence || 0) - (a.confidence || 0); // Then by confidence
  });
  
  for (const pattern of sorted) {
    const snippet = (pattern.snippet || pattern.text || '').trim();
    if (!snippet || snippet.length < 3) continue;
    
    // Better normalization: remove extra whitespace, special chars, limit length
    const normalizedSnippet = snippet.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .slice(0, 200);
    
    // Create keys: by text only (most important) and by category+text
    const textKey = normalizedSnippet;
    const categoryTextKey = `${pattern.category || 'Unknown'}-${normalizedSnippet}`;
    
    // Check if this text is a substring of an existing pattern (or vice versa)
    let isSubstring = false;
    for (const [key, idx] of seen.entries()) {
      if (key === textKey || key === categoryTextKey) continue;
      const existingNormalized = key.includes('-') ? key.split('-').slice(1).join('-') : key;
      if (normalizedSnippet.includes(existingNormalized) || existingNormalized.includes(normalizedSnippet)) {
        // One is substring of the other - keep the longer one (which we already have since sorted by length)
        if (normalizedSnippet.length >= existingNormalized.length) {
          // This one is longer or equal - replace the existing
          const existingIdx = idx;
          const existing = unique[existingIdx];
          if (pattern.verified && !existing.verified) {
            unique[existingIdx] = pattern;
          } else if (pattern.confidence > existing.confidence) {
            unique[existingIdx] = pattern;
          }
        }
        isSubstring = true;
        break;
      }
    }
    if (isSubstring) continue;
    
    // Check if we've seen this exact text (regardless of category)
    if (seen.has(textKey)) {
      const existingIdx = seen.get(textKey);
      const existing = unique[existingIdx];
      
      // If same text but different category, prefer verified or higher confidence
      if (pattern.verified && !existing.verified) {
        unique[existingIdx] = pattern; // Replace with verified
        seen.set(categoryTextKey, existingIdx);
      } else if (pattern.confidence > existing.confidence && !existing.verified) {
        unique[existingIdx] = pattern; // Replace with higher confidence
        seen.set(categoryTextKey, existingIdx);
      }
      // Otherwise keep existing
      continue;
    }
    
    // Check if we've seen this category+text combination
    if (seen.has(categoryTextKey)) {
      const existingIdx = seen.get(categoryTextKey);
      const existing = unique[existingIdx];
      
      // Prefer verified or higher confidence
      if (pattern.verified && !existing.verified) {
        unique[existingIdx] = pattern;
      } else if (pattern.confidence > existing.confidence) {
        unique[existingIdx] = pattern;
      }
      continue;
    }
    
    // New unique pattern
    seen.set(textKey, unique.length);
    seen.set(categoryTextKey, unique.length);
    unique.push(pattern);
  }
  
  console.log(`[DeceptiTech] Deduplication: ${patterns.length} -> ${unique.length} unique patterns`);
  return unique;
}

// Listen for messages from the injected React UI (via window.postMessage)
// Listen on both window and document to catch messages from shadow DOM
const handleUIMessage = (event) => {
  // Only accept messages from our extension UI
  if (event.data && event.data.source === 'deceptitech-ui') {
    console.log("Content script received message from UI:", event.data);
    
    switch (event.data.type) {
      case 'PERFORM_SCAN':
        runCompleteScan().then(results => {
          const targetWindow = window.top || window;
          targetWindow.postMessage({
            source: 'deceptitech-content',
            type: 'SCAN_RESPONSE',
            success: true,
            patterns: results,
            count: results.length
          }, '*');
        }).catch(error => {
          const targetWindow = window.top || window;
          targetWindow.postMessage({
            source: 'deceptitech-content',
            type: 'SCAN_RESPONSE',
            success: false,
            error: error?.message || 'Scan failed',
            patterns: []
          }, '*');
        });
        break;
        
      case 'GET_PATTERNS':
        const targetWindow2 = window.top || window;
        targetWindow2.postMessage({
          source: 'deceptitech-content',
          type: 'PATTERNS_RESPONSE',
          success: true,
          patterns: detectionState.patterns,
          isScanning: detectionState.isScanning
        }, '*');
        break;
    }
  }
};

window.addEventListener('message', handleUIMessage);
document.addEventListener('message', handleUIMessage); // Fallback for some contexts

// ================== DOM MUTATION MONITOR (DOM Layer) ==================
function handleMutation(mutation) {
  try {
    if (mutation.addedNodes && mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => processCandidateNode(node));
    }
    if (mutation.type === "attributes" && mutation.target) {
      processCandidateNode(mutation.target);
    }
  } catch (e) {
    console.warn("Mutation handling error", e);
  }
}

function processCandidateNode(node) {
  const el = (node && node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
  if (!el || !(el instanceof Element)) return;
  if (isIgnoredTag(el)) return;

  processDomCandidateElement(el);
}

function startDomObserver() {
  if (detectionState.observer) return;
  try {
    const obs = new MutationObserver(muts => muts.forEach(handleMutation));
    obs.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "checked", "selected", "value", "aria-hidden"]
    });
    detectionState.observer = obs;
  } catch {}
}

// ================== INITIALIZATION ==================
async function initialize() {
  console.log("Initializing DeceptiTech content script...");
  
  // Load pattern descriptions JSON early
  await loadPatternDescriptions();
  
  // Inject UI
  setTimeout(injectUI, 1000);
  
  // DO NOT perform automatic scan - wait for user to click button
  // Start DOM observation for dynamic updates (but don't scan yet)
  startDomObserver();

  console.log("DeceptiTech content script initialized - waiting for user to click scan button");
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
