import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FacilityOverview } from './pages/FacilityOverview';
import { BuildingDetails } from './pages/BuildingDetails';
import { DashboardLayout } from './layouts/DashboardLayout';

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<FacilityOverview />} />
          <Route path="/building/:buildingId" element={<BuildingDetails />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
