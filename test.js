const {
  parseLevel,
  solve,
  step,
  isWin,
  pullDistances
} = require('./solver.js');

const LEVELS = require('./levels.js');

const replay = (L, moves) => {
  let s = {
    p: L.player,
    b: L.boxes
  };

  for (const m of moves) {
    s = step(L, s, 'urdl'.indexOf(m.toLowerCase()));

    if (!s) {
      return false;
    }
  }
  return isWin(L, s);
};

const runs = [
  ['BFS', 'bfs', false],
  ['BFS+prune', 'bfs', true],
  ['DFS', 'dfs', false],
  ['DFS+prune', 'dfs', true]
];

let failures = 0;

const check = (ok, msg) => {
  if (!ok) {
    failures++;
    console.log('  FAIL: ' + msg);
  }
};

check(LEVELS.length === 3, 'expected exactly 3 levels');

console.log('moves/pushes/states expanded');
console.log(
  'level'.padEnd(18) +
  runs.map(r => r[0].padStart(18)).join('')
);

for (const lv of LEVELS) {
  const L = parseLevel(lv.map);
  const out = runs.map(([, a, p]) => solve(L, a, p, null, 400000));

  console.log(
    lv.name.padEnd(18) +
    out.map(r => (
      r.solved
        ? `${r.moves.length}/${r.pushes}/${r.explored}`
        : 'NO'
    ).padStart(18)).join('')
  );

  runs.forEach(([name], i) => {
    check(out[i].solved, `${lv.name}: ${name} found no solution`);

    if (out[i].solved) {
      check(
        replay(L, out[i].moves),
        `${lv.name}: ${name} solution does not replay`
      );
    }
  });

  if (out.every(r => r.solved)) {
    check(
      out[1].moves.length === out[0].moves.length,
      `${lv.name}: pruning changed the BFS answer`
    );

    check(
      out[2].moves.length >= out[0].moves.length,
      `${lv.name}: DFS is shorter than BFS (BFS must be optimal)`
    );

    check(
      out[1].explored <= out[0].explored,
      `${lv.name}: pruning expanded more states`
    );
  }

  const d = pullDistances(L);

  check(
    L.boxes.every(b => d[b] >= 0),
    `${lv.name}: a crate starts on a dead square`
  );
}

console.log(
  failures
    ? `\n${failures} check(s) FAILED`
    : '\nAll checks passed'
);

process.exitCode = failures ? 1 : 0;

const { evaluatePlayer, benchmarkLevel } = require('./solver.js');

for (const lv of LEVELS) {
  const L = parseLevel(lv.map);
  const r = solve(L, 'bfs', true);
  const e = evaluatePlayer(L, r.moves.length, r.pushes);

  check(
    e.moveEfficiency === 100,
    'minimum-move evaluation'
  );

  check(
    e.pushBest.solved && replay(L, e.pushBest.moves),
    'minimum-push path replays'
  );

  check(
    e.pushBest.pushes <= r.pushes,
    'minimum pushes <= BFS pushes'
  );

  check(
    e.pushEfficiency > 0 && e.pushEfficiency <= 100,
    'valid push efficiency'
  );

  for (const b of benchmarkLevel(L, 3)) {
    check(
      b.solved && b.visited === b.expanded + 1,
      'goal is visited but not expanded'
    );

    check(
      b.generated === b.discovered && b.generated >= b.visited,
      'unique discovered states'
    );

    check(
      b.peak >= 1 && b.peak <= b.generated,
      'frontier bounds'
    );

    check(
      b.repeats === 3 && b.avg >= 0 && b.sd >= 0,
      'benchmark metrics'
    );
  }

  check(
    solve(L, 'bfs', false, null, 0).status === 'limit',
    'limit distinguished from unsolvable'
  );
}

console.log(
  failures
    ? `${failures} check(s) FAILED`
    : 'Additional evaluation and benchmark checks passed'
);

process.exitCode = failures ? 1 : 0;