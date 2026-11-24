// Sokoban rules and the BFS / DFS solver. No DOM code here, so it also runs in Node (see test.js).
const DIRS = [[0, -1, 'u'], [1, 0, 'r'], [0, 1, 'd'], [-1, 0, 'l']];

// Turns the text map into flat arrays. A cell (x, y) has index y * W + x.
function parseLevel(rows) {
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const wall = new Uint8Array(W * H), goal = new Uint8Array(W * H), inside = new Uint8Array(W * H);
  const boxes = []; let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < W; x++) {
      const ch = row[x] || ' ', i = y * W + x;
      if (ch === '#') wall[i] = 1;
      if (ch === '.' || ch === '*' || ch === '+') goal[i] = 1;
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
  });
  const q = [player]; inside[player] = 1;            // flood fill: which cells belong to the room
  while (q.length) {
    const u = q.pop();
    for (const [dx, dy] of DIRS) {
      const x = u % W + dx, y = ((u / W) | 0) + dy, n = y * W + x;
      if (x >= 0 && y >= 0 && x < W && y < H && !wall[n] && !inside[n]) { inside[n] = 1; q.push(n); }
    }
  }
  return { W, H, wall, goal, inside, boxes: boxes.sort((a, b) => a - b), player };
}

const isWin = (L, s) => s.b.every(i => L.goal[i]);

// One move in direction k (0..3 = up, right, down, left). Returns the new state or null if blocked.
// State = { p: player cell, b: sorted list of crate cells }.
function step(L, s, k, dead) {
  const [dx, dy] = DIRS[k], W = L.W, x = s.p % W + dx, y = ((s.p / W) | 0) + dy;
  if (x < 0 || y < 0 || x >= W || y >= L.H) return null;
  const n = y * W + x;
  if (L.wall[n] || !L.inside[n]) return null;
  const bi = s.b.indexOf(n);
  let b = s.b, push = false;
  if (bi >= 0) {                                       // a crate is in the way: try to push it
    const x2 = x + dx, y2 = y + dy;
    if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= L.H) return null;
    const c = y2 * W + x2;
    if (!L.inside[c] || L.wall[c] || s.b.includes(c) || (dead && dead[c])) return null;
    b = s.b.slice(); b[bi] = c; b.sort((p, q) => p - q); push = true;
  }
  return { p: n, b, push };
}

// Pull distances: for every cell, the fewest pushes a lone crate needs to reach a goal (walls and other crates ignored).
// Found by a reverse BFS that starts at the goals and "pulls" a crate backwards. -1 means a dead square:
// a crate standing there can never reach any goal.
function pullDistances(L) {
  const dist = new Int32Array(L.W * L.H).fill(-1), q = [];
  L.goal.forEach((g, i) => { if (g) { dist[i] = 0; q.push(i); } });
  for (let h = 0; h < q.length; h++) {
    const u = q[h], ux = u % L.W, uy = (u / L.W) | 0;
    for (const [dx, dy] of DIRS) {
      const bx = ux + 2 * dx, by = uy + 2 * dy;                      // crate moves to a, player stands on b
      if (bx < 0 || by < 0 || bx >= L.W || by >= L.H) continue;
      const a = (uy + dy) * L.W + ux + dx, b = by * L.W + bx;
      if (!L.wall[a] && !L.wall[b] && dist[a] < 0) { dist[a] = dist[u] + 1; q.push(a); }
    }
  }
  return dist;
}
const deadSquares = L => Array.from(pullDistances(L), (v, i) => (!L.wall[i] && v < 0 ? 1 : 0));

