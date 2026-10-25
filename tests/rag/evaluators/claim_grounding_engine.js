// Autonomous RAG Evolution Lab - Claim Grounding & Verification Engine
// Implements deterministic Claim Extraction, Evidence Alignment, and Citation Verification

const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
  'what', 'how', 'why', 'which', 'who', 'does', 'do', 'did', 'with', 'from', 'by', 'it', 'this', 'that',
  'can', 'could', 'should', 'would', 'will', 'be', 'as', 'into', 'then', 'than', 'over', 'between',
  'its', 'their', 'such', 'so', 'also', 'furthermore', 'moreover', 'additionally', 'example', 'etc'
]);

// Curriculum Domain Synonyms
const SYNONYMS = {
  'operations': ['effects', 'tasks', 'actions'],
  'routine': ['function', 'method', 'callback', 'handler'],
  'destruction': ['unmount', 'unmounting', 'removal', 'unmounts'],
  'stop': ['prevent', 'avoids', 'prevents', 'eliminate'],
  'finishes': ['renders', 'rendered', 'completes', 'completed'],
  'executes': ['runs', 'invokes', 'calls', 'performs'],
  'modify': ['mutate', 'update', 'reassign', 'change'],
  'reassign': ['mutate', 'modify', 'update', 'overwrite'],
  'outer': ['enclosing', 'lexical', 'parent'],
  'speed': ['performance', 'latency', 'fast', 'faster']
};

// Contradiction assertion pairs
const CONTRADICTIONS = [
  { p1: ['function-scoped', 'function scope'], p2: ['block-scoped', 'block scope'] },
  { p1: ['binds this', 'bound this', 'own this'], p2: ['does not bind this', 'lexical this', 'inherit this'] },
  { p1: ['triggers re-render', 'causes re-render'], p2: ['does not trigger re-render', 'without re-render', 'without triggering a re-render'] },
  { p1: ['mutable', 'can be modified'], p2: ['immutable', 'cannot be modified', 'cannot be reassigned'] },
  { p1: ['1-dimensional', 'single axis'], p2: ['2-dimensional', 'two dimensions', 'columns and rows'] }
];

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\-<>\.\(\)\{\}\$]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Extract atomic propositional claims from generated answer text
 */
function extractClaims(answerText) {
  if (!answerText || typeof answerText !== 'string') return [];

  const clean = answerText
    .replace(/```[\s\S]*?```/g, '') // remove large code blocks
    .replace(/\[(?:Source:\s*)?[A-Za-z0-9\s&+]+(?:,\s*Section\s*\d+)?\]/gi, '') // remove bracketed citations
    .replace(/\[Doc[^\]]+\]/gi, '')
    .trim();

  // Split into sentences
  const rawSentences = clean.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 15);
  const claims = [];

  for (const sentence of rawSentences) {
    const clauses = sentence.split(/,\s*(?:while|whereas|however|but)\s+/i);
    for (const clause of clauses) {
      const cTrim = clause.trim().replace(/^[-*•\d.]+\s*/, '');
      if (cTrim.length > 12) {
        claims.push(cTrim);
      }
    }
  }

  return claims;
}

/**
 * Verify extracted claims against retrieved evidence chunks
 */
