import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SignUpPage } from './pages/auth/SignUpPage';

import { SocietiesPage } from './pages/4m/facilities/SocietiesPage';
import { FacilityOverview } from './pages/4m/facilities/FacilityOverview';
import { BuildingDetails } from './pages/4m/facilities/BuildingDetails';
import { AddTower } from './pages/4m/facilities/AddTower';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/4m/dashboard/DashboardPage';
import { BoosterDashboard } from './pages/scada/templates/booster/BoosterDashboard';
import { DevicesPage } from './pages/scada/devices/DevicesPage';
import { DeviceLiveMonitor } from './pages/scada/devices/DeviceLiveMonitor';
import { AdminPage } from './pages/4m/admin/AdminPage';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { AddEmployee } from './pages/4m/master/AddEmployee';
import { EmployeeMaster } from './pages/4m/master/EmployeeMaster';
import { AddMainFacility } from './pages/4m/master/AddMainFacility';
import { MainFacilityMaster } from './pages/4m/master/MainFacilityMaster';
import { UserManagement } from './pages/4m/users/UserManagement';
import { AddUser } from './pages/4m/users/AddUser';
import { FacilityManagement } from './pages/4m/facilities/FacilityManagement';
import { AddFacility } from './pages/4m/master/AddFacility';
import { AssetsManagement } from './pages/4m/machines/AssetsManagement';
import { MachineManagement } from './pages/4m/machines/MachineManagement';
import { AddMachine } from './pages/4m/machines/AddMachine';
import { EditMachine } from './pages/4m/machines/EditMachine';
import { ManageAccess } from './pages/4m/access/ManageAccess';
import { AddRole } from './pages/4m/access/AddRole';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from './store/slices/authSlice';
import type { RootState } from './store';
import { api } from './lib/api';

import { Toaster } from 'react-hot-toast';
import { AlertToastManager } from './components/shared/AlertToastManager';

function AuthSync() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          dispatch(setUser(res.data.user));
        }
      } catch (err) {
        console.error('Failed to sync user profile:', err);
      }
    };

    refreshUser();

    const handleFocus = () => {
      refreshUser();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, dispatch]);

  return null;
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthSync />
        <ScrollToTop />
        <AlertToastManager />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: '#00a651',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/societies"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SocietiesPage />
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

          {/* SCADA screens protected */}
          <Route
            path="/scada-dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BoosterDashboard title="" panelId="" buildingName="" />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
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
              <ProtectedRoute moduleId="master_employee" action="view">
                <DashboardLayout>
                  <EmployeeMaster />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/new"
            element={
              <ProtectedRoute moduleId="master_employee" action="create">
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/edit/:id"
            element={
              <ProtectedRoute moduleId="master_employee" action="edit">
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/employee/view/:id"
            element={
              <ProtectedRoute moduleId="master_employee" action="view">
                <DashboardLayout>
                  <AddEmployee />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="view">
                <DashboardLayout>
                  <MainFacilityMaster />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/new"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="create">
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/edit/:id"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="edit">
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/facility/new"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="create">
                <DashboardLayout>
                  <AddFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/facility/edit/:id"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="edit">
                <DashboardLayout>
                  <AddFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/facility/view/:id"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="view">
                <DashboardLayout>
                  <AddFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/main-facility/view/:id"
            element={
              <ProtectedRoute moduleId="master_main_facility" action="view">
                <DashboardLayout>
                  <AddMainFacility />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-access"
            element={
              <ProtectedRoute moduleId="manage_access" action="view">
                <DashboardLayout>
                  <ManageAccess />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-access/new"
            element={
              <ProtectedRoute moduleId="manage_access" action="create">
                <DashboardLayout>
                  <AddRole />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-access/edit/:id"
            element={
              <ProtectedRoute moduleId="manage_access" action="edit">
                <DashboardLayout>
                  <AddRole />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-access/view/:id"
            element={
              <ProtectedRoute moduleId="manage_access" action="view">
                <DashboardLayout>
                  <AddRole />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute moduleId="user_management" action="view">
                <DashboardLayout>
                  <UserManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/new"
            element={
              <ProtectedRoute moduleId="user_management" action="create">
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/edit/:id"
            element={
              <ProtectedRoute moduleId="user_management" action="edit">
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management/view/:id"
            element={
              <ProtectedRoute moduleId="user_management" action="view">
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility-management"
            element={
              <ProtectedRoute moduleId="facility_management" action="view">
                <DashboardLayout>
                  <FacilityManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/machine-management"
            element={
              <ProtectedRoute moduleId="machine_management" action="view">
                <DashboardLayout>
                  <MachineManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/machine-management/new"
            element={
              <ProtectedRoute moduleId="machine_management" action="create">
                <DashboardLayout>
                  <AddMachine />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/machine-management/edit/:id"
            element={
              <ProtectedRoute moduleId="machine_management" action="edit">
                <DashboardLayout>
                  <EditMachine />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute moduleId="assets" action="view">
                <DashboardLayout>
                  <AssetsManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
