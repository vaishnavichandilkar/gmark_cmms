const xlsx = require('./tmp_xlsx/node_modules/xlsx');

const data = [
  ["Application", "Module", "Submodule", "Task Category", "Feature / Task", "Backend Status", "Frontend Status", "Integration Status", "Overall Status", "Start Date", "End Date", "Owner", "Remarks"],
  
  // Authentication & Authorization
  ["HYPN IoT Platform", "Security", "Authentication", "Micro", "User Login & JWT Generation", "Completed", "Completed", "Completed", "Completed", "2026-06-01", "2026-06-03", "Backend/Frontend", "JWT configured and guarded routes active"],
  ["HYPN IoT Platform", "Security", "Authentication", "Micro", "Change Password Interface", "Completed", "Completed", "Completed", "Completed", "2026-06-03", "2026-06-05", "Frontend", "Password hashing implemented"],
  ["HYPN IoT Platform", "Security", "Authentication", "Micro", "Forgot/Reset Password Flow", "Completed", "Completed", "Completed", "Completed", "2026-06-04", "2026-06-06", "Fullstack", "Tokens & verification ongoing"],
  ["HYPN IoT Platform", "Security", "Authorization", "Single", "Role-Based Access Control (RBAC)", "Completed", "Completed", "Completed", "Completed", "2026-06-06", "2026-06-08", "Backend", "SUPER_ADMIN, SOCIETY_ADMIN, etc."],
  ["HYPN IoT Platform", "Security", "Profile", "Micro", "User Profile Management", "Completed", "Completed", "Completed", "Completed", "2026-06-08", "2026-06-10", "Fullstack", "Image and details update"],

  // User Management
  ["HYPN IoT Platform", "User Management", "Users", "Single", "Create/Edit/Delete Users", "Completed", "Completed", "Completed", "Completed", "2026-06-10", "2026-06-12", "Fullstack", "Admin User Management Dashboard"],
  ["HYPN IoT Platform", "User Management", "Users", "Micro", "Global Form UI Standardization", "N/A", "Completed", "Completed", "Completed", "2026-06-12", "2026-06-14", "Frontend", "Glassmorphic design language applied"],

  // Facility Management
  ["HYPN IoT Platform", "Facility Management", "Societies", "Single", "Society CRUD Operations", "Completed", "Completed", "Completed", "Completed", "2026-06-12", "2026-06-14", "Fullstack", "SocietiesPage implementation"],
  ["HYPN IoT Platform", "Facility Management", "Buildings", "Single", "Building/Tower CRUD", "Completed", "Completed", "Completed", "Completed", "2026-06-14", "2026-06-16", "Fullstack", "BuildingDetails & AddTower components"],
  ["HYPN IoT Platform", "Facility Management", "Overview", "Micro", "Facility Overview Dashboard", "Completed", "Completed", "Completed", "Completed", "2026-06-16", "2026-06-18", "Frontend", "Real-time metrics display"],

  // Device Management
  ["HYPN IoT Platform", "Device Management", "Devices", "Single", "Device Registration", "Completed", "Completed", "Completed", "Completed", "2026-06-18", "2026-06-20", "Fullstack", "Device template mapping"],
  ["HYPN IoT Platform", "Device Management", "Devices", "Micro", "Device Listing & Search", "Completed", "Completed", "Completed", "Completed", "2026-06-19", "2026-06-21", "Fullstack", "Pagination and filtering"],
  ["HYPN IoT Platform", "Device Management", "Monitoring", "Single", "Device Live Monitor Page", "Ongoing", "Ongoing", "Ongoing", "Ongoing", "2026-06-21", "2026-06-25", "Fullstack", "Socket real-time data sync"],

  // Data Ingestion (Backend Heavy)
  ["HYPN IoT Platform", "Data Ingestion", "MQTT", "Single", "MQTT Broker Connection", "Completed", "N/A", "Completed", "Completed", "2026-06-20", "2026-06-22", "Backend", "MQTT Module Configured"],
  ["HYPN IoT Platform", "Data Ingestion", "MQTT", "Micro", "Payload Parser & State Updater", "Completed", "N/A", "Completed", "Completed", "2026-06-21", "2026-06-24", "Backend", "DeviceState schema mapped"],
  ["HYPN IoT Platform", "Data Ingestion", "WebSocket", "Single", "Real-time Data Streaming", "Completed", "N/A", "Completed", "Completed", "2026-06-22", "2026-06-25", "Backend", "Socket.io implementation for frontend"],

  // SCADA Visualization
  ["HYPN IoT Platform", "SCADA", "Booster Templates", "Single", "Process Flow Visualization", "N/A", "Ongoing", "Ongoing", "Ongoing", "2026-06-24", "2026-06-28", "Frontend", "Building Booster Pump Process Flow"],
  ["HYPN IoT Platform", "SCADA", "Booster Templates", "Micro", "Tank Visualization Component", "N/A", "Ongoing", "Ongoing", "Ongoing", "2026-06-24", "2026-06-28", "Frontend", "Tank.tsx animation and fill levels"],
  ["HYPN IoT Platform", "SCADA", "Booster Templates", "Micro", "Pumps & Valves Visualization", "N/A", "Upcoming", "Upcoming", "Upcoming", "2026-06-26", "2026-06-30", "Frontend", "Motor status indicators"],
  ["HYPN IoT Platform", "SCADA", "Booster Templates", "Micro", "SCADA Setting Modals", "N/A", "Upcoming", "Upcoming", "Upcoming", "2026-06-28", "2026-07-02", "Frontend", "Parameter settings configuration UI"],

  // System & Logs
  ["HYPN IoT Platform", "System", "Audit Log", "Single", "Action Activity Tracking", "Completed", "Upcoming", "Ongoing", "Ongoing", "2026-06-22", "2026-06-26", "Backend", "API logs captured, UI pending"],
  ["HYPN IoT Platform", "System", "Settings", "Single", "Global Settings", "Upcoming", "Upcoming", "Upcoming", "Upcoming", "TBD", "TBD", "Fullstack", "Overall platform settings"],
  
  // Future Integrations
  ["HYPN IoT Platform", "Alerting", "Notifications", "Single", "Email/SMS Alerts", "Upcoming", "Upcoming", "Upcoming", "Upcoming", "TBD", "TBD", "Backend", "Critical fault alerts"],
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);

// Adjust column widths
ws['!cols'] = [
  {wch: 20}, // Application
  {wch: 18}, // Module
  {wch: 22}, // Submodule
  {wch: 15}, // Task Category
  {wch: 35}, // Feature / Task
  {wch: 15}, // Backend Status
  {wch: 15}, // Frontend Status
  {wch: 18}, // Integration Status
  {wch: 15}, // Overall Status
  {wch: 12}, // Start Date
  {wch: 12}, // End Date
  {wch: 15}, // Owner
  {wch: 40}  // Remarks
];

xlsx.utils.book_append_sheet(wb, ws, "Master Feature Tracker");
xlsx.writeFile(wb, 'IOT_HYPN_Feature_Tracker_v4.xlsx');
console.log("Excel file updated successfully with Micro task details!");