function verifyClaims(claims, retrievedEvidence) {
  if (!claims || claims.length === 0) {
    return {
      claimSupportScore: 0.0,
      supportedCount: 0,
      partialCount: 0,
      unsupportedCount: 0,
      contradictedCount: 0,
      totalClaims: 0,
      claimDetails: []
    };
  }

  const combinedEvidenceText = retrievedEvidence
    .map(e => ((e.title || '') + ' ' + (e.content || '')).toLowerCase())
    .join('\n\n');

  let supportedCount = 0;
  let partialCount = 0;
  let unsupportedCount = 0;
  let contradictedCount = 0;
  const claimDetails = [];

  for (const claim of claims) {
    const claimTokens = tokenize(claim);
    const lowerClaim = claim.toLowerCase();

    // 1. Check for Contradiction
    let isContradicted = false;
    let contradictionReason = null;
    for (const pair of CONTRADICTIONS) {
      const hasP1 = pair.p1.some(phrase => lowerClaim.includes(phrase));
      const hasP2 = pair.p2.some(phrase => lowerClaim.includes(phrase));
      const evidenceHasP1 = pair.p1.some(phrase => combinedEvidenceText.includes(phrase));
      const evidenceHasP2 = pair.p2.some(phrase => combinedEvidenceText.includes(phrase));

      if (hasP1 && !hasP2 && evidenceHasP2 && !evidenceHasP1) {
        isContradicted = true;
        contradictionReason = `Claim asserts '${pair.p1[0]}' but evidence establishes '${pair.p2[0]}'`;
        break;
      }
      if (hasP2 && !hasP1 && evidenceHasP1 && !evidenceHasP2) {
        isContradicted = true;
        contradictionReason = `Claim asserts '${pair.p2[0]}' but evidence establishes '${pair.p1[0]}'`;
        break;
      }
    }

    if (isContradicted) {
      contradictedCount++;
      claimDetails.push({ claim, status: 'CONTRADICTED', confidence: 0.0, reason: contradictionReason });
      continue;
    }

    // 2. Keyword & Synonym Matching against each evidence chunk
    let bestChunkScore = 0.0;
    let bestChunkTitle = null;
    let bestChunkIndex = null;

    for (const chunk of retrievedEvidence) {
      const chunkText = ((chunk.title || '') + ' ' + (chunk.content || '')).toLowerCase();
      const chunkTokens = tokenize(chunkText);
      const chunkTokenSet = new Set(chunkTokens);

      let matched = 0;
      for (const t of claimTokens) {
        if (chunkTokenSet.has(t)) {
          matched += 1.0;
        } else {
          // Check synonym mapping safely (avoid prototype keys like constructor)
          const syns = (Object.prototype.hasOwnProperty.call(SYNONYMS, t) && Array.isArray(SYNONYMS[t])) ? SYNONYMS[t] : [];
          const hasSyn = syns.some(s => chunkTokenSet.has(s) || chunkText.includes(s));
          if (hasSyn) {
            matched += 0.9;
          } else {
            // Check 4-char prefix stem
            for (const ct of chunkTokenSet) {
              if (ct.startsWith(t.substring(0, 4)) || t.startsWith(ct.substring(0, 4))) {
                matched += 0.75;
                break;
              }
            }
          }
        }
      }

      const score = claimTokens.length > 0 ? (matched / claimTokens.length) : 0;
      if (score > bestChunkScore) {
        bestChunkScore = score;
        bestChunkTitle = chunk.title;
        bestChunkIndex = chunk.chunk_index;
      }
    }

    // Classify Claim Support
    let status = 'UNSUPPORTED';
    if (bestChunkScore >= 0.55) {
      status = 'SUPPORTED';
      supportedCount++;
    } else if (bestChunkScore >= 0.35) {
      status = 'PARTIALLY_SUPPORTED';
      partialCount++;
    } else {
      status = 'UNSUPPORTED';
      unsupportedCount++;
    }

    claimDetails.push({
      claim,
      status,
      confidence: Math.min(1.0, parseFloat(bestChunkScore.toFixed(4))),
      supportingChunk: bestChunkTitle ? `${bestChunkTitle} (Section ${bestChunkIndex + 1})` : null
    });
  }

  const totalWeight = (supportedCount * 1.0) + (partialCount * 0.5) - (contradictedCount * 0.5);
  const claimSupportScore = Math.max(0.0, Math.min(1.0, totalWeight / claims.length));

  return {
    claimSupportScore: parseFloat(claimSupportScore.toFixed(4)),
    supportedCount,
    partialCount,
    unsupportedCount,
    contradictedCount,
    totalClaims: claims.length,
    claimDetails
  };
}

/**
 * Verify citations in answer text against retrieved evidence
 */
function verifyCitations(answerText, retrievedEvidence) {
  if (!answerText) return { citationPrecision: 0, citationRecall: 0, citationCompleteness: 0, citations: [] };

  const citationRegex = /\[(?:Source:\s*)?([A-Za-z0-9\s&+]+?)(?:,\s*Section\s*(\d+))?\]/g;
  const parsedCitations = [];
  let match;

  while ((match = citationRegex.exec(answerText)) !== null) {
    const citedDoc = match[1].trim();
    const citedSection = match[2] ? parseInt(match[2], 10) : null;
    parsedCitations.push({ raw: match[0], doc: citedDoc, section: citedSection, index: match.index });
  }

  if (parsedCitations.length === 0) {
    const hasMention = retrievedEvidence.some(e => answerText.toLowerCase().includes((e.title || '').toLowerCase()));
    return {
      hasCitations: false,
      hasTopicMention: hasMention,
      citationPrecision: hasMention ? 0.8 : 0.0,
      citationRecall: hasMention ? 0.7 : 0.0,
      citationCompleteness: hasMention ? 0.75 : 0.0,
      citations: []
    };
  }

  let validCitations = 0;
  const verifiedList = [];

  for (const cit of parsedCitations) {
    const citedLower = cit.doc.toLowerCase();
    const matchingChunk = retrievedEvidence.find(e => {
      const titleLower = (e.title || '').toLowerCase();
      const titleMatches = titleLower.includes(citedLower) || citedLower.includes(titleLower);
      const sectionMatches = cit.section === null || (e.chunk_index + 1) === cit.section;
      return titleMatches && sectionMatches;
    });

    const isValid = !!matchingChunk;
    if (isValid) validCitations++;

    verifiedList.push({
      ...cit,
      exists: isValid,
      matchedTitle: matchingChunk ? matchingChunk.title : null,
      matchedSection: matchingChunk ? (matchingChunk.chunk_index + 1) : null
    });
  }

  const citationPrecision = validCitations / parsedCitations.length;
  const citationRecall = Math.min(1.0, validCitations / Math.max(1, retrievedEvidence.length));
  const citationCompleteness = validCitations > 0 ? 1.0 : 0.0;

  return {
    hasCitations: true,
    hasTopicMention: true,
    totalCitations: parsedCitations.length,
    validCitations,
    citationPrecision: parseFloat(citationPrecision.toFixed(4)),
    citationRecall: parseFloat(citationRecall.toFixed(4)),
    citationCompleteness: parseFloat(citationCompleteness.toFixed(4)),
    citations: verifiedList
  };
}

module.exports = {
  extractClaims,
  verifyClaims,
  verifyCitations
};
