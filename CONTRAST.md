# Contrast Audit — Max Payne Fan Page

Automated WCAG color-contrast check (gap #2, option **b**). Reproduce:

```
npm run serve            # terminal 1
npm run check:contrast   # terminal 2
```

The script drives headless Chromium, injects [axe-core](https://github.com/dequelabs/axe-core),
and runs its `color-contrast` rule on the fully rendered page in **both weather states**
(rain and snow), after scrolling to force lazy content to paint. Exit code is non-zero if
any violation is found, so it can run in CI. Raw output: `contrast-results.json`.

## Result

| Weather state | Violations |
|---|---|
| Rain | **0** |
| Snow | **0** |

## Initial findings (before fixes)

The first run reported 8 `serious` violations across both states — all from three
palette usages on dark backgrounds:

| Element | Color used | Contrast | Required |
|---|---|---|---|
| `.game-card__body h3` (game titles) | `--brick-red` `#af1020` | 2.56:1 | 3:1 (large bold) |
| `.game-card__studio` (studio line) | `--charcoal` `#5b5f62` | 2.86:1 | 4.5:1 |
| `.site-footer` text | `--charcoal` `#5b5f62` | 2.85:1 | 4.5:1 |

## Fixes applied

All fixes stay within the specified palette (no invented hues):

- **Game titles** → `--amber-honey` `#e2a51e` (8.47:1) with a dark comic shadow for depth.
- **Muted meta / studio / footer / nav** → new `--charcoal-light` `#8b9094`, a lightened
  tint of the secondary `--charcoal` (5.7:1).
- **Hero meta** → `--charcoal-light` for readability over the dark hero scrim.

`--brick-red` is retained where it is decorative and passes (logo underline, section
number chips as a background, the hero "PAYNE" wordmark which is very large).

## Limitation

axe-core evaluates DOM element backgrounds/foregrounds. The falling rain/snow is drawn on
a `<canvas>` overlay (`pointer-events: none`), which axe does **not** measure. The design
keeps this overlay low-opacity and content contrast high so the weather never reduces
text legibility, but a pixel-sampling check (rendering with the canvas and sampling
luminance behind each text box) would be needed to verify overlap automatically. That can
be added if the dynamic color-adaptation decision lands on pixel-level detection.
