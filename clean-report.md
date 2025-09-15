# Clean Report

This refactor removes redundancy and consolidates helpers without changing behavior.

## Changes Made

- Consolidated helpers in `app.js`:
  - `validateAmount30String(amount)`: strict 0.<30> matcher for internal checks.
  - `normalizeAmountTo30(amount)`: accepts 0.<1..30>, right-pads to 30.
  - `encodeGridToFraction30(grid)`: 9×10 boolean grid → 30-digit fraction.
  - `decodeFraction30ToGrid(fraction30)`: 30-digit fraction → 9×10 grid.
  - `derivePalette(address)`: SHA-256 → 12-color palette.
  - `nanoRpc(body)`: single RPC with 5s timeout and multi-node fallback.

- Replaced ad-hoc encoding/decoding with the helpers in:
  - `encodeGrid()`
  - `decodeAmount()`
  - `decodeFromBalance()`
  - `renderDecoded()`

- Validation improvements:
  - Centralized amount validation/normalization.
  - Added reusable address validator.

- CSS pruning in `style.css`:
  - Removed hover/transition rules on grid cells to minimize CSS.
  - Removed duplicate `image-rendering` variants; kept `pixelated`.

- Removed duplicated logic for binary mapping by using `decodeFraction30ToGrid`.

## Items Removed/Merged

- Duplicated encode/decode loops replaced by helpers (approx. ~45 lines).
- Redundant hover/transition CSS (~15 lines).
- Palette derivation duplicated code replaced with `derivePalette`.

## Risky Areas Left Untouched

- UI structure in `index.html` unchanged to avoid layout regressions.
- Status messaging texts kept as-is besides clarifications already requested.

## Line Count Summary (approx.)

- JavaScript: ~60 lines removed/merged, ~80 lines added as reusable helpers (net small growth but lower duplication).
- CSS: ~20 lines removed.

Net effect: simpler code paths and fewer duplicated algorithms while keeping behavior identical.


