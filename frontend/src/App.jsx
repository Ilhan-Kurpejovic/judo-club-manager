import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Attendance from "./pages/coach/Attendance";
import Coaches from "./pages/Coaches";
import CoachCompetitions from "./pages/coach/CoachCompetitions";
import CoachGroups from "./pages/coach/CoachGroups";
import CoachMembers from "./pages/coach/CoachMembers";
import Competitions from "./pages/Competitions";
import ProtectedLayout from "./layouts/ProtectedLayout";
import Dashboard from "./pages/Dashboard";
import Files from "./pages/Files";
import Login from "./pages/Login";
import Memberships from "./pages/Memberships";
import Members from "./pages/Members";
import ProtectedRoute from "./routes/ProtectedRoute";
import TrainingGroups from "./pages/TrainingGroups";
import Trainings from "./pages/Trainings";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/training-groups" element={<TrainingGroups />} />
          <Route path="/trainings" element={<Trainings />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/files" element={<Files />} />
          <Route path="/coach-groups" element={<CoachGroups />} />
          <Route path="/coach-members" element={<CoachMembers />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/coach-competitions" element={<CoachCompetitions />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
