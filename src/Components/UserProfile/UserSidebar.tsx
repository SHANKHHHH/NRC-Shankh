import React, { useState } from "react";
import userIcon from "../../assets/Icons/user.svg";
import settingsIcon from "../../assets/Icons/settings.svg";

interface UserSidebarProps {
  open: boolean;
  onClose: () => void;
  role: string;
  onLogout: () => void;
  onOptionSelect?: (option: string) => void;
  onManageAccessRoleSelect?: (role: string) => void;
}

const sidebarConfig: Record<
  string,
  { displayName: string; options: string[] }
> = {
  admin: {
    displayName: "Admin",
    options: [
      "Dashboard",
      // 'Notifications',
      "Create new ID",
      "User Details",
      // 'Manage Access',
      //'Planner',
      //'Printing Manager',
      //'Production Head',
      //'Dispatch Executive',
      //'QC Manager',
      // 'Edit Machine', // ADDED: Edit Machine option for Admin
      //'Test Edit Machine', // TEMPORARY: Test option for debugging
      "Edit Working Details",
      "Job Cards",
      "Create New Job",
      "Start New Job",
    ],
  },
  printing_manager: {
    displayName: "Printing Manager",
    options: [], // No options - only logout available
  },
  dispatch_executive: {
    displayName: "Dispatch Executive",
    options: [], // No options - only logout available
  },
  production_head: {
    displayName: "Production Head",
    options: [], // No options - only logout available
  },
  qc_manager: {
    displayName: "QC Manager",
    options: [], // No options - only logout available
  },
  qc_head: {
    displayName: "QC Head",
    options: [], // No options - only logout available
  },
  dispatch_manager: {
    displayName: "Dispatch Manager",
    options: [], // No options - only logout available
  },
  planner: {
    displayName: "Planner",
    options: [
      "Dashboard",
      "Start New Job",
      "Create New Job",
      "Job cards",
      "Job Assigned",
    ], // ADDED: Create New Job option for Planner
  },
};

const accessRoles = [
  "Admin",
  "Planner",
  "Printing Manager",
  "Production Head",
  "Dispatch Executive",
  "QC Manager",
];

const UserSidebar: React.FC<UserSidebarProps> = ({
  open,
  onClose,
  role = "admin",
  onLogout,
  onOptionSelect,
  onManageAccessRoleSelect,
}) => {
  const [manageAccessMode, setManageAccessMode] = useState(false);
  const config = sidebarConfig[role] || sidebarConfig["admin"];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-transparent bg-opacity-40 z-40 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full
          w-4/5 sm:w-80 md:w-96 lg:w-[22rem] xl:w-[24rem] 2xl:w-[26rem] max-w-full
          bg-white z-50 shadow-2xl
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
          flex flex-col`}
      >
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-8">
          <div className="bg-blue-100 rounded-full p-6 mb-2">
            <img
              src={manageAccessMode ? settingsIcon : userIcon}
              alt="User"
              className="h-16 w-16"
            />
          </div>
          <div className="text-xl font-semibold mb-6">
            {manageAccessMode ? "Manage Access" : config.displayName}
          </div>
          <div className="w-full flex flex-col gap-0">
            {manageAccessMode &&
            role !== "printing_manager" &&
            role !== "qc_head" &&
            role !== "dispatch_manager" &&
            role !== "production_head" &&
            role !== "dispatch_executive" &&
            role !== "qc_manager" ? (
              <>
                {accessRoles.map((role) => (
                  <React.Fragment key={role}>
                    <button
                      className="w-full text-left px-6 py-3 text-base font-medium hover:bg-blue-50 focus:outline-none hover:cursor-pointer"
                      onClick={() => {
                        if (onManageAccessRoleSelect)
                          onManageAccessRoleSelect(role);
                      }}
                    >
                      {role}
                    </button>
                    <div className="border-b border-gray-200 mx-6" />
                  </React.Fragment>
                ))}
              </>
            ) : (
              <>
                {config.options.length > 0 ? (
                  config.options.map((option) => (
                    <React.Fragment key={option}>
                      <button
                        className="w-full text-left px-6 py-3 text-base font-medium hover:bg-blue-50 focus:outline-none hover:cursor-pointer"
                        onClick={() => {
                          if (option === "Manage Access") {
                            setManageAccessMode(true);
                            return;
                          }
                          if (onOptionSelect) onOptionSelect(option);
                          if (option !== "Create new ID") {
                            onClose();
                          }
                        }}
                      >
                        {option}
                      </button>
                      <div className="border-b border-gray-200 mx-6" />
                    </React.Fragment>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4 px-6">
                    No options available
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="p-4">
          {manageAccessMode ? (
            <button
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold text-base hover:bg-gray-300 transition mb-2 hover:cursor-pointer"
              onClick={() => setManageAccessMode(false)}
            >
              Back
            </button>
          ) : null}
          <button
            className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;