// One search routine, two algorithms (Ch. 10). They differ only in which state they take out of the frontier next.
//   bfs = oldest first (queue)  -> the solution with the fewest moves
//   dfs = newest first (stack)  -> some solution, usually very long
// prune: refuse pushes onto dead squares. from: optional start state. A capital letter in the answer = a push.
function solve(L, algo = 'bfs', prune = false, from = null, limit = 400000) {
  if (!['bfs', 'dfs', 'push'].includes(algo)) throw new Error('Unknown algorithm');
  const t0 = performance.now();
  const dead = prune ? deadSquares(L) : null;
  const key = s => s.p + ':' + s.b.join(',');
  const start = from || { p: L.player, b: L.boxes };
  const root = { s: start, parent: null, move: '', cost: 0 };
  const frontier = [root], discovered = new Map([[key(start), 0]]);
  let head = 0, peak = 1, visited = 0, expanded = 0, generated = 1;
  // For push-optimal reference, use Dijkstra with integer cost 0 or 1.
  // Separate FIFO buckets avoid sorting the frontier on every iteration.
  const buckets = [[root]]; let bucket = 0, pending = 1;
  const size = () => algo === 'push' ? pending : frontier.length - head;
  function take() {
    if (algo === 'push') {
      while (pending && !buckets[bucket]?.length) bucket++;
      if (!pending) return null;
      pending--; return buckets[bucket].pop();
    }
    if (algo === 'dfs') return frontier.pop();
    if (head >= frontier.length) return null;
    const entry = frontier[head]; frontier[head++] = null;
    if (head >= 1024 && head * 2 >= frontier.length) { frontier.splice(0, head); head = 0; }
    return entry;
  }
  function add(entry) {
    if (algo === 'push') { (buckets[entry.cost] ||= []).push(entry); pending++; }
    else frontier.push(entry);
    peak = Math.max(peak, size());
  }
  const result = (status, entry = null) => {
    const path = [];
    for (let e = entry; e?.parent; e = e.parent) path.push(e.move);
    const moves = path.reverse().join('');
    return { status, solved: status === 'solved', limit: status === 'limit',
      moves, pushes: (moves.match(/[A-Z]/g) || []).length,
      visited, expanded, generated, discovered: discovered.size, explored: expanded,
      peak, ms: performance.now() - t0 };
  };
  for (let e; (e = take());) {
    if (algo === 'push' && discovered.get(key(e.s)) !== e.cost) continue;
    if (visited >= limit) return result('limit');
    visited++;
    if (isWin(L, e.s)) return result('solved', e);
    expanded++;
    for (let d = 0; d < DIRS.length; d++) {
      const n = step(L, e.s, d, dead);
      if (!n) continue;
      const nk = key(n), cost = e.cost + Number(n.push);
      if (discovered.has(nk) && (algo !== 'push' || discovered.get(nk) <= cost)) continue;
      discovered.set(nk, cost); generated++;
      add({ s: n, parent: e, move: n.push ? DIRS[d][2].toUpperCase() : DIRS[d][2], cost });
    }
  }
  return result('unsolved');
}

const SEARCH_RUNS = [['BFS', 'bfs', false], ['BFS + prune', 'bfs', true], ['DFS', 'dfs', false], ['DFS + prune', 'dfs', true]];
function benchmarkLevel(L, repeats = 30, limit = 400000) {
  const start = { p: L.player, b: L.boxes };
  const results = SEARCH_RUNS.map(([name, algo, prune]) => ({ name, algo, prune, samples: [], result: solve(L, algo, prune, start, limit) }));
  // Rotate execution order to reduce systematic warm-up/order effects.
  for (let i = 0; i < repeats; i++) {
    for (let j = 0; j < results.length; j++) {
      const row = results[(i + j) % results.length];
      row.result = solve(L, row.algo, row.prune, start, limit);
      row.samples.push(row.result.ms);
    }
  }
  return results.map(({samples, result, ...row}) => {
    const sorted = [...samples].sort((a,b) => a-b), n = sorted.length;
    const avg = samples.reduce((a,b) => a+b, 0) / n;
    return { ...row, ...result, repeats: n, avg, median: (sorted[Math.floor((n-1)/2)] + sorted[Math.floor(n/2)])/2,
      sd: Math.sqrt(samples.reduce((a,b) => a+(b-avg)**2,0)/n) };
  });
}
function evaluatePlayer(L, moves, pushes) {
  const best = solve(L, 'bfs', true), pushBest = solve(L, 'push', true);
  const efficiency = (reference, actual) => actual === 0 ? (reference === 0 ? 100 : null) : 100 * reference / actual;
  return { best, pushBest, moveEfficiency: best.solved ? efficiency(best.moves.length, moves) : null,
    pushEfficiency: pushBest.solved ? efficiency(pushBest.pushes, pushes) : null,
    extraMoves: best.solved ? moves-best.moves.length : null,
    extraPushes: pushBest.solved ? pushes-pushBest.pushes : null };
}
if (typeof module !== 'undefined') module.exports = { DIRS, parseLevel, isWin, step, pullDistances, deadSquares, solve, benchmarkLevel, evaluatePlayer };
