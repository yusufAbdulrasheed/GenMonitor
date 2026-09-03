import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import DashboardOverview from "./components/DashboardOverview";
import FleetMap from "./pages/FleetMap";
import Generators from "./pages/admin/Generators";
import Alerts from "./pages/Alerts";
import WorkOrders from "./pages/WorkOrders";
import MaintenancePlans from "./pages/MaintenancePlans";
import Analytics from "./pages/Analytics";
import Reports from "./pages/admin/Reports";
import Activity from "./pages/Activity";
import Profile from "./pages/Profile";
import UserManagement from "./pages/admin/UserManagement";
import ApiKeys from "./pages/admin/ApiKeys";
import Thresholds from "./pages/admin/Thresholds";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const ALL_ROLES = ["Admin", "Engineer", "Technician", "NOC Manager"];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#1e1c17",
                  color: "#f2f0ea",
                  border: "1px solid #33302a",
                  borderRadius: "5px",
                  fontSize: "13px",
                  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                },
                success: { iconTheme: { primary: "#4d8a64", secondary: "#1e1c17" } },
                error: {
                  style: { background: "#7a2b23", color: "#f2f0ea", border: "1px solid #a2382f" },
                },
              }}
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardOverview />} />
                  <Route path="/map" element={<FleetMap />} />
                  <Route path="/generators" element={<Generators />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/work-orders" element={<WorkOrders />} />
                  <Route path="/maintenance-plans" element={<MaintenancePlans />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />

                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Engineer", "NOC Manager"]} />}>
                    <Route path="/reports" element={<Reports />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin", "NOC Manager"]} />}>
                    <Route path="/activity" element={<Activity />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Engineer"]} />}>
                    <Route path="/thresholds" element={<Thresholds />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/api-keys" element={<ApiKeys />} />
                  </Route>

                  <Route path="*" element={<div className="p-8 text-slate-300">Page Not Found</div>} />
                </Route>
              </Route>
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
