// EXP-0015 Audit Suite 04: Conversation Breakpoint Search (T1 to T40)
const fs = require('fs');
const path = require('path');
const { askGateway } = require('./audit_harness_common');

const session40Turns = [
  { turn: 1, q: 'What is React useEffect hook used for?', expected_topic: 'useEffect', target_module: 'React Hooks Tutorial' },
  { turn: 2, q: 'How does the cleanup function work in it?', expected_topic: 'cleanup', target_module: 'React Hooks Tutorial' },
  { turn: 3, q: 'When exactly does it get called?', expected_topic: 'cleanup timing', target_module: 'React Hooks Tutorial' },
  { turn: 4, q: 'Can you show an example of cancelling a subscription with it?', expected_topic: 'subscription cleanup', target_module: 'React Hooks Tutorial' },
  { turn: 5, q: 'What happens if I forget to return it?', expected_topic: 'memory leak', target_module: 'React Hooks Tutorial' },
  { turn: 6, q: 'Does it cause memory leaks in production?', expected_topic: 'memory leak', target_module: 'React Hooks Tutorial' },
  { turn: 7, q: 'How does this compare to the unmount lifecycle in class components?', expected_topic: 'componentWillUnmount', target_module: 'React Hooks Tutorial' },
  { turn: 8, q: 'Can I use async functions directly inside it?', expected_topic: 'async effect', target_module: 'React Hooks Tutorial' },
  { turn: 9, q: 'Why does that return a Promise and break it?', expected_topic: 'promise cleanup bug', target_module: 'React Hooks Tutorial' },
  { turn: 10, q: 'How should I structure the async call instead to fix it?', expected_topic: 'inner async function', target_module: 'React Hooks Tutorial' },
  { turn: 11, q: 'What about state variables used inside it?', expected_topic: 'effect dependencies', target_module: 'React Hooks Tutorial' },
  { turn: 12, q: 'Do they need to be listed in the dependency array?', expected_topic: 'dependency array', target_module: 'React Hooks Tutorial' },
  { turn: 13, q: 'What happens if I omit them?', expected_topic: 'stale closure', target_module: 'React Hooks Tutorial' },
  { turn: 14, q: 'Does it create a stale closure?', expected_topic: 'stale closure', target_module: 'React Hooks Tutorial' },
  { turn: 15, q: 'How does that affect the component rendered output?', expected_topic: 'outdated render', target_module: 'React Hooks Tutorial' },
  { turn: 16, q: 'Can useRef help avoid this issue?', expected_topic: 'useRef mutable value', target_module: 'React Hooks Tutorial' },
  { turn: 17, q: 'Why does updating its .current property avoid causing a re-render?', expected_topic: 'useRef no re-render', target_module: 'React Hooks Tutorial' },
  { turn: 18, q: 'Where is that value stored across renders?', expected_topic: 'fiber node ref', target_module: 'React Hooks Tutorial' },
  { turn: 19, q: 'Can I use it to hold a DOM node reference too?', expected_topic: 'DOM reference', target_module: 'React Hooks Tutorial' },
  { turn: 20, q: 'How do I focus an input using it?', expected_topic: 'input.focus()', target_module: 'React Hooks Tutorial' },
  { turn: 21, q: 'What if the element hasn\'t mounted yet when I access it?', expected_topic: 'null ref check', target_module: 'React Hooks Tutorial' },
  { turn: 22, q: 'Will it be null?', expected_topic: 'null ref', target_module: 'React Hooks Tutorial' },
  { turn: 23, q: 'How does useCallback interact with all of this?', expected_topic: 'useCallback', target_module: 'React Hooks Tutorial' },
  { turn: 24, q: 'Does it prevent child components from re-rendering?', expected_topic: 'prevent child re-render', target_module: 'React Hooks Tutorial' },
  { turn: 25, q: 'Only if the child is wrapped in React.memo, right?', expected_topic: 'React.memo', target_module: 'React Hooks Tutorial' },
  { turn: 26, q: 'Why does passing an inline arrow function defeat that?', expected_topic: 'reference equality break', target_module: 'React Hooks Tutorial' },
  { turn: 27, q: 'How does reference equality explain it?', expected_topic: 'reference equality', target_module: 'React Hooks Tutorial' },
  { turn: 28, q: 'What about useMemo?', expected_topic: 'useMemo', target_module: 'React Hooks Tutorial' },
  { turn: 29, q: 'When should I choose that instead of the former?', expected_topic: 'useMemo vs useCallback', target_module: 'React Hooks Tutorial' },
  { turn: 30, q: 'Is calculating filtered lists an example of it?', expected_topic: 'expensive calculation', target_module: 'React Hooks Tutorial' },
  { turn: 31, q: 'Does it run during rendering or after paint?', expected_topic: 'render time execution', target_module: 'React Hooks Tutorial' },
  { turn: 32, q: 'How is that different from the first hook we discussed?', expected_topic: 'useMemo vs useEffect timing', target_module: 'React Hooks Tutorial' },
  { turn: 33, q: 'Can you summarize the performance trade-offs between them?', expected_topic: 'hook trade-offs', target_module: 'React Hooks Tutorial' },
  { turn: 34, q: 'What happens if their dependencies change on every render?', expected_topic: 'unstable dependencies', target_module: 'React Hooks Tutorial' },
  { turn: 35, q: 'Does that make the memoization useless?', expected_topic: 'useless memoization', target_module: 'React Hooks Tutorial' },
  { turn: 36, q: 'How do custom hooks encapsulate them?', expected_topic: 'custom hooks', target_module: 'React Hooks Tutorial' },
  { turn: 37, q: 'Do custom hooks share state between component instances?', expected_topic: 'isolated state in custom hooks', target_module: 'React Hooks Tutorial' },
  { turn: 38, q: 'Why does each instance get its own copy of it?', expected_topic: 'independent state', target_module: 'React Hooks Tutorial' },
  { turn: 39, q: 'If I want to share it globally, what should I use instead?', expected_topic: 'global state / Context API', target_module: 'React Hooks Tutorial' },
  { turn: 40, q: 'Can useContext solve that?', expected_topic: 'useContext', target_module: 'React Hooks Tutorial' }
];

