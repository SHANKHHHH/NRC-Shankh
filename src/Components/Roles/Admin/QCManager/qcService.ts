export interface QCData {
  id: number;
  jobNrcJobNo: string;
  status: "accept" | "pending" | "rejected" | "planned" | "start" | "stop";
  date: string;
  shift: string | null;
  operatorName: string | null;
  checkedBy: string;
  quantity: number;
  rejectedQty: number;
  reasonForRejection: string;
  remarks: string;
  qcCheckSignBy: string | null;
  jobStepId: number | null;
  // Rejection reason A–F and Others (from quality-dept API)
  rejectionReasonAQty?: number | null;
  rejectionReasonBQty?: number | null;
  rejectionReasonCQty?: number | null;
  rejectionReasonDQty?: number | null;
  rejectionReasonEQty?: number | null;
  rejectionReasonFQty?: number | null;
  rejectionReasonOthersQty?: number | null;
  startedBy?: string | null;
  // Step and job context
  stepNo?: number;
  stepName?: string;
  startDate?: string | null;
  endDate?: string | null;
  user?: string | null;
  machineDetails?: Array<{
    unit: string;
    machineId: string | null;
    machineCode: string | null;
    machineType: string;
  }>;
  jobPlanId?: number;
  jobDetails?: any;
  stepDetails?: any;
  qualityDetails?: any; // Full QC record for modal (includes rejection reason fields)
}

export interface QCSummary {
  totalQCChecks: number;
  totalQuantityChecked: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;
  rejectionPercentage: number;
  topRejectionReason: string;
  topRejectionCount: number;
  plannedChecks: number;
  inProgressChecks: number;
  completedChecks: number;
}

class QCService {
  private baseUrl = `${
    import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"
  }/api`;

