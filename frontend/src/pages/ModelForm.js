import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function ModelForm() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    dataset_summary: "",
    task: "",
    sensitive_features: "",
  });

  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fd = new FormData();

      // Append each field
      Object.keys(form).forEach((key) => {
        fd.append(key, form[key]);
      });

      // MUST send multipart/form-data
      await api.post("/models/", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      nav("/");
    } catch (err) {
      console.error("Create model error:", err);
      setError("Failed to create model");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded shadow max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Add Model Metadata</h2>

      <input
        className="w-full mb-2 border p-2 rounded"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />

      <textarea
        className="w-full mb-2 border p-2 rounded"
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <textarea
        className="w-full mb-2 border p-2 rounded"
        placeholder="Dataset summary"
        value={form.dataset_summary}
        onChange={(e) => setForm({ ...form, dataset_summary: e.target.value })}
      />

      <input
        className="w-full mb-2 border p-2 rounded"
        placeholder="Task (e.g., classification, generative)"
        value={form.task}
        onChange={(e) => setForm({ ...form, task: e.target.value })}
      />

      <input
        className="w-full mb-2 border p-2 rounded"
        placeholder="Sensitive features (comma separated)"
        value={form.sensitive_features}
        onChange={(e) =>
          setForm({ ...form, sensitive_features: e.target.value })
        }
      />

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => nav("/")}
          className="px-4 py-2 rounded border"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
