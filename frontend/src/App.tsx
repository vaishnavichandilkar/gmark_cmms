import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FacilityOverview } from './pages/FacilityOverview';
import { BuildingDetails } from './pages/BuildingDetails';
import { DashboardLayout } from './layouts/DashboardLayout';
import { BoosterDashboard } from './pages/scada/templates/booster/BoosterDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout><FacilityOverview /></DashboardLayout>} />
        <Route path="/building/:buildingId" element={<DashboardLayout><BuildingDetails /></DashboardLayout>} />
        <Route path="/scada/flushing-terrace" element={<BoosterDashboard title="Flushing Terrace Booster System" panelId="20260508012" buildingName="A Building" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
