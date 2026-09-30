# CamoniKu (Collaborative Offline-First Expense Tracker)

CamoniKu is a modern, responsive web application (mobile-first approach) built for collaborative expense tracking with offline-first capabilities, real-time cloud synchronization, and comprehensive financial reporting.

## 🚀 Key Features

- **Offline-First Architecture:**
  - Full CRUD functionality even when disconnected.
  - Guest/Anonymous mode storing data strictly locally.
  - Automatic migration of local guest data to Firebase upon Google sign-in.
- **Real-Time Collaboration:**
  - Workspaces (Notebooks) supporting multi-user collaboration.
  - Invite collaborators via email or Firebase UID with Role-Based Access Control (RBAC: Owner vs. Member).
- **Comprehensive Expense Management:**
  - Live currency formatting respecting notebook configuration (e.g., IDR `Rp 15.000`, USD `$15.00`).
  - Pre-filled onboarding data for immediate exploration.
  - Case-insensitive, whitespace-insensitive, and punctuation-insensitive uniqueness validation for classifications and categories (e.g., `"F & B"` conflicts with `"f&b"` or `"f b"`).
- **Reports & Advanced Analytics:**
  - **Month-over-Month (MoM)** spending change with percentage indicator.
  - **Average Daily Spend** calculation.
  - **Top 5 Largest Transactions** to quickly identify budget drainers.
  - **Daily Spending Trend** line chart (Recharts).
  - **Category Breakdown** donut/pie chart.
  - **Collaborative User Contribution** bar chart.
  - One-click **PDF Report Export** (`jspdf` + `html2canvas`).
  - **Excel Export** (`.xlsx`) via SheetJS.
- **Custom Global Confirmations:**
  - Custom accessible Confirmation Modal for all delete operations (no native `window.confirm`).
- **Data Backup & Migration:**
  - JSON Backup Export and schema-validated JSON Import (Zod) with target destination selection.
- **Localization:**
  - Multilingual support (`en` and `id`) powered by `i18next`.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS (v4)
- **Backend / BaaS:** Firebase (Authentication, Firestore, Security Rules)
- **State Management:** Zustand
- **Charts:** Recharts
- **Localization:** i18next + react-i18next
- **Exports:** SheetJS (`xlsx`), `jspdf`, `html2canvas`
- **Icons:** Lucide React
- **Forms & Validation:** Zod
- **Toasts:** Sonner
- **Date Utility:** date-fns

---

## 📁 Project Structure

```text
camoniku/
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions CI/CD to GitHub Pages
├── firestore.rules            # Firebase Security Rules with RBAC
├── src/
│   ├── components/
│   │   ├── common/            # ConfirmModal, NetworkStatusIndicator, EmptyState, SkeletonLoader, ErrorBoundary
│   │   ├── layout/            # Navbar, AppLayout
│   │   └── modals/            # TransactionModal, NotebookModal, InviteMemberModal, AddMetadataModal, ImportJsonModal
│   ├── hooks/                 # useSync (Real-time Firestore listeners + online/offline detection)
│   ├── i18n/                  # i18next setup and EN/ID translations
│   ├── lib/
│   │   ├── firebase/          # Firebase app, auth, and persistent cache configuration
│   │   └── storage/           # LocalStorage database engine for offline-first mode
│   ├── pages/                 # AuthPage, DashboardPage, TransactionsPage, ReportsPage, NotebooksPage, SettingsPage, NotFoundPage
│   ├── store/                 # Zustand stores (useAuthStore, useNotebookStore, useTransactionStore, useMetadataStore, useSettingsStore, useNetworkStore)
│   ├── types/                 # Strict TypeScript interfaces and schemas
│   └── utils/                 # Currency formatting, date calculations, normalize, Excel/PDF exports
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Firestore Security Rules (`firestore.rules`)

Role-Based Access Control (RBAC) enforces:
- **Notebooks:** Read allowed for `owner_id` or UIDs in `member_ids`. Only owner can edit or delete.
- **Transactions / Classifications / Categories:** Read/write allowed only for confirmed members or owners of the parent `notebook_id`.

---

## 🏃 Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

4. **Preview Production Build:**
   ```bash
   npm run preview
   ```

---

## 🚢 CI/CD Deployment

The repository includes `.github/workflows/deploy.yml` which automatically builds and publishes the production bundle to **GitHub Pages** on every push to the `main` branch.
