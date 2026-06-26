import { pgTable, text, integer, boolean, jsonb, timestamp, serial, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  title: text("title").notNull().default("New Chat"),
  agentType: text("agent_type").notNull().default("ceo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  mediumFixCount: integer("medium_fix_count").notNull().default(0),
  fullRebuildCount: integer("full_rebuild_count").notNull().default(0),
  currentVersion: integer("current_version").notNull().default(0),
  detectedLanguage: text("detected_language").notNull().default("en"),
  planTier: text("plan_tier").notNull().default("free"),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  agentType: text("agent_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// PDF §7.1 — all fields including new Section 7.1 additions
export const pipelineStatesTable = pgTable("pipeline_states", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  intentType: text("intent_type").notNull().default("chat"),
  thinkingLevel: text("thinking_level").notNull().default("low"),
  planTier: text("plan_tier").notNull().default("free"),
  requirements: jsonb("requirements").notNull().default({}),
  requirementsComplete: boolean("requirements_complete").notNull().default(false),
  plan: jsonb("plan").notNull().default([]),
  blueprintApproved: boolean("blueprint_approved").notNull().default(false),
  strategyBrief: text("strategy_brief"),
  builderOutput: jsonb("builder_output"),
  reviewerResult: jsonb("reviewer_result"),
  criticResult: jsonb("critic_result"),
  judgeResult: jsonb("judge_result"),
  consensusResult: jsonb("consensus_result"),
  status: text("status").notNull().default("classifying"),
  // Dynamic Routing Engine fields (§7.1 additions)
  routingHistory: jsonb("routing_history").notNull().default([]),
  loopCounts: jsonb("loop_counts").notNull().default({}),
  currentAgent: text("current_agent"),
  failoverLog: jsonb("failover_log").notNull().default([]),
  peerAuditFlag: boolean("peer_audit_flag").notNull().default(false),
  resumeFromAgent: text("resume_from_agent"),
  signatureQuestionResponse: text("signature_question_response"),
  constraintFindings: jsonb("constraint_findings").notNull().default({}),
  assumptionFlags: jsonb("assumption_flags").notNull().default([]),
  // Domain picker (§4.4)
  domain: text("domain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentLogsTable = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  pipelineStateId: text("pipeline_state_id"),
  agentName: text("agent_name").notNull(),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  durationMs: integer("duration_ms"),
  status: text("status").notNull(),
  confidence: numeric("confidence"),
  retryCount: integer("retry_count").notNull().default(0),
  failoverCost: numeric("failover_cost").notNull().default("0"),
  clarificationDepth: integer("clarification_depth"),
  signatureQAnswered: boolean("signature_q_answered"),
  errorDetail: text("error_detail"),
  // Model used — for pool health observability (§10.6)
  modelUsed: text("model_used"),
  providerUsed: text("provider_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const versionHistoryTable = pgTable("version_history", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  artifactType: text("artifact_type").notNull().default("code"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisionMemoryTable = pgTable("decision_memory", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  rule: text("rule").notNull(),
  appliesTo: text("applies_to").notNull().default("all_projects"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  preferredPlanTier: text("preferred_plan_tier").notNull().default("free"),
  theme: text("theme").notNull().default("dark"),
  preferences: jsonb("preferences").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// PDF §21 — Think Credits balance per user
export const userCreditsTable = pgTable("user_credits", {
  userId: text("user_id").primaryKey(),
  planTier: text("plan_tier").notNull().default("free"),
  creditsBalance: integer("credits_balance").notNull().default(50),
  creditsUsedThisMonth: integer("credits_used_this_month").notNull().default(0),
  monthlyQuota: integer("monthly_quota").notNull().default(50),
  extraCreditsBalance: integer("extra_credits_balance").notNull().default(0),
  graceUntil: timestamp("grace_until", { withTimezone: true }),
  lastRefillAt: timestamp("last_refill_at", { withTimezone: true }).notNull().defaultNow(),
  // Stripe billing integration (§18.4)
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// PDF §21.5 — Credit transaction log
export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  conversationId: text("conversation_id"),
  action: text("action").notNull(),
  creditsUsed: integer("credits_used").notNull().default(0),
  balanceBefore: integer("balance_before").notNull().default(0),
  balanceAfter: integer("balance_after").notNull().default(0),
  agentName: text("agent_name"),
  isFailover: boolean("is_failover").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// PDF §18.4 — Stripe billing events log
export const billingEventsTable = pgTable("billing_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  eventType: text("event_type").notNull(),
  planTierFrom: text("plan_tier_from"),
  planTierTo: text("plan_tier_to"),
  stripeEventId: text("stripe_event_id"),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable);
export const insertMessageSchema = createInsertSchema(messagesTable);
export const insertAgentLogSchema = createInsertSchema(agentLogsTable);
export const insertVersionHistorySchema = createInsertSchema(versionHistoryTable);
export const insertDecisionMemorySchema = createInsertSchema(decisionMemoryTable);
export const insertUserCreditsSchema = createInsertSchema(userCreditsTable);
export const insertCreditTransactionSchema = createInsertSchema(creditTransactionsTable);

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type AgentLogEntry = typeof agentLogsTable.$inferSelect;
export type VersionHistoryEntry = typeof versionHistoryTable.$inferSelect;
export type DecisionMemoryEntry = typeof decisionMemoryTable.$inferSelect;
export type UserCredits = typeof userCreditsTable.$inferSelect;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type BillingEvent = typeof billingEventsTable.$inferSelect;
