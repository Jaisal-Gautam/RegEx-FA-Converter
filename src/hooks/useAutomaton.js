import { useState, useCallback, useEffect, useRef } from "react";
import {
  compileRegex,
  collectStates,
  flattenTransitions,
  extractAlphabet,
} from "../utils/thompson";
import { subsetConstruction, simulateDFA, simulateNFA } from "../utils/subset";
import { layoutNFA, layoutDFA } from "../utils/layout";

/**
 * Build an array of incremental NFA frames (one new state revealed per frame).
 * Each frame is a full svgData-shaped object ready to pass to CanvasPanel.
 */

/**
 * Compute a stable display-label map: BFS from startId, assign q0, q1, q2…
 * Returns a Map<internalId, displayLabel>.
 */
function buildLabelMap(states, startId) {
  const map = new Map()
  const order = []
  const visited = new Set()
  const queue = [startId]
  visited.add(startId)
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    const s = states.find(s => s.id === id)
    if (s) {
      s.transitions.forEach(t => {
        if (!visited.has(t.to.id)) {
          visited.add(t.to.id)
          queue.push(t.to.id)
        }
      })
    }
  }
  // any states not reachable (shouldn't happen) get appended
  states.forEach(s => { if (!visited.has(s.id)) order.push(s.id) })
  order.forEach((id, i) => map.set(id, `q${i}`))
  return map
}

function buildNFAFrames(states, transitions, pos, acceptIds, startId) {
  const labelMap = buildLabelMap(states, startId)
  return states.map((_, i) => {
    const visibleStates = states.slice(0, i + 1);
    const visibleIds = new Set(visibleStates.map((s) => s.id));
    return {
      states: visibleStates.map((s) => ({ ...s, label: labelMap.get(s.id) ?? `q${s.id}` })),
      transitions: transitions.filter(
        (t) => visibleIds.has(t.from) && visibleIds.has(t.to),
      ),
      pos,
      startId,
      acceptIds,
    };
  });
}

/**
 * Build an array of incremental DFA frames (one new DFA state revealed per frame).
 */
function buildDFAFrames(dfaStates, dfaTrans, pos, acceptIds) {
  return dfaStates.map((_, i) => {
    const visibleStates = dfaStates.slice(0, i + 1);
    const visibleIds = new Set(visibleStates.map((s) => s.id));
    return {
      states: visibleStates.map((s) => ({ ...s, label: `D${s.id}` })),
      transitions: dfaTrans.filter(
        (t) => visibleIds.has(t.from) && visibleIds.has(t.to),
      ),
      pos,
      startId: 0,
      acceptIds,
    };
  });
}

const ANIM_INTERVAL_MS = 600; // ms per step — slow enough to follow

