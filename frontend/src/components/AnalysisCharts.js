import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
  "#d885a3",
  "#83a6ed",
  "#8e8e8e",
  "#ffbb28",
  "#00c49f",
];

export default function AnalysisCharts({ analysis }) {
  if (!analysis) return null;

  const allData = [];

  if (analysis.bias) {
    Object.entries(analysis.bias).forEach(([key, val]) => {
      allData.push({
        name: key.replace(/_/g, " "),
        score: val.score || 0,
      });
    });
  }

  if (analysis.misinformation) {
    Object.entries(analysis.misinformation).forEach(([key, val]) => {
      allData.push({
        name: key.replace(/_/g, " "),
        score: val.score || 0,
      });
    });
  }

  if (analysis.deepfake) {
    allData.push({
      name: "authenticity",
      score: analysis.deepfake.authenticity_score || 0,
    });
    allData.push({
      name: "face integrity",
      score: analysis.deepfake.face_integrity_score || 0,
    });
    allData.push({
      name: "artifacts",
      score: analysis.deepfake.artifact_detection_score || 0,
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
      {/* BAR CHART */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2 text-sm">Bar Chart – Scores</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={allData}>
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score">
                {allData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PIE CHART */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2 text-sm">Pie Chart – Scores</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={allData}
                dataKey="score"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {allData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
