/**
 * Single POST replaces N× GET /api/jobs/:nrcJobNo/with-po-details for job list cards (same payload per job).
 */
const CHUNK_SIZE = 500;

export type JobWithPOClientShape = {
  jobDetails: any;
  purchaseOrderDetails: any[];
  poJobPlannings: any[];
  steps?: any;
  jobPlanningDetails?: any;
};

export async function fetchJobsWithPODetailsBatch(
  baseUrl: string,
  accessToken: string,
  nrcJobNos: string[]
): Promise<Record<string, JobWithPOClientShape | null>> {
  const unique = [...new Set(nrcJobNos.map(String).filter(Boolean))];
  const merged: Record<string, JobWithPOClientShape | null> = {};

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/dashboard/jobs-with-po-details-batch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nrcJobNos: chunk }),
      }
    );
    if (!response.ok) {
      console.warn("jobs-with-po-details-batch failed:", response.status);
      continue;
    }
    const json = await response.json();
    if (json.success && json.data && typeof json.data === "object") {
      for (const [k, v] of Object.entries(json.data)) {
        if (v == null) {
          merged[k] = null;
        } else {
          const d = v as any;
          merged[k] = {
            jobDetails: d,
            purchaseOrderDetails:
              d.purchaseOrders || d.purchaseOrderDetails || [],
            poJobPlannings: d.poJobPlannings || [],
            steps: d.steps,
            jobPlanningDetails: d.jobPlanningDetails,
          };
        }
      }
    }
  }

  return merged;
}
