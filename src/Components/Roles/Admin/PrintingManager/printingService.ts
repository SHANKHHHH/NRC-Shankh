import { fetchJobsWithPODetailsBatch } from "../../../../utils/fetchJobsWithPODetailsBatch";

export interface PrintingDetails {
  id: number;
  jobNrcJobNo: string;
  status: "accept" | "pending" | "rejected" | "in_progress" | "hold";
  date: string;
  shift: string | null;
  oprName: string;
  noOfColours: number | null;
  inksUsed: string | null;
  quantity: number;
  wastage: number;
  coatingType: string | null;
  separateSheets: boolean | null;
  extraSheets: number | null;
  machine: string;
  jobStepId: number;
  // Add new fields from your API
  stepStatus?: string; // The step status (planned, start, stop)
  stepName?: string;
  user?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  jobDemand?: string;
  machineDetails?: Array<{
    unit: string;
    machineId: string;
    machineCode: string;
    machineType: string;
  }>;
  // Whether Production Head has already continued this step
  productionHeadContinued?: boolean;
  // Additional planning information
  jobPlanCode?: string;
  deliveryDate?: string | null;
  purchaseOrderId?: number | null;
}

export interface PrintingSummary {
  totalPrintJobs: number;
  totalQuantityPrinted: number;
  totalWastage: number;
  acceptedJobs: number;
  pendingJobs: number;
  rejectedJobs: number;
  inProgressJobs: number;
  holdJobs: number;
  plannedJobs: number;
  averageWastagePercentage: number;
}

class PrintingService {
  private baseUrl = `${import.meta.env.VITE_API_URL}/api`;

