# Project Structure

All source code lives under `askbetter/`.

```
askbetter/
├── src/
│   ├── analysis/             # Core analysis engine (framework-agnostic TS — no React imports)
│   │   ├── types.ts          # All shared types: PromptIntent, AnalysisResult, QualityScores, etc.
│   │   ├── parser.ts         # Extracts user messages from raw transcript text
│   │   ├── classifier.ts     # Scores intent signals; picks primaryIntent with tiebreak
│   │   ├── rubric.ts         # Detects quality flags; scores 6 quality dimensions per prompt
│   │   ├── patterns.ts       # Detects 12 behavioral patterns across the conversation
│   │   ├── suggestions.ts    # Generates summary paragraph and dimension-driven suggestions
│   │   ├── examples.ts       # Dolly 15k-inspired calibration examples (docs/tuning only)
│   │   └── analyzer.ts       # Public entry point: analyzeConversation(string[]) → AnalysisResult
│   ├── lib/
│   │   └── sampleData.ts     # Sample conversation strings for demo/testing (5 scenarios)
│   ├── components/           # Reusable UI components (results page building blocks)
│   │   ├── ScoreCard.tsx     # Six score gauges (Autonomy, Curiosity, Critical Thinking, Specificity, Context, Engagement)
│   │   ├── DistributionChart.tsx  # Recharts pie chart for intent category breakdown
│   │   ├── PatternList.tsx   # Detected behavioral patterns with severity badges
│   │   ├── PromptExamples.tsx     # Passive vs. active prompt highlights with intent + flag badges
│   │   └── Suggestions.tsx   # Summary paragraph + numbered improvement suggestions
│   ├── pages/                # Route-level page components
│   │   ├── InputPage.tsx     # "/" — transcript input, 5 sample loaders, analyze button
│   │   └── ResultsPage.tsx   # "/results" — full analysis display
│   ├── App.tsx               # Router setup (BrowserRouter, two routes)
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles / Tailwind base (@import "tailwindcss")
│   └── App.css               # App-level styles
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

## Architecture Rules

- `src/analysis/` is the analysis engine — keep it free of React imports. It must be callable from tests or a future API route without any UI dependency.
- `src/components/` contains presentational components only. They receive typed props and do not call the analyzer directly.
- `src/pages/` owns page-level state and wires analysis → components together.
- Analysis results flow: `InputPage` calls `parseConversation` then `analyzeConversation`, then navigates to `/results` passing the `AnalysisResult` object via `location.state`. `ResultsPage` reads it from state and renders components.
- If `location.state` is missing on `/results`, redirect back to `/`.
- All components import types from `src/analysis/types.ts` — not from `src/lib/`.

## Data Flow

```
raw text → parser.ts → string[]
                     → classifier.ts (scoreIntents + primaryIntentFrom) → PromptIntent
                     → rubric.ts (detectFlags + scorePromptQuality) → QualityScores + flags
                     → analyzer.ts → AnalysisResult
                                   → ResultsPage (via router state)
```

## Key Types (src/analysis/types.ts)

- `PromptIntent` — `"delegation" | "curiosity" | "collaborative" | "verification"`
- `AnalyzedPrompt` — single prompt with `primaryIntent`, `intentScores`, `qualityScores`, `qualityScore`, `flags`, `isPassive`, `isActive`
- `ConversationScores` — `autonomy`, `curiosity`, `criticalThinking`, `specificity`, `context`, `engagement`, `overallQuality`
- `AnalysisResult` — full output: `prompts`, `scores`, `patterns`, `summary`, `suggestions`, `passiveExamples`, `activeExamples`, `distribution`

## Type Conventions

- All shared types live in `src/analysis/types.ts` — do not redefine them in components
- Use `interface` for object shapes, `type` for unions and aliases
- Props interfaces are defined inline in the component file, not exported unless reused
