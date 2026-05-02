# AskBetter — Product Overview

**Slogan:** Better questions, better answers

AskBetter is a desktop web app that analyzes a pasted ChatGPT conversation and helps users understand how they use AI. It identifies user prompts, classifies each by intent type, scores the overall conversation across six quality dimensions, and gives concrete suggestions for asking more active, curious, and thoughtful questions.

## Core Value

Give users a mirror: show what kinds of questions they asked, where they were passive, where they were active, and how to improve.

## Target Users

- Hackathon judges (short live demo)
- Students and learners who want to use AI without losing active reasoning
- AI-heavy builders who want feedback on their prompting habits

## Prompt Intent Categories

Every user message is classified into exactly one primary intent:

- **Delegation** — asking AI to do a task ("Write this", "Fix this", "Summarize this")
- **Curiosity** — asking why/how/what-if, exploring ideas
- **Collaborative** — thinking with AI, brainstorming, iterating together
- **Verification** — asking AI to check, review, or critique work

Intent and quality are scored separately. A delegation prompt is not automatically bad — "Fix this and explain why" is delegation with learning intent and scores well.

## Prompt Quality Flags

Each prompt is also checked for behavioral signals:

- `delegation_with_learning_intent` — task + explanation request
- `shows_prior_attempt` — user shares their own attempt or reasoning
- `asks_for_reasoning` — user asks for step-by-step or rationale
- `asks_for_alternatives` — user asks for options, comparisons, tradeoffs
- `asks_for_risk_or_limitations` — user asks for edge cases, assumptions, failure modes
- `copy_paste_without_question` — long prompt (100+ words) with no question mark

## Conversation Scores (0–100)

Six dimensions, each averaged from prompt-level rubric scores:

- **Autonomy** — active thinking vs. offloading; boosted by prior attempts and learning intent
- **Curiosity** — exploratory questions and conceptual depth
- **Critical Thinking** — verification, reasoning requests, edge case awareness
- **Specificity** — goal, constraints, audience, format, examples in prompts
- **Context** — background and framing provided to the AI
- **Engagement** — iteration, follow-up, and conversation length
- **Overall Quality** — average of all six dimensions

## MVP Constraints

- No user accounts, auth, or persistence
- No LLM API key required — rule-based engine only
- Desktop-first; basic responsiveness acceptable
- One pasted or sample conversation per session
- Demoable end-to-end in under two minutes
- Five sample conversations available on the input page for demo purposes
