# ChessMato — handoff to Claudia
Date: 2026-10-29. Owner: Vivi.
Local project: C:\Users\Vivi\OneDrive\Documents\ClaudiaGaryBendt\Project Files\chess_drills

## Immediate objective
Continue the existing app. Do not rebuild from scratch or claim unfinished work is complete.
First verify the newest appearance/accessibility layer. Then expand training variety. Preserve the tabbed UI and existing game behavior.
The owner wants concrete implementation, concise updates, and one feature at a time. Avoid prolonged color discussion or repeated confirmation requests.

## Product rules
- Name: ChessMato.
- Local/offline only. No paid services, hosting, accounts, or required remote APIs.
- No clocks, timed rounds, countdowns, or speed bonuses. Internal engine timeouts/delays are not user-facing clocks.
- Future Android: offline APK with all assets/engine bundled. Sharing the APK, offline hotseat, Bluetooth/Wi-Fi Direct are future goals; not implemented.
- Default surrounding background: tomato red #ff6347. Keep the original light/green board as default.
- Most recent approved text treatment on red: warm ivory with a dark outline. This supersedes the earlier Kermit-green request.
- Future custom pieces, boards, backgrounds. Appearance and chess logic must remain separate.
- Progress page is liked; preserve its direction and expand/polish later.
- Player Profile is too bare: improve later with strengths, priorities, learning, recent sessions and next steps, keeping reported vs measured facts separate.

## Gary Bendt
The original fictional coach persona: legendary 3200, able to explain/train down to 400.
Calm, direct, resilient, practical, Carlsen-inspired pressure and endgame emphasis. Do not impersonate Magnus or imply actual FIDE credentials.
The owner imagines Gary as a supercomputer disguised as human; keep the character's prose in-character, without computer-themed jokes or reveals.
Gary's persona rating is separate from the player's editable training rating.
Owner requested a minimize control leaving a small Gary Bendt bar that can be clicked to reopen; newest appearance.js implements it, verification pending.

## Core interaction invariants
- Click Piece -> Click Legal Destination. No drag required.
- Hover previews a piece's movement range, including enemy pieces. Enemy hovers also show material value.
- Hover/preview must NEVER change the actual game position. A previous bug returned the live game instead of a copy; this was fixed in context().
- Check, double-check, checkmate/stalemate, castling, en passant, underpromotion must work correctly.
- Yellow opening guides: source piece only initially; once that piece is selected, BOTH source and destination highlighted.
- Optional same guides in puzzles and bot suggestions. Suggested bot moves are assisted and earn zero rating points.
- Puzzle correct -> win explanation; legal wrong answer -> miss explanation. Wait for Okay before next puzzle, never auto-advance on a timer.
- Alternative mate-in-one moves need attention when expanding imported puzzles: current scorer matches a supplied move, so generalize acceptance carefully.
- Green/red dots are direct attack information, not guarantees of tactical safety.
- Pinned pieces still contribute geometric attacks for king-safety purposes.

## Latest appearance work: SAVED, not fully verified
appearance.js / appearance.css were just added and referenced at the end of index.html.
Two local SVG sets: cburnett and merida (24 SVGs total), with credits and GPL license in pieces/.
Piece choices: Classic SVG (new default), Merida, letters with W/B side markers, legacy font glyphs.
Optional notation, large/corner/edge labels, label sizing, piece sizing, high-contrast board, text scaling, larger controls, reduced motion, keyboard/screen-reader toggles.
Six support presets: New, Intermediate, Advanced, Expert, Master, Grandmaster. Presets do not change rating.
Keyboard implementation: arrows, Home/End, Enter/Space, Escape with roving tabindex; test it with both orientations.
Gary panel minimize; ivory/outlined red-area text.
Adaptive lettering rule MUST survive future custom boards: inspect each square's actual rendered background (including selected/yellow/check states), derive contrasting ink, and outline/fallback when needed. Default light squares get dark-green labels; green squares get white. Apply to coordinate labels AND letter-piece sets, without changing SVG team colors.
The script currently exposes chessMatoAppearance for inspection/testing.

