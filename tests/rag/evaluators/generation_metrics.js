// Generation Quality & Grounding Evaluator
// Implements Atomic Claim Support, Faithfulness, Citation Verification, and Abstention Compliance

const { extractClaims, verifyClaims, verifyCitations } = require('./claim_grounding_engine');

function evaluateGeneration(testCase, responseData, isUnanswerable = false) {
  const answer = (responseData.answer || '').trim();
  const sources = responseData.sources || [];
  const confidence = responseData.confidence ?? (responseData.retrieval_confidence ?? 0.5);

  // 1. Abstention Evaluation (Crucial for unanswerables & out-of-domain)
  const abstentionKeywords = [
    'cannot find',
    'not found',
    'not mentioned',
    'do not have information',
    "i don't have enough information",
    'not in the provided course materials',
    'outside the scope',
    'not covered',
    'apologies, but i cannot',
    'cannot answer based on the provided',
    'not covered in your enrolled course materials'
  ];

  const lowerAnswer = answer.toLowerCase();
  const declaredAbstention = abstentionKeywords.some(phrase => lowerAnswer.includes(phrase));

  let abstentionAccuracy = 0.0;
  if (isUnanswerable) {
    if (declaredAbstention || confidence < 0.56 || sources.length === 0 || responseData.abstain) {
      abstentionAccuracy = 1.0;
    } else {
      abstentionAccuracy = 0.0;
    }
  } else {
    // For in-domain queries: unjustified refusal is a penalty
    abstentionAccuracy = declaredAbstention ? 0.0 : 1.0;
  }

  // 2. Claim Extraction & Verification (only for non-abstaining answers)
  let claimEval = {
    claimSupportScore: 0.0,
    supportedCount: 0,
    partialCount: 0,
    unsupportedCount: 0,
    contradictedCount: 0,
    totalClaims: 0,
    claimDetails: []
  };

  if (!declaredAbstention && sources.length > 0 && answer.length > 20) {
    const claims = extractClaims(answer);
    claimEval = verifyClaims(claims, sources);
  }

  // 3. Hallucination Rate
  let hallucinationScore = 0.0;
  if (isUnanswerable) {
    hallucinationScore = (abstentionAccuracy === 1.0) ? 0.0 : 1.0;
  } else {
    // For in-domain: fraction of claims that are unsupported or contradicted
    if (claimEval.totalClaims > 0) {
      hallucinationScore = (claimEval.unsupportedCount + claimEval.contradictedCount) / claimEval.totalClaims;
    } else {
      hallucinationScore = declaredAbstention ? 1.0 : 0.0;
    }
  }

  // 4. Citation Verification
  let citationEval = {
    citationPrecision: 0.0,
    citationRecall: 0.0,
    citationCompleteness: 0.0,
    citations: []
  };
  if (!isUnanswerable && sources.length > 0) {
    citationEval = verifyCitations(answer, sources);
  } else if (isUnanswerable) {
    citationEval = {
      citationPrecision: (sources.length === 0 || declaredAbstention) ? 1.0 : 0.0,
      citationRecall: 1.0,
      citationCompleteness: 1.0,
      citations: []
    };
  }

  return {
    abstentionAccuracy,
    declaredAbstention,
    claimSupportScore: claimEval.claimSupportScore,
    supportedClaims: claimEval.supportedCount,
    unsupportedClaims: claimEval.unsupportedCount,
    contradictedClaims: claimEval.contradictedCount,
    totalClaims: claimEval.totalClaims,
    claimDetails: claimEval.claimDetails,
    hallucinationScore: parseFloat(hallucinationScore.toFixed(4)),
    citationPrecision: citationEval.citationPrecision,
    citationRecall: citationEval.citationRecall,
    citationCompleteness: citationEval.citationCompleteness,
    confidence
  };
}

module.exports = {
  evaluateGeneration
};
