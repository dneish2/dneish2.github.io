# The Price of a Question

An interactive case study on finplatform: what one question costs to answer, why it takes
five different models to serve it, which hardware is worth owning, and what has to stay true
for the price to hold as it scales.

Prose companion: [`writing/finplatform-architecture.html`](../../writing/finplatform-architecture.html).

## Files

| File | What it is |
|---|---|
| `index.html` | eight acts, the sticky ledger rail, all static copy |
| `page.css` | page-local vocabulary only. Tokens come from `assets/css/main.css` |
| `data.js` | **every number on the page**, each tagged with its provenance |
| `app.js` | rail, reveals, card flips, the router simulator, the cost model, four charts |
| `verify.js` | numbers and toy-logic harness. `node verify.js` |
| `sweep.cjs` | render sweep across three widths + reduced motion (needs Playwright) |

No build step, no dependencies. Open `index.html` directly, or serve the site root
(`python -m http.server 8080`) and visit `/work/price-of-a-question/`.

## The one rule

`data.js` is the single source of truth. Both toys, all four charts, and every card read
from it. Each figure is a record:

```js
m(0.011, 'usd', 'llm/tiers.py:61', 'measured on a representative analyst prompt')  // measured
e(2300, 'usd', 'street price band of roughly $2,000 to $2,600; midpoint taken')    // estimated
```

Measured figures render with a filled diamond and carry a repo path on hover. Estimates
render with a hollow diamond and open to show their arithmetic. **The marker is rendered
from the tag, never hand-typed**, so a number cannot claim to be measured unless the data
says so. `verify.js` fails if a measured figure has no source or an estimate has no
arithmetic.

## Keeping it honest

The page is pinned to finplatform constants that will move. When they do, `verify.js` is
what tells you:

```
node verify.js
```

And the render gate, which needs Playwright (borrowed from the finplatform tooling next
door, since this repo has no dependencies of its own):

```
python -m http.server 8099                                    # from the site root
NODE_PATH=../../../finplatform/_tooling/node_modules node sweep.cjs
```

It reports a 2px overflow from `.site-nav` at 390px. That is shared site chrome and affects
every page in this repo, not just this one.

Known moving parts:

- **Sonnet 5 intro pricing ends 2026-08-31.** The same call goes from about $0.011 to about
  $0.0165. The Sonnet card counts down to it.
- **The production T1 provider is an open decision.** Today it is Haiku, because Cloud Run
  has no GPU.
- **`--memory 2Gi` was recommended and not applied** as of 2026-08-04.
- **Prompt caching is unimplemented**, worth 20 to 40 percent of the input bill.

Last reconciled against finplatform on 2026-08-05.