Last smoke test: page loaded with zero JS errors. Test then failed because the TEST expected 4 SVG pieces in the initial back-rank puzzle; that puzzle actually has 6 pieces. Fix the test expectation and continue testing. Do not treat this as a confirmed app failure. Remaining appearance/preset/keyboard/contrast/server checks were NOT completed.
Earlier versions passed real Edge browser tests for board clicks, all UI tabs, engine responses, hints and assists, opening guides, puzzle win/miss confirmations and mobile overflow.

## Current gameplay/features
- Stockfish.js 10.0.2 with local stockfish.wasm.
- chess.js 0.10.3 rules.
- Editable 400-3200 training number. Kudos points change the SAME number up/down; user may manually set it any time.
- Bot uses scaled Skill Level/search depth, NOT calibrated Elo. Do not claim actual 3200 strength.
- Move Kudos shown as percentage and game average, estimated from engine centipawn loss: 100*exp(-max(0,loss)/200), with mate caps. Own heuristic, not Chess.com/Lichess accuracy.
- 23 starter puzzles, but 12 are similar generated knight forks: owner explicitly wants MUCH more variety in drills and all game modes.
- Five vision games: coordinates, piece finder, attacker, undefended piece, legal destination count; 5 questions per round.
- Ten lessons/quizzes, daily goals, badges, streaks, spaced review, mistake notebook.
- Sixteen manually curated opening sample branches. White Italian-based 1.e4 plus responses to major defenses. Black Caro-Kann / Slav plus London response.
- Opening departures explain why the repertoire move fits the plan, without claiming every alternative is a blunder.
- Opening first-choice recall, guided vs unaided, tracked separately from engine opening accuracy.
- Claude recommendation text box only matches topics locally. Structured drill import validates FEN/SAN. No live Claude integration.

## Player profile and requested training roadmap
14 analyzed games: 5 wins, 8 losses, 1 draw. The 14th was confirmed as the USER resigning.
Strengths: tactical, 70 reported brilliant/excellent moves; best phase endgame, reported 77% accuracy.
Weaknesses: reported opening 57.7%, offbeat Formation setups then queen/king pawn games; middlegame wildly inconsistent, 7 reported blunders.
Reported approximately 50% of losses were resignations. Exact historical count is unknown; don't infer an exact rate from this.
Named examples (NOT enough to reconstruct positions): opening Nf3/f4 vs Coach-Magnus; Ne2 vs BecksNSU; Nd6 vs maykalka missed a winning rook check; endgame b4 vs Coach-Magnus and 4Akash_404.
Do not fabricate their exact puzzles; request PGN/FEN when needed.
Roadmap requested in order:
1. Opening trainer — implemented starter.
2. Optional pre-move middlegame blunder check: what is undefended, their checks/captures/threats; personal missed-check puzzles — NOT implemented.
3. Resignation review with cautious holdability analysis and replay against bot from that position — NOT implemented.
4. Occasional endgame upkeep; focus time on openings/middlegame.
Post-game one-line mistake explanations/better moves, longitudinal middlegame consistency and resignation metrics — NOT implemented.
In parallel, owner requested broader exercise variety and current UI/appearance improvements.

## UI and files
Ten workspaces / 23 original subsections, plus newest Accessibility subsection:
Play, Openings, Puzzles, Minigames, Lessons, Progress, Player profile, Coach Gary, Analysis, Settings.
Switching tabs preserves active board/game. Controls are MOVED, not cloned, so IDs and existing event handlers are important.
Load order:
1. index.html (inline base rules/UI and chess.min.js)
2. academy.js (IIFE state: bot, profile, lessons/minigames)
3. openings.js (personal coach, repertoire, yellow guides, puzzle outcome overrides)
4. ui.js (tabbed DOM reorganization)
5. appearance.js (new layer)
CSS: inline base, ui.css, appearance.css, plus opening-injected styles.
Many globals are wrapped across layers: render, paintPreview, clickSquare, play, load, complete. Be careful of wrapper order and closures.
Existing testing hooks: workshopTest, academyTest, academyCoach, openingCoachTest, chessUITest, chessMatoAppearance.
No framework/npm build is needed. App is vanilla JS.

