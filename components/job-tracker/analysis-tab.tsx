"use client"

import type { AnalysisDataset } from "@/lib/job-tracker/analysis"

import { ApplicationFlowCard } from "@/components/job-tracker/analysis/application-flow-card"
import { ApplicationsByDayCard } from "@/components/job-tracker/analysis/applications-by-day-card"
import { OverviewMetrics } from "@/components/job-tracker/analysis/overview-metrics"
import { RequestedTechnologiesCard } from "@/components/job-tracker/analysis/requested-technologies-card"
import { ResumeUsageCard } from "@/components/job-tracker/analysis/resume-usage-card"
import { RoleWordsCard } from "@/components/job-tracker/analysis/role-words-card"
import { SalaryRecoveryCard } from "@/components/job-tracker/analysis/salary-recovery-card"
import { TopCompaniesCard } from "@/components/job-tracker/analysis/top-companies-card"

interface AnalysisTabProps {
  analysis: AnalysisDataset
  deeperSearchEnabled: boolean
}

export function AnalysisTab({
  analysis,
  deeperSearchEnabled,
}: AnalysisTabProps) {
  return (
    <section className="space-y-4">
      <OverviewMetrics overview={analysis.overview} />

      <div className="grid gap-4 xl:grid-cols-3">
        <TopCompaniesCard companyBars={analysis.companyBars} />
        <ResumeUsageCard cvBreakdown={analysis.cvBreakdown} />

        <div
          className={
            deeperSearchEnabled
              ? "grid gap-4 xl:col-span-3 xl:grid-cols-3"
              : "xl:col-span-3"
          }
        >
          <ApplicationFlowCard
            overview={analysis.overview}
            flowNodes={analysis.flowNodes}
            flowLinks={analysis.flowLinks}
            className={deeperSearchEnabled ? "xl:col-span-2" : undefined}
          />
          {deeperSearchEnabled ? (
            <SalaryRecoveryCard averageSalaryBars={analysis.averageSalaryBars} />
          ) : null}
        </div>

        <div
          className={
            deeperSearchEnabled
              ? "grid gap-4 xl:col-span-3 xl:grid-cols-2"
              : "xl:col-span-3"
          }
        >
          <ApplicationsByDayCard dailySeries={analysis.dailySeries} />
          {deeperSearchEnabled ? (
            <RequestedTechnologiesCard topSkills={analysis.topSkills} />
          ) : null}
        </div>

        <RoleWordsCard bubbleLayout={analysis.bubbleLayout} />
      </div>
    </section>
  )
}
