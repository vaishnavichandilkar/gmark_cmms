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
        <Route path="/scada/domestic-terrace" element={<BoosterDashboard title="Domestic Terrace Booster System" panelId="20260508045" buildingName="A Building" pump1Id="20260508045" pump2Id="20260508012" />} />
        <Route path="/scada/tower-b-domestic" element={<BoosterDashboard title="Tower B Domestic System (Basement-03)" panelId="20260508013" buildingName="B Building" pump1Id="20260508013" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />} />
        <Route path="/scada/tower-ac-domestic" element={<BoosterDashboard title="Tower A&C Domestic System (Basement-03)" panelId="20260526020" buildingName="B Building" pump1Id="20260526020" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Tank" outletType="tank" outletTitle="Overhead Tank" />} />
        <Route path="/scada/sub-soil-pump-02" element={<BoosterDashboard title="Sub Soil Pump-02 (Basement-01)" panelId="202605034" buildingName="B Building" pump1Id="202605034" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sub-soil-pump-03" element={<BoosterDashboard title="Sub Soil Pump-03 (Basement-01)" panelId="2026050907" buildingName="B Building" pump1Id="2026050907" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sub-soil-pump-04" element={<BoosterDashboard title="Sub Soil Pump-04 (Basement-01)" panelId="2026050909" buildingName="B Building" pump1Id="2026050909" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-01" element={<BoosterDashboard title="Sump Pump-01 (Basement-03)" panelId="20260506030" buildingName="B Building" pump1Id="20260506030" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-02" element={<BoosterDashboard title="Sump Pump-02 (Basement-03)" panelId="20260506029" buildingName="B Building" pump1Id="20260506029" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-03" element={<BoosterDashboard title="Sump Pump-03 (Basement-03)" panelId="20260506023" buildingName="B Building" pump1Id="20260506023" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-04" element={<BoosterDashboard title="Sump Pump-04 (Basement-03)" panelId="2026050913" buildingName="B Building" pump1Id="2026050913" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-05" element={<BoosterDashboard title="Sump Pump-05 (Basement-03)" panelId="2026051104" buildingName="B Building" pump1Id="2026051104" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
        <Route path="/scada/sump-pump-06" element={<BoosterDashboard title="Sump Pump-06 (Basement-03)" panelId="20260506027" buildingName="B Building" pump1Id="20260506027" pump2Id="2026050805" pump3Id="20260506023" inletTankTitle="Underground Sump" showPressureCard={false} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
