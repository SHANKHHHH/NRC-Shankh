import React, { useState } from "react";
import {
  X,
  Calendar,
  Package,
  User,
  Building,
  Hash,
  Ruler,
  Download,
  Edit,
  Save,
} from "lucide-react";
import jsPDF from "jspdf";
import SingleJobPlanningModal from "../../Planner/modal/SingleJobPlanningModal";

interface PurchaseOrder {
  id: number;
  boardSize: string | null;
  boxDimensions: string | null;
  jobBoardSize: string | null;
  customer: string;
  deliveryDate: string;
  dieCode: number | null;
  dispatchDate: string | null;
  dispatchQuantity: number | null;
  fluteType: string | null;
  jockeyMonth: string | null;
  noOfUps: number | null;
  nrcDeliveryDate: string | null;
  noOfSheets: number | null;
  poDate: string;
  poNumber: string;
  pendingQuantity: number | null;
  pendingValidity: number | null;
  plant: string | null;
  shadeCardApprovalDate: string | null;
  sharedCardDiffDate: number | null;
  srNo: number | null;
  style: string | null;
  totalPOQuantity: number | null;
  unit: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobNrcJobNo: string | null;
  userId: string | null;
  job: {
    nrcJobNo: string;
    customerName: string;
    styleItemSKU: string;
  } | null;
  user: any | null;
}

interface PODetailModalProps {
  po: PurchaseOrder | null;
  completionStatus:
    | "artwork_pending"
    | "po_pending"
    | "more_info_pending"
    | "completed";
  onClose: () => void;
  onNavigateToForm?: (po: PurchaseOrder, formType: string) => void;
  onRefresh?: () => void;
}

