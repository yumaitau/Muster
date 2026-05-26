import { z } from "zod";

export const financeRoleConfigSchema = z.object({
  reportTitle: z.string().default("Weekly finance report")
});

export const weeklyFinanceReportInputSchema = z.object({
  date: z.string().optional()
});

export const financeReportArtifactSchema = z.object({
  balanceSheet: z.unknown(),
  narrative: z.string(),
  generatedAt: z.string()
});

export const WEEKLY_FINANCE_REPORT_PROCEDURE = "weekly-finance-report";
