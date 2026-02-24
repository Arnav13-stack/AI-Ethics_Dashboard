// frontend/src/pages/Dashboard.js

import React, { useEffect, useState } from "react";
import api from "../api";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
  "#14b8a6",
];

function prettyLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Dashboard() {
  const [models, setModels] = useState([]);
  const [predictRes, setPredictRes] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [auditRes, setAuditRes] = useState(null);

  async function loadModels() {
    try {
      const res = await api.get("/models/");
      setModels(res.data.models || []);
    } catch (err) {
      console.error("Failed loading models:", err);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  const deleteModel = async (id) => {
    if (!window.confirm("Delete this model?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/models/${id}`);
      setModels((prev) => prev.filter((m) => m.id !== id));
      if (activeModel?.id === id) {
        setPredictRes(null);
        setAttacks([]);
        setActiveModel(null);
        setAuditRes(null);
      }
    } catch (err) {
      console.error("Failed to delete model:", err);
      alert("Failed to delete model.");
    }
  };

  async function runPredict(id) {
    setLoading(true);
    setPredictRes(null);
    setAttacks([]);
    try {
      const m = models.find((x) => x.id === id);
      setActiveModel(m || null);

      const res = await api.post(`/predict/${id}`);
      const result = res.data.result || {
        severity_score: 0,
        reasons: [],
        mitigation: [],
      };

      let bias_risk = 0;
      let misinfo_risk = 0;
      let sensitive_risk = 0;

      const ds = (m.dataset_summary || "").toLowerCase();
      const task = (m.task || "").toLowerCase();

      if (
        ds.includes("small") ||
        ds.includes("skew") ||
        ds.includes("region")
      ) {
        bias_risk = 25;
      }
      if (m.sensitive_features && m.sensitive_features.length > 0) {
        sensitive_risk = 20;
      }
      if (task.includes("generate") || task.includes("text")) {
        misinfo_risk = 30;
      }

      result.bias_risk = bias_risk;
      result.misinfo_risk = misinfo_risk;
      result.sensitive_risk = sensitive_risk;

      if (
        typeof result.severity_score !== "number" ||
        Number.isNaN(result.severity_score)
      ) {
        result.severity_score = 0;
      } else {
        result.severity_score = Math.max(
          0,
          Math.min(10, Math.round(result.severity_score))
        );
      }

      setPredictRes(result);
    } catch (err) {
      console.error("Predictor failed:", err);
      alert("Predictor failed");
    } finally {
      setLoading(false);
    }
  }

  async function runRedteam(id) {
    setLoading(true);
    setAttacks([]);
    try {
      const res = await api.post(`/redteam/${id}?attacks=5`);
      setAttacks(res.data.attacks || []);
    } catch (err) {
      console.error("RedTeam failed:", err);
      alert("RedTeam failed");
    } finally {
      setLoading(false);
    }
  }

  async function runAudit(id) {
    setLoading(true);
    setAuditRes(null);
    try {
      const m = models.find((x) => x.id === id);
      setActiveModel(m || null);

      const res = await api.post(`/analyze_model/${id}`);
      setAuditRes(res.data.analysis);
    } catch (err) {
      console.error("Model audit failed:", err);
      alert("Model audit failed");
    } finally {
      setLoading(false);
    }
  }

  const riskChartData = predictRes
    ? [
        { name: "Bias Risk", value: predictRes.bias_risk || 0 },
        { name: "Sensitive Risk", value: predictRes.sensitive_risk || 0 },
        { name: "Misinformation", value: predictRes.misinfo_risk || 0 },
        {
          name: "Overall Severity",
          value: (predictRes.severity_score || 0) * 10,
        },
      ]
    : [];

  const biasBarData = auditRes
    ? Object.entries(auditRes.bias).map(([key, val]) => ({
        name: prettyLabel(key),
        value: val.score || 0,
      }))
    : [];

  const misinfoBarData = auditRes
    ? Object.entries(auditRes.misinformation).map(([key, val]) => ({
        name: prettyLabel(key),
        value: val.score || 0,
      }))
    : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            src="/fav.ico"
            alt="AI Ethics Logo"
            className="w-14 h-14 rounded-lg shadow-md object-cover"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-700">
              AI Ethics — Predictor, RedTeam & Audits
            </h1>
            <p className="text-sm text-gray-500">
              Quick model risk assessments, adversarial tests & bias audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadModels}
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-3">Models</h2>
          <div className="space-y-4">
            {models.length === 0 && (
              <div className="bg-white p-4 rounded shadow text-gray-600">
                No models yet. Add one from the Add Model page.
              </div>
            )}

            {models.map((m) => (
              <div
                key={m.id}
                className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row sm:items-center gap-3"
                role="region"
                aria-label={`Model ${m.name}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold text-gray-800 truncate">
                      {m.name}
                    </div>
                    <div className="text-xs text-gray-400">#{m.id}</div>
                  </div>

                  <div className="mt-1 text-sm text-gray-600 truncate">
                    {m.task} — {m.dataset_summary}
                  </div>

                  {m.sensitive_features && (
                    <div className="mt-2 text-xs text-red-600 truncate">
                      Sensitive: {m.sensitive_features}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runPredict(m.id)}
                    disabled={loading}
                    className="px-3 py-2 bg-green-600 text-white rounded shadow-sm hover:bg-green-700 disabled:opacity-60 text-sm"
                  >
                    Predict
                  </button>

                  <button
                    onClick={() => runRedteam(m.id)}
                    disabled={loading}
                    className="px-3 py-2 bg-red-600 text-white rounded shadow-sm hover:bg-red-700 disabled:opacity-60 text-sm"
                  >
                    RedTeam
                  </button>

                  <button
                    onClick={() => runAudit(m.id)}
                    disabled={loading}
                    className="px-3 py-2 bg-amber-500 text-white rounded shadow-sm hover:bg-amber-600 disabled:opacity-60 text-sm"
                  >
                    Audit
                  </button>

                  <button
                    onClick={() => deleteModel(m.id)}
                    className="px-3 py-2 bg-gray-800 text-white rounded shadow-sm hover:bg-black text-sm"
                    title="Delete model"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Predictor Risk Breakdown</h3>

            {!predictRes && (
              <div className="text-gray-500 text-sm">
                Run predictor to see results
              </div>
            )}

            {predictRes && (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={riskChartData}>
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {predictRes && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Severity Gauge</h3>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  style={{ width: `${predictRes.severity_score * 10}%` }}
                  className={`h-4 rounded-full transition-all duration-500 ${
                    predictRes.severity_score < 3
                      ? "bg-green-500"
                      : predictRes.severity_score < 7
                      ? "bg-yellow-500"
                      : "bg-red-600"
                  }`}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-green-600">Low</span>
                <span className="text-yellow-600">Medium</span>
                <span className="text-red-600">High</span>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Predictor Results</h3>

            {predictRes ? (
              <>
                <div className="mb-2">
                  Severity: <strong>{predictRes.severity_score}</strong>
                  {" / 10"}
                </div>

                <div className="text-sm mb-2">
                  <div className="font-medium">Reasons:</div>
                  <ul className="list-disc ml-5">
                    {(predictRes.reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-sm">
                  <div className="font-medium">Mitigation:</div>
                  <ul className="list-disc ml-5">
                    {(predictRes.mitigation || []).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">
                No predictor results yet.
              </div>
            )}

            {attacks.length > 0 && (
              <>
                <div className="font-semibold mt-4">RedTeam Attacks</div>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                  {attacks.map((a) => (
                    <div key={a.id} className="p-2 border rounded">
                      <div className="text-sm font-medium">
                        {a.type} — vuln {a.vulnerability_score}
                      </div>
                      <div className="text-sm mt-1 break-words">
                        {a.attack_prompt}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">
              Model Audit — Bias & Misinformation
            </h3>

            {!auditRes && (
              <div className="text-gray-500 text-sm">
                Click <b>Audit</b> on a model to see detailed
                bias/misinformation scores, bar charts and pie charts.
              </div>
            )}

            {auditRes && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Bias Scores</div>
                  <div
                    className="grid grid-cols-2 gap-2"
                    style={{ height: 220 }}
                  >
                    <div>
                      <ResponsiveContainer>
                        <BarChart data={biasBarData}>
                          <XAxis dataKey="name" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="value">
                            {biasBarData.map((entry, index) => (
                              <Cell
                                key={`cell-bias-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 🔧 FIXED PIECHART OVERLAP — margin + legend layout */}
                    <div>
                      <ResponsiveContainer>
                        <PieChart
                          margin={{ top: 10, right: 40, bottom: 10, left: 10 }}
                        >
                          <Pie
                            data={biasBarData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={70}
                            label
                          >
                            {biasBarData.map((entry, index) => (
                              <Cell
                                key={`cell-bias-pie-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                          />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">
                    Misinformation Scores
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2"
                    style={{ height: 220 }}
                  >
                    <div>
                      <ResponsiveContainer>
                        <BarChart data={misinfoBarData}>
                          <XAxis dataKey="name" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="value">
                            {misinfoBarData.map((entry, index) => (
                              <Cell
                                key={`cell-misinfo-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 🔧 SAME FIX APPLIED HERE */}
                    <div>
                      <ResponsiveContainer>
                        <PieChart
                          margin={{ top: 10, right: 40, bottom: 10, left: 10 }}
                        >
                          <Pie
                            data={misinfoBarData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={70}
                            label
                          >
                            {misinfoBarData.map((entry, index) => (
                              <Cell
                                key={`cell-misinfo-pie-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                          />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold mt-2">
                    Deepfake / Manipulation Signals
                  </div>
                  <div>
                    Authenticity score: {auditRes.deepfake.authenticity_score}
                  </div>
                  <div>
                    Manipulation type: {auditRes.deepfake.manipulation_type}
                  </div>
                  <div>
                    Face integrity score:{" "}
                    {auditRes.deepfake.face_integrity_score}
                  </div>
                  <div>
                    Artifact detection score:{" "}
                    {auditRes.deepfake.artifact_detection_score}
                  </div>
                  {auditRes.deepfake.notes?.length > 0 && (
                    <ul className="list-disc ml-4">
                      {auditRes.deepfake.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}

                  <div className="font-semibold mt-3">
                    Suggested Model Types
                  </div>
                  <ul className="space-y-1">
                    {auditRes.model_suggestions.recommended_models.map(
                      (m, i) => (
                        <li key={i} className="border rounded p-1">
                          <div className="font-medium">{m.task}</div>
                          <div>
                            Models: {m.suggested_model_types.join(", ")}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            {m.reason}
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
