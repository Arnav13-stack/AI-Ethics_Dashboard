# 🛡️ AI Ethics — Predictor & RedTeam

> Quick model risk assessments, adversarial testing & bias audits.

AI Ethics — Predictor & RedTeam is a web-based platform designed to evaluate machine learning models for bias, fairness, misinformation risk, and adversarial robustness.

It provides structured model metadata management, risk scoring, red-teaming simulations, audit tracking, and PDF export capabilities.

---

## 🚀 Features

### 📊 Dashboard
- View all registered AI models
- Perform:
  - ✅ Predictor (Risk Scoring)
  - 🔴 RedTeam (Adversarial Testing)
  - 🟡 Audit (Bias & Misinformation Analysis)
  - 🗑 Delete Model
- Displays dataset summary and sensitive attributes
- Real-time risk breakdown panel
<img width="1176" height="594" alt="Screenshot (5551)" src="https://github.com/user-attachments/assets/18a0dd46-87af-4f6f-9bec-d8f46061e497" />

---

### ➕ Add Model
Add model metadata including:
- Model Name
- Description
- Dataset Summary
- Task Type (classification, generative, etc.)
- Sensitive Features (comma separated)

Ensures ethical evaluation is tied to model context.
<img width="1195" height="544" alt="Screenshot (5552)" src="https://github.com/user-attachments/assets/c24fa37a-7f00-4073-84b1-c17a3055b20c" />

---

### 📈 Run History
- Track all previous Predictor and RedTeam runs
- View:
  - Run ID
  - Model Reference
  - Run Type
- Export results as PDF for documentation & compliance
<img width="1202" height="576" alt="Screenshot (5553)" src="https://github.com/user-attachments/assets/586f2958-6df3-4367-92c9-cf3bbc2f0522" />

---

### 📂 Upload Audit
Upload content for automated auditing:
- CSV
- Text
- Image
- Video

System analyzes:
- Bias score
- Misinformation score
- Deepfake detection score
- Visual charts (bar & pie)
<img width="1177" height="557" alt="Screenshot (5554)" src="https://github.com/user-attachments/assets/eb232fe3-bdfd-4ea5-8418-80df29550652" />

---

## 🏗️ System Overview

The platform includes:

- Model Registry
- Risk Scoring Engine
- Red-Team Simulation
- Bias & Misinformation Analysis
- Audit Export System (PDF)
- Content Upload Analysis

---

## 🛠️ Tech Stack

Frontend:
- React.js
- Tailwind CSS
- JavaScript

Backend:
- Node.js
- Express.js

Database:
- MongoDB

Visualization:
- Chart.js / Recharts

---

## 📂 Project 


---

---

## ⚙️ Installation & Running the Project

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Arnav13-stack/AI-Ethics_Dashboard.git
cd AI-Ethics_Dashboard

---

## 🚀 Run Frontend (React)

Navigate to frontend folder:

```bash
cd frontend
npm install
npm start

## 🚀 Run Backend
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000



