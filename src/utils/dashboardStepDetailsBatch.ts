/**
 * Single POST replaces thousands of GET .../by-step-id/:id calls on Admin / Production dashboards.
 */
const CHUNK_SIZE = 5000;

export async function fetchStepDetailsBatch(
  baseUrl: string,
  accessToken: string,
  steps: Array<{ stepId: number; stepName: string }>
): Promise<Record<string, unknown | null>> {
  if (steps.length === 0) return {};
  const merged: Record<string, unknown | null> = {};

  for (let i = 0; i < steps.length; i += CHUNK_SIZE) {
    const chunk = steps.slice(i, i + CHUNK_SIZE);
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/dashboard/step-details-batch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ steps: chunk }),
      }
    );
    if (!response.ok) {
      console.warn("step-details-batch failed:", response.status);
      continue;
    }
    const json = await response.json();
    if (json.success && json.data && typeof json.data === "object") {
      Object.assign(merged, json.data);
    }
  }

  return merged;
}