export function useAutomaton(initialRegex = "") {
  const [regexVal, setRegexVal] = useState(initialRegex);
  const [error, setError] = useState("");

  // NFA
  const [nfaSvgData, setNfaSvgData] = useState(null);
  const [nfaTableData, setNfaTableData] = useState(null);
  const [nfaStats, setNfaStats] = useState(null);
  const [postfix, setPostfix] = useState([]);
  const [alphabet, setAlphabet] = useState([]);
  const [rawNFA, setRawNFA] = useState(null);

  // DFA
  const [dfaSvgData, setDfaSvgData] = useState(null);
  const [dfaRaw, setDfaRaw] = useState(null);
  const [dfaStats, setDfaStats] = useState(null);
  const [dfaHighlight, setDfaHighlight] = useState(null);

  // Simulation
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState("nfa");

  // Animation — frames are full svgData objects; step advances on interval
  const [animFrames, setAnimFrames] = useState([]); // all frames
  const [animStep, setAnimStep] = useState(0); // current frame index
  const [isAnimating, setIsAnimating] = useState(false);
  const [animIsDFA, setAnimIsDFA] = useState(false); // which type is animating

  const timerRef = useRef(null);

  /** Start the frame-by-frame animation for the given frames array */
  const runAnimation = useCallback((frames, isDFA, onDone) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setAnimFrames(frames);
    setAnimStep(0);
    setIsAnimating(true);
    setAnimIsDFA(isDFA);

    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      if (idx >= frames.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setAnimStep(frames.length - 1);
        setIsAnimating(false);
        onDone?.();
        return;
      }
      setAnimStep(idx);
    }, ANIM_INTERVAL_MS);
  }, []);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  /** Pause animation & jump to a specific frame */
  const goToStep = useCallback((stepIdx, isDfaStep = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // If jumping to the final state, end the animation phase naturally
    if (animFrames.length > 0 && stepIdx >= animFrames.length - 1) {
      setIsAnimating(false);
      setAnimStep(animFrames.length - 1);
    } else {
      setIsAnimating(true);
      setAnimStep(stepIdx);
    }
    setAnimIsDFA(isDfaStep);
  }, [animFrames]);

  // ── Build NFA ────────────────────────────────────────────────────────────
  const buildNFA = useCallback(() => {
    setError("");
    setDfaSvgData(null);
    setDfaRaw(null);
    setDfaStats(null);
    setDfaHighlight(null);
    setSimResult(null);
    setAnimFrames([]);
    setIsAnimating(false);

    if (!regexVal.trim()) {
      setNfaSvgData(null);
      setRawNFA(null);
      return;
    }

    try {
      const { nfa, postfix: pf } = compileRegex(regexVal);
      const states = collectStates(nfa.start);
      const allTrans = flattenTransitions(states);
      const alpha = extractAlphabet(allTrans);
      const acceptIds = new Set(
        states.filter((s) => s.isAccept).map((s) => s.id),
      );
      const pos = layoutNFA(states, nfa.start.id);
      const labelMap = buildLabelMap(states, nfa.start.id);

      setPostfix(pf);
      setAlphabet(alpha);
      setRawNFA({ nfa, states, allTrans, labelMap });

      const finalSvg = {
        states: states.map((s) => ({ ...s, label: labelMap.get(s.id) ?? `q${s.id}` })),
        transitions: allTrans,
        pos,
        startId: nfa.start.id,
        acceptIds,
      };
      setNfaSvgData(finalSvg);
      setNfaTableData({ states, transitions: allTrans, labelMap });
      setNfaStats({
        states: states.length,
        trans: allTrans.length,
        eps: allTrans.filter((t) => t.symbol === "ε").length,
        alpha: alpha.join(", ") || "—",
      });
      setActiveTab("nfa");

      // Animate frame-by-frame in the main canvas
      const frames = buildNFAFrames(
        states,
        allTrans,
        pos,
        acceptIds,
        nfa.start.id,
      );
      runAnimation(frames, false, () => {});
    } catch (e) {
      setError(e.message);
    }
  }, [regexVal, runAnimation]);

  // ── Convert to DFA ───────────────────────────────────────────────────────
  const buildDFA = useCallback(() => {
    if (!rawNFA) return;
    setAnimFrames([]);
    setIsAnimating(false);

    const { nfa, states } = rawNFA;
    const { dfaStates, dfaTrans } = subsetConstruction(
      nfa.start,
      states,
      alphabet,
    );
    const acceptIds = new Set(
      dfaStates.filter((s) => s.isAccept).map((s) => s.id),
    );
    const pos = layoutDFA(dfaStates, dfaTrans);

    setDfaRaw({ dfaStates, dfaTrans });
    setDfaSvgData({
      states: dfaStates.map((s) => ({ ...s, label: `D${s.id}` })),
      transitions: dfaTrans,
      pos,
      startId: 0,
      acceptIds,
    });
    setDfaStats({ states: dfaStates.length });
    setDfaHighlight(null);
    setActiveTab("dfa");

    // Animate frame-by-frame in the main canvas
    const frames = buildDFAFrames(dfaStates, dfaTrans, pos, acceptIds);
    runAnimation(frames, true, () => {});
  }, [rawNFA, alphabet, runAnimation]);

  // ── Simulate ─────────────────────────────────────────────────────────────
  const runSimulate = useCallback(() => {
    if (!rawNFA) return;
    if (dfaRaw) {
      const { accepted, path } = simulateDFA(
        dfaRaw.dfaStates,
        dfaRaw.dfaTrans,
        simInput,
      );
      setDfaHighlight(path);
      setSimResult({ accepted, text: simInput });
      setActiveTab("dfa");
    } else {
      const { accepted } = simulateNFA(
        rawNFA.nfa.start,
        rawNFA.states,
        simInput,
      );
      setSimResult({ accepted, text: simInput });
    }
  }, [rawNFA, dfaRaw, simInput]);

  // Build on first render
  useEffect(() => {
    buildNFA();
  }, []); // eslint-disable-line

  // The "live" SVG to render — during animation show the current frame;
  // otherwise show the full final diagram.
  const liveNfaSvgData =
    isAnimating && !animIsDFA && animFrames.length > 0
      ? animFrames[animStep]
      : nfaSvgData;

  const liveDfaSvgData =
    isAnimating && animIsDFA && animFrames.length > 0
      ? animFrames[animStep]
      : dfaSvgData;

  // Table data to show in the canvas overlay — mirrors the current animation frame
  const liveNfaTableData =
    isAnimating && !animIsDFA && animFrames.length > 0
      ? {
          states: animFrames[animStep].states,
          transitions: animFrames[animStep].transitions,
        }
      : nfaTableData;

  // For the DFA overlay table, CanvasPanel passes tableData → MiniDFATable({dfaData})
  // which expects { dfaStates, dfaTrans }, so we reshape the animation frame accordingly.
  const liveDfaTableData =
    isAnimating && animIsDFA && animFrames.length > 0
      ? {
          dfaStates: animFrames[animStep].states.map((s) => ({
            ...s,
            nfaStates: s.nfaStates || [],
          })),
          dfaTrans: animFrames[animStep].transitions,
        }
      : dfaRaw;

  // Clear previously generated FAs whenever the user edits the regex string
  const handleRegexChange = useCallback((newRegex) => {
    setRegexVal(newRegex);
    setError("");
    setNfaSvgData(null);
    setRawNFA(null);
    setDfaSvgData(null);
    setDfaRaw(null);
    setDfaStats(null);
    setNfaStats(null);
    setPostfix([]);
    setAnimFrames([]);
    setIsAnimating(false);
  }, []);

  return {
    regexVal,
    setRegexVal: handleRegexChange,
    error,
    buildNFA,
    buildDFA,
    runSimulate,
    // Live (possibly animated) SVG data
    nfaSvgData: liveNfaSvgData,
    dfaSvgData: liveDfaSvgData,
    // Table data
    nfaTableData,
    dfaRaw,
    // Live table data for overlay
    liveNfaTableData,
    liveDfaTableData,
    nfaStats,
    postfix,
    alphabet,
    dfaStats,
    dfaHighlight,
    simInput,
    setSimInput,
    simResult,
    activeTab,
    setActiveTab,
    isAnimating,
    animIsDFA,
    animStep,
    totalAnimSteps: animFrames.length,
    hasNFA: !!rawNFA,
    hasDFA: !!dfaRaw,
    nfaLabelMap: rawNFA?.labelMap ?? null,
    goToStep,
  };
}
