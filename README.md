# CheckMato

Offline, untimed chess training in the browser. Originally built on the "Chess Workshop — Training Arena" base.

Open **Start Chess Workshop.cmd** for the full app, including the local Stockfish opponent. It serves only this app on http://127.0.0.1:8767 and opens your default browser. Node.js is required; the launcher uses the existing Codex runtime when Node is not on PATH.
For puzzles and minigames without a server, open index.html. Keep every app file in this folder. Refresh the browser after an update.

## Controls
Click Piece → Click Legal Destination. Hover previews never move pieces. Hover another piece to inspect its movement range while retaining your clicked selection. Enemy previews are hypothetical if it is not their turn; en passant is omitted for those previews.
Enemy piece hovers show material values. Square coordinates are large and centered; on occupied squares they sit at the lower center so the piece remains readable.
The checked king is marked red. Legal moves always resolve your own king's check.
Green dots mean not directly attacked after the move, red dots mean attacked. Neither guarantees tactical safety. Pinned enemy pieces count in geometric attacks; their legal movement range may be restricted.

## Training
- Five vision minigames: square finder, piece finder, spot the attacker, undefended pieces, and legal move counter. Five questions per round; Okay advances after feedback.
- Ten lessons with quizzes and topic practice.
- 23 starter drills: original exercises, Black-side variants, and geometric fork practice.
- Solved puzzles display confirmation; Okay loads the next recommended puzzle.
- Progressive hints, missed-puzzle review, spaced repetition, daily goals, activity streaks, and earned badges.
- Paste coaching advice to prioritize matching exercises; import exact legal FEN/SAN solution lines in the drill format (Copy drill format).

## Rating and Kudos
There is ONE editable 400–3200 training rating. Points earned/lost change the same number. Change it at any time.
Bot strength scales its skill/search settings to this number; the result is not calibrated Elo. The engine is Stockfish.js 10.0.2.
Move Kudos is displayed as a percentage and game average. Formula: 100 * exp(-max(0, evaluation loss in centipawns)/200). Full-strength depth-10 searches estimate evaluations before/after your move. Search uncertainty and mate transitions can make this estimate coarse. It is not a Chess.com or Lichess percentage.
Moves earn +5/+2/-2/-5/-9 points for >=90/>=75/>=50/>=25/<25% Kudos. Game results award +25 win, +3 draw, -15 loss.
Puzzles award +12 clean, +4 with help, -3 per rejected attempt. Quiz completion awards +6 once per lesson. Vision answers give +3 correct, -2 wrong.
Puzzle bands are rough teaching estimates. The starter collection is beginner-level, around 400–850, and high target numbers do not transform simple exercises into advanced ones. Import harder exercises to expand the curriculum.
Analysis mode has no automatic opponent and does not score moves.

## Persistence and backup
Browser storage saves your progress when available. File pages and the localhost app use different browser storage. Export/import the drill backup AND the separate arena-progress backup when moving between them. Clearing browser storage deletes local progress.
Drill backup restores the drill collection/history; arena backup restores the rating, badges, lesson completion, activities, and Kudos history.
Downloads go to the location selected by your browser.
**Simplest:** Settings → Backups → "Back up everything" saves rating, puzzles, openings, profile, games, chats and settings in one .json file; "Restore everything" loads it in another browser or device.

## Verification
Actual headless Edge tests covered mouse hover → click piece → click destination, preview immutability, puzzle completion/Okay advance, all five minigame startups, rating changes, and a real Stockfish reply with Kudos scoring.
Rules tests cover check escapes, double check, checkmate versus stalemate, castling through check, en passant, and underpromotion. Initial-position perft depth 3 gives 8,902 nodes.
All shipped drill solution lines are checked for legality on startup; tactical optimality is not engine-certified.

## Licenses / source
chess.js 0.10.3: BSD-2-Clause, LICENSE-chess.txt.
Stockfish.js 10.0.2: GPLv3, LICENSE-stockfish.txt.
Exact engine package and corresponding source: https://www.npmjs.com/package/stockfish/v/10.0.2
Upstream: https://github.com/nmrugg/stockfish.js
Opening names: lichess-org/chess-openings, CC0 public domain (openings-db.js, built by tools/build-openings.cjs).
Puzzle library data: the Lichess puzzle database (database.lichess.org, CC0), downloaded by the player and imported locally.
fzstd 0.1.1 (Zstandard decoder used by the puzzle library): MIT, vendor/LICENSE-fzstd.txt.
Engine JS and WASM are vendored locally; no API keys or paid services are used. Review upstream source/license terms before redistributing.

## Personalized opening coach (first feature)
Use Your opening coach beside the board. White has an Italian-based 1.e4 starter repertoire; Black has Caro-Kann against e4 and Slav against d4/c4, with a London response. Sixteen legal sample branches cover major responses; they are not a complete opening database or engine-certified best lines.
Yellow guides show only the source piece initially. Click it to highlight both source and destination. Hover continues to preview other pieces without changing the board.
Switch off guides for a recall test. Completed sessions track first-choice repertoire recall, with guided/unaided decisions separated. These measures are NOT engine opening accuracy. Wrong alternatives are flagged as departures from the selected repertoire, not automatically called blunders.
Correct moves receive a plain-English purpose. A departure offers retry or keeping the move on a two-sided analysis board. Completion waits for Okay before selecting another practice line.
An optional personal baseline (results reported from outside CheckMato) can live in `personal-data.js`, which is gitignored and stays on your device. Without it, the profile starts neutral and is built from your practice and imported games. Personal positions are never fabricated from move names.
The short running profile updates after each opening session and is separately exportable/restorable using the coach-profile backup controls.
Since implemented (2026-10-29): pre-move blunder check, puzzles from your own missed forcing moves in bot games, resignation review and play-on, and measured middlegame/resignation stats. Still planned: full phase-based post-game review, and personal puzzles from your earlier games (needs your PGNs or FENs).