  // Get all QC data
  async getAllQCData(): Promise<QCData[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${this.baseUrl}/quality-dept`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch QC data: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid API response format");
      }

      // API returns { data: [ { nrcJobNo, jobDetails, qualityDetails: [ {...}, ... ] } ] }
      // Flatten: one row per qualityDetails entry, with rejection reason fields
      return result.data.flatMap((item: any) => {
        const nrcJobNo = item.nrcJobNo || "-";
        const jobDetails = item.jobDetails || null;
        const detailsList = Array.isArray(item.qualityDetails)
          ? item.qualityDetails
          : item.qualityDetails
            ? [item.qualityDetails]
            : [];

        if (detailsList.length === 0) {
          return [
            {
              id: 0,
              jobNrcJobNo: nrcJobNo,
              status: "planned" as const,
              date: new Date().toISOString(),
              shift: null,
              operatorName: null,
              checkedBy: "-",
              quantity: 0,
              rejectedQty: 0,
              reasonForRejection: "-",
              remarks: "-",
              qcCheckSignBy: null,
              jobStepId: null,
              jobDetails,
              qualityDetails: null,
            },
          ];
        }

        return detailsList.map((qd: any) => ({
          id: qd.id !== undefined ? qd.id : 0,
          jobNrcJobNo: qd.jobNrcJobNo !== undefined ? qd.jobNrcJobNo : nrcJobNo,
          status:
            qd.status !== undefined ? qd.status : ("pending" as const),
          date:
            qd.date !== undefined
              ? qd.date
              : new Date().toISOString(),
          shift: qd.shift !== undefined ? qd.shift : null,
          operatorName: qd.operatorName !== undefined ? qd.operatorName : null,
          checkedBy:
            qd.checkedBy !== undefined
              ? qd.checkedBy
              : qd.qcCheckSignBy || "-",
          quantity: qd.quantity !== undefined ? qd.quantity : qd.passQuantity || 0,
          rejectedQty:
            qd.rejectedQty !== undefined ? qd.rejectedQty : qd.rejectedQuantity || 0,
          reasonForRejection: qd.reasonForRejection !== undefined ? qd.reasonForRejection : "-",
          remarks: qd.remarks !== undefined ? qd.remarks : "-",
          qcCheckSignBy: qd.qcCheckSignBy !== undefined ? qd.qcCheckSignBy : null,
          jobStepId: qd.jobStepId !== undefined ? qd.jobStepId : null,
          rejectionReasonAQty: qd.rejectionReasonAQty ?? null,
          rejectionReasonBQty: qd.rejectionReasonBQty ?? null,
          rejectionReasonCQty: qd.rejectionReasonCQty ?? null,
          rejectionReasonDQty: qd.rejectionReasonDQty ?? null,
          rejectionReasonEQty: qd.rejectionReasonEQty ?? null,
          rejectionReasonFQty: qd.rejectionReasonFQty ?? null,
          rejectionReasonOthersQty: qd.rejectionReasonOthersQty ?? null,
          startedBy: qd.startedBy ?? null,
          stepNo: qd.stepDetails?.stepNo,
          stepName: qd.stepDetails?.stepName ?? "QualityDept",
          startDate: qd.stepDetails?.startDate ?? null,
          endDate: qd.stepDetails?.endDate ?? null,
          user: qd.operatorName ?? null,
          machineDetails: qd.stepDetails?.machineDetails || [],
          jobDetails,
          stepDetails: qd.stepDetails ?? null,
          qualityDetails: qd,
        }));
      });
    } catch (error) {
      console.error("Error fetching QC data:", error);
      return [];
    }
  }

  // Get QC data by job number
  async getQCDataByJob(jobNo: string): Promise<QCData[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${this.baseUrl}/quality-dept/by-job/${encodeURIComponent(jobNo)}`,
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
          `Failed to fetch QC data for job ${jobNo}: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid API response format");
      }

      // by-job API returns { data: [ qd1, qd2, ... ] } - array of QualityDept records
      return result.data.map((qd: any) => ({
        id: qd.id || 0,
        jobNrcJobNo: qd.jobNrcJobNo || jobNo,
        status: qd.status || "pending",
        date: qd.date || new Date().toISOString(),
        shift: qd.shift || null,
        operatorName: qd.operatorName || null,
        checkedBy: qd.checkedBy || qd.qcCheckSignBy || "-",
        quantity: qd.quantity || qd.passQuantity || 0,
        rejectedQty: qd.rejectedQty || qd.rejectedQuantity || 0,
        reasonForRejection: qd.reasonForRejection || "-",
        remarks: qd.remarks || "-",
        qcCheckSignBy: qd.qcCheckSignBy || null,
        jobStepId: qd.jobStepId || null,
        rejectionReasonAQty: qd.rejectionReasonAQty ?? null,
        rejectionReasonBQty: qd.rejectionReasonBQty ?? null,
        rejectionReasonCQty: qd.rejectionReasonCQty ?? null,
        rejectionReasonDQty: qd.rejectionReasonDQty ?? null,
        rejectionReasonEQty: qd.rejectionReasonEQty ?? null,
        rejectionReasonFQty: qd.rejectionReasonFQty ?? null,
        rejectionReasonOthersQty: qd.rejectionReasonOthersQty ?? null,
        startedBy: qd.startedBy ?? null,
        stepNo: qd.jobStep?.stepNo,
        stepName: qd.jobStep?.stepName || "QualityDept",
        startDate: qd.jobStep?.startDate ?? null,
        endDate: qd.jobStep?.endDate ?? null,
        user: qd.operatorName || null,
        machineDetails: qd.jobStep?.machineDetails || [],
        jobPlanId: qd.jobStep?.jobPlanningId ?? null,
        stepDetails: qd.jobStep ?? null,
        qualityDetails: qd,
      }));
    } catch (error) {
      console.error(`Error fetching QC data for job ${jobNo}:`, error);
      throw error;
    }
  }

  // Get QC statistics
  async getQCStatistics(): Promise<QCSummary> {
    try {
      const qcData = await this.getAllQCData();

      if (qcData.length === 0) {
        return {
          totalQCChecks: 0,
          totalQuantityChecked: 0,
          totalAcceptedQuantity: 0,
          totalRejectedQuantity: 0,
          rejectionPercentage: 0,
          topRejectionReason: "No data",
          topRejectionCount: 0,
          plannedChecks: 0,
          inProgressChecks: 0,
          completedChecks: 0,
        };
      }

      const totalQuantityChecked = qcData.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
      const totalRejectedQuantity = qcData.reduce(
        (sum, item) => sum + (item.rejectedQty || 0),
        0
      );
      const totalAcceptedQuantity =
        totalQuantityChecked - totalRejectedQuantity;
      const rejectionPercentage =
        totalQuantityChecked > 0
          ? (totalRejectedQuantity / totalQuantityChecked) * 100
          : 0;

      // Count by status
      const plannedChecks = qcData.filter(
        (item) => item.status === "planned"
      ).length;
      const inProgressChecks = qcData.filter(
        (item) => item.status === "start" || item.status === "pending"
      ).length;
      const completedChecks = qcData.filter(
        (item) =>
          item.status === "accept" ||
          item.status === "rejected" ||
          item.status === "stop"
      ).length;

      // Find top rejection reason
      const rejectionReasons = qcData
        .filter((item) => item.rejectedQty > 0)
        .reduce((acc, item) => {
          const reason = item.reasonForRejection || "Unknown";
          acc[reason] = (acc[reason] || 0) + item.rejectedQty;
          return acc;
        }, {} as Record<string, number>);

      const topRejectionReason =
        Object.keys(rejectionReasons).length > 0
          ? Object.entries(rejectionReasons).sort(([, a], [, b]) => b - a)[0][0]
          : "No rejections";

      const topRejectionCount =
        Object.keys(rejectionReasons).length > 0
          ? Object.entries(rejectionReasons).sort(([, a], [, b]) => b - a)[0][1]
          : 0;

      return {
        totalQCChecks: qcData.length,
        totalQuantityChecked,
        totalAcceptedQuantity,
        totalRejectedQuantity,
        rejectionPercentage: Math.round(rejectionPercentage * 100) / 100,
        topRejectionReason,
        topRejectionCount,
        plannedChecks,
        inProgressChecks,
        completedChecks,
      };
    } catch (error) {
      console.error("Error calculating QC statistics:", error);
      return {
        totalQCChecks: 0,
        totalQuantityChecked: 0,
        totalAcceptedQuantity: 0,
        totalRejectedQuantity: 0,
        rejectionPercentage: 0,
        topRejectionReason: "Error",
        topRejectionCount: 0,
        plannedChecks: 0,
        inProgressChecks: 0,
        completedChecks: 0,
      };
    }
  }
}

export const qcService = new QCService();
export default qcService;
