import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  compileRegex,
  compileRegexWithSteps,
  collectStates,
  flattenTransitions,
  extractAlphabet,
} from "../utils/thompson";
import { subsetConstruction, simulateDFA, simulateNFA } from "../utils/subset";
import { layoutNFA, layoutDFA, layoutSubNFA } from "../utils/layout";

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

/**
 * Post-processes construction steps to remap internal IDs to BFS-ordered labels (q0, q1, ...).
 * This ensures the sidebar text and graph highlights are in sync.
 */
function remapConstructionSteps(steps, labelMap) {
  const getMappedNum = (id) => {
    const label = labelMap.get(id);
    if (!label) return id;
    const num = parseInt(label.replace('q', ''), 10);
    return isNaN(num) ? id : num;
  };

  return steps.map(step => {
    const newStep = { ...step };

    const remapSnapshot = (snap) => {
      if (!snap) return snap;
      const states = (snap.states || []).map(s => ({
        ...s,
        id: getMappedNum(s.id),
        label: labelMap.get(s.id) || `q${s.id}`
      }));
      const transitions = (snap.transitions || []).map(t => ({
        ...t,
        from: getMappedNum(t.from),
        to: getMappedNum(t.to)
      }));
      return {
        ...snap,
        states,
        transitions,
        startId: getMappedNum(snap.startId),
        acceptId: getMappedNum(snap.acceptId),
        // Some snapshots might have acceptIds as array
        acceptIds: snap.acceptIds ? (Array.isArray(snap.acceptIds) ? snap.acceptIds.map(getMappedNum) : snap.acceptIds) : undefined
      };
    };

    if (newStep.resultSnapshot) newStep.resultSnapshot = remapSnapshot(newStep.resultSnapshot);
    if (newStep.stackSnapshot) {
      // stackSnapshot is an object with states and transitions arrays
      newStep.stackSnapshot = remapSnapshot(newStep.stackSnapshot);
    }

    if (newStep.connections) {
      newStep.connections = newStep.connections.map(conn => {
        let desc = conn.desc;
        if (desc) {
          desc = desc.replace(/q(\d+)/g, (match, idStr) => {
            const id = parseInt(idStr, 10);
            return labelMap.get(id) || match;
          });
        }
        return {
          ...conn,
          from: getMappedNum(conn.from),
          to: getMappedNum(conn.to),
          desc
        };
      });
    }

    return newStep;
  });
}



// Default interval is 800ms
const DEFAULT_ANIM_INTERVAL_MS = 800;