async function runConversationBreakpointAudit() {
  console.log('================================================================');
  console.log('  RUNNING EXP-0015 SUITE 04: 40-TURN CONVERSATION BREAKPOINT AUDIT');
  console.log('================================================================\n');

  const history = [];
  const turnResults = [];
  const sessionId = 'audit_breakpoint_' + Date.now();

  let firstDegradedTurn = null;
  let firstWrongRetrieval = null;
  let firstWrongEntity = null;
  let firstUnsupportedAnswer = null;

  for (let i = 0; i < session40Turns.length; i++) {
    const item = session40Turns[i];
    process.stdout.write(`[Turn ${item.turn}/40] "${item.q.substring(0, 45)}" ... `);

    // Call askGateway with rolling conversation history
    const res = await askGateway(item.q, {
      session_id: sessionId,
      history: history.slice(-6) // Standard sliding window
    });

    const topDoc = res.sources && res.sources[0] ? res.sources[0].title : 'none';
    const topContent = res.sources && res.sources[0] ? res.sources[0].content : '';
    const retrievedExpected = topDoc.toLowerCase().includes('react');

    let turnStatus = 'ACCURATE';
    if (!retrievedExpected || res.abstain) {
      turnStatus = 'DEGRADED_RETRIEVAL';
      if (!firstWrongRetrieval) firstWrongRetrieval = item.turn;
      if (!firstDegradedTurn) firstDegradedTurn = item.turn;
    } else if (res.confidence < 0.40) {
      turnStatus = 'LOW_CONFIDENCE';
      if (!firstDegradedTurn) firstDegradedTurn = item.turn;
    }

    console.log(`${turnStatus} (${res.latency}ms, Top: "${topDoc}", Conf: ${res.confidence})`);

    // Append to conversation history
    history.push({ role: 'user', content: item.q });
    history.push({ role: 'assistant', content: res.answer ? res.answer.substring(0, 200) : '' });

    turnResults.push({
      turn: item.turn,
      query: item.q,
      expected_topic: item.expected_topic,
      retrieved_top_doc: topDoc,
      confidence: res.confidence,
      abstain: res.abstain,
      latency: res.latency,
      status: turnStatus,
      answer_snippet: res.answer ? res.answer.substring(0, 150) : ''
    });
  }

  const summary = {
    total_turns: session40Turns.length,
    first_degraded_turn: firstDegradedTurn,
    first_wrong_retrieval: firstWrongRetrieval,
    first_wrong_entity: firstWrongEntity,
    first_unsupported_answer: firstUnsupportedAnswer,
    turn_breakdown: {
      turns_1_to_10_accuracy_pct: Number(((turnResults.slice(0, 10).filter(t => t.status === 'ACCURATE').length / 10) * 100).toFixed(1)),
      turns_11_to_20_accuracy_pct: Number(((turnResults.slice(10, 20).filter(t => t.status === 'ACCURATE').length / 10) * 100).toFixed(1)),
      turns_21_to_30_accuracy_pct: Number(((turnResults.slice(20, 30).filter(t => t.status === 'ACCURATE').length / 10) * 100).toFixed(1)),
      turns_31_to_40_accuracy_pct: Number(((turnResults.slice(30, 40).filter(t => t.status === 'ACCURATE').length / 10) * 100).toFixed(1))
    },
    turns: turnResults
  };

  const outPath = path.resolve('D:/Collage project/EduConnect-LMS-Experimental/tests/rag/audit_exp0015/results_suite_04_conversation_breakpoint.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('\n================================================================');
  console.log('EXP-0015 Suite 04 Conversation Breakpoint Audit Complete:');
  console.log(`  Total Turns Evaluated: 40`);
  console.log(`  First Degraded Turn: ${firstDegradedTurn || 'None'}`);
  console.log(`  First Wrong Retrieval: ${firstWrongRetrieval || 'None'}`);
  console.log(`  Turns 1-10 Accuracy: ${summary.turn_breakdown.turns_1_to_10_accuracy_pct}%`);
  console.log(`  Turns 11-20 Accuracy: ${summary.turn_breakdown.turns_1_to_20_accuracy_pct}%`);
  console.log(`  Turns 21-30 Accuracy: ${summary.turn_breakdown.turns_21_to_30_accuracy_pct}%`);
  console.log(`  Turns 31-40 Accuracy: ${summary.turn_breakdown.turns_31_to_40_accuracy_pct}%`);
  console.log(`  Results written to: ${outPath}`);
  console.log('================================================================\n');
}

runConversationBreakpointAudit().catch(console.error);
