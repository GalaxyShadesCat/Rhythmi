# Rhythmi

**Live Demo:** https://rhythmi.vercel.app

Welcome to **Rhythmi**, the ultimate heart rate monitoring app. Whether you're training like an athlete, recovering from a Netflix binge, or just obsessed with biometrics, this app lets you visualise, analyse, and understand your heartbeat in real time.

## 🚀 Quick Start Guide

Clone the repo and get the dev server running:

```bash
git clone https://github.com/GalaxyShadesCat/Rhythmi.git
cd Rhythmi
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 🩺 What is Rhythmi?

Rhythmi is a full-stack heart rate analytics platform for real-time tracking and intelligent insight generation from ECG signals. We support **Bluetooth-connected devices** (like the Polar H10) and offer everything about your heart from basic tracking to **AI consultation** about your health.

### 🔑 Core Features

- 🫀 Real-time Heart Rate Monitoring via Bluetooth
- 📡 ECG Signal Streaming & Visualization
- 🌿 HRV (Heart Rate Variability) Analysis
- 🧠 Signal Quality Assessment
  - 📊 Statistical (std-based)
  - 🤖 Machine Learning (TensorFlow.js)
- 🏃 Session Logging (rest, exercise, recovery)
- 💬 Health Chatbot
- 📅 Historical Data & Trends (Chart.js)
- 👤 User Profiles
- 🍃 MongoDB Integration

## 🧪 Signal Quality Assessment

### 📊 Statistical (Default)

- Based on **standard deviation** of 5 seconds of ECG data.
- Categories:
  - 🟢 `Excellent`: < 300
  - 🟡 `Good`: < 400
  - 🟠 `Fair`: < 500
  - 🔴 `Poor`: ≥ 500

### 🤖 ML-based (Optional)

- Check that `TensorFlow.js` model files are imported:
  - `/public/tfjs_model/model.json`
  - `/public/scaler.json`
- Categories:
  - 🔴 `Poor`: class 0
  - 🟡 `Good`: class 1
  - 🟢 `Excellent`: class 2
- Features used:
  - Statistical measures
  - Frequency domain transforms
  - Peak detection

**To activate ML mode**, go to `NewRecord.tsx` and uncomment the relevant lines.

## 🛠️ Installation Instructions

### 📦 Prerequisites

| Requirement      | Version         |
| ---------------- | --------------- |
| Node.js          | ≥ 18            |
| npm              | ≥ 9             |
| MongoDB          | Local or Atlas  |
| Bluetooth Device | e.g., Polar H10 |

### 📥 Install & Setup

```bash
npm install
```

Create your `.env.local` file:

```env
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

⚠️ Don't forget:
- Never commit `.env.local` to GitHub.
- Make sure the keys are valid.
- The app won’t start without them.

## 🧑‍💻 Development Commands

| Task             | Command         |
| ---------------- | --------------- |
| Dev server       | `npm run dev`   |
| Production build | `npm run build` |
| Start production | `npm run start` |
| Lint check       | `npm run lint`  |

## 🗃️ Connecting to MongoDB

You’ll need:

1. A MongoDB Atlas cluster (or local instance)
2. The connection string in `.env.local`

Collections created:
- 🗂️ `records`
- 👥 `users`: your name, birth year, and gender

## 🚢 Deploying with Vercel

1. Push your repo to GitHub 📤
2. Connect GitHub to [Vercel](https://vercel.com)
3. Set the environment variables in the Vercel dashboard 🔐
4. Deploy your app! 🌐

## 🧱 Tech Stack Breakdown

| Layer    | Tech                               |
| -------- | ---------------------------------- |
| Frontend | Next.js, React, Tailwind CSS, MUI  |
| Backend  | Next.js API routes                 |
| Database | MongoDB (Atlas or Local)           |
| Charts   | Chart.js                           |
| AI       | OpenRouter API, TensorFlow.js      |
| Fonts    | Inter, Roboto Mono, Material Icons |
