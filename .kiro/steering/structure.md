# Project Structure

All source code lives under `askbetter/`.

```
askbetter/
├── src/
│   ├── lib/                  # Core analysis engine (framework-agnostic TS)
│   │   ├── types.ts          # Shared types: PromptCategory, AnalysisResult, etc.
│   │   ├── parser.ts         # Extracts user messages from raw transcript text
│   │   ├── classifier.ts     # Classifies a single prompt into a PromptCategory
│   │   ├── analyzer.ts       # Orchestrates parse → classify → score → insights
│   │   └── sampleData.ts     # Sample conversation strings for demo/testing
│   ├── components/           # Reusable UI components (results page building blocks)
│   │   ├── ScoreCard.tsx     # Four score cards (Autonomy, Curiosity, etc.)
│   │   ├── DistributionChart.tsx  # Recharts pie/bar for category breakdown
│   │   ├── PatternList.tsx   # Detected behavioral patterns with severity badges
│   │   ├── PromptExamples.tsx     # Passive vs. active prompt highlights
│   │   └── Suggestions.tsx   # Summary paragraph + improvement suggestions
│   ├── pages/                # Route-level page components
│   │   ├── InputPage.tsx     # "/" — transcript input, sample loader, analyze button
│   │   └── ResultsPage.tsx   # "/results" — full analysis display
│   ├── App.tsx               # Router setup (BrowserRouter, two routes)
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles / Tailwind base
│   └── App.css               # App-level styles
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

## Architecture Rules

- `src/lib/` is the analysis engine — keep it free of React imports. It must be callable from tests or a future API route without any UI dependency.
- `src/components/` contains presentational components only. They receive typed props and do not call the analyzer directly.
- `src/pages/` owns page-level state and wires lib → components together.
- Analysis results flow: `InputPage` runs the analyzer, then navigates to `/results` passing the `AnalysisResult` object via `location.state`. `ResultsPage` reads it from state and renders components.
- If `location.state` is missing on `/results`, redirect back to `/`.

## Data Flow

```
raw text → parser.ts → string[]
                     → classifier.ts (per prompt) → PromptCategory
                     → analyzer.ts → AnalysisResult
                                   → ResultsPage (via router state)
```

## Type Conventions
- All shared types live in `src/lib/types.ts` — do not redefine them in components
- Use `interface` for object shapes, `type` for unions and aliases
- Props interfaces are defined inline in the component file, not exported unless reused
