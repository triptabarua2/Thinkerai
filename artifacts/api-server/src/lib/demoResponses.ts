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

  browser: [
    `# Browser Agent — Web Automation Expert 🌐

I'm your **Browser Agent**. I can automate any browser task using Playwright.

\`\`\`typescript
import { chromium } from "playwright";

async function scrapeData(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  
  const data = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".item")).map(el => ({
      title: el.querySelector("h2")?.textContent?.trim(),
      price: el.querySelector(".price")?.textContent?.trim(),
    }));
  });
  
  await browser.close();
  return data;
}
\`\`\`

**Capabilities:**
- Web scraping & data extraction
- Form automation & login flows
- Screenshot & PDF generation
- E2E testing with Playwright
- Multi-page navigation

> ⚡ Connect Claude API to automate any website you describe.`,
  ],

  git: [
    `# Git Agent — Version Control Expert 🔀

I'm your **Git Agent**. Here's a complete Git workflow:

\`\`\`bash
# Feature branch workflow
git checkout -b feature/user-auth
git add -A
git commit -m "feat(auth): add JWT authentication middleware"

# Interactive rebase to clean history
git rebase -i HEAD~3

# Create PR-ready branch
git push origin feature/user-auth
\`\`\`

**Git workflows I handle:**
- Branching strategies (GitFlow, trunk-based)
- Commit message conventions (Conventional Commits)
- Merge vs rebase decisions
- Conflict resolution
- GitHub Actions CI/CD

> ⚡ Connect Claude API for intelligent Git workflow design.`,
  ],

  devops: [
    `# DevOps Agent — Infrastructure Expert 🚀

I'm your **DevOps Agent**. Here's a production Docker setup:

\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

\`\`\`yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
\`\`\`

> ⚡ Connect Claude API for your specific infrastructure design.`,
  ],

  security: [
    `# Security Agent — Protection Expert 🛡️

I'm your **Security Agent**. Here's a security audit checklist:

## Critical Security Checks

### Authentication
- [ ] Passwords hashed with bcrypt/argon2 (NOT md5/sha1)
- [ ] JWT tokens expire (< 24h access, < 30d refresh)
- [ ] Rate limiting on auth endpoints (max 5 attempts/minute)

### API Security
- [ ] Input validation on ALL endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS configured for specific origins only
- [ ] Sensitive data removed from error messages

\`\`\`typescript
// Secure password hashing
import { hash, verify } from "argon2";
const hashed = await hash(password, { type: argon2id, memoryCost: 65536 });
\`\`\`

**OWASP Top 10 protection included in every audit.**

> ⚡ Connect Claude API to audit your specific codebase.`,
  ],

  qa: [
    `# QA Agent — Quality Assurance Expert ✅

I'm your **QA Agent**. Here's a complete test suite:

\`\`\`typescript
import { describe, it, expect, vi } from "vitest";

describe("UserService", () => {
  it("should create user with hashed password", async () => {
    const service = new UserService();
    const user = await service.create({ email: "test@example.com", password: "secure123" });
    
    expect(user.id).toBeDefined();
    expect(user.password).not.toBe("secure123");
    expect(user.email).toBe("test@example.com");
  });

  it("should reject duplicate emails", async () => {
    const service = new UserService();
    await service.create({ email: "dupe@example.com", password: "pass" });
    
    await expect(
      service.create({ email: "dupe@example.com", password: "pass2" })
    ).rejects.toThrow("Email already exists");
  });
});
\`\`\`

> ⚡ Connect Claude API to write tests for your specific codebase.`,
  ],

  memory: [
    `# Memory Agent — Knowledge Base Manager 🧠

I'm your **Memory Agent**. Here's how I organize knowledge:

## Memory Architecture

\`\`\`
Short-term Memory (Session)
├── Current task context
├── Recent messages
└── Active agent state

Long-term Memory (Persistent)
├── User preferences
├── Project knowledge
├── Past decisions
└── Learned patterns

Semantic Memory (Vector DB)
├── Document embeddings
├── Code snippets
├── Research notes
└── Meeting summaries
\`\`\`

**What I remember:**
- Your preferences and working style
- Project context across sessions
- Important decisions and reasoning
- Files, code, and documentation you've shared

> ⚡ Connect Claude API to build a personal knowledge base.`,
  ],

  video: [
    `# Video Agent — Content Creator 🎬

I'm your **Video Agent**. Here's a complete video script:

---
**VIDEO: "5 AI Productivity Hacks" — YouTube Short (60s)**

**[0:00-0:05] HOOK**
*[Fast cut, energetic music]*
"Stop wasting 4 hours a day on tasks AI can do in 4 minutes."

**[0:05-0:20] HACK #1**
*[Screen recording of AI tool]*
"Use AI to summarize long documents. Drop any PDF — get a 5-bullet summary."

**[0:20-0:35] HACK #2**
*[Code editor animation]*
"Generate boilerplate code in seconds. Describe what you need, get production-ready code."

**[0:55-1:00] CTA**
"Follow for daily AI productivity tips. Link in bio for the full toolkit."

---

> ⚡ Connect Claude API for scripts tailored to your brand and audience.`,
  ],

  image: [
    `# Image Agent — Visual Creator 🎨

I'm your **Image Agent**. Here are optimized generation prompts:

## Midjourney Prompt Formula

\`\`\`
[Subject] + [Style] + [Lighting] + [Camera] + [Mood] + [Quality tags]
\`\`\`

**Example prompts:**

**Product Photography:**
> A minimalist smartphone on white marble, studio lighting, 85mm lens, sharp focus, professional product photography, 8K, --ar 4:5

**Tech UI Concept:**
> Futuristic dark mode dashboard interface, glassmorphism, neon blue accents, floating elements, cinematic lighting, Figma mockup style, --ar 16:9

**Logo Design:**
> Modern geometric logo for AI startup "Think AI", minimal, dark background, gradient purple to blue, vector style, --no text

> ⚡ Connect Claude API to generate prompts for your specific visual needs.`,
  ],

  music: [
    `# Music Agent — Audio Creator 🎵

I'm your **Music Agent**. Here's a complete music brief:

## Track Brief: "Autonomous" (Ambient/Electronic)

**Mood:** Futuristic, focused, empowering  
**BPM:** 120  
**Key:** A minor  
**Duration:** 3:30

### Structure
\`\`\`
0:00 - 0:30  Intro: Soft synth pads, sparse kick
0:30 - 1:00  Build: Add arpeggiated synth, hi-hats
1:00 - 2:00  Drop: Full arrangement, driving bass
2:00 - 2:30  Break: Strip to pads, melodic hook
2:30 - 3:00  Final Drop: Add string layer
3:00 - 3:30  Outro: Fade to silence
\`\`\`

**Suno AI Prompt:**
> Ambient electronic, 120bpm, A minor, cinematic, futuristic, driving synth bass, arpeggiated lead, lush pads, professional mix, no vocals

> ⚡ Connect Claude API for music tailored to your project.`,
  ],

  canvas: [
    `# Canvas Agent — Visual Architect 🎯

I'm your **Canvas Agent**. Here's a system architecture diagram:

\`\`\`mermaid
graph TB
    User([👤 User]) --> App[Think AI App]
    
    App --> CEO[🎯 CEO Agent]
    CEO --> Research[🔍 Research]
    CEO --> Coding[💻 Coding]
    CEO --> Automation[⚡ Automation]
    
    Research --> VectorDB[(Qdrant)]
    Coding --> GitHub[GitHub API]
    Automation --> Webhooks[Webhooks]
    
    CEO --> Memory[(Memory Store)]
    Memory --> VectorDB
    
    style CEO fill:#FFB800,color:#000
    style Research fill:#00D4FF,color:#000
    style Coding fill:#7B61FF,color:#fff
\`\`\`

**Diagrams I create:**
- System & architecture diagrams
- Database ERDs
- User flow & journey maps
- Mind maps & concept trees
- Network topology diagrams

> ⚡ Connect Claude API for diagrams of your specific system.`,
  ],

  report: [
    `# Report Agent — Intelligence Analyst 📊

I'm your **Report Agent**. Here's a sample executive report:

---

## Executive Summary: AI Market Analysis 2025

**Overall Assessment:** High-growth sector with transformative opportunity

### Key Findings

\`\`\`
Market Size 2025:     $190B  ████████████████████  
Expected 2030:        $830B  ████████████████████████████████████
CAGR:                 34%    Strong growth trajectory
Adoption Rate:        67%    Enterprise deployment accelerating
\`\`\`

### Strategic Recommendations

1. **Immediate (0–90 days)** — Deploy AI in high-ROI workflows first
2. **Short-term (3–6 months)** — Build internal AI capabilities
3. **Long-term (6–18 months)** — Develop proprietary AI advantage

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Talent shortage | High | Medium | Train existing staff |
| Data quality | Medium | High | Governance framework |
| Regulation | Low | High | Compliance monitoring |

> ⚡ Connect Claude API to analyze your specific data and generate custom reports.`,
  ],

  file: [
    `# File Agent — Data Processor 📁

I'm your **File Agent**. Here's a universal file processor:

\`\`\`python
import pdfplumber
import docx
import pandas as pd
from pathlib import Path

def process_file(filepath: str) -> dict:
    path = Path(filepath)
    ext = path.suffix.lower()
    
    if ext == ".pdf":
        with pdfplumber.open(filepath) as pdf:
            text = "\\n".join(p.extract_text() or "" for p in pdf.pages)
            tables = [p.extract_table() for p in pdf.pages if p.extract_table()]
        return {"type": "pdf", "text": text, "tables": tables}
    
    elif ext in [".docx", ".doc"]:
        doc = docx.Document(filepath)
        text = "\\n".join(p.text for p in doc.paragraphs)
        return {"type": "docx", "text": text}
    
    elif ext in [".csv", ".xlsx"]:
        df = pd.read_csv(filepath) if ext == ".csv" else pd.read_excel(filepath)
        return {"type": "spreadsheet", "shape": df.shape, "preview": df.head().to_dict()}
    
    return {"type": "unknown", "error": f"Unsupported format: {ext}"}
\`\`\`

> ⚡ Connect Claude API to process and analyze your specific files.`,
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

> 🔑 Connect Claude API to create a detailed plan for YOUR specific project.`,
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
