# Sokoban
A Sokoban puzzle game with built-in search algorithms.
You push crates onto goals; **BFS** and **DFS** can solve the level so their behaviour can be compared side by side.
Course project for **Design and Analysis of Algorithms (EF234405), 2026/2027**.

**Live demo:** <add the GitHub Pages link here>

## Features
- 3 levels: **First push** (1 crate), **Two crates** (2 crates) and **Long way round** (3 crates).
- **Solve** animates BFS or DFS on the current position. **Hint** plays one move. **Undo** and **Restart**.
- **Compare algorithms** runs BFS and DFS, with and without dead-square pruning, and fills a table: states expanded, moves, pushes, time.
- **Dead-square pruning** and an option to draw the dead squares on the board.
- When you finish a level without help, your move count is compared with the shortest solution.

## Link to the course
| Algorithm | Where it is used | Course chapter | Time complexity |
|---|---|---|---|
| BFS | Fewest-moves solution (`solve`, algo `bfs`); also the reverse search for dead squares (`pullDistances`) | Ch. 10 (10.7) | O(V + E) |
| DFS | Any solution, usually very long (`solve`, algo `dfs`); flood fill in `parseLevel` | Ch. 10 (10.8) | O(V + E) |

Only the two algorithms from the course are used.

## Design (five-phase framework, Ch. 1.5)
1. **Understand.** Push every crate onto a goal. You can only push (never pull), one crate at a time, and not into a wall or another crate.
2. **Abstract.** The puzzle is a path problem on an **implicit graph**. A vertex is a *state* (the player's cell plus the sorted list of crate cells). An edge is one move (up, right, down or left). The graph is never stored; neighbours are computed on demand by `step`.
3. **Design.** BFS expands states by number of moves (a queue), so the first solved state it reaches has the fewest moves. DFS takes the newest state instead (a stack), so it often reaches a solution with fewer expanded states, but the solution is usually much longer.
4. **Analyze.** The number of vertices grows roughly like (cells choose crates) times (cells), so adding one crate multiplies the work. See Evaluation.
5. **Implement.** JavaScript, no dependencies. Rules and algorithms are in `solver.js` (no DOM code, so they also run in Node and can be tested).

**Dead squares.** A reverse BFS starts at the goals and "pulls" a crate backwards. Cells it never reaches are dead: a crate there can never reach a goal. With pruning on, pushes onto dead squares are skipped. This never changes the answer, it only removes useless states.

## Project structure
```
index.html, style.css    interface
game.js                  drawing, keyboard input, undo, solver playback
solver.js                game rules, BFS and DFS (no DOM)
levels.js                the 3 level maps
test.js                  correctness tests (node test.js)
benchmark.js             growth measurements for the report (node benchmark.js > results.csv)
```

## How to run
Open `index.html` in any browser. Nothing to install.

```
node test.js                        # needs Node.js 18 or newer
node benchmark.js > results.csv     # about 30 seconds
```
**Controls:** arrow keys or WASD to move, `Z` to undo, `R` to restart.

## Evaluation
`node test.js` solves every level with BFS and DFS (with and without pruning), replays each solution with the game rules, and checks that
pruning does not change the BFS answer, that DFS is never shorter than BFS, and that pruning never expands more states.
Results below are **moves / pushes / states expanded**. State counts are deterministic.

| Level | BFS | BFS + prune | DFS | DFS + prune |
|---|---|---|---|---|
| First push | 8 / 4 / 204 | 8 / 4 / 133 | 110 / 12 / 654 | 110 / 12 / 222 |
| Two crates | 12 / 5 / 910 | 12 / 5 / 462 | 152 / 25 / 866 | 152 / 25 / 212 |
| Long way round | 28 / 15 / 6526 | 28 / 15 / 4148 | 150 / 23 / 1017 | 150 / 23 / 264 |

`node benchmark.js > results.csv` also prints the biggest frontier and the average time of 30 runs.

## Conclusion
.......

## Team and contribution
| Member | Role | Contribution |
|---|---|---|
| <Name 1> | Interface and game logic (`index.html`, `style.css`, `game.js`) | 33.33% |
| <Name 2> | Algorithms (`solver.js`) | 33.33% |
| <Name 3> | Levels, tests, benchmark, report (`levels.js`, `test.js`, `benchmark.js`, report) | 33.33% |

## License
MIT. See `LICENSE`.