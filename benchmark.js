const { parseLevel, benchmarkLevel } = require('./solver.js');
const LEVELS = require('./levels.js');

console.log(
  'level,algorithm,prune,status,moves,pushes,visited,expanded,generated,peak_frontier,runs,mean_ms,median_ms,sd_ms'
);

for (const level of LEVELS) {
  for (const r of benchmarkLevel(parseLevel(level.map))) {
    console.log(
      [
        level.name,
        r.algo,
        r.prune,
        r.status,
        r.solved ? r.moves.length : '',
        r.solved ? r.pushes : '',
        r.visited,
        r.expanded,
        r.generated,
        r.peak,
        r.repeats,
        r.avg.toFixed(3),
        r.median.toFixed(3),
        r.sd.toFixed(3)
      ].join(',')
    );
  }
}