export function useAutomaton(initialRegex = "") {
  const [regexVal, setRegexVal] = useState(initialRegex);
  const [error, setError] = useState("");
  const [animInterval, setAnimInterval] = useState(DEFAULT_ANIM_INTERVAL_MS);

  // NFA
  const [nfaSvgData, setNfaSvgData] = useState(null);
  const [nfaTableData, setNfaTableData] = useState(null);
  const [nfaStats, setNfaStats] = useState(null);
  const [postfix, setPostfix] = useState([]);
  const [alphabet, setAlphabet] = useState([]);
  const [rawNFA, setRawNFA] = useState(null);

  // Construction steps for step-by-step builder
  const [constructionSteps, setConstructionSteps] = useState([]);
  const [builderStep, setBuilderStep] = useState(0);

  const [dfaConstructionSteps, setDfaConstructionSteps] = useState([]);
  const [dfaBuilderStep, setDfaBuilderStep] = useState(0);

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

  // Animation — advances builderStep automatically on interval
  const [isAnimating, setIsAnimating] = useState(false);
  const [animIsDFA, setAnimIsDFA] = useState(false); // which type is animating

  const timerRef = useRef(null);

  /** Start the step-by-step animation for the given step sequence */
  const runAnimation = useCallback((stepsCount, isDFA, setter, onDone) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setIsAnimating(true);
    setAnimIsDFA(isDFA);
    setter(0);

    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      if (idx >= stepsCount) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setter(stepsCount - 1);
        setIsAnimating(false);
        onDone?.();
        return;
      }
      setter(idx);
    }, animInterval);
  }, [animInterval]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  /** Stop animation */
  const goToStep = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // ── Build NFA ────────────────────────────────────────────────────────────
  const buildNFA = useCallback(() => {
    setError("");
    setDfaSvgData(null);
    setDfaRaw(null);
    setDfaStats(null);
    setDfaHighlight(null);
    setSimResult(null);
    setIsAnimating(false);

    if (!regexVal.trim()) {
      setNfaSvgData(null);
      setRawNFA(null);
      return;
    }

    try {
      const { nfa, postfix: pf, constructionSteps: cSteps } = compileRegexWithSteps(regexVal);
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
      
      const syncedSteps = remapConstructionSteps(cSteps, labelMap);
      setConstructionSteps(syncedSteps);
      setBuilderStep(syncedSteps.length > 0 ? syncedSteps.length - 1 : 0);

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

      // Step 0 is not needed manually, runAnimation does it.
      if (syncedSteps.length > 0) {
        runAnimation(syncedSteps.length, false, setBuilderStep);
      } else {
        setBuilderStep(0);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [regexVal, runAnimation]);

  // ── Convert to DFA ───────────────────────────────────────────────────────
  const buildDFA = useCallback(() => {
    if (!rawNFA) return;
    setIsAnimating(false);

    const { nfa, states } = rawNFA;
    const { dfaStates, dfaTrans, dfaSteps } = subsetConstruction(
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
    
    // Convert dfaSteps into renderable snapshots by tagging them with the full pos map
    const layoutDfaSteps = dfaSteps.map((step) => ({
      ...step,
      resultSnapshot: {
        ...step.resultSnapshot,
        pos,
        startId: 0,
        acceptIds: new Set(step.resultSnapshot.states.filter((s) => s.isAccept).map((s) => s.id))
      }
    }));
    
    // Post-process DFA steps to use mapped NFA labels
    const nfaLabelMap = rawNFA.labelMap;
    const getMappedNum = (id) => {
      const label = nfaLabelMap.get(id);
      if (!label) return id;
      const num = parseInt(label.replace('q', ''), 10);
      return isNaN(num) ? id : num;
    };

    const syncedDfaSteps = layoutDfaSteps.map(step => ({
      ...step,
      movedIds: step.movedIds ? step.movedIds.map(getMappedNum) : [],
      closureIds: step.closureIds ? step.closureIds.map(getMappedNum) : [],
    }));

    setDfaConstructionSteps(syncedDfaSteps);
    if (syncedDfaSteps.length > 0) {
      runAnimation(syncedDfaSteps.length, true, setDfaBuilderStep);
    } else {
      setDfaBuilderStep(0);
    }
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

  // Build on first render - disabled to remove preloaded input
  /*
  useEffect(() => {
    buildNFA();
  }, []); // eslint-disable-line
  */

  // ── Track previous snapshot for step-change animation ──────────────────────
  const prevBuilderStepRef = useRef(-1)
  const prevDfaBuilderStepRef = useRef(-1)
  const prevSnapshotRef    = useRef(null)
  const prevDfaSnapshotRef = useRef(null)

  const liveNfaSvgData = useMemo(() => {
    // Step builder rendering
    if (activeTab === "nfa" && constructionSteps.length > 0) {
      if (builderStep < constructionSteps.length - 1) {
        const step = constructionSteps[builderStep];
        const snapshot = step.stackSnapshot;
        if (snapshot && snapshot.states.length > 0) {
          const pos = layoutSubNFA(snapshot.states, snapshot.transitions, snapshot.startIds);
          const acceptIds = new Set(snapshot.acceptIds);

          // Determine which state IDs and transition keys are new this step
          const prevSnap = prevSnapshotRef.current
          const prevStateIds = prevSnap ? new Set(prevSnap.states.map(s => s.id)) : new Set()
          const newStateIds  = new Set(snapshot.states.filter(s => !prevStateIds.has(s.id)).map(s => s.id))

          // Transition key = `${from}-${to}-${symbol}`
          const prevTransKeys = prevSnap
            ? new Set(prevSnap.transitions.map(t => `${t.from}-${t.to}-${t.symbol}`))
            : new Set()
          const newTransKeys = new Set(
            snapshot.transitions
              .filter(t => !prevTransKeys.has(`${t.from}-${t.to}-${t.symbol}`))
              .map(t => `${t.from}-${t.to}-${t.symbol}`)
          )

          // Save snapshot for the NEXT diff (only when step changes)
          if (prevBuilderStepRef.current !== builderStep) {
            prevBuilderStepRef.current = builderStep
            prevSnapshotRef.current    = snapshot
          }

          return {
            ...nfaSvgData,
            activeNodeIds: new Set(snapshot.states.map(s => s.id)),
            activeTransKeys: new Set(snapshot.transitions.map(t => `${t.from}-${t.to}-${t.symbol}`)),
            newStateIds,
            newTransKeys,
            activeSymbol: step.token?.type === 'char' ? step.token.val : 'ε',
            activeRowId: step.connections?.[0]?.from,
            animKey: builderStep,   // signal to AutomatonSVG to re-trigger animation
          };
        }
      }
    }
    
    return nfaSvgData; // Final complete NFA
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, constructionSteps, builderStep, nfaSvgData, rawNFA]);

  const liveDfaSvgData = useMemo(() => {
    if (activeTab === "dfa" && dfaConstructionSteps.length > 0) {
      if (dfaBuilderStep < dfaConstructionSteps.length - 1) {
        const step = dfaConstructionSteps[dfaBuilderStep];
        const snapshot = step.resultSnapshot;
        if (snapshot && snapshot.states.length > 0) {
          const prevSnap = prevDfaSnapshotRef.current
          const prevStateIds = prevSnap ? new Set(prevSnap.states.map(s => s.id)) : new Set()
          const newStateIds  = new Set(snapshot.states.filter(s => !prevStateIds.has(s.id)).map(s => s.id))
          
          const prevTransKeys = prevSnap
            ? new Set(prevSnap.transitions.map(t => `${t.from}-${t.to}-${t.symbol}`))
            : new Set()
          const newTransKeys = new Set(
            snapshot.transitions
              .filter(t => !prevTransKeys.has(`${t.from}-${t.to}-${t.symbol}`))
              .map(t => `${t.from}-${t.to}-${t.symbol}`)
          )

          if (prevDfaBuilderStepRef.current !== dfaBuilderStep) {
            prevDfaBuilderStepRef.current = dfaBuilderStep
            prevDfaSnapshotRef.current    = snapshot
          }

          return {
            ...dfaSvgData,
            activeNodeIds: new Set(snapshot.states.map(s => s.id)),
            activeTransKeys: new Set(snapshot.transitions.map(t => `${t.from}-${t.to}-${t.symbol}`)),
            newStateIds,
            newTransKeys,
            activeSymbol: step.symbol,
            activeRowId: step.fromDfaState,
            animKey: `dfa-${dfaBuilderStep}`,
          };
        }
      }
    }

    return dfaSvgData;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dfaConstructionSteps, dfaBuilderStep, dfaSvgData]);

  // Table data to show in the canvas overlay — mirrors the current animation frame or builder step
  const liveNfaTableData = (() => {
    if (activeTab === "nfa" && constructionSteps.length > 0 && builderStep < constructionSteps.length - 1) {
      const step = constructionSteps[builderStep];
      const snapshot = step.stackSnapshot;
      if (snapshot && snapshot.states.length > 0) {
         return {
           states: snapshot.states,
           transitions: snapshot.transitions,
         };
      }
    }

    return nfaTableData;
  })();

  // For the DFA overlay table, CanvasPanel passes tableData → MiniDFATable({dfaData})
  // which expects { dfaStates, dfaTrans }, so we reshape the animation frame accordingly.
  const liveDfaTableData = (() => {
    if (activeTab === "dfa" && dfaConstructionSteps.length > 0 && dfaBuilderStep < dfaConstructionSteps.length - 1) {
      const step = dfaConstructionSteps[dfaBuilderStep];
      if (step && step.resultSnapshot) {
        return {
          dfaStates: step.resultSnapshot.states.map((s) => ({
            ...s,
            nfaStates: s.nfaStates || [],
          })),
          dfaTrans: step.resultSnapshot.transitions,
        };
      }
    }
    return dfaRaw;
  })();

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
    setIsAnimating(false);
    setConstructionSteps([]);
    setBuilderStep(0);
    setDfaConstructionSteps([]);
    setDfaBuilderStep(0);
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
    animStep: animIsDFA ? dfaBuilderStep : builderStep,
    totalAnimSteps: animIsDFA ? dfaConstructionSteps.length : constructionSteps.length,
    hasNFA: !!rawNFA,
    hasDFA: !!dfaRaw,
    nfaLabelMap: rawNFA?.labelMap ?? null,
    goToStep,
    constructionSteps,
    builderStep,
    setBuilderStep,
    dfaConstructionSteps,
    dfaBuilderStep,
    setDfaBuilderStep,
    animInterval,
    setAnimInterval,
  };
}
