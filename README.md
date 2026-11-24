# Sokoban Search Lab

A Sokoban puzzle game with built-in search algorithms. You push crates onto goals; **BFS** and **DFS** can solve the level so their behaviour can be compared side by side.
Course project for **Design and Analysis of Algorithms (EF234405), 2026/2027**.

**Live demo:** <add github page soon>

## Features
- Isometric 3D-style Canvas board, responsive dashboard, high-DPI rendering and touch swipe controls.
- Keyboard directions follow the original grid: up = upper-right, right = lower-right, down = lower-left, left = upper-left.
- 3 levels: **First push** (1 crate), **Two crates** (2 crates) and **Long way round** (3 crates).
- **Solve** animates BFS or DFS on the current position. **Hint** plays one move. **Undo** and **Restart**.
- **Compare algorithms** runs BFS and DFS, with and without dead-square pruning, and fills a table: states expanded, moves, pushes, time.
- **Dead-square pruning** and an option to draw the dead squares on the board.
- When you finish a level without help, your move count is compared with the shortest solution.
**Controls:** arrow keys or WASD to move, `Z` to undo, `R` to restart.


## Link to the course
| Algorithm | Where it is used | Course chapter | Time complexity |
|---|---|---|---|
| BFS | Fewest-moves solution (`solve`, algo `bfs`); also the reverse search for dead squares (`pullDistances`) | Ch. 10 (10.7) | O(V + E) |
| DFS | Any solution, usually very long (`solve`, algo `dfs`); flood fill in `parseLevel` | Ch. 10 (10.8) | O(V + E) |


## Project structure
```
index.html, style.css    interface
game.js                  drawing, keyboard input, undo, solver playback
solver.js                game rules, BFS and DFS (no DOM)
levels.js                the 3 level maps
test.js                  correctness tests (node test.js)
benchmark.js             growth measurements for the report (node benchmark.js > results.csv)
```

## Team and contribution
| Member | Role | Contribution |
|---|---|---|
| Aurelia Pradnyaswari Sanjaya Erawan| Levels, tests, benchmark, report (`levels.js`, `test.js`, `benchmark.js`, report) | 33.33% |
| Deara briliana Putri | Game logic, Algorithms (`index.html`, `game.js`, report) | 33.33% |
| Marsya Safina Maulidiyah | Algorithms (`solver.js`, `style.css`) | 33.33% |
