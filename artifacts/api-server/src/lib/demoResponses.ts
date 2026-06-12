export interface DemoResponse {
  content: string;
}

const DEMO_RESPONSES: Record<string, string[]> = {
  coding: [
    `# Coding Agent — Ready to Build 🛠️

I'm your **Coding Agent**. Here's what I can help you build:

\`\`\`typescript
// Example: A clean TypeScript API handler
import { Request, Response } from "express";

export async function handleRequest(req: Request, res: Response) {
  try {
    const { data } = req.body;
    
    // Process your data
    const result = await processData(data);
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}
\`\`\`

**I can build:**
- Web apps (React, Next.js, Vue)
- Mobile apps (React Native, Expo)
- Backend APIs (Node.js, Python, Go)
- Databases & schemas
- Authentication systems
- Full-stack SaaS platforms

> ⚡ **Connect an API key** (DeepSeek is free at platform.deepseek.com) to unlock real AI-powered code generation for your specific project.`,

    `# Here's Your Code Solution 💻

\`\`\`javascript
// Clean, production-ready implementation
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const optimizedSearch = debounce((query) => {
  fetchResults(query);
}, 300);
\`\`\`

**Key features:**
- ✅ No memory leaks
- ✅ Handles rapid calls efficiently  
- ✅ Clean closure pattern

> 🔑 Add your DeepSeek API key to get code tailored to YOUR specific requirements.`,
  ],

  research: [
    `# Research Agent — Knowledge Base 🔍

I'm your **Research Agent**. Here's a structured research overview:

## Topic Analysis Framework

### 1. Primary Sources
- Academic papers & peer-reviewed research
- Official documentation & whitepapers
- Government & institutional reports

### 2. Key Findings Structure
| Aspect | Details | Confidence |
|--------|---------|-----------|
| Core concept | Foundational principles | High |
| Current state | Latest developments | Medium |
| Future outlook | Emerging trends | Medium |

### 3. Research Methodology
1. **Define scope** — narrow the research question
2. **Gather data** — primary and secondary sources
3. **Analyze patterns** — identify key themes
4. **Synthesize insights** — draw actionable conclusions

> 🔑 Connect DeepSeek (free tier at platform.deepseek.com) for real-time research on any topic you specify.`,
  ],

  content: [
    `# Content Agent — Writing Assistant ✍️

I'm your **Content Agent**. Here's a sample of what I produce:

---

## The Future of AI Operating Systems

The landscape of artificial intelligence is undergoing a **fundamental transformation**. No longer limited to answering questions, modern AI systems are becoming *autonomous operators* capable of:

- **Planning** complex multi-step workflows
- **Executing** tasks across multiple domains
- **Learning** from each interaction
- **Adapting** to user preferences over time

### Why This Matters

> "The most profound technologies are those that disappear. They weave themselves into the fabric of everyday life until they are indistinguishable from it." — Mark Weiser

AI operating systems represent this next frontier — invisible infrastructure that amplifies human capability.

---

*Ready to create content for your specific topic, audience, and tone.*

> 🔑 Add DeepSeek API (free) to generate custom content for your exact needs.`,
  ],

  analysis: [
    `# Analysis Agent — Data Insights 📊

I'm your **Analysis Agent**. Here's a sample analytical breakdown:

## Executive Summary

**Overall Assessment:** Strong opportunity with manageable risks

### Key Metrics Dashboard
\`\`\`
Performance Index:    ████████░░  78/100
Risk Score:          ███░░░░░░░  32/100  (lower is better)
Opportunity Score:   █████████░  87/100
Confidence Level:    ████████░░  80%
\`\`\`

### SWOT Analysis
| Strengths | Weaknesses |
|-----------|-----------|
| Clear market demand | Resource constraints |
| Strong technical foundation | Limited initial reach |

| Opportunities | Threats |
|--------------|---------|
| Growing AI adoption | Competitive landscape |
| Underserved segments | Regulatory uncertainty |

### Recommendations
1. **Priority 1** — Focus on core differentiator
2. **Priority 2** — Build strategic partnerships
3. **Priority 3** — Iterate based on early feedback

> 🔑 Connect DeepSeek API (free) to analyze YOUR specific data and scenarios.`,
  ],

  automation: [
    `# Automation Agent — Workflow Designer ⚡

I'm your **Automation Agent**. Here's a workflow blueprint:

## Automated Pipeline Architecture

\`\`\`
[Trigger] → [Process] → [Decision] → [Action] → [Notify]
    ↑                        ↓
    └──────── [Retry] ←── [Error]
\`\`\`

### Sample Automation Workflow
\`\`\`yaml
workflow:
  name: "data-processing-pipeline"
  trigger:
    type: schedule
    cron: "0 9 * * 1-5"  # Weekdays at 9 AM
  
  steps:
    - name: fetch-data
      action: http.get
      url: "https://api.example.com/data"
      
    - name: process
      action: transform
      template: "{{data | filter | aggregate}}"
      
    - name: notify
      action: slack.send
      channel: "#reports"
      message: "Daily report ready: {{result.summary}}"
\`\`\`

**Automatable tasks:**
- ✅ Data pipelines & ETL
- ✅ Report generation
- ✅ Notification systems
- ✅ CI/CD workflows
- ✅ Social media scheduling

> 🔑 Add DeepSeek API (free) to build automation for YOUR specific use case.`,
  ],

  planner: [
    `# Planner Agent — Strategic Roadmap 🗺️

I'm your **Planner Agent**. Here's a strategic planning framework:

## Project Execution Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Define clear objectives and success metrics
- [ ] Identify key stakeholders and resources
- [ ] Set up infrastructure and tooling
- [ ] **Milestone:** Environment ready, team aligned

### Phase 2: Build (Week 3-6)
- [ ] Core feature development
- [ ] Integration and testing
- [ ] Performance optimization
- [ ] **Milestone:** MVP functional

### Phase 3: Launch (Week 7-8)
- [ ] Beta testing with real users
- [ ] Gather feedback and iterate
- [ ] Production deployment
- [ ] **Milestone:** Live product with users

### Phase 4: Scale (Ongoing)
- [ ] Monitor analytics and KPIs
- [ ] Expand features based on demand
- [ ] Optimize for growth
- [ ] **Milestone:** Product-market fit achieved

> 🔑 Connect DeepSeek API (free) to create a detailed plan for YOUR specific project.`,
  ],

  ceo: [
    `# Think AI — Autonomous Operating System 🧠

I'm **Think AI**, your autonomous AI operating system. Here's what I'm capable of:

## Active Agent Fleet

| Agent | Status | Capability |
|-------|--------|-----------|
| 🎯 CEO Agent | **Active** | Orchestration & strategy |
| 🔍 Research Agent | Ready | Deep research & analysis |
| 💻 Coding Agent | Ready | Full-stack development |
| ✍️ Content Agent | Ready | Writing & creation |
| 📊 Analysis Agent | Ready | Data & insights |
| ⚡ Automation Agent | Ready | Workflow automation |
| 🗺️ Planner Agent | Ready | Strategic planning |

## What I Can Execute

- **Build software** — web apps, mobile apps, APIs, databases
- **Research topics** — comprehensive analysis with sources
- **Create content** — articles, copy, documentation
- **Plan projects** — roadmaps, timelines, strategies
- **Automate workflows** — pipelines, schedules, integrations
- **Analyze data** — insights, reports, recommendations

## Getting Started

Just tell me what you want to accomplish. I'll:
1. Analyze your request
2. Ask clarifying questions if needed
3. Assign the right agent
4. Execute the task

> ⚡ **Demo Mode Active** — Add a free DeepSeek API key at platform.deepseek.com to unlock full AI power.`,

    `# Understanding Your Request 🧠

As your **CEO Agent**, I'm analyzing this task and here's my initial assessment:

## Task Breakdown

**Complexity:** Medium-High  
**Estimated Steps:** 4-6  
**Agents Required:** Multi-agent coordination

### Execution Plan
1. **Clarify requirements** — ensure I understand the exact goal
2. **Research phase** — gather necessary context and best practices  
3. **Design approach** — architect the solution
4. **Execute** — implement step by step
5. **Review & refine** — quality check and iteration

### Key Considerations
- Breaking this into manageable sub-tasks
- Identifying potential blockers early
- Ensuring deliverables are production-ready

I'm ready to proceed. What additional context can you share?

> 🔑 Connect DeepSeek (free) or any API key to execute this task with real AI intelligence.`,
  ],
};

