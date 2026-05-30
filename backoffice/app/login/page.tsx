"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import adminClient from "@/lib/axios";
import { adminService } from "@/services/admin.service";

export default function AdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    // Test key by calling the health endpoint
    try {
      adminService.login(key);
      // Verify the key works
      await adminClient.get("/api/v1/admin/health");
      router.push("/dashboard");
    } catch {
      adminService.logout();
      setError("Clé API invalide ou API inaccessible");
      localStorage.removeItem("mjimsai_admin_token");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-surface-900">MjimsAI Admin</h1>
          <p className="text-surface-500 text-sm mt-1">Backoffice — accès restreint</p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Clé API Admin</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Votre ADMIN_API_KEY"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-mono"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
            <button type="submit" disabled={loading || !key}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {loading ? "Vérification..." : "Accéder au backoffice"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