## Running / portability
Open index.html for puzzles/training. For bot, launch Start ChessMato.cmd, which delegates to original PowerShell launcher.
server.cjs serves a strict static allowlist on 127.0.0.1:8767 and opens the browser. Latest allowlist includes appearance files and SVG assets.
Check that real server serves root/assets correctly (many browser tests used a separate temporary test server).
Launcher uses Node on PATH or a Codex-cache fallback; this fallback is machine-specific. For portability document/install Node LTS or package a runtime later.
If a prior server is running, launcher reopens it rather than restarting; new assets may need server restart.

## Data, backup, and licenses
localStorage:
chess-workshop-v1 — drills/progress.
chess-academy-v2 — rating/Kudos, lessons, badges/minigames.
chess-personal-coach-v1 — supplied baseline and opening sessions.
chess-ui-v1 — selected tabs.
chessmato-display-v1 — appearance.
chessmato-gary-folded — Gary minimize state.
Browser progress is NOT in this source ZIP. File:// and localhost are different storage origins; existing export/restore controls transfer their respective collections. Preserve keys or migrate explicitly.
Keep licenses/credits for chess.js, Stockfish and SVG sets. Editable SVG source is included.

## Variety source researched, NOT downloaded/imported
Official Lichess puzzle database is CC0: https://database.lichess.org/#puzzles
CSV.zst source: https://database.lichess.org/lichess_db_puzzle.csv.zst
Dataset is huge: stream/decompress a bounded sample, do not download it all casually.
FEN is BEFORE opponent's first UCI move. Apply that first move, then present position; remaining moves are the solution. Convert using chess.js and validate all lines.
Actual puzzle ratings/tags can diversify themes/difficulty, with provenance. Accept alternate checkmates for mate-in-one puzzles.
Do not claim expanded variety is already implemented.

## Suggested immediate steps
1. Verify appearance script, SVG loading via file and real local server, notation toggle, all six presets, keyboard play, contrast after moves/highlights/theme changes, Gary minimize, desktop/mobile, unchanged chess legality.
2. Expand puzzle themes and multi-move exercises, add minigame variations and improve nonrepetitive selection.
3. Continue the requested personalized roadmap one concrete feature at a time.
4. Flesh out Profile, then flair Progress later without losing the direction the owner likes.
5. Report actual saved/tested results, not plans as completed work.

## Update 2026-10-29 (Claude session) — verified vs planned
### Done and tested (Playwright/Chromium, tests/*.test.cjs, via server.cjs and file://)
- Appearance layer verified: SVG sets (cburnett/merida), letters, legacy glyphs; notation on/off + center/corner/edge; all six presets (rating unchanged, individual overrides kept); keyboard play both orientations (arrows, Home/End, Enter/Space, Escape, roving tabindex); per-square label contrast on default, high-contrast, guide, selected, check, letter-piece states; Gary minimize persists; tomato/ivory theme; no horizontal overflow at 390px on all 10 views.
- Fixed: base `button:hover` repainted hovered squares dark (unreadable labels, board color changed). Fixed: center labels hidden behind SVG pieces and under move dots. Fixed: server.cjs crashed on non-Windows (explorer.exe spawn); now uses the platform opener, `CHESSMATO_NO_BROWSER=1` skips it.
- New coaches.js: offline chats for Gary Bendt and Claudia Herman (Coaches tab, board stays visible). Local intent matching + rule-based position scan (your undefended/attacked pieces, their checks/captures/mate threats, your checks/free captures/mates, material). No network, no AI service. History in localStorage `chessmato-coach-chats-v1`. Claudia's voice is a labelled placeholder pending the owner's confirmation of the Sara Herman (ZefCatt) trait list.
- New storage key: chessmato-coach-chats-v1. academyCoach gained botSide().

