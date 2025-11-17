
# Verum Omnis - Forensic Engine

Verum Omnis is a powerful, web-based forensic analysis engine that leverages the Google Gemini API to analyze case files, including text, images, and PDFs. It produces detailed, structured reports to identify liabilities, outline strategic recommendations, and draft communications.

The application is designed to be a stateless, offline-first progressive web app (PWA) that can be installed on devices and packaged as a native Android application using Capacitor.

## Features

-   **Multi-modal Evidence Analysis:** Upload and analyze text descriptions, `.txt`, `.pdf`, and image files.
-   **Advanced AI Models:** Automatically selects the best Gemini model (`gemini-2.5-flash` or `gemini-2.5-pro`) based on the complexity of the evidence.
-   **"Thinking Mode":** Utilizes a higher thinking budget for deep analysis of complex text-based cases.
-   **Structured Forensic Reports:** Generates comprehensive reports in Markdown format with sections like Executive Summary, Timeline, Liability Assessment, and Strategic Recommendations.
-   **Secure PDF Export:** Downloads the generated report as a cryptographically sealed PDF, complete with a SHA-256 hash for integrity verification.
-   **Offline First:** The UI remains functional offline, allowing users to prepare cases without an internet connection. Analysis is enabled when connectivity is restored.
-   **Cross-Platform:** Runs in any modern web browser and can be compiled into a native Android app via Capacitor.

## Tech Stack

-   **Frontend:** React, TypeScript, Vite
-   **AI:** Google Gemini API (`@google/genai`)
-   **Native Runtime:** Capacitor
-   **Deployment:** Firebase Hosting
-   **CI/CD:** GitHub Actions

## Setup and Running Locally

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn

### 1. Clone the repository

```bash
git clone <repository-url>
cd verum-forensic-engine
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root of the project and add your Google Gemini API key:

```
VITE_API_KEY=your_google_api_key_here
```

### 4. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The output files will be generated in the `dist/` directory.

## Capacitor Android Setup

To build and run the application as a native Android app:

### 1. Install Capacitor CLI and Android platform

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
```

### 2. Build the web assets

Make sure you have a fresh production build of the web app.

```bash
npm run build
```

### 3. Sync the web assets with the native project

This command copies your web build from `dist/` into the native Android project.

```bash
npx cap sync
```

### 4. Open the project in Android Studio

```bash
npx cap open android
```

From Android Studio, you can run the app on an emulator or a connected physical device.

## Firebase Deployment

This project is configured for automatic deployment to Firebase Hosting via GitHub Actions. Any push to the `main` branch will trigger a workflow that builds and deploys the application.

For the workflow to succeed, you must configure two secrets in your GitHub repository settings:

-   `VITE_API_KEY`: Your Google Gemini API key.
-   `FIREBASE_SERVICE_ACCOUNT_VERUM_OMNIS_ENGINE`: The JSON content of your Firebase service account key.
