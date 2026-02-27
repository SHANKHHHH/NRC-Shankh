export interface MachineInfo {
  id: string;
  machineCode: string;
  machineType: string;
}

// Shared helper to categorize machines based on their name/type
export const getMachineCategory = (machineName: string): string => {
  const name = machineName.toLowerCase();

  // Printing machines
  if (name.includes("printing")) {
    return "Printing";
  }

  // Corrugation machines
  if (name.includes("corrugation")) {
    return "Corrugation";
  }

  // Lamination machines
  if (name.includes("flute laminator")) {
    return "Lamination";
  }

  // Pasting machines
  if (
    name.includes("manual flap pasting") ||
    name.includes("auto flap pasting")
  ) {
    return "Pasting";
  }

  // Punching machines
  if (name.includes("manual punching") || name.includes("auto punching")) {
    return "Punching";
  }

  // Paper cutting machines
  if (name.includes("paper cut")) {
    return "Cutting";
  }

  // Thin blade machines
  if (name.includes("thin blade")) {
    return "Cutting";
  }

  // Pinning machines
  if (name.includes("pinning")) {
    return "Finishing";
  }

  // Foiling machines
  if (name.includes("foiling ma")) {
    return "Finishing";
  }

  return "Other";
};

const ALL_CATEGORIES = [
  "Printing",
  "Corrugation",
  "Lamination",
  "Pasting",
  "Punching",
  "Cutting",
  "Finishing",
  "Other",
];

// Map roles to machine categories they can access
export const getRoleMachineCategories = (role: string): string[] => {
  const roleMap: Record<string, string[]> = {
    // Operator roles
    printer: ["Printing"],
    printing_operator: ["Printing"],

    corrugator: ["Corrugation"],
    corrugation_operator: ["Corrugation"],

    flutelaminator: ["Lamination"],
    flute_laminator: ["Lamination"],
    lamination_operator: ["Lamination"],

    pasting_operator: ["Pasting"],
    flap_pasting: ["Pasting"],

    punching_operator: ["Punching"],
    die_cutting: ["Punching"],

    cutting_operator: ["Cutting"],
    paper_cutting: ["Cutting"],

    finishing_operator: ["Finishing"],
    quality_controller: ["Finishing"],

    // Management / supervisor roles – allow access to all machine categories
    admin: ALL_CATEGORIES,
    supervisor: ALL_CATEGORIES,
    planner: ALL_CATEGORIES,
    production_head: ALL_CATEGORIES,
    flyingsquad: ALL_CATEGORIES,
    qc_manager: ALL_CATEGORIES,
    qc_head: ALL_CATEGORIES,
    dispatch_executive: ALL_CATEGORIES,
    dispatch_manager: ALL_CATEGORIES,
    printing_manager: ALL_CATEGORIES,

    // Store roles – primarily cutting and finishing
    paperstore: ["Cutting", "Finishing", "Other"],
  };

  return roleMap[role] || [];
};

// Filter machines based on selected roles
export const filterMachinesByRoles = (
  machines: MachineInfo[],
  roles: string[]
): MachineInfo[] => {
  if (roles.length === 0) {
    return machines;
  }

  const allowedCategories = new Set<string>();

  roles.forEach((role) => {
    const categories = getRoleMachineCategories(role);
    categories.forEach((category) => allowedCategories.add(category));
  });

  return machines.filter((machine) => {
    const machineCategory = getMachineCategory(machine.machineType);
    return allowedCategories.has(machineCategory);
  });
};

