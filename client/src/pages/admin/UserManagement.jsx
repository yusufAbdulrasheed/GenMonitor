import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Server, UserPlus, ShieldOff, Shield, RefreshCw } from "lucide-react";

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Technician",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", formData);
      toast.success("User created successfully. Email dispatched.");
      setFormData({ name: "", email: "", phone: "", role: "Technician" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating user");
    }
  };

  const toggleUserStatus = async (id, isActive) => {
    try {
      const endpoint = isActive
        ? `/users/${id}/deactivate`
        : `/users/${id}/reactivate`;
      await api.patch(endpoint);
      toast.success(`User ${isActive ? "deactivated" : "reactivated"}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
            <Server className="text-cyan-400 shrink-0" />
            Active Personnel Logic
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Provision and manage access privileges across the telemetry
            database. Only Administrators have clearance to modify these
            records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Provision Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-cyan-900/5 h-fit relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <UserPlus size={100} />
          </div>
          <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-500" /> Provision Account
          </h2>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 placeholder-slate-600 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 placeholder-slate-600 outline-none transition-all"
                placeholder="operator@gensys.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 placeholder-slate-600 outline-none transition-all"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Clearance Level
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Admin">Admin</option>
                <option value="Engineer">Engineer</option>
                <option value="Technician">Technician</option>
                <option value="NOC Manager">NOC Manager</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-slate-950 font-semibold rounded shadow transition-all flex items-center justify-center gap-2 text-sm mt-4 uppercase tracking-wider"
            >
              Deploy Account
            </button>
          </form>
        </div>

        {/* Directory Grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-100">
              Active Directory
            </h2>
            <button
              onClick={fetchUsers}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin text-cyan-500" : ""}`}
              />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Identifier</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"></span>{" "}
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>{" "}
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u._id !== user?.id && (
                        <button
                          onClick={() => toggleUserStatus(u._id, u.isActive)}
                          className={`p-1.5 rounded-lg border transition-colors ${u.isActive ? "border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50" : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"}`}
                          title={
                            u.isActive ? "Revoke Access" : "Restore Access"
                          }
                        >
                          {u.isActive ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No telemetry returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
