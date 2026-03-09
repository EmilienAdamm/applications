import {
  date,
  index,
  integer,
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

export type JobApplicationRow = typeof jobApplications.$inferSelect
export type NewJobApplication = typeof jobApplications.$inferInsert
export type UserOptionRow = typeof userOptions.$inferSelect
export type NewUserOption = typeof userOptions.$inferInsert