### Planned, NOT implemented
- PGN import/export that builds a player's profile with the local engine.
- Multiple local profiles; device-to-device sharing preferably over Bluetooth, file export as fallback. No server/account/cloud.
- Possible future full website: keep ChessMato a plain static site (no backend, in-browser engine, local storage, PWA/offline) so hosting stays a drop-in. Not built.
- Future online mode (planned, NOT built): online profiles are completely separate from local ones. The server is the only writer of online stats; the client submits only moves/answers for server-issued games and puzzles and never uploads local stats or files. One-way download from online to local is allowed. It needs bot/engine-assistance detection. Online accounts cannot set their own difficulty: there are 3 complete placement games (vs players or bots), starting near 1500, and the server sets the Elo. The local editable training rating stays as is. Keep local storage from ever becoming an online data source.
- Online accounts are for live matchmaking play against users of similar rating and for correspondence ("play by mail") games. Whether live games have any clock is undecided (the app is untimed so far). Not built.
- Bluetooth electronic chessboards (planned, NOT built): connect physical boards for local play and training, and later online play. Board input must go through the same move-validation path as clicks (clickSquare/play → chess.js), so the app's rules decide legality. Web Bluetooth works in Chromium/Android; board protocols vary by vendor.
- Online time controls (planned, NOT built): untimed/correspondence, plus bullet, blitz and standard, each with several base+increment variations, and separate online ratings per category. Local training stays untimed.
- Local two-player play (planned, NOT built): hotseat on one device and device-to-device over Bluetooth, with the same choice of clock-free, bullet, blitz or standard (with variations). Training modes (bot, puzzles, drills, lessons) stay untimed.
- Timed modes (planned): follow standard chess clock rules, where flag-fall loses unless the opponent cannot possibly checkmate, which is a draw. The only ChessMato-specific detail is that each move switches the clock automatically (no clock button), including moves made on Bluetooth boards.
  - Clock switch detail: the clock switches when the player confirms the move (move-confirmation step), not when the piece is placed. There's no separate clock button.
  - Ghost move (planned): after choosing a move, the piece "ghost moves" so only the mover sees the resulting board. Nothing changes in the live position, for the opponent, or on the network until they confirm. They can cancel or pick another move, and their clock keeps running until they confirm. Only one ghost piece at a time: picking another move replaces it, with no chaining. Must reuse the existing preview-on-a-copy rule (never mutate the live game).
  - Superseded 14:39 by the "thinking board" (approved by Vivi: "make sure it's intuitive and not confusing"). The whole board tints into a private mode where the player plays out ONE line for both sides (legal moves only, sides alternate automatically). Back/Forward step through it, playing over a step replaces the rest of the line, Reset returns to the real position, and Play/Submit sends only the first move. The live game, opponent and server never see it. Available in all modes; the suggested default is off for future rated games against people (not yet confirmed).
- Rated play assist profile (planned, NOT built): one locked "rated" profile that can't be changed mid-game. Turned off: thinking board, pre-move blunder check, coach comments/chat, hover material values and threat previews, Kudos/eval during the game. Kept: selected-piece and last-move highlights, legal-destination dots, and accessibility (piece sets, notation, keyboard). Everything returns for the post-game review. Casual, local and training modes keep all guides. When building it, route through the existing toggles (thinking enabled, training premove/panel, appearance hover) rather than new code paths.
- Ranked types (planned): Ranked has guides off and separate ratings per speed (clock-free, bullet, blitz, standard). Assisted-Ranked is clock-free only, with guides on and its own single Elo that never mixes with Ranked.
  - Online clock-free games let the player choose Ranked (unassisted) or Assisted-Ranked. A player who doesn't respond within 72 hours automatically resigns. Local clock-free games have no limit.
  - Local clock-free Bluetooth games are automatically drawn if the devices disconnect (a short reconnect window has been suggested; the user hasn't answered yet).
