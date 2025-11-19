import React from "react";
import {
  X,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Download,
  PlayCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import logoImage from "../../../../assets/Login/logo.jpg";

interface Job {
  id: number;
  nrcJobNo: string;
  status?: string;
  finalStatus?: string;
  company?: string;
  customerName?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  totalDuration?: number;
  jobDetails?: any;
  purchaseOrderDetails?: any;
  purchaseOrderId?: number;
  jobPlanningDetails?: {
    purchaseOrderDetails?: any[];
    allStepsDetails?: any[];
  };
  allSteps?: any[];
  allStepDetails?: {
    paperStore?: any[];
    printingDetails?: any[];
    corrugation?: any[];
    flutelam?: any[];
    punching?: any[];
    sideFlapPasting?: any[];
    qualityDept?: any[];
    dispatchProcess?: any[];
  };

  steps?: any[];
}

interface DetailedJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onResumeJob?: (jobNo: string) => void;
  isResumingJob?: boolean;
}

const DetailedJobModal: React.FC<DetailedJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onResumeJob,
  isResumingJob,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  if (!isOpen || !job) return null;

  // Helper function to convert logo to base64
  const getLogoAsBase64 = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataURL);
      };
      img.onerror = () => reject(new Error("Failed to load logo"));
      img.src = logoImage;
    });
  };

  const generatePDF = async () => {
    if (!job) return;

    setIsGeneratingPDF(true);

    try {
      // Create PDF instance
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15; // Reduced from 20

      // Colors - Job Card Style
      const colors = {
        primary: [0, 102, 204], // Blue for headers
        white: [255, 255, 255],
        black: [0, 0, 0],
        lightGray: [240, 240, 240],
        darkGray: [64, 64, 64],
      };

      // Helper function to draw a colored rectangle
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

      // Helper function to draw a border
      const drawBorder = (
        x: number,
        y: number,
        width: number,
        height: number,
        lineWidth: number = 0.5
      ) => {
        pdf.setDrawColor(colors.black[0], colors.black[1], colors.black[2]);
        pdf.setLineWidth(lineWidth);
        pdf.rect(x, y, width, height);
      };

      // Draw thick blue borders on left and right
      drawRect(0, 0, 3, pageHeight, colors.primary);
      drawRect(pageWidth - 3, 0, 3, pageHeight, colors.primary);

      // Draw thin blue borders on top and bottom
      drawRect(0, 0, pageWidth, 2, colors.primary);
      drawRect(0, pageHeight - 2, pageWidth, 2, colors.primary);

      // Header Section - Company Logo and Name - REDUCED HEIGHT
      const headerHeight = 12; // Reduced from 15
      drawRect(15, yPosition, 22, headerHeight, colors.primary); // Reduced width
      drawBorder(15, yPosition, 22, headerHeight, 1);

      // Add NRC Logo - SMALLER
      try {
        const logoBase64 = await getLogoAsBase64();
        pdf.addImage(logoBase64, "JPEG", 16, yPosition + 1, 20, 10); // Smaller logo
      } catch (error) {
        console.warn("Could not load logo, using text fallback:", error);
        pdf.setFontSize(7); // Reduced font size
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
        pdf.text("NRC", 26, yPosition + 7, { align: "center" });
      }

      // Company Name - SMALLER
      pdf.setFontSize(9); // Reduced from 10
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      pdf.text("NRCONTAINERS PRIVATE LIMITED", 45, yPosition + 4); // Adjusted position
      pdf.setFontSize(5); // Reduced from 6
      pdf.setFont("helvetica", "normal");
      pdf.text("INTELLIGENT PACKAGING", 45, yPosition + 8); // Adjusted position

      // Job Card Title - SMALLER
      pdf.setFontSize(16); // Reduced from 20
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text("JOB DETAILS", pageWidth - 20, yPosition + 8, {
        // Adjusted position
        align: "right",
      });

      yPosition += headerHeight + 8; // Reduced spacing

      // Main Information Section - SMALLER FONTS
      pdf.setFontSize(8); // Reduced from 10
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(colors.black[0], colors.black[1], colors.black[2]);

      // Handle purchase order details
      let poDetailsArray =
        job.jobPlanningDetails?.purchaseOrderDetails ||
        job.purchaseOrderDetails;

      // If purchaseOrderId exists, find the matching purchase order
      let poDetails: any;
      if (job.purchaseOrderId && Array.isArray(poDetailsArray)) {
        poDetails = poDetailsArray.find(
          (po: any) => po.id === job.purchaseOrderId
        );
        // If not found, fall back to first item
        if (!poDetails) {
          poDetails = poDetailsArray[0];
        }
      } else {
        // Existing logic: take first item if array, or the object itself
        poDetails = Array.isArray(poDetailsArray)
          ? poDetailsArray[0]
          : poDetailsArray;
      }

      // Left Column
      pdf.text(
        `Client's Name : ${String(
          job.jobDetails?.customerName || job.jobDetails?.company || "N/A"
        )}`,
        20,
        yPosition
      );
      pdf.text(
        `Job Name : ${String(
          job.nrcJobNo || job.jobDetails?.nrcJobNo || "N/A"
        )}`,
        20,
        yPosition + 5 // Reduced spacing from 6
      );
      pdf.text(
        `Date : ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        20,
        yPosition + 10 // Reduced spacing from 12
      );

      // Right Column
      pdf.text(
        `Job Card No. : ${String(job.id || "N/A")}`,
        pageWidth / 2 + 20,
        yPosition
      );
      pdf.text(
        `Quantity : ${String(poDetails?.totalPOQuantity || "N/A")}`,
        pageWidth / 2 + 20,
        yPosition + 5 // Reduced spacing from 6
      );

      // Bottom Row
      pdf.text(
        `PO No. : ${String(poDetails?.poNumber || "N/A")}`,
        20,
        yPosition + 15 // Reduced spacing from 18
      );
      pdf.text(
        `No of Sheets: ${String(poDetails?.noOfSheets || "N/A")}`,
        pageWidth / 2 + 20,
        yPosition + 15 // Reduced spacing from 18
      );

      yPosition += 25; // Reduced spacing from 35

      // PAPER STORE Section Header
      drawRect(15, yPosition, pageWidth - 30, 6, colors.primary); // Reduced height from 8
      pdf.setFontSize(10); // Reduced from 12
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      pdf.text("STEP DETAILS", pageWidth / 2, yPosition + 4, {
        align: "center",
      }); // Adjusted position
      yPosition += 8; // Reduced spacing from 12

      // Get all steps data
      const availableSteps = job.allSteps || job.steps || [];

      // Define step order for sorting
      const stepOrder = [
        "PaperStore",
        "PrintingDetails",
        "Corrugation",
        "FluteLaminateBoardConversion",
        "Punching",
        "SideFlapPasting",
        "QualityDept",
        "DispatchProcess",
      ];

      // Sort steps according to predefined order
      const sortedSteps = [...availableSteps].sort((a, b) => {
        const aIndex = stepOrder.indexOf(a.stepName);
        const bIndex = stepOrder.indexOf(b.stepName);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      // Grid layout for steps - 2 columns
      const columnWidth = (pageWidth - 40) / 2; // Two columns with margins
      const leftColumnX = 15;
      const rightColumnX = 15 + columnWidth + 10; // 10mm gap between columns
      let leftColumnY = yPosition;
      let rightColumnY = yPosition;
      let currentColumn = 0; // 0 for left, 1 for right

      // Helper function to get section titles
      function getSectionTitle(stepName: string): string {
        switch (stepName) {
          case "PaperStore":
            return "Paper Store";
          case "PrintingDetails":
            return "Printing Details";
          case "Corrugation":
            return "Corrugation";
          case "FluteLaminateBoardConversion":
            return "Flute Lamination";
          case "Punching":
            return "Punching";
          case "SideFlapPasting":
            return "Flap Pasting";
          case "QualityDept":
            return "Quality Check";
          case "DispatchProcess":
            return "Dispatch";
          default:
            return stepName.replace(/([a-z])([A-Z])/g, "$1 $2");
        }
      }

      // Get step details from the step object
      function getStepDetailsFromStep(step: any) {
        if (job && job.allStepDetails) {
          switch (step.stepName) {
            case "PaperStore":
              return job.allStepDetails.paperStore || [];
            case "PrintingDetails":
              return job.allStepDetails.printingDetails || [];
            case "Corrugation":
              return job.allStepDetails.corrugation || [];
            case "FluteLaminateBoardConversion":
              return job.allStepDetails.flutelam || [];
            case "Punching":
              return job.allStepDetails.punching || [];
            case "SideFlapPasting":
              return job.allStepDetails.sideFlapPasting || [];
            case "QualityDept":
              return job.allStepDetails.qualityDept || [];
            case "DispatchProcess":
              return job.allStepDetails.dispatchProcess || [];
            default:
              return [];
          }
        }

        // Check if stepDetails is directly available on the step object
        if (step.stepDetails) {
          // If stepDetails is nested in .data property
          if (step.stepDetails.data) {
            return [step.stepDetails.data];
          } 
          // If stepDetails is an array
          else if (Array.isArray(step.stepDetails)) {
            return step.stepDetails;
          }
          // If stepDetails is directly an object (most common case now)
          else if (typeof step.stepDetails === 'object') {
            return [step.stepDetails];
          }
        }

        return [];
      }

      // Process each step in grid layout
      sortedSteps.forEach((step: any) => {
        const sectionTitle = getSectionTitle(step.stepName);
        const stepDetails = getStepDetailsFromStep(step);

        // Calculate position based on current column
        const currentX = currentColumn === 0 ? leftColumnX : rightColumnX;
        let currentY = currentColumn === 0 ? leftColumnY : rightColumnY;

        // Step header - smaller
        const stepHeaderHeight = 8;
        drawRect(
          currentX,
          currentY,
          columnWidth,
          stepHeaderHeight,
          [230, 244, 255]
        ); // Light blue
        drawBorder(currentX, currentY, columnWidth, stepHeaderHeight, 0.3);

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(
          colors.primary[0],
          colors.primary[1],
          colors.primary[2]
        );
        pdf.text(sectionTitle, currentX + 3, currentY + 5);

        // Status on the right
        const statusText = step.status || "planned";
        const statusColor =
          statusText === "completed"
            ? [34, 197, 94]
            : statusText === "in-progress"
            ? [251, 191, 36]
            : [107, 114, 128];

        pdf.setFontSize(6);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        pdf.text(
          statusText.toUpperCase(),
          currentX + columnWidth - 3,
          currentY + 5,
          { align: "right" }
        );

        currentY += stepHeaderHeight + 2;

        // Step details in compact format
        if (stepDetails && stepDetails.length > 0) {
          const detail = stepDetails[0]; // Take first detail for compact display
          const detailsHeight = 20; // Fixed height for consistency

          // Draw details box
          drawRect(
            currentX,
            currentY,
            columnWidth,
            detailsHeight,
            colors.white
          );
          drawBorder(currentX, currentY, columnWidth, detailsHeight, 0.2);

          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(
            colors.darkGray[0],
            colors.darkGray[1],
            colors.darkGray[2]
          );

          let detailY = currentY + 4;
          const leftDetailX = currentX + 2;
          const rightDetailX = currentX + columnWidth / 2 + 2;
          let detailCount = 0;

          // Display key fields based on step type
          const displayField = (label: string, value: any) => {
            if (value && detailCount < 6) {
              // Limit to 6 fields max
              const text = `${label}: ${value}`;
              const xPos = detailCount % 2 === 0 ? leftDetailX : rightDetailX;
              const yPos = detailY + Math.floor(detailCount / 2) * 3;

              pdf.text(text, xPos, yPos);
              detailCount++;
            }
          };

          // Step-specific fields (most important ones only)
          if (step.stepName === "PaperStore") {
            displayField("Size", detail.sheetSize);
            displayField("Qty", detail.quantity);
            displayField("Available", detail.available);
            displayField("GSM", detail.gsm);
            displayField("Mill", detail.mill);
            displayField("Quality", detail.quality);
          } else if (step.stepName === "PrintingDetails") {
            displayField("Qty", detail.quantity);
            displayField("Machine", detail.machine);
            displayField("Operator", detail.oprName);
            displayField("Inks", detail.inksUsed);
            displayField("Colors", detail.noOfColours);
            displayField("Coating", detail.coatingType);
          } else if (step.stepName === "Corrugation") {
            displayField("Qty", detail.quantity);
            displayField("Machine", detail.machineNo);
            displayField("Flute", detail.flute);
            displayField("Size", detail.size);
            displayField("GSM1", detail.gsm1);
            displayField("GSM2", detail.gsm2);
          } else if (step.stepName === "FluteLaminateBoardConversion") {
            displayField("Qty", detail.quantity);
            displayField("Operator", detail.operatorName);
            displayField("Film", detail.film);
            displayField("Adhesive", detail.adhesive);
            displayField("Wastage", detail.wastage);
            displayField("Shift", detail.shift);
          } else if (step.stepName === "Punching") {
            displayField("Qty", detail.quantity);
            displayField("Machine", detail.machine);
            displayField("Operator", detail.operatorName);
            displayField("Die", detail.die);
            displayField("Wastage", detail.wastage);
            displayField("Shift", detail.shift);
          } else if (step.stepName === "SideFlapPasting") {
            displayField("Qty", detail.quantity);
            displayField("Machine", detail.machineNo);
            displayField("Operator", detail.operatorName);
            displayField("Adhesive", detail.adhesive);
            displayField("Wastage", detail.wastage);
            displayField("Shift", detail.shift);
          } else if (step.stepName === "QualityDept") {
            displayField("Qty", detail.quantity);
            displayField("Checked By", detail.checkedBy);
            displayField("Rejected", detail.rejectedQty);
            displayField("Reason", detail.reasonForRejection);
            displayField("Operator", detail.operatorName);
            displayField("Shift", detail.shift);
          } else if (step.stepName === "DispatchProcess") {
            displayField("Qty", detail.quantity);
            displayField("Balance", detail.balanceQty);
            displayField("Dispatch No", detail.dispatchNo);
            displayField("Operator", detail.operatorName);
            displayField(
              "Date",
              detail.dispatchDate
                ? new Date(detail.dispatchDate).toLocaleDateString()
                : ""
            );
            displayField("Shift", detail.shift);
          } else {
            // Generic fields
            displayField("Qty", detail.quantity);
            displayField("Operator", detail.operatorName);
            displayField("Shift", detail.shift);
            displayField("Status", detail.status);
          }

          currentY += detailsHeight + 3;
        } else {
          // If no details, just add minimal spacing
          currentY += 15;
        }

        // Update column positions
        if (currentColumn === 0) {
          leftColumnY = currentY;
        } else {
          rightColumnY = currentY;
        }

        // Switch to next column
        currentColumn = 1 - currentColumn;
      });

      // Footer
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
      pdf.text(
        `Generated on ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );

      // Save the PDF
      pdf.save(
        `NRC_Job_${(
          job.nrcJobNo ||
          job.jobDetails?.nrcJobNo ||
          "Unknown"
        ).replace(/[^a-zA-Z0-9]/g, "_")}_${
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

  console.log("Rendering DetailedJobModal with job:", job);

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-20 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-full">
              <TrendingUp className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {job.nrcJobNo || job.jobDetails?.nrcJobNo || "N/A"}
              </h2>
              <p className="text-blue-100">
                {job.jobDetails?.customerName ||
                  job.jobDetails?.company ||
                  "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Download PDF Button */}
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-black p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="Download PDF"
            >
              <Download size={20} />
              {isGeneratingPDF && (
                <span className="text-sm">Generating...</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Content - Rest of your existing content remains unchanged */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Job Details */}
              {job.jobDetails && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Job Details
                  </h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Style ID:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.styleItemSKU ||
                          job.jobDetails.styleId ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Box Dimensions:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.boxDimensions || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Board Size:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.boardSize || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Process Colors:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.processColors || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Flute Type:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.fluteType || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        No. of Colors:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.noOfColor || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        No. of Ups:
                      </span>
                      <span className="text-gray-900">
                        {job.jobDetails.noUps || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Width:</span>
                      <span className="text-gray-900">
                        {job.jobDetails.width || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Height:</span>
                      <span className="text-gray-900">
                        {job.jobDetails.height || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Length:</span>
                      <span className="text-gray-900">
                        {job.jobDetails.length || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Pre-Rate:
                      </span>
                      <span className="text-gray-900">
                        ₹{job.jobDetails.preRate || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Order Details */}
              {(job.purchaseOrderDetails ||
                job.jobPlanningDetails?.purchaseOrderDetails) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Purchase Order Details
                  </h3>
                  {(() => {
                    // Handle new data structure: jobPlanningDetails.purchaseOrderDetails (array)
                    // or fallback to old structure: job.purchaseOrderDetails
                    let poDetailsArray =
                      job.jobPlanningDetails?.purchaseOrderDetails ||
                      job.purchaseOrderDetails;

                    // If purchaseOrderId exists, find the matching purchase order
                    let poDetails: any;
                    if (job.purchaseOrderId && Array.isArray(poDetailsArray)) {
                      poDetails = poDetailsArray.find(
                        (po: any) => po.id === job.purchaseOrderId
                      );
                      // If not found, fall back to first item
                      if (!poDetails) {
                        poDetails = poDetailsArray[0];
                      }
                    } else {
                      // Existing logic: take first item if array, or the object itself
                      poDetails = Array.isArray(poDetailsArray)
                        ? poDetailsArray[0]
                        : poDetailsArray;
                    }

                    if (!poDetails)
                      return (
                        <p className="text-sm text-gray-500">
                          No PO details available
                        </p>
                      );

                    return (
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            PO Number:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.poNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Customer:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.customer || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Style:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.style || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Unit:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.unit || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Board Size:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.boardSize || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Flute Type:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.fluteType || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Total Quantity:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.totalPOQuantity || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Pending Quantity:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.pendingQuantity || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            No. of Sheets:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.noOfSheets || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            No. of Ups:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.noOfUps || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Die Code:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.dieCode || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            PO Date:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.poDate
                              ? new Date(poDetails.poDate).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Delivery Date:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.deliveryDate
                              ? new Date(
                                  poDetails.deliveryDate
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            NRC Delivery Date:
                          </span>
                          <span className="text-gray-900">
                            {poDetails.nrcDeliveryDate
                              ? new Date(
                                  poDetails.nrcDeliveryDate
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        {poDetails.shadeCardApprovalDate && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">
                              Shade Card Approval:
                            </span>
                            <span className="text-gray-900">
                              {new Date(
                                poDetails.shadeCardApprovalDate
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Status:
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              poDetails.status === "active"
                                ? "bg-green-100 text-green-800"
                                : poDetails.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : poDetails.status === "created"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {poDetails.status || "N/A"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Timeline & Status */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Timeline & Status
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="text-gray-900">
                      {job.createdAt
                        ? new Date(job.createdAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  {job.completedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Completed:
                      </span>
                      <span className="text-gray-900">
                        {new Date(job.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {job.completedBy && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Completed By:
                      </span>
                      <span className="text-gray-900">{job.completedBy}</span>
                    </div>
                  )}
                  {job.totalDuration && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Total Duration:
                      </span>
                      <span className="text-gray-900">
                        {job.totalDuration} days
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : job.status === "in-progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rest of your existing steps section remains unchanged */}
              {/* Steps Information */}
              {((job.allSteps && job.allSteps.length > 0) ||
                (job.steps && job.steps.length > 0)) && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {(job.status || job.finalStatus) === "completed"
                        ? "Completed Steps"
                        : "Job Steps"}
                      ({job.allSteps?.length || job.steps?.length || 0})
                    </h3>
                    {(() => {
                      // Check if any step is on hold (including major hold)
                      // Using same priority order: stepDetails.data.status > stepDetails.status > step-specific properties > step.status
                      const availableSteps = job.allSteps || job.steps || [];
                      const hasHoldSteps = availableSteps.some((step: any) => {
                        // Priority 1: Check stepDetails.data.status first
                        if (
                          step.stepDetails?.data?.status === "major_hold" ||
                          step.stepDetails?.data?.status === "hold"
                        ) {
                          return true;
                        }
                        
                        // Priority 2: Check stepDetails.status
                        if (
                          step.stepDetails?.status === "major_hold" ||
                          step.stepDetails?.status === "hold"
                        ) {
                          return true;
                        }
                        
                        // Priority 3: Check step-specific properties (paperStore, printingDetails, etc.)
                        if (
                          step.paperStore?.status === "major_hold" ||
                          step.printingDetails?.status === "major_hold" ||
                          step.corrugation?.status === "major_hold" ||
                          step.flutelam?.status === "major_hold" ||
                          step.fluteLaminateBoardConversion?.status === "major_hold" ||
                          step.punching?.status === "major_hold" ||
                          step.sideFlapPasting?.status === "major_hold" ||
                          step.qualityDept?.status === "major_hold" ||
                          step.dispatchProcess?.status === "major_hold" ||
                          step.paperStore?.status === "hold" ||
                          step.printingDetails?.status === "hold" ||
                          step.corrugation?.status === "hold" ||
                          step.flutelam?.status === "hold" ||
                          step.fluteLaminateBoardConversion?.status === "hold" ||
                          step.punching?.status === "hold" ||
                          step.sideFlapPasting?.status === "hold" ||
                          step.qualityDept?.status === "hold" ||
                          step.dispatchProcess?.status === "hold"
                        ) {
                          return true;
                        }
                        
                        // Priority 4: Check direct step status (fallback)
                        return (
                          step.status === "major_hold" || step.status === "hold"
                        );
                      });

                      return (
                        hasHoldSteps &&
                        onResumeJob &&
                        (job.status || job.finalStatus) !== "completed" && (
                          <button
                            onClick={() => onResumeJob(job.nrcJobNo)}
                            disabled={isResumingJob}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium flex items-center space-x-2 transition-colors"
                            title="Resume all steps on hold for this job"
                          >
                            <PlayCircle size={18} />
                            <span>
                              {isResumingJob ? "Resuming..." : "Resume Job"}
                            </span>
                          </button>
                        )
                      );
                    })()}
                  </div>
                  {/* Your existing steps content remains unchanged */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(() => {
                      // Define step order for sorting
                      const stepOrder = [
                        "PaperStore",
                        "PrintingDetails",
                        "Corrugation",
                        "FluteLaminateBoardConversion",
                        "Punching",
                        "SideFlapPasting",
                        "QualityDept",
                        "DispatchProcess",
                      ];

                      // Get the available steps data (prioritize allSteps, then steps, then stepDetails)
                      const availableSteps = job.allSteps || job.steps || [];

                      // Sort steps according to predefined order
                      const sortedSteps = [...availableSteps].sort((a, b) => {
                        const aIndex = stepOrder.indexOf(a.stepName);
                        const bIndex = stepOrder.indexOf(b.stepName);
                        return (
                          (aIndex === -1 ? 999 : aIndex) -
                          (bIndex === -1 ? 999 : bIndex)
                        );
                      });

                      return sortedSteps.map((step: any, stepIndex: number) => {
                        // FIXED: Get step details from allStepDetails based on step name
                        const getStepDetails = (stepName: string) => {
                          // Check multiple possible locations for step details
                          if (job.allStepDetails) {
                            // Use proper type-safe access
                            switch (stepName) {
                              case "PaperStore":
                                return job.allStepDetails.paperStore || [];
                              case "PrintingDetails":
                                return job.allStepDetails.printingDetails || [];
                              case "Corrugation":
                                return job.allStepDetails.corrugation || [];
                              case "FluteLaminateBoardConversion":
                                return job.allStepDetails.flutelam || [];
                              case "Punching":
                                return job.allStepDetails.punching || [];
                              case "SideFlapPasting":
                                return job.allStepDetails.sideFlapPasting || [];
                              case "QualityDept":
                                return job.allStepDetails.qualityDept || [];
                              case "DispatchProcess":
                                return job.allStepDetails.dispatchProcess || [];
                              default:
                                return [];
                            }
                          }
                          // Check if stepDetails is directly available on the step object
                          if (step.stepDetails) {
                            // If stepDetails is nested in .data property
                            if (step.stepDetails.data) {
                              return [step.stepDetails.data]; // Wrap single object in array
                            }
                            // If stepDetails is already an array
                            else if (Array.isArray(step.stepDetails)) {
                              return step.stepDetails;
                            }
                            // If stepDetails is directly an object (most common case now)
                            else if (typeof step.stepDetails === 'object') {
                              return [step.stepDetails];
                            }
                          }

                          return [];
                        };

                        const stepDetails = getStepDetails(step.stepName);

                        // Helper function to get step status in priority order:
                        // 1. stepDetails.data.status (highest priority)
                        // 2. stepDetails.status
                        // 3. Step-specific properties (paperStore.status, printingDetails.status, etc.)
                        // 4. step.status (lowest priority)
                        const getStepStatus = (step: any): string => {
                          // Priority 1: stepDetails.data.status
                          if (step.stepDetails?.data?.data?.status) {
                            return step.stepDetails.data.data.status;
                          }
                          
                          // Priority 2: stepDetails.status
                          if (step.stepDetails?.status) {
                            return step.stepDetails.status;
                          }
                          
                          // Priority 3: Step-specific properties
                          const stepSpecificStatus = 
                            step.paperStore?.status ||
                            step.printingDetails?.status ||
                            step.corrugation?.status ||
                            step.flutelam?.status ||
                            step.fluteLaminateBoardConversion?.status ||
                            step.punching?.status ||
                            step.sideFlapPasting?.status ||
                            step.qualityDept?.status ||
                            step.dispatchProcess?.status;
                          
                          if (stepSpecificStatus) {
                            return stepSpecificStatus;
                          }
                          
                          // Priority 4: step.status (fallback)
                          return step.status || "planned";
                        };

                        const stepStatus = getStepStatus(step);
                        const isMajorHold = stepStatus === "major_hold" || stepStatus === "hold";

                        // Format status for display
                        const getStatusDisplay = (status: string): string => {
                          if (status === "major_hold" || status === "hold") {
                            return "Major Hold";
                          }
                          if (status === "completed" || status === "stop" || status === "accept") {
                            return "Completed";
                          }
                          if (status === "in-progress" || status === "start") {
                            return "In Progress";
                          }
                          return status || "Planned";
                        };

                        const statusDisplay = getStatusDisplay(stepStatus);

                        // Get status badge color
                        const getStatusBadgeColor = (status: string): string => {
                          if (status === "major_hold" || status === "hold") {
                            return "bg-red-100 text-red-800";
                          }
                          if (status === "completed" || status === "stop" || status === "accept") {
                            return "bg-green-100 text-green-800";
                          }
                          if (status === "in-progress" || status === "start") {
                            return "bg-yellow-100 text-yellow-800";
                          }
                          return "bg-gray-100 text-gray-800";
                        };

                        return (
                          <div
                            key={step.id || stepIndex}
                            className="bg-white p-3 rounded border border-gray-100"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800 text-sm">
                                {step.stepName.replace(
                                  /([a-z])([A-Z])/g,
                                  "$1 $2"
                                )}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(stepStatus)}`}
                                >
                                  {statusDisplay}
                                </span>
                              </div>
                            </div>

                            {/* Major Hold Remark */}
                            {isMajorHold &&
                              stepDetails &&
                              stepDetails.length > 0 && (
                                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-xs font-medium text-red-800 mb-1">
                                    Major Hold Reason:
                                  </p>
                                  <p className="text-xs text-red-700">
                                    {stepDetails[0]?.majorHoldRemark ||
                                      stepDetails[0]?.holdRemark ||
                                      "No reason provided"}
                                  </p>
                                </div>
                              )}

                            {/* Step Timeline */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              {step.startDate && (
                                <div className="flex justify-between">
                                  <span>Start:</span>
                                  <span>
                                    {new Date(
                                      step.startDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {step.endDate && (
                                <div className="flex justify-between">
                                  <span>End:</span>
                                  <span>
                                    {new Date(
                                      step.endDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Machine Details */}
                            {step.machineDetails &&
                              step.machineDetails.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs font-medium text-gray-700 mb-1">
                                    Machine Details:
                                  </p>
                                  {step.machineDetails.map(
                                    (machine: any, machineIndex: number) => (
                                      <div
                                        key={machineIndex}
                                        className="text-xs text-gray-500 ml-2 space-y-1"
                                      >
                                        <div className="flex justify-between">
                                          <span>Unit:</span>
                                          <span>
                                            {machine.unit || "No unit"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Machine ID:</span>
                                          <span>
                                            {machine.machineId ||
                                              machine.id ||
                                              "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Machine Code:</span>
                                          <span>
                                            {machine.machineCode || "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Machine Type:</span>
                                          <span>{machine.machineType}</span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {/* Step Details Section */}
                            {stepDetails && stepDetails.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  Step Details:
                                </p>
                                {stepDetails.map(
                                  (detail: any, detailIndex: number) => (
                                    <div
                                      key={detailIndex}
                                      className="text-xs text-gray-500 ml-2 space-y-1"
                                    >
                                      {/* Paper Store Details */}
                                      {step.stepName === "PaperStore" && (
                                        <>
                                          {detail.sheetSize && (
                                            <div className="flex justify-between">
                                              <span>Sheet Size:</span>
                                              <span>{detail.sheetSize}</span>
                                            </div>
                                          )}
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.available && (
                                            <div className="flex justify-between">
                                              <span>Available:</span>
                                              <span>{detail.available}</span>
                                            </div>
                                          )}
                                          {detail.issuedDate && (
                                            <div className="flex justify-between">
                                              <span>Issued Date:</span>
                                              <span>
                                                {new Date(
                                                  detail.issuedDate
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                          )}
                                          {detail.mill && (
                                            <div className="flex justify-between">
                                              <span>Mill:</span>
                                              <span>{detail.mill}</span>
                                            </div>
                                          )}
                                          {detail.gsm && (
                                            <div className="flex justify-between">
                                              <span>GSM:</span>
                                              <span>{detail.gsm}</span>
                                            </div>
                                          )}
                                          {detail.quality && (
                                            <div className="flex justify-between">
                                              <span>Quality:</span>
                                              <span>{detail.quality}</span>
                                            </div>
                                          )}
                                          {detail.extraMargin && (
                                            <div className="flex justify-between">
                                              <span>Extra Margin:</span>
                                              <span>{detail.extraMargin}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Printing Details */}
                                      {step.stepName === "PrintingDetails" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.machine && (
                                            <div className="flex justify-between">
                                              <span>Machine:</span>
                                              <span>{detail.machine}</span>
                                            </div>
                                          )}
                                          {detail.oprName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.oprName}</span>
                                            </div>
                                          )}
                                          {detail.inksUsed && (
                                            <div className="flex justify-between">
                                              <span>Inks Used:</span>
                                              <span>{detail.inksUsed}</span>
                                            </div>
                                          )}
                                          {detail.coatingType && (
                                            <div className="flex justify-between">
                                              <span>Coating Type:</span>
                                              <span>{detail.coatingType}</span>
                                            </div>
                                          )}
                                          {detail.noOfColours && (
                                            <div className="flex justify-between">
                                              <span>No. of Colours:</span>
                                              <span>{detail.noOfColours}</span>
                                            </div>
                                          )}
                                          {detail.extraSheets && (
                                            <div className="flex justify-between">
                                              <span>Extra Sheets:</span>
                                              <span>{detail.extraSheets}</span>
                                            </div>
                                          )}
                                          {detail.separateSheets && (
                                            <div className="flex justify-between">
                                              <span>Separate Sheets:</span>
                                              <span>
                                                {detail.separateSheets}
                                              </span>
                                            </div>
                                          )}
                                          {detail.wastage && (
                                            <div className="flex justify-between">
                                              <span>Wastage:</span>
                                              <span>{detail.wastage}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Corrugation Details */}
                                      {step.stepName === "Corrugation" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.machineNo && (
                                            <div className="flex justify-between">
                                              <span>Machine No:</span>
                                              <span>{detail.machineNo}</span>
                                            </div>
                                          )}
                                          {detail.oprName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.oprName}</span>
                                            </div>
                                          )}
                                          {detail.flute && (
                                            <div className="flex justify-between">
                                              <span>Flute:</span>
                                              <span>{detail.flute}</span>
                                            </div>
                                          )}
                                          {detail.size && (
                                            <div className="flex justify-between">
                                              <span>Size:</span>
                                              <span>{detail.size}</span>
                                            </div>
                                          )}
                                          {detail.gsm1 && (
                                            <div className="flex justify-between">
                                              <span>GSM 1:</span>
                                              <span>{detail.gsm1}</span>
                                            </div>
                                          )}
                                          {detail.gsm2 && (
                                            <div className="flex justify-between">
                                              <span>GSM 2:</span>
                                              <span>{detail.gsm2}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {/* {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )} */}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Flute Laminate Details */}
                                      {step.stepName ===
                                        "FluteLaminateBoardConversion" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.film && (
                                            <div className="flex justify-between">
                                              <span>Film:</span>
                                              <span>{detail.film}</span>
                                            </div>
                                          )}
                                          {detail.adhesive && (
                                            <div className="flex justify-between">
                                              <span>Adhesive:</span>
                                              <span>{detail.adhesive}</span>
                                            </div>
                                          )}
                                          {detail.wastage && (
                                            <div className="flex justify-between">
                                              <span>Wastage:</span>
                                              <span>{detail.wastage}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Punching Details */}
                                      {step.stepName === "Punching" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.machine && (
                                            <div className="flex justify-between">
                                              <span>Machine:</span>
                                              <span>{detail.machine}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.die && (
                                            <div className="flex justify-between">
                                              <span>Die:</span>
                                              <span>{detail.die}</span>
                                            </div>
                                          )}
                                          {detail.wastage && (
                                            <div className="flex justify-between">
                                              <span>Wastage:</span>
                                              <span>{detail.wastage}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Side Flap Pasting Details */}
                                      {step.stepName === "SideFlapPasting" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.machineNo && (
                                            <div className="flex justify-between">
                                              <span>Machine No:</span>
                                              <span>{detail.machineNo}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.adhesive && (
                                            <div className="flex justify-between">
                                              <span>Adhesive:</span>
                                              <span>{detail.adhesive}</span>
                                            </div>
                                          )}
                                          {detail.wastage && (
                                            <div className="flex justify-between">
                                              <span>Wastage:</span>
                                              <span>{detail.wastage}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Quality Dept Details */}
                                      {step.stepName === "QualityDept" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.checkedBy && (
                                            <div className="flex justify-between">
                                              <span>Checked By:</span>
                                              <span>{detail.checkedBy}</span>
                                            </div>
                                          )}
                                          {detail.rejectedQty && (
                                            <div className="flex justify-between">
                                              <span>Rejected Qty:</span>
                                              <span className="text-red-600">
                                                {detail.rejectedQty}
                                              </span>
                                            </div>
                                          )}
                                          {detail.reasonForRejection && (
                                            <div className="flex justify-between">
                                              <span>Reason for Rejection:</span>
                                              <span className="text-red-600">
                                                {detail.reasonForRejection}
                                              </span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Dispatch Process Details */}
                                      {step.stepName === "DispatchProcess" && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.balanceQty && (
                                            <div className="flex justify-between">
                                              <span>Balance Qty:</span>
                                              <span>{detail.balanceQty}</span>
                                            </div>
                                          )}
                                          {detail.dispatchNo && (
                                            <div className="flex justify-between">
                                              <span>Dispatch No:</span>
                                              <span>{detail.dispatchNo}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.dispatchDate && (
                                            <div className="flex justify-between">
                                              <span>Dispatch Date:</span>
                                              <span>
                                                {new Date(
                                                  detail.dispatchDate
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.holdRemark && (
                                            <div className="flex justify-between">
                                              <span>Hold Remark:</span>
                                              <span className="text-red-600">
                                                {detail.holdRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.completeRemark && (
                                            <div className="flex justify-between">
                                              <span>Complete Remark:</span>
                                              <span className="text-green-600">
                                                {detail.completeRemark}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Generic Details for any step not covered above */}
                                      {![
                                        "PaperStore",
                                        "PrintingDetails",
                                        "Corrugation",
                                        "FluteLaminateBoardConversion",
                                        "Punching",
                                        "SideFlapPasting",
                                        "QualityDept",
                                        "DispatchProcess",
                                      ].includes(step.stepName) && (
                                        <>
                                          {detail.quantity && (
                                            <div className="flex justify-between">
                                              <span>Quantity:</span>
                                              <span>{detail.quantity}</span>
                                            </div>
                                          )}
                                          {detail.shift && (
                                            <div className="flex justify-between">
                                              <span>Shift:</span>
                                              <span>{detail.shift}</span>
                                            </div>
                                          )}
                                          {detail.operatorName && (
                                            <div className="flex justify-between">
                                              <span>Operator:</span>
                                              <span>{detail.operatorName}</span>
                                            </div>
                                          )}
                                          {detail.status && (
                                            <div className="flex justify-between">
                                              <span>Status:</span>
                                              <span
                                                className={`px-1 py-0.5 rounded text-xs ${
                                                  detail.status === "hold"
                                                    ? "bg-red-100 text-red-800"
                                                    : detail.status === "start"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : detail.status === "accept"
                                                    ? "bg-green-100 text-green-800"
                                                    : detail.status ===
                                                      "in_progress"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                              >
                                                {detail.status}
                                              </span>
                                            </div>
                                          )}
                                          {detail.remarks && (
                                            <div className="flex justify-between">
                                              <span>Remarks:</span>
                                              <span>{detail.remarks}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedJobModal;