const PODetailModal: React.FC<PODetailModalProps> = ({
  po,
  onClose,
  completionStatus,
  onNavigateToForm,
  onRefresh,
}) => {
  const [showJobPlanningModal, setShowJobPlanningModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editedData, setEditedData] = useState<PurchaseOrder>(
    po || ({} as PurchaseOrder)
  );

  if (!po) return null;

  // Update editedData when po changes
  React.useEffect(() => {
    setEditedData(po);
  }, [po]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-GB");
  };

  const generatePDF = async () => {
    if (!po) return;

    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 30;

      // Colors
      const colors = {
        primary: [41, 128, 185],
        secondary: [52, 73, 94],
        success: [39, 174, 96],
        warning: [241, 196, 15],
        danger: [231, 76, 60],
        light: [249, 250, 251],
        white: [255, 255, 255],
        text: [44, 62, 80],
        blue: [59, 130, 246],
        green: [34, 197, 94],
        purple: [147, 51, 234],
        orange: [249, 115, 22],
        red: [239, 68, 68],
        indigo: [99, 102, 241],
      };

      // Helper functions
      const drawRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        color: number[]
      ) => {
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(x, y, width, height, "F");
      };

      const drawBorder = (
        x: number,
        y: number,
        width: number,
        height: number,
        color: number[] = colors.light
      ) => {
        pdf.setDrawColor(color[0], color[1], color[2]);
        pdf.setLineWidth(0.5);
        pdf.rect(x, y, width, height, "S");
      };

      // Header
      drawRect(0, 0, pageWidth, 50, colors.primary);

      // Company logo area
      // drawRect(15, 10, 8, 8, colors.white);
      // pdf.setFontSize(6);
      // pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // pdf.text('NRC', 19, 15.5, { align: 'center' });

      // Company name
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("NR Containers", pageWidth / 2, 25, { align: "center" });

      // Subtitle
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Purchase Order Details", pageWidth / 2, 35, {
        align: "center",
      });

      yPosition = 65;

      // PO Header
      drawRect(15, yPosition - 5, pageWidth - 30, 25, colors.secondary);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text(`PO Number: ${po.poNumber}`, 20, yPosition + 5);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Customer: ${po.customer}`, 20, yPosition + 15);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        pageWidth - 20,
        yPosition + 15,
        { align: "right" }
      );

      yPosition += 35;

      // Section function
      const addSection = (
        title: string,
        data: { [key: string]: any },
        sectionColor: number[]
      ) => {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = 30;
        }

        // Section header
        drawRect(15, yPosition - 2, pageWidth - 30, 12, sectionColor);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${title}`, 20, yPosition + 6);
        yPosition += 15;

        // Content background
        const contentHeight =
          Object.keys(data).filter(
            (key) =>
              data[key] !== null &&
              data[key] !== undefined &&
              data[key] !== "N/A" &&
              data[key] !== ""
          ).length *
            7 +
          8;

        drawRect(
          15,
          yPosition - 2,
          pageWidth - 30,
          contentHeight,
          colors.white
        );
        drawBorder(15, yPosition - 2, pageWidth - 30, contentHeight);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        let itemY = yPosition + 3;
        Object.entries(data).forEach(([key, value]) => {
          if (
            value !== null &&
            value !== undefined &&
            value !== "N/A" &&
            value !== ""
          ) {
            const displayValue = String(value);

            pdf.setFont("helvetica", "bold");
            pdf.text(`${key}:`, 20, itemY);

            pdf.setFont("helvetica", "normal");
            pdf.text(displayValue, 80, itemY);

            itemY += 7;
          }
        });

        yPosition = itemY + 8;
      };

      // Basic Information
      addSection(
        "Basic Information",
        {
          "PO Number": po.poNumber,
          Status: po.status,
          Style: po.style || "N/A",
          Unit: po.unit,
        },
        colors.blue
      );

      // Customer Information
      addSection(
        "Customer Information",
        {
          Customer: po.customer,
          "Job Number": po.job?.nrcJobNo || po.jobNrcJobNo || "N/A",
          "Style SKU": po.job?.styleItemSKU || "N/A",
        },
        colors.green
      );

      // Important Dates
      addSection(
        "Important Dates",
        {
          "PO Date": formatDate(po.poDate),
          "Delivery Date": formatDate(po.deliveryDate),
          "Dispatch Date": formatDate(po.dispatchDate || ""),
          "NRC Delivery Date": formatDate(po.nrcDeliveryDate || ""),
          "Shade Card Approval": formatDate(po.shadeCardApprovalDate || ""),
        },
        colors.purple
      );

      // Specifications
      addSection(
        "Specifications",
        {
          "Board Size": po.boardSize || "N/A",
          "Flute Type": po.fluteType || "N/A",
          "Die Code": po.dieCode || "N/A",
          "No. of Ups": po.noOfUps || "N/A",
          "Jockey Month": po.jockeyMonth || "N/A",
        },
        colors.orange
      );

      // Quantities
      addSection(
        "Quantities",
        {
          "Total PO Quantity": po.totalPOQuantity?.toLocaleString() || "0",
          "No. of Sheets": po.noOfSheets?.toLocaleString() || "0",
          "Dispatch Quantity": po.dispatchQuantity?.toLocaleString() || "0",
          "Pending Quantity": po.pendingQuantity?.toLocaleString() || "0",
          "Pending Validity": po.pendingValidity
            ? `${po.pendingValidity} days`
            : "0 days",
        },
        colors.red
      );

      // Plant & System Information
      addSection(
        "Plant & System",
        {
          Plant: po.plant || "N/A",
          "SR No": po.srNo || "N/A",
          "Shared Card Diff": po.sharedCardDiffDate
            ? `${po.sharedCardDiffDate} days`
            : "0 days",
          Created: formatDateTime(po.createdAt),
          Updated: formatDateTime(po.updatedAt),
        },
        colors.indigo
      );

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);

        drawRect(0, pageHeight - 15, pageWidth, 15, colors.light);

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        pdf.text("NR Containers Pvt. Ltd.", 15, pageHeight - 7);
        pdf.text(
          `Generated on ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        );
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 7, {
          align: "right",
        });
      }

      // Save PDF
      pdf.save(
        `PO_${po.poNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleFormNavigation = (po: PurchaseOrder, formType: string) => {
    if (formType === "moreInfo") {
      setShowJobPlanningModal(true);
      return;
    }

    onClose();
    onNavigateToForm?.(po, formType);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(po); // Reset to original data
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Prepare the update payload
      const updatePayload = {
        poNumber: editedData.poNumber,
        customer: editedData.customer,
        totalPOQuantity: editedData.totalPOQuantity,
        dispatchQuantity: editedData.dispatchQuantity,
        pendingQuantity: editedData.pendingQuantity,
        boardSize: editedData.boardSize,
        fluteType: editedData.fluteType,
        noOfSheets: editedData.noOfSheets,
        noOfUps: editedData.noOfUps,
        deliveryDate: editedData.deliveryDate,
        dispatchDate: editedData.dispatchDate,
        poDate: editedData.poDate,
        shadeCardApprovalDate: editedData.shadeCardApprovalDate,
        dieCode: editedData.dieCode,
        style: editedData.style,
        plant: editedData.plant,
        unit: editedData.unit,
        srNo: editedData.srNo,
      };

      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/purchase-orders/${po.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update purchase order");
      }

      await response.json();
      alert("Purchase order updated successfully!");
      setIsEditing(false);

      // Refresh the data
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } catch (error) {
      console.error("Error updating purchase order:", error);
      alert(
        `Failed to update purchase order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFieldChange = (field: keyof PurchaseOrder, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobPlanningSubmit = async (jobPlanningData: any) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      console.log("🔍 Received job planning data:", jobPlanningData);

      // 🔥 UPDATED: Handle multiple machines per step
      const jobPlanPayload = {
        nrcJobNo: po.jobNrcJobNo || po.job?.nrcJobNo,
        jobDemand: jobPlanningData.jobDemand,
        purchaseOrderId: po.id, // Include PO ID if available
        finishedGoodsQty: jobPlanningData.finishedGoodsQty || 0, // Include finished goods quantity
        steps: jobPlanningData.steps.map((step: any, index: number) => {
          console.log(`🔍 Processing step ${step.stepName}:`, step);

          // 🔥 NEW: Handle multiple machines from the new modal structure
          let machineDetails = [];

          if (
            step.machineDetails &&
            Array.isArray(step.machineDetails) &&
            step.machineDetails.length > 0
          ) {
            // New format: already has machineDetails array
            machineDetails = step.machineDetails;
          } else if (step.machineId) {
            // Old format: single machine (backward compatibility)
            machineDetails = [
              {
                id: step.machineId,
                unit: po.unit || "Unit 1",
                machineCode: step.machineCode,
                machineType: step.machineDetail || "Production Step",
              },
            ];
          } else {
            // No machines assigned
            machineDetails = [
              {
                unit: po.unit || "Unit 1",
                machineId: null,
                machineCode: null,
                machineType: "Not Assigned",
              },
            ];
          }

          console.log(
            `🔍 Final machineDetails for ${step.stepName}:`,
            machineDetails
          );

          return {
            jobStepId: step.jobStepId || index + 1,
            stepNo: step.stepNo || index + 1,
            stepName: step.stepName,
            machineDetails: machineDetails, // 🔥 This will be stored as JSON in DB
            status: step.status || ("planned" as const),
            startDate: step.startDate || null,
            endDate: step.endDate || null,
            user: step.user || null,
            createdAt: step.createdAt || new Date().toISOString(),
            updatedAt: step.updatedAt || new Date().toISOString(),
          };
        }),
      };

      console.log(
        "📤 Final job plan payload:",
        JSON.stringify(jobPlanPayload, null, 2)
      );

      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(jobPlanPayload),
        }
      );

      const responseText = await response.text();
      console.log("🔍 API Response:", responseText);

      if (!response.ok) {
        let errorMessage = "Failed to create job plan";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error("❌ API Error:", errorData);
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // 🔥 UPDATED: Handle machine status updates for multiple machines
      const allMachines = [];

      // Collect all machines from the new structure
      if (
        jobPlanningData.selectedMachines &&
        Array.isArray(jobPlanningData.selectedMachines)
      ) {
        allMachines.push(...jobPlanningData.selectedMachines);
      } else {
        // Fallback: collect machines from steps
        jobPlanningData.steps.forEach((step: any) => {
          if (step.machineDetails && Array.isArray(step.machineDetails)) {
            step.machineDetails.forEach((machine: any) => {
              if (machine.id) {
                allMachines.push({
                  id: machine.id,
                  machineCode: machine.machineCode,
                  machineType: machine.machineType,
                });
              }
            });
          }
        });
      }

      console.log("🏭 All machines to update status:", allMachines);

      // Update machine statuses
      if (allMachines.length > 0) {
        const machineUpdatePromises = allMachines
          .filter((machine: any) => machine.id)
          .map(async (machine: any) => {
            try {
              console.log(
                `🔧 Updating machine ${machine.id} (${machine.machineCode}) status to busy`
              );
              const machineResponse = await fetch(
                `https://nrprod.nrcontainers.com/api/machines/${machine.id}/status`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({ status: "busy" }),
                }
              );

              if (!machineResponse.ok) {
                console.warn(`Failed to update machine ${machine.id} status`);
              } else {
                console.log(
                  `✅ Successfully updated machine ${machine.id} status`
                );
              }
            } catch (error) {
              console.warn(
                `Error updating machine ${machine.id} status:`,
                error
              );
            }
          });

        await Promise.all(machineUpdatePromises);
        console.log("✅ All machine status updates completed");
      }

      console.log("✅ Job plan created successfully");
      setShowJobPlanningModal(false);
      onClose();
      alert("Job plan created successfully!");

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("❌ Job planning error:", error);
      alert(
        `Failed to create job plan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 lg:p-6 border-b border-gray-200 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
              Purchase Order Details
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 truncate">
              PO Number: {po.poNumber}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Edit Button - Show when not editing */}
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors flex items-center space-x-2"
                title="Edit Purchase Order"
              >
                <Edit size={18} />
              </button>
            )}

            {/* Download PDF Button */}
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="Download PDF"
            >
              <Download size={18} />
              {isGeneratingPDF && (
                <span className="text-sm hidden sm:inline">Generating...</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors self-end sm:self-auto"
            >
              <X size={18} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      PO Number:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.poNumber || ""}
                        onChange={(e) =>
                          handleFieldChange("poNumber", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.poNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Status:
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        po.status === "created"
                          ? "bg-blue-100 text-blue-800"
                          : po.status === "in_progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : po.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Style:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.style || ""}
                        onChange={(e) =>
                          handleFieldChange("style", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.style || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Unit:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.unit || ""}
                        onChange={(e) =>
                          handleFieldChange("unit", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" />
                  Customer Information
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Customer:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.customer || ""}
                        onChange={(e) =>
                          handleFieldChange("customer", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.customer}
                      </span>
                    )}
                  </div>
                  {po.job && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          Job Number:
                        </span>
                        <span className="text-xs sm:text-sm text-gray-800 break-all">
                          {po.job.nrcJobNo}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          Style SKU:
                        </span>
                        <span className="text-xs sm:text-sm text-gray-800 break-all">
                          {po.job.styleItemSKU}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-600" />
                  Important Dates
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      PO Date:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedData.poDate
                            ? editedData.poDate.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange("poDate", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {formatDate(po.poDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Delivery Date:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedData.deliveryDate
                            ? editedData.deliveryDate.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange("deliveryDate", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {formatDate(po.deliveryDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Dispatch Date:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedData.dispatchDate
                            ? editedData.dispatchDate.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange("dispatchDate", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {formatDate(po.dispatchDate || "")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      NRC Delivery:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedData.nrcDeliveryDate
                            ? editedData.nrcDeliveryDate.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange("nrcDeliveryDate", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {formatDate(po.nrcDeliveryDate || "")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Shade Card Approval:
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedData.shadeCardApprovalDate
                            ? editedData.shadeCardApprovalDate.split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            "shadeCardApprovalDate",
                            e.target.value
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {formatDate(po.shadeCardApprovalDate || "")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Specifications */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Ruler className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" />
                  Specifications
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Board Size:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.boardSize || ""}
                        onChange={(e) =>
                          handleFieldChange("boardSize", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.boardSize || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Flute Type:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.fluteType || ""}
                        onChange={(e) =>
                          handleFieldChange("fluteType", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.fluteType || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Die Code:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.dieCode || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "dieCode",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.dieCode || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      No. of Ups:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.noOfUps || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "noOfUps",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.noOfUps || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Jockey Month:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.jockeyMonth || ""}
                        onChange={(e) =>
                          handleFieldChange("jockeyMonth", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.jockeyMonth || "N/A"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantities */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Hash className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-600" />
                  Quantities
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Total PO Quantity:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.totalPOQuantity || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "totalPOQuantity",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.totalPOQuantity || 0}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      No. of Sheets:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.noOfSheets || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "noOfSheets",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.noOfSheets || 0}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Dispatch Quantity:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.dispatchQuantity || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "dispatchQuantity",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.dispatchQuantity || 0}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Pending Quantity:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.pendingQuantity || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "pendingQuantity",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.pendingQuantity || 0}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Pending Validity:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.pendingValidity || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "pendingValidity",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.pendingValidity || 0} days
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Plant & System Info */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-indigo-600" />
                  Plant & System
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Plant:
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.plant || ""}
                        onChange={(e) =>
                          handleFieldChange("plant", e.target.value)
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800 break-all">
                        {po.plant || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      SR No:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData.srNo || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "srNo",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="text-xs sm:text-sm text-gray-800 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-800">
                        {po.srNo || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Shared Card Diff:
                    </span>
                    <span className="text-xs sm:text-sm text-gray-800">
                      {po.sharedCardDiffDate || 0} days
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Created:
                    </span>
                    <span className="text-xs sm:text-sm text-gray-800">
                      {formatDateTime(po.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      Updated:
                    </span>
                    <span className="text-xs sm:text-sm text-gray-800">
                      {formatDateTime(po.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-4 sm:px-6 py-2 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-4 sm:px-6 py-2 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-50 flex items-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {completionStatus === "more_info_pending" && (
                <button
                  onClick={() => handleFormNavigation(po, "moreInfo")}
                  className="px-4 sm:px-6 py-2 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Complete More Info
                </button>
              )}

              {completionStatus === "artwork_pending" && (
                <button
                  onClick={() => handleFormNavigation(po, "artwork")}
                  className="px-4 sm:px-6 py-2 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base"
                >
                  Complete Artwork Details
                </button>
              )}

              {completionStatus === "po_pending" && (
                <button
                  onClick={() => handleFormNavigation(po, "po")}
                  className="px-4 sm:px-6 py-2 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
                >
                  Complete PO Details
                </button>
              )}

              {![
                "more_info_pending",
                "artwork_pending",
                "po_pending",
                "completed",
              ].includes(completionStatus) && (
                <button
                  onClick={onClose}
                  className="px-4 sm:px-6 py-2 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
                >
                  Close
                </button>
              )}
            </>
          )}

          {showJobPlanningModal && (
            <SingleJobPlanningModal
              po={po}
              onSave={handleJobPlanningSubmit}
              onClose={() => setShowJobPlanningModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PODetailModal;
