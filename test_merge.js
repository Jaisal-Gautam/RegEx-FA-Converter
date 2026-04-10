import fs from 'fs';

let _counter = 0;
function newState() { return { id: _counter++, transitions: [] }; }
function addTrans(f, t, s) { f.transitions.push({ to: t, symbol: s }); }
function makeNFA(start, accept) { return { start, accept }; }

function nfaLiteral(c) {
  const s = newState(), a = newState();
  addTrans(s, a, c);
  return makeNFA(s, a);
}

function nfaConcat(n1, n2) {
  const visited = new Set();
  const redirect = (s) => {
    if (visited.has(s.id)) return;
    visited.add(s.id);
    s.transitions.forEach(t => {
      if (t.to === n1.accept) t.to = n2.start;
      redirect(t.to);
    });
  };
  redirect(n1.start);
  return makeNFA(n1.start, n2.accept);
}

function bfsPrint(s) {
    const visited = new Set();
    const q = [s];
    visited.add(s.id);
    while (q.length) {
        const u = q.shift();
        console.log(`State ${u.id}: ` + u.transitions.map(t => `--${t.symbol}--> ${t.to.id}`).join(', '));
        u.transitions.forEach(t => {
            if (!visited.has(t.to.id)) {
                visited.add(t.to.id);
                q.push(t.to);
            }
        });
    }
}

const n1 = nfaLiteral('a');
const n2 = nfaLiteral('b');
const n3 = nfaConcat(n1, n2);
bfsPrint(n3.start);
