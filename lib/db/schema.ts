import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    companyName: text("company_name").notNull().default(""),
    jobPosition: text("job_position").notNull().default(""),
    dateOfApplication: date("date_of_application").notNull(),
    jobOfferLink: text("job_offer_link").notNull().default(""),
    cvUsed: text("cv_used").notNull().default(""),
    emailUsed: text("email_used").notNull().default(""),
    status: text("status").notNull().default(""),
    finalStatus: text("final_status").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_job_applications_user_id").on(t.userId)]
)

export const userOptions = pgTable(
  "user_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    color: text("color").notNull().default("zinc"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_options_user_id").on(t.userId),
    unique("unique_user_option").on(t.userId, t.category, t.value),
  ]
)

export const jobApplicationMetadata = pgTable(
  "job_application_metadata",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull(),
    userId: text("user_id").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    sourceTitle: text("source_title").notNull().default(""),
    salaryText: text("salary_text").notNull().default(""),
    locations: jsonb("locations").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    extractionStatus: text("extraction_status").notNull().default("failed"),
    extractionError: text("extraction_error").notNull().default(""),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_job_application_metadata_user_id").on(t.userId),
    unique("unique_job_application_metadata_application_id").on(t.applicationId),
  ]
)

export const trackerUserSettings = pgTable("tracker_user_settings", {
  userId: text("user_id").primaryKey(),
  deeperSearchEnabled: boolean("dipper_search_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type JobApplicationRow = typeof jobApplications.$inferSelect
export type NewJobApplication = typeof jobApplications.$inferInsert
export type UserOptionRow = typeof userOptions.$inferSelect
export type NewUserOption = typeof userOptions.$inferInsert
export type JobApplicationMetadataRow = typeof jobApplicationMetadata.$inferSelect
export type NewJobApplicationMetadata = typeof jobApplicationMetadata.$inferInsert
export type TrackerUserSettingsRow = typeof trackerUserSettings.$inferSelect
