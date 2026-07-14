import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const videoStatus = pgEnum("video_status", [
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export const subtitleKind = pgEnum("subtitle_kind", ["original", "translated"]);

export const jobType = pgEnum("job_type", [
  "import",
  "probe",
  "stt",
  "ocr",
  "translate",
  "render",
  "dub",
]);

export const jobStatus = pgEnum("job_status", [
  "queued",
  "active",
  "done",
  "failed",
  "cancelled",
]);

export const creditReason = pgEnum("credit_reason", [
  "signup_trial",
  "topup",
  "job_charge",
  "job_refund",
  "admin_adjust",
]);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    r2Key: text("r2_key"),
    originalName: text("original_name").notNull(),
    status: videoStatus("status").notNull().default("uploading"),
    durationSec: integer("duration_sec"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    sourceLang: text("source_lang"),
    /** Ngôn ngữ đích khi dịch (mặc định "vi") */
    targetLang: text("target_lang"),
    /** User glossary: one "term=translation" per line, injected into translate prompt */
    glossary: text("glossary"),
    /** natural | formal | literal */
    translationStyle: text("translation_style"),
    /** Audit trail — legal requirement (brainstorm #2) */
    uploadIp: text("upload_ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("videos_user_idx").on(t.userId, t.createdAt)],
);

export const subtitleTracks = pgTable(
  "subtitle_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    kind: subtitleKind("kind").notNull(),
    lang: text("lang").notNull(),
    /** [{ i, startMs, endMs, text }] — see SubtitleSegment in @dichvideo/shared */
    segments: jsonb("segments").notNull().default([]),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("subtitle_tracks_video_idx").on(t.videoId)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: jobType("type").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    error: text("error"),
    params: jsonb("params").notNull().default({}),
    result: jsonb("result"),
    creditsCharged: integer("credits_charged").notNull().default(0),
    costUsdMicros: bigint("cost_usd_micros", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [
    index("jobs_video_idx").on(t.videoId),
    index("jobs_user_idx").on(t.userId, t.createdAt),
  ],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    /** groq | gemini | azure-tts | r2 | ... */
    provider: text("provider").notNull(),
    /** tokens_in | tokens_out | audio_sec | chars | bytes */
    metric: text("metric").notNull(),
    quantity: bigint("quantity", { mode: "number" }).notNull(),
    costUsdMicros: bigint("cost_usd_micros", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("usage_events_job_idx").on(t.jobId)],
);

/** Append-only. Never UPDATE or DELETE rows. Balance invariant: user.creditBalance == SUM(delta). */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: creditReason("reason").notNull(),
    /** e.g. 'job' | 'sepay_tx' — pairs with refId */
    refType: text("ref_type"),
    refId: text("ref_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("credit_ledger_user_idx").on(t.userId, t.createdAt)],
);

/**
 * Tin nhắn chat trong app.
 * room: "community" (phòng chung mọi user) hoặc "support:<userId>" (kênh riêng user ↔ admin).
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    room: text("room").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** người gửi là admin (xét theo ADMIN_EMAILS lúc gửi) — hiện badge trong UI */
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("chat_messages_room_idx").on(t.room, t.createdAt)],
);
