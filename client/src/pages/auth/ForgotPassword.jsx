import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Mail, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-request", { email });
      toast.success("Password reset email sent if account exists", {
        duration: 5000,
      });
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error requesting reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl opacity-50 mix-blend-screen -z-10 animate-pulse"></div>

      <div className="max-w-md w-full space-y-8 bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-[0_0_40px_-15px_rgba(14,165,233,0.3)]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <Mail className="h-10 w-10 text-cyan-400" />
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            Recovery Protocol
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                className="block text-sm font-medium text-slate-300 mb-1"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm transition-all"
                placeholder="operator@gensys.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Authentication
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
