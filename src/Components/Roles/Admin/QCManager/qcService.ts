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
  // Add new fields from the API structure
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
  qualityDetails?: any; // For when QC details are available
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

      // Process the data based on the actual API structure
      return result.data.map((item: any) => {
        // Extract quality details if available (similar to printing details)
        const qualityDetails = item.qualityDetails || null;

        // If qualityDetails is null (for planned jobs), create a minimal object
        if (!qualityDetails) {
          return {
            id: item.id || 0,
            jobNrcJobNo: item.nrcJobNo || "-",
            status: item.status || "planned",
            date: item.startDate || item.createdAt || new Date().toISOString(),
            shift: null,
            operatorName: item.user || null,
            checkedBy: item.user || "-",
            quantity: 0,
            rejectedQty: 0,
            reasonForRejection: "-",
            remarks: "-",
            qcCheckSignBy: null,
            jobStepId: item.id || null,
            // Add step-level information
            stepNo: item.stepNo,
            stepName: item.stepName,
            startDate: item.startDate,
            endDate: item.endDate,
            user: item.user,
            machineDetails: item.machineDetails || [],
            jobPlanId: item.jobPlanId,
            qualityDetails: null,
          };
        }

        // Map the actual quality details when available
        // Use qualityDetails values directly, don't fall back to item values
        return {
          id:
            qualityDetails.id !== undefined ? qualityDetails.id : item.id || 0,
          jobNrcJobNo:
            qualityDetails.jobNrcJobNo !== undefined
              ? qualityDetails.jobNrcJobNo
              : item.nrcJobNo || "-",
          status:
            qualityDetails.status !== undefined
              ? qualityDetails.status
              : item.status || "pending",
          date:
            qualityDetails.date !== undefined
              ? qualityDetails.date
              : item.startDate || item.createdAt || new Date().toISOString(),
          shift:
            qualityDetails.shift !== undefined ? qualityDetails.shift : null,
          operatorName:
            qualityDetails.operatorName !== undefined
              ? qualityDetails.operatorName
              : item.user || null,
          checkedBy:
            qualityDetails.checkedBy !== undefined
              ? qualityDetails.checkedBy
              : qualityDetails.qcCheckSignBy || item.user || "-",
          quantity:
            qualityDetails.quantity !== undefined
              ? qualityDetails.quantity
              : qualityDetails.passQuantity || 0,
          rejectedQty:
            qualityDetails.rejectedQty !== undefined
              ? qualityDetails.rejectedQty
              : qualityDetails.rejectedQuantity || 0,
          reasonForRejection:
            qualityDetails.reasonForRejection !== undefined
              ? qualityDetails.reasonForRejection
              : "-",
          remarks:
            qualityDetails.remarks !== undefined ? qualityDetails.remarks : "-",
          qcCheckSignBy:
            qualityDetails.qcCheckSignBy !== undefined
              ? qualityDetails.qcCheckSignBy
              : null,
          jobStepId:
            qualityDetails.jobStepId !== undefined
              ? qualityDetails.jobStepId
              : item.id || null,
          // Add step-level information
          stepNo: item.stepNo,
          stepName: item.stepName,
          startDate: item.startDate,
          endDate: item.endDate,
          user: item.user,
          machineDetails: item.machineDetails || [],
          jobPlanId: item.jobPlanId,
          qualityDetails,
        };
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

      // Use the same mapping logic as getAllQCData
      return result.data.map((item: any) => {
        const qualityDetails = item.qualityDetails || null;

        if (!qualityDetails) {
          return {
            id: item.id || 0,
            jobNrcJobNo: item.nrcJobNo || jobNo,
            status: item.status || "planned",
            date: item.startDate || item.createdAt || new Date().toISOString(),
            shift: null,
            operatorName: item.user || null,
            checkedBy: item.user || "-",
            quantity: 0,
            rejectedQty: 0,
            reasonForRejection: "-",
            remarks: "-",
            qcCheckSignBy: null,
            jobStepId: item.id || null,
            stepNo: item.stepNo,
            stepName: item.stepName,
            startDate: item.startDate,
            endDate: item.endDate,
            user: item.user,
            machineDetails: item.machineDetails || [],
            jobPlanId: item.jobPlanId,
            qualityDetails: null,
          };
        }

        return {
          id: qualityDetails.id || item.id || 0,
          jobNrcJobNo: qualityDetails.jobNrcJobNo || jobNo,
          status: qualityDetails.status || item.status || "pending",
          date:
            qualityDetails.date ||
            item.startDate ||
            item.createdAt ||
            new Date().toISOString(),
          shift: qualityDetails.shift || null,
          operatorName: qualityDetails.operatorName || item.user || null,
          checkedBy:
            qualityDetails.checkedBy ||
            qualityDetails.qcCheckSignBy ||
            item.user ||
            "-",
          quantity: qualityDetails.quantity || qualityDetails.passQuantity || 0,
          rejectedQty:
            qualityDetails.rejectedQty || qualityDetails.rejectedQuantity || 0,
          reasonForRejection: qualityDetails.reasonForRejection || "-",
          remarks: qualityDetails.remarks || "-",
          qcCheckSignBy: qualityDetails.qcCheckSignBy || null,
          jobStepId: qualityDetails.jobStepId || item.id || null,
          stepNo: item.stepNo,
          stepName: item.stepName,
          startDate: item.startDate,
          endDate: item.endDate,
          user: item.user,
          machineDetails: item.machineDetails || [],
          jobPlanId: item.jobPlanId,
          qualityDetails,
        };
      });
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
