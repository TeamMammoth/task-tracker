---
name: plan
description: Plans changes and hands off implementation and review.
tools: ['agent']
agents: [implementer, code-review]
handoffs:
  - label: Start Implementation
    agent: implementer
    prompt: Implement the plan above.
    send: true
    model: GPT-5.2

  - label: Run Review
    agent: code-review
    prompt: Review the code changes made in the previous step.
---

Create a short implementation plan.