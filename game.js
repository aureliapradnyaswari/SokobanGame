// Handles the game display, player input, and solver playback. Game rules and search logic are in solver.js.

// Set up the canvas and shared game state 
const $ = id => document.getElementById(id);
const cv = $('board'), ctx = cv.getContext('2d');

let L, s, dead, hist, moves, pushes;
let timer = null;
let done = false;
let assisted = false;
let startedAt = 0, comparisonToken = 0;

// Add a section for the player's results
const resultPanel = $('sMoves').closest('div');
const evaluation = document.createElement('div');
evaluation.className = 'evaluation';
resultPanel.append(evaluation);

// Prepare the comparison table and its summary
const comparePanel = $('cmp').closest('div');
comparePanel.classList.add('comparison');
const table = $('cmp').closest('table');
const tableWrap = document.createElement('div');
tableWrap.className = 'table-scroll';
table.before(tableWrap);
tableWrap.append(table);
table.querySelector('thead').innerHTML =
  '<tr><th>Algorithm</th><th>Status</th><th>Moves</th><th>Pushes</th><th>Visited</th><th>Expanded</th><th>Generated</th><th>Peak</th><th>Mean ms</th><th>Median ms</th><th>SD ms</th></tr>';
const comparisonSummary = document.createElement('div');
comparisonSummary.className = 'comparison-summary';
comparePanel.append(comparisonSummary);

const solverDetails = document.createElement('p');
solverDetails.className = 'metric-note';
resultPanel.append(solverDetails);

// Helper functions used throughout the file
const fmt = n => n == null ? '–' : n.toLocaleString('en-US');
const percent = n => n == null ? '–' : `${n.toFixed(1)}%`;
const say = t => { $('msg').textContent = t; };
const setText = (id, v) => { $(id).textContent = v; };

function resetEvaluation() {
  evaluation.innerHTML = '<h3>Player evaluation</h3><p class="metric-note">Complete the level to see your efficiency.</p>';
}

// Load the selected level and reset its state
let curMap;

function load(i) {
  loadMap(LEVELS[i].map, `Level ${i + 1}: push every crate onto a goal.`);
}

function loadMap(map, msg) {
  stop();
  comparisonToken++;
  $('cmpBtn').disabled = false;
  startedAt = 0;
  resetEvaluation();
  solverDetails.textContent = '';
  comparisonSummary.textContent = '';

  curMap = map;
  L = parseLevel(map);
  dead = deadSquares(L);
  s = { p: L.player, b: L.boxes };
  hist = [];
  moves = pushes = 0;
  done = false;
  assisted = false;

  $('cmp').innerHTML = '<tr><td colspan="11">Runs every algorithm from the start of this level.</td></tr>';
  ['sBest', 'sBestPush', 'sStates', 'sMs'].forEach(k => setText(k, '–'));
  stats();
  draw();
  say(msg);
}

function stats() {
  setText('sMoves', moves);
  setText('sPush', pushes);
}

// Draw the board using an isometric view
const ISO_X = 34, ISO_Y = 19, MARGIN = 38, TOP = 82;

function project(x, y, z = 0) {
  return [
    MARGIN + L.H * ISO_X + (x - y) * ISO_X,
    TOP + (x + y) * ISO_Y - z
  ];
}

function polygon(points, color, outline = null) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function plane(x, y, size, z, color, outline) {
  polygon([
    project(x, y, z),
    project(x + size, y, z),
    project(x + size, y + size, z),
    project(x, y + size, z)
  ], color, outline);
}

function block(x, y, size, height, colors, base = 0) {
  const a = project(x, y, base + height),
    b = project(x + size, y, base + height);
  const c = project(x + size, y + size, base + height),
    d = project(x, y + size, base + height);
  const B = project(x + size, y, base),
    C = project(x + size, y + size, base),
    D = project(x, y + size, base);

  polygon([b, c, C, B], colors[1], colors[3]);
  polygon([c, d, D, C], colors[2], colors[3]);
  polygon([a, b, c, d], colors[0], colors[3]);
}

