export type ProductOutcome = {
  barcode: string;
  source: "contribution" | "catalogue";
  name: string | null;
  attempted: boolean | null;
  inspected: boolean | null;
  outcome: string;
  reason: string | null;
  publicationId: string | null;
  gaps: string[];
  provenance: { kind: string; host: string }[];
};
export type Counts = {
  reserved: number;
  attempted: number;
  attemptedUnknown?: number;
  inspected: number;
  inspectedUnknown?: number;
  published: number;
  staged: number;
  deferred: number;
  failed: number;
};
export type RunRecord = {
  runId: string;
  metadataApplications?: number | null;
  metadataRollbacks?: number | null;
  reservedAt: string;
  reportedAt: string | null;
  historyState: string;
  report: null | {
    kind: "routine";
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    skippedUnchanged: number;
    products: ProductOutcome[];
  };
  counts:
    null | (Counts & { bySource: { contribution: Counts; catalogue: Counts } });
};
export type HistoryPage = {
  runs: RunRecord[];
  nextCursor: string | null;
  enrichment: false;
};
export function validateHistory(data: HistoryPage): HistoryPage {
  if (
    data?.enrichment !== false ||
    !Array.isArray(data.runs) ||
    !(data.nextCursor === null || typeof data.nextCursor === "string")
  )
    throw Error("Invalid run history response");
  for (const run of data.runs) {
    if (
      !run.runId ||
      !run.reservedAt ||
      (run.report && !Array.isArray(run.report.products))
    )
      throw Error("Incomplete run history");
    if (
      run.report &&
      (!run.counts ||
        run.report.products.length !== run.counts.reserved ||
        run.report.products.length > 10)
    )
      throw Error("Run result count mismatch");
  }
  return data;
}