  // Get all printing details
  async getAllPrintingDetails(): Promise<PrintingDetails[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${this.baseUrl}/printing-details`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch printing data: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid API response format");
      }

      // Process the data correctly based on your API structure
      const baseList: PrintingDetails[] = result.data.map((item: any) => {
        // Extract printing details from the nested structure
        const printingDetails = item.printingDetails;

        // If printingDetails is null (for planned jobs), create a minimal object
        if (!printingDetails) {
          return {
            id: 0,
            jobNrcJobNo: item.jobPlanning?.nrcJobNo || "-",
            status: "pending",
            date: item.createdAt || new Date().toISOString(),
            shift: null,
            oprName: item.user || "-",
            noOfColours: null,
            inksUsed: null,
            quantity: 0,
            wastage: 0,
            coatingType: null,
            separateSheets: null,
            extraSheets: null,
            machine: item.machineDetails?.[0]?.machineCode || "-",
            jobStepId: item.jobStepId || 0,
            // Add step-level information
            stepStatus: item.status || "planned",
            stepName: item.stepName || "PrintingDetails",
            user: item.user,
            startDate: item.startDate,
            endDate: item.endDate,
            jobDemand: item.jobPlanning?.jobDemand || "medium",
            machineDetails: item.machineDetails || [],
            // For planned jobs with no printing details yet, Production Head has not continued
            productionHeadContinued: false,
            jobPlanCode: item.jobPlanning?.jobPlanCode ?? undefined,
            deliveryDate: null,
            purchaseOrderId: undefined,
          };
        }

        // Map the actual printing details
        return {
          id: printingDetails.id || 0,
          jobNrcJobNo:
            printingDetails.jobNrcJobNo || item.jobPlanning?.nrcJobNo || "-",
          status: printingDetails.status || "pending",
          date:
            printingDetails.date ||
            item.startDate ||
            item.createdAt ||
            new Date().toISOString(),
          shift: printingDetails.shift,
          oprName: printingDetails.oprName || item.user || "-",
          noOfColours: printingDetails.noOfColours,
          inksUsed: printingDetails.inksUsed,
          quantity: printingDetails.quantity || 0,
          wastage: printingDetails.wastage || 0,
          coatingType: printingDetails.coatingType,
          separateSheets: printingDetails.separateSheets,
          extraSheets: printingDetails.extraSheets,
          machine:
            printingDetails.machine ||
            item.machineDetails?.[0]?.machineCode ||
            "-",
          jobStepId: printingDetails.jobStepId || item.jobStepId || 0,
          // Add step-level information
          stepStatus: item.status || "planned",
          stepName: item.stepName || "PrintingDetails",
          user: item.user,
          startDate: item.startDate,
          endDate: item.endDate,
          jobDemand: item.jobPlanning?.jobDemand || "medium",
          machineDetails: item.machineDetails || [],
          // Reflect backend flag so Production Head button can be disabled properly
          productionHeadContinued: printingDetails.productionHeadContinued ?? false,
          jobPlanCode: item.jobPlanning?.jobPlanCode ?? undefined,
          deliveryDate: null,
          purchaseOrderId: undefined,
        };
      });

      // Enrich with job planning code and delivery date (frontend-only, no backend changes)
      return await this.enrichWithPlanningInfo(baseList);
    } catch (error) {
      console.error("Error fetching printing details:", error);
      return [];
    }
  }

  // Get printing details by job number
  async getPrintingDetailsByJob(jobNo: string): Promise<PrintingDetails[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${this.baseUrl}/printing-details/by-job/${encodeURIComponent(jobNo)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch printing data for job ${jobNo}: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid API response format");
      }

      // Use the same mapping logic as getAllPrintingDetails
      return result.data.map((item: any) => {
        const printingDetails = item.printingDetails;

        if (!printingDetails) {
          return {
            id: 0,
            jobNrcJobNo: item.jobPlanning?.nrcJobNo || jobNo,
            status: "pending",
            date: item.createdAt || new Date().toISOString(),
            shift: null,
            oprName: item.user || "-",
            noOfColours: null,
            inksUsed: null,
            quantity: 0,
            wastage: 0,
            coatingType: null,
            separateSheets: null,
            extraSheets: null,
            machine: item.machineDetails?.[0]?.machineCode || "-",
            jobStepId: item.jobStepId || 0,
            stepStatus: item.status || "planned",
            stepName: item.stepName || "PrintingDetails",
            user: item.user,
            startDate: item.startDate,
            endDate: item.endDate,
            jobDemand: item.jobPlanning?.jobDemand || "medium",
            machineDetails: item.machineDetails || [],
          };
        }

        return {
          id: printingDetails.id || 0,
          jobNrcJobNo: printingDetails.jobNrcJobNo || jobNo,
          status: printingDetails.status || "pending",
          date:
            printingDetails.date ||
            item.startDate ||
            item.createdAt ||
            new Date().toISOString(),
          shift: printingDetails.shift,
          oprName: printingDetails.oprName || item.user || "-",
          noOfColours: printingDetails.noOfColours,
          inksUsed: printingDetails.inksUsed,
          quantity: printingDetails.quantity || 0,
          wastage: printingDetails.wastage || 0,
          coatingType: printingDetails.coatingType,
          separateSheets: printingDetails.separateSheets,
          extraSheets: printingDetails.extraSheets,
          machine:
            printingDetails.machine ||
            item.machineDetails?.[0]?.machineCode ||
            "-",
          jobStepId: printingDetails.jobStepId || item.jobStepId || 0,
          stepStatus: item.status || "planned",
          stepName: item.stepName || "PrintingDetails",
          user: item.user,
          startDate: item.startDate,
          endDate: item.endDate,
          jobDemand: item.jobPlanning?.jobDemand || "medium",
          machineDetails: item.machineDetails || [],
        };
      });
    } catch (error) {
      console.error(`Error fetching printing details for job ${jobNo}:`, error);
      throw error;
    }
  }

  /**
   * Enrich printing jobs with deliveryDate (and purchaseOrderId / jobPlanCode when missing).
   * Uses POST /api/dashboard/jobs-with-po-details-batch (same as Admin list pages) instead of
   * 2×N GETs per unique NRC (job-planning + with-po-details), which caused thousands of requests.
   */
  private async enrichWithPlanningInfo(
    printJobs: PrintingDetails[]
  ): Promise<PrintingDetails[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        return printJobs;
      }

      const jobNos = Array.from(
        new Set(
          printJobs
            .map((p) => p.jobNrcJobNo)
            .filter((n) => n && n !== "-" && typeof n === "string")
        )
      ) as string[];

      if (jobNos.length === 0) return printJobs;

      const apiOrigin =
        import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";

      const poBatch = await fetchJobsWithPODetailsBatch(
        apiOrigin,
        accessToken,
        jobNos
      );

      const planningMap: Record<
        string,
        {
          jobPlanCode?: string;
          purchaseOrderId?: number | null;
          deliveryDate?: string | null;
        }
      > = {};

      for (const jobNo of jobNos) {
        const row = poBatch[jobNo];
        if (!row?.jobDetails) continue;

        const jd = row.jobDetails as Record<string, unknown>;
        const jobPlanCode =
          (jd.jobPlanCode as string | undefined) ||
          (jd.jobPlanningDetails &&
          typeof jd.jobPlanningDetails === "object" &&
          jd.jobPlanningDetails !== null
            ? (jd.jobPlanningDetails as { jobPlanCode?: string }).jobPlanCode
            : undefined);

        const rawPoId = jd.purchaseOrderId;
        const purchaseOrderId =
          typeof rawPoId === "number" ? rawPoId : null;

        const poList = Array.isArray(row.purchaseOrderDetails)
          ? row.purchaseOrderDetails
          : Array.isArray((jd as { purchaseOrders?: unknown[] }).purchaseOrders)
            ? ((jd as { purchaseOrders: unknown[] }).purchaseOrders as any[])
            : [];

        let deliveryDate: string | null | undefined = undefined;
        if (poList.length > 0) {
          let chosenPO: any = null;
          if (purchaseOrderId != null) {
            chosenPO =
              poList.find((po: any) => po.id === purchaseOrderId) || null;
          }
          if (!chosenPO) chosenPO = poList[0];
          if (chosenPO) {
            deliveryDate =
              chosenPO.nrcDeliveryDate || chosenPO.deliveryDate || null;
          }
        }

        planningMap[jobNo] = {
          jobPlanCode,
          purchaseOrderId: purchaseOrderId ?? null,
          deliveryDate,
        };
      }

      return printJobs.map((job) => {
        const info = planningMap[job.jobNrcJobNo];
        if (info) {
          if (info.jobPlanCode && job.jobPlanCode == null) {
            job.jobPlanCode = info.jobPlanCode;
          }
          if (info.purchaseOrderId !== undefined) {
            job.purchaseOrderId = info.purchaseOrderId;
          }
          if (info.deliveryDate !== undefined) {
            job.deliveryDate = info.deliveryDate;
          }
        }
        return job;
      });
    } catch (e) {
      console.warn("Failed to enrich printing jobs with planning info:", e);
      return printJobs;
    }
  }

  // Get printing statistics
  async getPrintingStatistics(): Promise<PrintingSummary> {
    try {
      const printingData = await this.getAllPrintingDetails();

      if (printingData.length === 0) {
        return {
          totalPrintJobs: 0,
          totalQuantityPrinted: 0,
          totalWastage: 0,
          acceptedJobs: 0,
          pendingJobs: 0,
          rejectedJobs: 0,
          inProgressJobs: 0,
          holdJobs: 0,
          plannedJobs: 0,
          averageWastagePercentage: 0,
        };
      }

      const totalQuantityPrinted = printingData.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
      const totalWastage = printingData.reduce(
        (sum, item) => sum + (item.wastage || 0),
        0
      );
      const averageWastagePercentage =
        totalQuantityPrinted > 0
          ? (totalWastage / totalQuantityPrinted) * 100
          : 0;

      return {
        totalPrintJobs: printingData.length,
        totalQuantityPrinted,
        totalWastage,
        acceptedJobs: printingData.filter((item) => item.status === "accept")
          .length,
        pendingJobs: printingData.filter((item) => item.status === "pending")
          .length,
        rejectedJobs: printingData.filter((item) => item.status === "rejected")
          .length,
        inProgressJobs: printingData.filter(
          (item) => item.status === "in_progress"
        ).length,
        holdJobs: printingData.filter((item) => item.status === "hold").length,
        plannedJobs: printingData.filter(
          (item) => item.stepStatus === "planned"
        ).length,
        averageWastagePercentage: Math.round(averageWastagePercentage),
      };
    } catch (error) {
      console.error("Error calculating printing statistics:", error);
      return {
        totalPrintJobs: 0,
        totalQuantityPrinted: 0,
        totalWastage: 0,
        acceptedJobs: 0,
        pendingJobs: 0,
        rejectedJobs: 0,
        inProgressJobs: 0,
        holdJobs: 0,
        plannedJobs: 0,
        averageWastagePercentage: 0,
      };
    }
  }
}

export const printingService = new PrintingService();
export default printingService;