## Optional guides and puzzle outcomes
Guide squares in puzzles reveal the source, then the destination once selected; using this help marks the solve assisted.
Suggest a move in a live bot game uses its local Stockfish recommendation. It uses the same staged yellow guide. The next played move is marked assisted and earns no rating points, even if you choose another move.
A legal puzzle answer outside the supplied solution ends as a miss (-3 points once). Feedback gives the prescribed move and a short purpose, explicitly without claiming every alternative is bad. Illegal clicks do not count as answers.
Correct solutions show a win (or solved-with-help) explanation. Both wins and misses wait for Okay before moving on. There are no countdowns or chess clocks.

## Local-only Android direction
No hosted service is required or planned. The current PC engine uses a localhost-only server, not public hosting. A future Android build can package the app and engine as an offline APK. Hotseat can be offline; Bluetooth/Wi-Fi Direct requires additional native implementation. Android packaging and multiplayer are not implemented yet.

## Additional browser verification
Passed actual click tests for all guide stages, original-position immutability, White and Black opening startup, full opening completion, deviation/retry, profile accounting, puzzle miss/win confirmation, zero premature advance, guide toggles, real Stockfish hints, no points from assisted moves, and stale-hint removal.

## CheckMato interface
The program is now named CheckMato. Its background is tomato red (#ff6347); the chessboard palette is unchanged.
Ten main workspaces: Play, Openings, Puzzles, Minigames, Lessons, Progress, Player profile, Coach Gary, Analysis, Settings. Each has focused subsections (23 total). Tab switches preserve the current position/game. Keyboard arrow keys navigate tablists; mobile navigation scrolls horizontally without widening the page.
Gary Bendt is the fictional coach persona, with a legendary 3200 character rating and a 400–3200 coaching range. His practical, calm approach is inspired by Carlsen; he is not presented as Magnus himself. The player’s rating remains separate and unchanged.
Backups are consolidated under Settings → Backups, and scoring/implementation notes live under Settings → About & scoring.
Use Start CheckMato.cmd (or the original launcher) for local bot games. Storage keys are preserved so the rebrand does not reset progress.

## Added 2026-10-29
- **Coaches tab**: offline chats with Gary Bendt and Claudia Herman. Answers come from local rules (a scan of direct attacks, checks, captures and mate threats), your saved progress, and existing engine results. No internet connection needed.
- **Thinking board** (Settings → Accessibility, on by default): your first chosen move tints the board into a private copy. Play out one line for both sides, use Back/Forward to step through it, Reset to return to the real game, and Play to send only your first move. Works in every mode except minigames.
- **Puzzles**: a bundled pack of engine-checked puzzles (puzzle-pack.js) generated offline with the local Stockfish from engine games. Themes include mates, back rank, forks, pins, skewers, discovered attacks, promotion, endgames and quiet moves. Alternate checkmates are accepted, and "Next" rotates themes. Regenerate with tools/generate-puzzles.cjs and tools/build-pack.cjs.
- **Minigames**: Find a checking move, Free capture, Spot the pin, Knight route, Material count, and Mixed rounds.
- **Openings**: Mixed mode, where the opponent varies its replies within your repertoire.
- **Bot games**: an optional blunder check before each move (warns, never blocks), a checks/captures/threats panel, a resignation review before resigning, and practice play-on from saved resignations.
- **Player profile**: structured strengths and priorities, Measured progress, and Resignation review.
- **My games** (Player profile): import PGN text or .pgn files from Lichess, Chess.com or anywhere, with your side found by username. It shows results, how games ended (Lichess "Normal" without mate counts as resignation), the opening name (from the Lichess list), and where you or your opponent left your repertoire. The optional local-engine review gives Kudos by phase, blunders and biggest swings. Missed forcing moves (mates, checks, captures) become personal puzzles from the exact game position, and resigned losses go to the Resignation review. Finished CheckMato bot games are saved automatically. You can export one game or all of them as .pgn.
- **Puzzle library** (Puzzles tab): download lichess_db_puzzle.csv.zst once from database.lichess.org, then pick it in CheckMato. Choose themes, a rating range and how many to add (up to 5,000 in total). The file is read and filtered on your device. Each puzzle starts after the opponent's move, is checked for legality, keeps its Lichess rating and themes, and joins the practice queue. Built-in and personal puzzles are unaffected, and "Remove all Lichess puzzles" undoes an import.
- **Spaced review and daily plan**: missed puzzles return after five minutes, then after 1, 2, 4… days. Opening lines return after 1, 3, 7, 16 and 30 days, and sooner after a slip. Puzzles → Practice queue shows what is due. Coaches → Daily plan has Gary or Claudia pick three short tasks each day: missed puzzles or a due line, your weakest puzzle theme, and an endgame or minigame round.
- **Guess the move** (Play tab): follow a finished game from one side and guess each move. An exact match scores 3. With the local engine, close alternatives score 1–2. It includes five classic games (Morphy's Opera Game, the Immortal and Evergreen games, Réti–Tartakower 1910, Ed. Lasker–Thomas 1912), each checked to end in its recorded mate, plus any game under My games.
- **Opening names** appear under the board in analysis, opening practice and bot games.
- Tests: `CHESSMATO_NO_BROWSER=1 node server.cjs`, then `node tests/<name>.test.cjs` (requires Playwright). Suites: appearance, core, coaches, variety, roadmap, thinking, pgn, lichess, review, guess.
