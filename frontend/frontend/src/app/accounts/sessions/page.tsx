'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getSessions, revokeSession, getFeatures } from '@/lib/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Array<{ _id: string; device?: string; createdAt: string; lastUsedAt?: string; expiresAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const feats = await getFeatures().catch(() => ({} as Record<string, boolean>));
        if (!active) return;
        setFeatures(feats || {});
        const s = await getSessions();
        if (!active) return;
        setSessions(s);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleRevoke = async (id: string) => {
    const prev = sessions.slice();
    setSessions(prev.filter(s => s._id !== id));
    try {
      await revokeSession(id);
    } catch {
      setSessions(prev); // revert if failed
      alert('Failed to revoke session');
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ALL"]}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Active Sessions</h1>
        {!features?.enableSessionsUI && (
          <div className="mb-4 text-sm text-gray-500">Sessions UI is behind a feature flag; enable with FEATURE_SESSIONS_UI=true</div>
        )}
        {loading ? (
          <div>Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-600">No active sessions.</div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Last Used</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s._id} className="border-t">
                    <td className="px-3 py-2">{s.device || '-'}</td>
                    <td className="px-3 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2">{new Date(s.expiresAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <button className="px-3 py-1 border rounded" onClick={() => handleRevoke(s._id)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
