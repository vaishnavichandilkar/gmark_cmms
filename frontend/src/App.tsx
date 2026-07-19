import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { ProfilePage } from './pages/auth/ProfilePage';

import { SocietiesPage } from './pages/SocietiesPage';
import { FacilityOverview } from './pages/FacilityOverview';
import { BuildingDetails } from './pages/BuildingDetails';
import { AddTower } from './pages/AddTower';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardHub } from './pages/DashboardHub';
import { BoosterDashboard } from './pages/scada/templates/booster/BoosterDashboard';
import { DevicesPage } from './pages/devices/DevicesPage';
import { DeviceLiveMonitor } from './pages/devices/DeviceLiveMonitor';
import { AdminPage } from './pages/AdminPage';
import { ScrollToTop } from './components/ScrollToTop';
import { AddEmployee } from './pages/master/AddEmployee';
import { EmployeeMaster } from './pages/master/EmployeeMaster';
import { AddMainFacility } from './pages/master/AddMainFacility';
import { MainFacilityMaster } from './pages/master/MainFacilityMaster';
import { UserManagement } from './pages/UserManagement';
import { AddUser } from './pages/AddUser';
import { FacilityManagement } from './pages/FacilityManagement';
import { AddFacility } from './pages/master/AddFacility';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SocietiesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardHub />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/:societyId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FacilityOverview />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-building"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SOCIETY_ADMIN']}>
                <DashboardLayout>
                  <AddTower />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/building/:buildingId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BuildingDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChangePasswordPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* SCADA screens protected */}
          <Route
            path="/scada/flushing-terrace"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Flushing Terrace Booster System" panelId="20260508012" buildingName="A Building" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/domestic-terrace"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Domestic Terrace Booster System" panelId="20260508045" buildingName="A Building" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/tower-b-domestic"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Tower B Domestic System (Basement-03)" panelId="20260508013" buildingName="B Building" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/tower-ac-domestic"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Tower A&C Domestic System (Basement-03)" panelId="20260526020" buildingName="B Building" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/tower-b-flushing"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Tower B Flushing System" panelId="20260223035" buildingName="STP" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/tower-ac-flushing"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Tower A&C Flushing System" panelId="2026052022" buildingName="STP" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/gardan-system"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Garden System" panelId="2026526023" buildingName="STP" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sub-soil-pump-01"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sub Soil Pump-01 (Basement-01)" panelId="2026050910" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sub-soil-pump-02"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sub Soil Pump-02 (Basement-01)" panelId="202605034" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sub-soil-pump-03"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sub Soil Pump-03 (Basement-01)" panelId="2026050907" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sub-soil-pump-04"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sub Soil Pump-04 (Basement-01)" panelId="2026050909" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-01"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-01 (Basement-03)" panelId="20260506030" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-02"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-02 (Basement-03)" panelId="20260506029" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-03"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-03 (Basement-03)" panelId="20260506023" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-04"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-04 (Basement-03)" panelId="2026050913" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-05"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-05 (Basement-03)" panelId="2026051104" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada/sump-pump-06"
            element={
              <ProtectedRoute>
                <BoosterDashboard title="Sump Pump-06 (Basement-03)" panelId="20260506027" buildingName="B Building" inletTankTitle="Underground Sump" showPressureCard={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DevicesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices/:deviceId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DeviceLiveMonitor />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SOCIETY_ADMIN']}>
                <DashboardLayout>
                  <AdminPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmployeeMaster />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/edit/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/view/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MainFacilityMaster />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/facility/new"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DashboardLayout>
                  <AddFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/facility/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DashboardLayout>
                  <AddFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/view/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UserManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/new"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/edit/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/view/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility-management"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FacilityManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
