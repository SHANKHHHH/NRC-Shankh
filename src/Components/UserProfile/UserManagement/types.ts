export interface UserData {
  id: string;
  name: string;
  email: string;
  roles: string[];
  machineIds?: string[];
  active: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: string[];
  firstName: string;
  lastName: string;
  machineIds: string[];
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  password?: string;
  machineId: string[];
}

// Role options matching the backend expectations
export const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Planner", value: "planner" },
  { label: "Flying Squad", value: "flyingsquad" },
  { label: "Production Head", value: "production_head" },
  { label: "Dispatch Executive", value: "dispatch_executive" },
  { label: "QC Manager", value: "qc_manager" },
  { label: "QC Head", value: "qc_head" },
  { label: "Printer", value: "printer" },
  { label: "Printing Manager", value: "printing_manager" },
  { label: "Corrugator", value: "corrugator" },
  { label: "Flute Laminator", value: "flutelaminator" },
  { label: "Pasting Operator", value: "pasting_operator" },
  { label: "Punching Operator", value: "punching_operator" },
  { label: "Paper Store", value: "paperstore" },
  { label: "Dispatch Manager", value: "dispatch_manager" },
];

export const getRoleDisplayName = (roleValue: string): string => {
  const roleMap: Record<string, string> = {
    admin: "Admin",
    planner: "Planner",
    production_head: "Production Head",
    dispatch_executive: "Dispatch Executive",
    dispatch_manager: "Dispatch Manager",
    qc_manager: "QC Manager",
    qc_head: "QC Head",
    printer: "Printer",
    printing_manager: "Printing Manager",
    corrugator: "Corrugator",
    flutelaminator: "Flute Laminator",
    pasting_operator: "Pasting Operator",
    punching_operator: "Punching Operator",
    paperstore: "Paper Store",
    flyingsquad: "Flying Squad",
  };
  return roleMap[roleValue] || roleValue;
};

export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
};