function line(a, b, color, width = 2) {
  ctx.beginPath();
  ctx.moveTo(...a);
  ctx.lineTo(...b);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function crate(x, y, onGoal) {
  const colors = onGoal
    ? ['#9af0b7', '#278e75', '#176853', '#124b43']
    : ['#ffd28a', '#ba703a', '#86502d', '#5b3826'];

  block(x + .12, y + .12, .76, 32, colors);
  plane(x + .22, y + .22, .56, 33, onGoal ? '#57c997' : '#e6a75c', colors[3]);
  line(project(x + .23, y + .23, 34), project(x + .77, y + .77, 34), colors[0], 4);
  line(project(x + .77, y + .23, 34), project(x + .23, y + .77, 34), colors[0], 4);
}

function player(x, y) {
  block(x + .24, y + .24, .52, 20, ['#71e7d0', '#258f9c', '#176378', '#164654']);
  block(x + .19, y + .19, .62, 22, ['#f1f8ff', '#91a9c4', '#607f9e', '#395671'], 20);
  polygon([
    project(x + .27, y + .81, 37),
    project(x + .73, y + .81, 37),
    project(x + .73, y + .81, 28),
    project(x + .27, y + .81, 28)
  ], '#102a42');
  line(project(x + .35, y + .82, 33), project(x + .65, y + .82, 33), '#71e7d0', 3);
}

function draw() {
  const width = (L.W + L.H) * ISO_X + 2 * MARGIN;
  const height = (L.W + L.H) * ISO_Y + TOP + 48;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(width * dpr) || cv.height !== Math.round(height * dpr)) {
    cv.width = Math.round(width * dpr);
    cv.height = Math.round(height * dpr);
  }

  cv.style.maxWidth = `${width}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Draw the farther cells first so the closer ones appear in front
  const cells = Array.from({ length: L.W * L.H }, (_, i) => ({ i, x: i % L.W, y: Math.floor(i / L.W) }));
  cells.sort((a, b) => a.x + a.y - b.x - b.y);

  // Draw the floor, goal tiles, and optional dead-square markers
  for (const { i, x, y } of cells) {
    if (!L.inside[i] && !L.wall[i]) continue;

    block(x, y, 1, 12, [(x + y) % 2 ? '#405a70' : '#49647a', '#24394e', '#1c2e43', '#263b50'], -12);

    if (L.goal[i]) {
      plane(x + .20, y + .20, .60, 1, '#204b53', '#71e7d0');
      plane(x + .36, y + .36, .28, 2, '#71e7d0');
    }

    if ($('showDead').checked && dead[i] && !L.wall[i]) {
      line(project(x + .25, y + .25, 2), project(x + .75, y + .75, 2), '#fb8296', 3);
      line(project(x + .75, y + .25, 2), project(x + .25, y + .75, 2), '#fb8296', 3);
    }
  }

  // Draw the walls, crates, and player on top of the floor
  for (const { i, x, y } of cells) {
    if (L.wall[i]) {
      // Keep the front walls low so the board remains easy to see
      const h = (x === L.W - 1 || y === L.H - 1) ? 13 : 26;
      block(x + .04, y + .04, .92, h, ['#829bb5', '#435b77', '#304760', '#263b50']);
      plane(x + .15, y + .15, .70, h + 1, '#a1b5c9', '#647e99');
    } else if (s.b.includes(i)) crate(x, y, L.goal[i]);
    else if (s.p === i) player(x, y);
  }
}

// Handle player movement and undo
function move(k) {
  if (done) return false;
  const n = step(L, s, k);
  if (!n) return false;
  if (!startedAt) startedAt = performance.now();

  hist.push({ s, push: n.push });
  s = { p: n.p, b: n.b };
  moves++;
  if (n.push) pushes++;

  stats();
  draw();
  if (isWin(L, s)) win();
  return true;
}

function undo() {
  stop();
  if (!hist.length) return;

  const h = hist.pop();
  s = h.s;
  moves--;
  if (h.push) pushes--;
  done = false;

  resetEvaluation();
  stats();
  draw();
  say('Move undone.');
}

function win() {
  done = true;
  stop();
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
  const r = evaluatePlayer(L, moves, pushes);
  evaluation.innerHTML = `<h3>Player evaluation</h3>
    <p class="metric-note">${assisted ? 'Assisted run · includes solver or hint' : 'Independent run'} · ${elapsed.toFixed(1)} s elapsed</p>
    <div class="efficiency-grid"><div><small>Move efficiency</small><strong>${percent(r.moveEfficiency)}</strong></div>
    <div><small>Push efficiency</small><strong>${percent(r.pushEfficiency)}</strong></div></div>
    <dl><dt>Minimum moves</dt><dd>${r.best.solved ? r.best.moves.length : '–'}</dd>
    <dt>Extra moves</dt><dd>${fmt(r.extraMoves)}</dd>
    <dt>Minimum pushes</dt><dd>${r.pushBest.solved ? r.pushBest.pushes : '–'}</dd>
    <dt>Extra pushes</dt><dd>${fmt(r.extraPushes)}</dd></dl>
    <p class="metric-note">Move and push optima are computed separately. Counts exclude undone moves; time includes pauses and undo.</p>`;
  say(`Level completed! ${moves} moves, ${pushes} pushes. ${assisted ? 'Assisted run.' : 'Independent run.'}`);
}

// Run the solver, show hints, and compare search results
const NAMES = { bfs: 'BFS', dfs: 'DFS' };
const NOTE = {
  bfs: 'If found, BFS returns a minimum-move solution.',
  dfs: 'DFS finds a solution, but it is usually far longer than necessary.'
};

function stop() {
  clearInterval(timer);
  timer = null;
}

function show(r) {
  setText('sBest', r.solved ? r.moves.length : '–');
  setText('sBestPush', r.solved ? r.pushes : '–');
  setText('sStates', fmt(r.expanded));
  setText('sMs', r.ms.toFixed(3));
  solverDetails.textContent = `From current position at search start · ${r.status} · visited ${fmt(r.visited)} · generated ${fmt(r.generated)} · peak frontier ${fmt(r.peak)}`;
}

function runSolver() {
  stop();
  if (done) return;

  const algo = $('algo').value,
    r = solve(L, algo, $('prune').checked, s, 400000);
  show(r);
  if (!r.solved) {
    say(r.limit ? 'The search hit its state limit.' : 'This position cannot be solved. Undo or restart.');
    return;
  }

  assisted = true;
  let i = 0;
  say(`${NAMES[algo]} found a solution of ${r.moves.length} moves and ${r.pushes} pushes after expanding ${r.explored} states. ${NOTE[algo]}`);
  timer = setInterval(() => {
    if (i >= r.moves.length) return stop();
    move('urdl'.indexOf(r.moves[i++].toLowerCase()));
  }, 340 - $('speed').value * 26);
}

function hint() {
  stop();
  if (done) return;

  const r = solve(L, 'bfs', true, s);
  show(r);
  if (!r.solved) {
    say(r.limit ? 'Search limit reached; solvability unknown.' : 'This position cannot be solved. Undo or restart.');
    return;
  }

  assisted = true;
  move('urdl'.indexOf(r.moves[0].toLowerCase()));
  say(`Hint: the best finish from here takes ${r.moves.length} moves.`);
}

function compare() {
  stop();
  const token = ++comparisonToken,
    level = L;
  $('cmpBtn').disabled = true;
  comparisonSummary.textContent = 'Benchmarking: 30 measured runs per configuration…';

  setTimeout(() => {
    if (token !== comparisonToken) return;
    try {
      const rows = benchmarkLevel(level);
      $('cmp').innerHTML = rows.map(r => `<tr><th scope="row">${r.name}</th><td>${r.status}</td><td>${r.solved ? r.moves.length : '–'}</td><td>${r.solved ? r.pushes : '–'}</td><td>${fmt(r.visited)}</td><td>${fmt(r.expanded)}</td><td>${fmt(r.generated)}</td><td>${fmt(r.peak)}</td><td>${r.avg.toFixed(3)}</td><td>${r.median.toFixed(3)}</td><td>${r.sd.toFixed(3)}</td></tr>`).join('');

      const solved = rows.filter(r => r.solved);
      const winners = (metric) => {
        if (!solved.length) return 'No completed search';
        const best = Math.min(...solved.map(metric));
        return solved.filter(r => metric(r) === best).map(r => r.name).join(' / ');
      };
      comparisonSummary.innerHTML = `<h3>Benchmark findings</h3><dl><dt>Shortest solution</dt><dd>${winners(r=>r.moves.length)}</dd><dt>Lowest mean time</dt><dd>${winners(r=>r.avg)}</dd><dt>Fewest expanded</dt><dd>${winners(r=>r.expanded)}</dd><dt>Smallest peak frontier</dt><dd>${winners(r=>r.peak)}</dd></dl>
      <p class="metric-note">Same initial level state and direction order. One warm-up + 30 measured runs each, rotated order, 400,000 visited-state limit. Time includes preprocessing and path reconstruction. Peak is frontier size, not total memory. Only solved runs qualify for findings. BFS guarantees minimum moves when solved; pruning preserves solvability and BFS optimality, not necessarily DFS's path.</p>`;
    } catch (error) {
      comparisonSummary.textContent = `Benchmark failed: ${error.message}`;
    } finally {
      $('cmpBtn').disabled = false;
    }
  }, 30);
}

