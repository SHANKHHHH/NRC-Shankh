/** Shared fetch for GET /api/jobs/:nrcJobNo/with-po-details (Admin Job Plans + Production Head). */

export interface JobDetailsWithPOData {
  jobDetails: any;
  purchaseOrderDetails: any[];
  poJobPlannings: any[];
}

export function getApiBase(): string {
  return (
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
    "https://nrprod.nrcontainers.com"
  );
}

export async function fetchJobWithPODetails(
  nrcJobNo: string
): Promise<JobDetailsWithPOData> {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    throw new Error("Authentication token not found");
  }

  const base = getApiBase();
  try {
    const response = await fetch(
      `${base}/api/jobs/${encodeURIComponent(nrcJobNo)}/with-po-details`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return {
          jobDetails: result.data,
          purchaseOrderDetails: result.data.purchaseOrders || [],
          poJobPlannings: result.data.poJobPlannings || [],
        };
      }
    }
  } catch (e) {
    console.error(`Error fetching job+PO details for ${nrcJobNo}:`, e);
    throw e;
  }

  return {
    jobDetails: null,
    purchaseOrderDetails: [],
    poJobPlannings: [],
  };
}
