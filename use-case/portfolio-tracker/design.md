# Northstar — Portfolio tracker

- **Source issue:** [#17 — CSV portfolio tracker with Yahoo Finance data](https://github.com/tvriesde/dark-factory/issues/17)
- **Design status:** Wireframe fallback; no verified Figma link was provided.
- **Scope:** Static, self-contained portfolio prototype with local CSV import, an example portfolio file, and position calculations. No external services or storage.
- **Market-data boundary:** The sample quotes are fictional UI fixtures, not Yahoo Finance data or current prices. This GitHub Pages prototype has no live Yahoo Finance connection; live quotes would require a separately approved data integration.

## Annotated wireframes

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ N northstar/                                        ◉ Personal portfolio │
├──────────────────────────────────────────────────────────────────────────┤
│ YOUR MONEY, IN ONE PLACE                                                 │
│ Portfolio overview                           [Example CSV] [Import]    │
│ A clearer view of the positions you’re tracking.                        │
│                                                                          │
│ ● Demo portfolio  Example positions and sample prices only. No live ... │
│ ┌─────────────────────────┐ ┌───────────────────┐ ┌───────────────────┐  │
│ │ TOTAL VALUE             │ │ INVESTED          │ │ TOTAL RETURN      │  │
│ │ $ value       ~~~~~~~   │ │ $ cost basis      │ │ + gain / loss    │  │
│ └─────────────────────────┘ └───────────────────┘ └───────────────────┘  │
│ ┌───────────────────────────────────────────────┐ ┌──────────────────┐ │
│ │ YOUR INVESTMENTS   Holdings                   │ │ AT A GLANCE      │ │
│ │ Asset  Shares  Avg cost  Sample price  Value  │ │ Allocation       │ │
│ │ MSFT     12    $380.50    $421.80       $...  │ │ MSFT     ━━━  % │ │
│ │ AAPL     20    $175.20    $191.45       $...  │ │ AAPL     ━━   % │ │
│ │ ...                                             │ │ ...              │ │
│ │ status: imported data / validation feedback   │ │ Share of quoted  │ │
│ └───────────────────────────────────────────────┘ └──────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Bring your portfolio with you  Required CSV columns  [Get example]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌────────────────────────────┐
│ N northstar/        ◉ User │
├────────────────────────────┤
│ YOUR MONEY, IN ONE PLACE    │
│ Portfolio overview          │
│ A clearer view of positions │
│ [Example CSV] [Import]      │
│ ● Demo portfolio            │
│ Example prices only; no live│
│ Yahoo Finance connection.   │
│ ┌─────────────────────────┐ │
│ │ TOTAL VALUE             │ │
│ │ $ value                 │ │
│ └─────────────────────────┘ │
│ ┌──────────────┐┌──────────┐│
│ │ INVESTED     ││ RETURN   ││
│ └──────────────┘└──────────┘│
│ ┌─────────────────────────┐ │
│ │ Holdings        Sample  │ │
│ │ ← horizontally scroll → │ │
│ └─────────────────────────┘ │
│ Allocation                  │
│ MSFT  ━━━━━━━         25%   │
│ ...                         │
│ Bring your portfolio...     │
└────────────────────────────┘
```

## Interaction and accessibility notes

- The initial view uses fictional price and cost values for MSFT, AAPL (Apple), and TSLA, with an explicit demo-data notice. The sample values do not claim to come from Yahoo Finance.
- The native CSV picker accepts a header row with `symbol`, `shares`, and `average_cost`. Imports are parsed in memory, validated, and replace the example portfolio only after the entire file is valid. CSV files are not uploaded or persisted.
- The downloadable `example-portfolio.csv` contains the same three sample positions and can be imported directly. Invalid files leave the current portfolio unchanged and give a concise status message; symbols without a sample quote remain visible and are excluded from market-value and return totals.
- Holdings are represented by a semantic table with column headers. Import feedback uses a polite status region; controls are keyboard-operable with visible focus styles.
- At narrow widths, summaries stack and the holdings table remains horizontally scrollable inside its own labeled container, without forcing the page itself to scroll sideways.
