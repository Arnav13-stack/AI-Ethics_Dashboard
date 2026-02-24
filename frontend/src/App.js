// frontend/src/App.js

import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import ModelForm from "./pages/ModelForm";
import RunHistory from "./pages/RunHistory";
import UploadAudit from "./pages/UploadAudit";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-700">
          AI Ethics — Predictor & RedTeam
        </h1>

        <nav className="space-x-4">
          <Link to="/" className="text-slate-700 hover:underline">
            Dashboard
          </Link>
          <Link to="/add" className="text-slate-700 hover:underline">
            Add Model
          </Link>
          <Link to="/runs" className="text-slate-700 hover:underline">
            Run History
          </Link>
          <Link to="/upload-audit" className="text-slate-700 hover:underline">
            Upload Audit
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<ModelForm />} />
          <Route path="/runs" element={<RunHistory />} />
          <Route path="/upload-audit" element={<UploadAudit />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