const CLARIFY_DEMOS: Record<string, object> = {
  low_confidence: {
    confidence: 22,
    intent: "User wants to build something but details are unclear",
    task_type: "coding",
    needs_clarification: true,
    reason: "The request is too vague to proceed without critical details",
    questions: [
      {
        id: "platform",
        question: "What type of app are you building?",
        type: "choice",
        options: ["Web App", "Mobile App", "Desktop App", "API / Backend"],
      },
      {
        id: "purpose",
        question: "What is the main purpose of this app?",
        type: "text",
      },
      {
        id: "auth",
        question: "Does it need user login / authentication?",
        type: "boolean",
      },
    ],
  },
  high_confidence: {
    confidence: 91,
    intent: "User wants a specific, well-defined task completed",
    task_type: "general",
    needs_clarification: false,
    reason: "The request is clear and actionable",
    questions: [],
  },
};

export function getDemoResponse(agentType: string, message: string): string {
  const responses = DEMO_RESPONSES[agentType] ?? DEMO_RESPONSES["ceo"]!;
  const index = message.length % responses.length;
  return responses[index]!;
}

export function getDemoClarification(message: string): object {
  const isVague =
    message.split(" ").length < 6 ||
    /^(build|make|create|write|do|help|fix|get)\s/i.test(message.trim());
  return isVague ? CLARIFY_DEMOS.low_confidence! : CLARIFY_DEMOS.high_confidence!;
}
