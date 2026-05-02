# AskBetter — Product Overview

**Slogan:** Better questions, better answers

AskBetter is a desktop web app that analyzes a pasted ChatGPT conversation and helps users understand how they use AI. It identifies user prompts, classifies each by behavior type, scores the overall conversation across four axes, and gives concrete suggestions for asking more active, curious, and thoughtful questions.

## Core Value
Give users a mirror: show what kinds of questions they asked, where they were passive, where they were active, and how to improve.

## Target Users
- Hackathon judges (short live demo)
- Students and learners who want to use AI without losing active reasoning
- AI-heavy builders who want feedback on their prompting habits

## Prompt Categories
Every user message is classified into exactly one:
- **Delegation** — asking AI to do a task ("Write this", "Fix this", "Summarize this")
- **Curiosity** — asking why/how/what-if, exploring ideas
- **Collaborative** — thinking with AI, brainstorming, iterating together
- **Verification** — asking AI to check, review, or critique work

## Conversation Scores (0–100)
- **Autonomy** — how much the user actively thinks vs. offloads
- **Curiosity** — how often the user explores ideas or asks conceptual questions
- **Critical Thinking** — how often the user verifies, pushes back, or compares alternatives
- **Engagement** — whether the conversation shows iteration and follow-up

## MVP Constraints
- No user accounts, auth, or persistence
- No LLM API key required — rule-based engine only
- Desktop-first; basic responsiveness acceptable
- One pasted or sample conversation per session
- Demoable end-to-end in under two minutes
