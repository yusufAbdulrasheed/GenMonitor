import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Info, Smartphone, Mail, KeyRound, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const NotificationPrefs = () => {
  const queryClient = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ['notificationPrefs'],
    queryFn: async () => (await api.get('/notifications/prefs')).data,
  });
  const mut = useMutation({
    mutationFn: (patch) => api.put('/notifications/prefs', patch),
    onSuccess: () => {
      toast.success('Preferences saved');
      queryClient.invalidateQueries({ queryKey: ['notificationPrefs'] });
    },
  });

  const rows = [
    ['inApp', 'In-app notifications'],
    ['emailOnCritical', 'Email me on critical alerts'],
    ['emailOnWarning', 'Email me on warning alerts'],
  ];

  return (
    <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-cyan-500" /> Notification Preferences
      </h2>
      <div className="space-y-3">
        {rows.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={prefs?.[key] ?? false}
              onChange={(e) => mut.mutate({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSubmit = {
      name: formData.name,
      phone: formData.phone,
    };

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        toast.error('Current password is required to set a new password');
        setIsSubmitting(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        setIsSubmitting(false);
        return;
      }
      dataToSubmit.currentPassword = formData.currentPassword;
      dataToSubmit.newPassword = formData.newPassword;
    }

    const success = await updateProfile(dataToSubmit);
    if (success) {
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
      }));
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
          <User className="text-cyan-400" />
          Operator Profile
        </h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl">
          Manage your personal identifiers and secure access credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg h-fit relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Shield size={100} />
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold text-2xl uppercase ring-1 ring-cyan-500/30">
              {user?.name?.substring(0, 2) || 'AD'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{user?.name}</h2>
              <span className="px-2 py-0.5 text-xs uppercase tracking-wider font-semibold rounded-full bg-slate-800/80 text-cyan-400 border border-cyan-900/50 inline-block mt-1">
                {user?.role}
              </span>
            </div>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
              <Info className="w-4 h-4" />
              <span className="font-medium">Account Active</span>
            </div>
          </div>
        </div>

        {/* Update Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-500" /> System Credentials
          </h2>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10 w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Contact Protocol (Phone)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    className="pl-10 w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider">Security Update</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Required for changes"
                      className="pl-10 w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current"
                      className="pl-10 w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-slate-950 font-semibold rounded shadow transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Commit Changes'
                )}
              </button>
            </div>
          </form>
        </div>

        <NotificationPrefs />
      </div>
    </div>
  );
};

const SettingsIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

export default Profile;