// Connect keyboard shortcuts and button actions
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dir = {
    ArrowUp: 0, w: 0,
    ArrowRight: 1, d: 1,
    ArrowDown: 2, s: 2,
    ArrowLeft: 3, a: 3
  }[k];

  if (dir !== undefined) {
    e.preventDefault();
    stop();
    move(dir);
  }
  else if (k === 'z' || k === 'u') undo();
  else if (k === 'r') loadMap(curMap, 'Level restarted.');
});

LEVELS.forEach((l, i) => $('level').add(new Option(`${i + 1}. ${l.name}`, i)));
$('level').onchange = e => load(+e.target.value);
$('undo').onclick = undo;
$('restart').onclick = () => loadMap(curMap, 'Level restarted.');
$('solve').onclick = runSolver;
$('hint').onclick = hint;
$('stop').onclick = () => {
  stop();
  say('Playback stopped.');
};
$('cmpBtn').onclick = compare;
$('showDead').onchange = draw;

// Allow movement with swipes on touch screens
// Add touch controls here so the HTML does not need extra changes
let touchStart = null;

cv.addEventListener('pointerdown', event => {
  touchStart = [event.clientX, event.clientY];
  cv.setPointerCapture(event.pointerId);
});

cv.addEventListener('pointercancel', () => {
  touchStart = null;
});

cv.addEventListener('pointerup', event => {
  if (!touchStart) return;

  const dx = event.clientX - touchStart[0];
  const dy = event.clientY - touchStart[1];
  touchStart = null;
  if (Math.hypot(dx, dy) < 18) return;

  // Map the swipe direction to movement along the isometric grid
  const u = dx / ISO_X + dy / ISO_Y;
  const v = dy / ISO_Y - dx / ISO_X;
  stop();
  move(Math.abs(u) > Math.abs(v) ? (u > 0 ? 1 : 3) : (v > 0 ? 2 : 0));
});

load(0);