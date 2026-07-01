const xlsx = require('./tmp_xlsx/node_modules/xlsx');

const data = [
  ["Application", "Module", "Submodule", "Feature", "Backend", "Frontend", "Testing", "Start Date", "End Date", "Status", "Owner"],
  
  // Infrastructure
  ["HYPN", "Infrastructure", "Database", "Initial PostgreSQL Setup & Prisma Schema", "Completed", "N/A", "Up Coming", "2026-06-01", "2026-06-02", "Completed", "Dev Team"],
  ["HYPN", "Infrastructure", "Database", "Prisma migrations & seed data (Admin, Roles, Buildings)", "Completed", "N/A", "Up Coming", "2026-06-02", "2026-06-03", "Completed", "Dev Team"],
  
  // Auth
  ["HYPN", "Auth", "API", "JWT Strategy & Auth Guard setup", "Completed", "N/A", "Up Coming", "2026-06-03", "2026-06-03", "Completed", "Dev Team"],
  ["HYPN", "Auth", "API", "Role-Based Access Control (RBAC) implementation", "Completed", "N/A", "Up Coming", "2026-06-03", "2026-06-03", "Completed", "Dev Team"],
  ["HYPN", "Auth", "API", "Login API Endpoint (/auth/login)", "Completed", "N/A", "Up Coming", "2026-06-04", "2026-06-04", "Completed", "Dev Team"],
  ["HYPN", "Auth", "API", "Refresh Token Endpoint (/auth/refresh)", "Completed", "N/A", "Up Coming", "2026-06-04", "2026-06-04", "Completed", "Dev Team"],
  ["HYPN", "Auth", "API", "Change/Reset Password Endpoints (/auth/change-password, etc.)", "Completed", "N/A", "Up Coming", "2026-06-04", "2026-06-04", "Completed", "Dev Team"],
  ["HYPN", "Auth", "UI", "LoginPage Component & Context Integration", "Completed", "Completed", "Up Coming", "2026-06-05", "2026-06-05", "Completed", "Dev Team"],
  ["HYPN", "Auth", "UI", "ChangePasswordPage & ResetPasswordPage Components", "Completed", "Completed", "Up Coming", "2026-06-05", "2026-06-05", "Completed", "Dev Team"],
  ["HYPN", "Auth", "UI", "ProfilePage Component (User details & avatar)", "Completed", "Completed", "Up Coming", "2026-06-05", "2026-06-05", "Completed", "Dev Team"],
  
  // Users
  ["HYPN", "Users", "API", "GET /users (List all users with filters)", "Completed", "N/A", "Up Coming", "2026-06-06", "2026-06-06", "Completed", "Dev Team"],
  ["HYPN", "Users", "API", "POST /users (Admin Create User)", "Completed", "N/A", "Up Coming", "2026-06-06", "2026-06-06", "Completed", "Dev Team"],
  ["HYPN", "Users", "API", "PUT & DELETE /users/:id (Admin Update/Delete)", "Completed", "N/A", "Up Coming", "2026-06-07", "2026-06-07", "Completed", "Dev Team"],
  ["HYPN", "Users", "UI", "AdminPage Component (User Management Data Table)", "Completed", "Completed", "Up Coming", "2026-06-08", "2026-06-08", "Completed", "Dev Team"],
  ["HYPN", "Users", "UI", "Add/Edit User Modal & Form Validation", "Completed", "Completed", "Up Coming", "2026-06-08", "2026-06-08", "Completed", "Dev Team"],
  
  // Societies
  ["HYPN", "Societies", "API", "Societies CRUD Endpoints", "Completed", "N/A", "Up Coming", "2026-06-09", "2026-06-10", "Completed", "Dev Team"],
  ["HYPN", "Societies", "UI", "SocietiesPage Component", "Completed", "Completed", "Up Coming", "2026-06-10", "2026-06-11", "Completed", "Dev Team"],
  ["HYPN", "Societies", "UI", "Create/Edit Society Form & Modal", "Completed", "Completed", "Up Coming", "2026-06-10", "2026-06-11", "Completed", "Dev Team"],
  
  // Buildings
  ["HYPN", "Buildings", "API", "Buildings/Towers CRUD Endpoints", "Completed", "N/A", "Up Coming", "2026-06-11", "2026-06-12", "Completed", "Dev Team"],
  ["HYPN", "Buildings", "UI", "BuildingDetails Component (Tower View)", "Completed", "Completed", "Up Coming", "2026-06-12", "2026-06-13", "Completed", "Dev Team"],
  ["HYPN", "Buildings", "UI", "AddTower Component & Form", "Completed", "Completed", "Up Coming", "2026-06-13", "2026-06-14", "Completed", "Dev Team"],
  ["HYPN", "Buildings", "UI", "FacilityOverview Component (Dashboard Metrics)", "Completed", "Completed", "Up Coming", "2026-06-14", "2026-06-15", "Completed", "Dev Team"],
  
  // Devices
  ["HYPN", "Devices", "API", "Devices Registration/CRUD Endpoints (/devices)", "Completed", "N/A", "Up Coming", "2026-06-16", "2026-06-17", "Completed", "Dev Team"],
  ["HYPN", "Devices", "API", "Device Mapping to Buildings & Societies", "Completed", "N/A", "Up Coming", "2026-06-16", "2026-06-17", "Completed", "Dev Team"],
  ["HYPN", "Devices", "UI", "DevicesPage Component (Device Listing Table)", "Completed", "Completed", "Up Coming", "2026-06-18", "2026-06-18", "Completed", "Dev Team"],
  ["HYPN", "Devices", "UI", "Create/Edit Device Form (Template Mapping)", "Completed", "Completed", "Up Coming", "2026-06-18", "2026-06-18", "Completed", "Dev Team"],
  ["HYPN", "Devices", "UI", "DeviceLiveMonitor Page (Real-time tracking UI)", "Ongoing", "Ongoing", "Up Coming", "2026-06-19", "2026-06-22", "Ongoing", "Dev Team"],
  
  // SCADA / Data Ingestion
  ["HYPN", "Data Ingestion", "API", "MQTT Broker Connection & Service", "Completed", "N/A", "Up Coming", "2026-06-19", "2026-06-20", "Completed", "Dev Team"],
  ["HYPN", "Data Ingestion", "API", "Payload Parser (Hex to JSON decoding)", "Completed", "N/A", "Up Coming", "2026-06-20", "2026-06-21", "Completed", "Dev Team"],
  ["HYPN", "Data Ingestion", "API", "DeviceState schema updating mechanism", "Completed", "N/A", "Up Coming", "2026-06-20", "2026-06-21", "Completed", "Dev Team"],
  ["HYPN", "Data Ingestion", "API", "WebSocket Service (Socket.IO Real-time Emit)", "Completed", "N/A", "Up Coming", "2026-06-21", "2026-06-22", "Completed", "Dev Team"],
  
  // SCADA Visualization
  ["HYPN", "SCADA UI", "Booster Templates", "Process Flow Visualization Boilerplate", "N/A", "Ongoing", "Up Coming", "2026-06-23", "2026-06-25", "Ongoing", "Dev Team"],
  ["HYPN", "SCADA UI", "Booster Templates", "Tank.tsx Animation & Fill Levels Component", "N/A", "Ongoing", "Up Coming", "2026-06-23", "2026-06-25", "Ongoing", "Dev Team"],
  ["HYPN", "SCADA UI", "Booster Templates", "Pumps & Valves Motor Status Indicators", "N/A", "Up Coming", "Up Coming", "2026-06-26", "2026-06-28", "Up Coming", "Dev Team"],
  ["HYPN", "SCADA UI", "Booster Templates", "SCADA Settings Modals (Parameter Config)", "N/A", "Up Coming", "Up Coming", "2026-06-28", "2026-06-30", "Up Coming", "Dev Team"],
  ["HYPN", "SCADA UI", "Integration", "Real-Time Equipment Data Integration (Live Updates)", "N/A", "Ongoing", "Up Coming", "2026-06-24", "2026-06-26", "Ongoing", "Dev Team"],
  
  // Audit & Logs
  ["HYPN", "System", "User Activity", "User Activity Tracking System (Database Record)", "Completed", "N/A", "Up Coming", "2026-06-22", "2026-06-23", "Completed", "Dev Team"],
  ["HYPN", "System", "User Activity", "User Activity History Dashboard", "Up Coming", "Up Coming", "Up Coming", "2026-07-01", "2026-07-02", "Up Coming", "Dev Team"],
  
  // Automations & Alerts
  ["HYPN", "Alerting", "Triggers", "Critical Fault Database Schema & Rules", "Up Coming", "N/A", "Up Coming", "TBD", "TBD", "Up Coming", "Dev Team"],
  ["HYPN", "Alerting", "Notifications", "Email/SMS Alert Integration", "Up Coming", "N/A", "Up Coming", "TBD", "TBD", "Up Coming", "Dev Team"]
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);

// Adjust column widths to match TaskFlow style closely
ws['!cols'] = [
  {wch: 15}, // Application
  {wch: 20}, // Module
  {wch: 20}, // Submodule
  {wch: 55}, // Feature
  {wch: 15}, // Backend
  {wch: 15}, // Frontend
  {wch: 15}, // Testing
  {wch: 12}, // Start Date
  {wch: 12}, // End Date
  {wch: 15}, // Status
  {wch: 15}  // Owner
];

xlsx.utils.book_append_sheet(wb, ws, "Master Feature Tracker");
xlsx.writeFile(wb, 'IOT_HYPN_Feature_Tracker_v4.xlsx');
console.log("Excel file successfully updated with reference layout!");
