// frontend/src/pages/RunHistory.js
import React, { useEffect, useState } from "react";
import api from "../api";

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadRuns() {
    setLoading(true);
    try {
      const res = await api.get("/runs/");
      setRuns(res.data.runs || []);
    } catch (err) {
      console.error("Failed to load runs:", err);
      alert("Failed to load runs (see console)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function downloadPdf(runId) {
    try {
      const res = await api.get(`/report/${runId}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai_ethics_report_run_${runId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF (see console)");
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-3">Run History</h2>

      {loading && <div>Loading...</div>}

      {!loading && runs.length === 0 && (
        <div>No runs yet. Run predictor or redteam to generate runs.</div>
      )}

      <div className="space-y-2">
        {runs.map((r) => (
          <div
            key={r.id}
            className="p-3 border rounded flex justify-between items-start"
          >
            <div>
              <div className="font-semibold">
                Run #{r.id} — Model {r.model_id}
              </div>
              <div className="text-sm text-gray-600">Type: {r.run_type}</div>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => downloadPdf(r.id)}
                className="px-3 py-1 bg-indigo-600 text-white rounded"
              >
                Export PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
