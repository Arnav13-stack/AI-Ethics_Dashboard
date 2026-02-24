// frontend/src/pages/UploadAudit.js

import React, { useState } from "react";
import api from "../api";
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

export default function UploadAudit() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please choose a file.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setLoading(true);
    try {
      const res = await api.post("/analyze_upload/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      console.error("Upload audit failed:", err);
      setError("Failed to analyze file.");
    } finally {
      setLoading(false);
    }
  }

  function renderHighlight(original, highlightWords = []) {
    if (!highlightWords || highlightWords.length === 0) return original;
    let text = original;
    highlightWords.forEach((w) => {
      if (!w) return;
      const regex = new RegExp(`(${w})`, "gi");
      text = text.replace(regex, "<mark>$1</mark>");
    });
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  }

  function Section({ title, children }) {
    return (
      <div className="mb-4 border rounded p-3 bg-white shadow-sm">
        <h3 className="font-semibold mb-2">{title}</h3>
        {children}
      </div>
    );
  }

  const analysis = result?.analysis;

  const biasBarData = analysis
    ? Object.entries(analysis.bias).map(([key, val]) => ({
        name: prettyLabel(key),
        value: val.score || 0,
      }))
    : [];

  const misinfoBarData = analysis
    ? Object.entries(analysis.misinformation).map(([key, val]) => ({
        name: prettyLabel(key),
        value: val.score || 0,
      }))
    : [];

  return (
    <div className="bg-slate-50 p-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700">
          Upload Content — Bias, Misinformation & Deepfake Audit
        </h2>

        <form
          onSubmit={handleSubmit}
          className="mb-6 bg-white p-4 rounded shadow flex flex-col md:flex-row items-center gap-3"
        >
          <input
            type="file"
            className="flex-1"
            onChange={(e) => setFile(e.target.files[0])}
            accept=".csv, text/*, image/*, video/*"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        </form>

        {!result && (
          <div className="text-gray-600 text-sm">
            Choose a <b>CSV, text, image, or video</b> file and click{" "}
            <b>Upload & Analyze</b> to see bias, misinformation, deepfake scores
            plus bar & pie charts.
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Section
              title={`File: ${
                result.file_name
              } (${result.media_type.toUpperCase()})`}
            >
              <p className="text-sm text-gray-600">
                Below is the automated ethics audit for this upload.
              </p>
            </Section>

            {/* CHARTS */}
            <Section title="Bias & Misinformation — Charts">
              <div
                className="grid md:grid-cols-2 gap-4"
                style={{ minHeight: 240 }}
              >
                {/* Bias Bar + Pie */}
                <div className="border rounded p-2">
                  <div className="text-sm font-medium mb-1">Bias Scores</div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={biasBarData}>
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="value">
                          {biasBarData.map((entry, index) => (
                            <Cell
                              key={`bias-bar-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border rounded p-2">
                  <div className="text-sm font-medium mb-1">Bias Pie Chart</div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={biasBarData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={70}
                          label
                        >
                          {biasBarData.map((entry, index) => (
                            <Cell
                              key={`bias-pie-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Misinfo Bar + Pie */}
                <div className="border rounded p-2">
                  <div className="text-sm font-medium mb-1">
                    Misinformation Scores
                  </div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={misinfoBarData}>
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="value">
                          {misinfoBarData.map((entry, index) => (
                            <Cell
                              key={`mis-bar-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border rounded p-2">
                  <div className="text-sm font-medium mb-1">
                    Misinformation Pie Chart
                  </div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={misinfoBarData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={70}
                          label
                        >
                          {misinfoBarData.map((entry, index) => (
                            <Cell
                              key={`mis-pie-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Section>

            {/* Bias Details */}
            <Section title="Bias Details">
              {Object.entries(analysis.bias).map(([key, value]) => (
                <div key={key} className="mb-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{prettyLabel(key)}</span>
                    <span>Score: {value.score}</span>
                  </div>
                  {value.issues.length === 0 && (
                    <div className="text-xs text-gray-500">
                      No major issues found.
                    </div>
                  )}
                  {value.issues.map((issue, i) => (
                    <div key={i} className="ml-3 mt-1 text-sm">
                      <div>
                        <span className="font-medium">Original: </span>
                        {renderHighlight(issue.original, issue.highlight_words)}
                      </div>
                      <div>
                        <span className="font-medium">Corrected: </span>
                        {issue.corrected}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Section>

            {/* Misinformation Details */}
            <Section title="Misinformation Details">
              {Object.entries(analysis.misinformation).map(([key, value]) => (
                <div key={key} className="mb-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{prettyLabel(key)}</span>
                    <span>Score: {value.score}</span>
                  </div>
                  {value.issues.length === 0 && (
                    <div className="text-xs text-gray-500">
                      No major issues found.
                    </div>
                  )}
                  {value.issues.map((issue, i) => (
                    <div key={i} className="ml-3 mt-1 text-sm">
                      <div>
                        <span className="font-medium">Original: </span>
                        {issue.original}
                      </div>
                      <div>
                        <span className="font-medium">Reason: </span>
                        {issue.reason}
                      </div>
                      <div>
                        <span className="font-medium">Corrected: </span>
                        {issue.corrected}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Section>

            {/* Deepfake + model suggestions */}
            <Section title="Deepfake / Manipulation & Model Suggestions">
              <div className="text-sm space-y-1 mb-3">
                <div className="font-semibold">
                  Deepfake / Manipulation Signals
                </div>
                <div>
                  Authenticity score: {analysis.deepfake.authenticity_score}
                </div>
                <div>
                  Manipulation type: {analysis.deepfake.manipulation_type}
                </div>
                <div>
                  Face integrity score: {analysis.deepfake.face_integrity_score}
                </div>
                <div>
                  Artifact detection score:{" "}
                  {analysis.deepfake.artifact_detection_score}
                </div>
                {analysis.deepfake.notes?.length > 0 && (
                  <ul className="list-disc ml-5 text-xs text-gray-600">
                    {analysis.deepfake.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="text-sm">
                <div className="font-semibold mb-1">Suggested Model Types</div>
                <ul className="space-y-2">
                  {analysis.model_suggestions.recommended_models.map((m, i) => (
                    <li key={i} className="border rounded p-2">
                      <div className="font-medium">{m.task}</div>
                      <div className="text-xs">
                        Models: {m.suggested_model_types.join(", ")}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {m.reason}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
