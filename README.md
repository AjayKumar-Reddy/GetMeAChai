# GetMeAChai ☕ - Secure SaaS Crowdfunding Platform

GetMeAChai is a full-stack, fintech-hardened crowdfunding SaaS platform built with **Next.js 15**, **React 19**, and **MongoDB**. The platform allows creators to build custom profiles, set fundraising targets, receive secure payments, and analyze support payouts using interactive dashboards.

This project is built to showcase production-grade software development practices: incorporating at-rest encryption, secure payment integrity verification, session protection, and custom data reporting.

---

## 🛠️ Tech Stack & Dependencies

*   **Framework**: Next.js 15 (App Router, Server Actions)
*   **Library**: React 19
*   **Database**: MongoDB via Mongoose
*   **Authentication**: NextAuth.js (GitHub OAuth + Email & Password Credentials)
*   **Payment Gateway**: Razorpay Checkout SDK
*   **Styling**: TailwindCSS & Vanilla CSS
*   **Security & Hashing**: `bcryptjs` (salt rounds: 12) & Node `crypto` (AES-256-GCM)

---

## 📂 Directory Structure

```
paterion-clone/
├── actions/
│   └── useractions.js       # Secure server actions (mutations, registration, analytics)
├── app/
│   ├── [username]/
│   │   └── page.js          # Dynamic public profile routing (Next.js 15 awaited params)
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.js     # NextAuth authentication endpoint
│   │   └── razorpay/
│   │       └── route.js     # Server-side Razorpay webhook/signature verification
│   ├── about/
│   │   └── page.js          # Redesigned glassmorphic about page
│   ├── dashboard/
│   │   └── page.js          # Main dashboard shell
│   ├── login/
│   │   └── page.js          # Split-screen premium authentication tab UI
│   ├── globals.css          # Core CSS stylesheet
│   ├── layout.js            # Root layout containing global gradients, Navbar, and Footer
│   └── page.js              # Home landing page with creator search
├── components/
│   ├── Dashboard.js         # Tabbed SaaS dashboard (Settings, Integrations, Analytics)
│   ├── Home.js              # Landing page component
│   ├── Navbar.js            # Sticky transparent glassmorphic header
│   ├── Footer.js            # Minimal border-t footer
│   ├── PaymentPage.js       # Creator profile & sticky donation form
│   └── SessionWrapper.js    # Client-side NextAuth context provider
├── db/
│   ├── connectDb.js         # Cached Mongoose connection handler
│   └── crypto.js            # AES-256-GCM symmetric encryption utility
├── lib/
│   └── authoptions.js       # Shared NextAuth provider configurations
├── models/
│   ├── User.js              # User schema (email, username, encrypted secrets, bio, goals)
│   └── Payment.js           # Transaction schema (payer, receiver, order ID, message, status)
├── package.json             # Core dependency management and scripts
└── .env.local               # Environment configurations (ignored in git commits)
```

---

## 🔒 Security & Fintech Features

### 1. At-Rest Encryption (AES-256-GCM)
*   **Problem**: Storing API merchant keys in plaintext inside databases creates a catastrophic vulnerability.
*   **Solution**: Integrated a symmetric encryption utility in `db/crypto.js`. Before saving a creator's `razorpaysecret` to MongoDB, the string is encrypted using AES-256-GCM with a random initialization vector (IV) and a cryptographic authentication tag. The data is saved in the format `iv:authTag:ciphertext`. Decryption is performed dynamically on the server during checkouts.

### 2. Cryptographic Signature Verification (HMAC-SHA256)
*   **Problem**: Malicious clients can call callback endpoints with spoofed payloads to mark unpaid orders as "completed".
*   **Solution**: Standard callback redirects are disabled. Instead, Razorpay checkout triggers a server-side JSON endpoint (`/api/razorpay`). The server fetches the recipient's encrypted Razorpay secret, decrypts it, and verifies the incoming checkout payload using HMAC-SHA256 signature calculations. If the signatures do not match, the transaction is rejected.

### 3. Data Minimization & Field Selection
*   **Problem**: Accidentally transmitting password hashes or API keys to the client during profile fetches.
*   **Solution**: Set `select: false` on the `password` and `razorpaysecret` fields inside `models/User.js`. Unless explicitly requested in server actions using Mongoose's `.select("+field")`, these fields are excluded from database queries, preventing leaks.

### 4. Mass Assignment & Session Protection
*   **Problem**: A client sending unauthorized parameters (e.g. attempting to modify another user's email or account details).
*   **Solution**: All write mutations in `actions/useractions.js` pull the user identity directly from the secure `getServerSession()` token, completely ignoring client-sent email headers. Modifiable parameters are strictly whitelisted before saving.

### 5. Self-Payment & Fraud Restriction
*   Enforced at both client and server layers by comparing `session.user.name` with the profile owner's username, preventing circular self-donations and transaction fraud.

---

## 📊 Analytics & Reporting

### 1. Dependency-Free Daily Trend Chart
To ensure complete compatibility with React 19, the dashboard does not rely on third-party charting libraries (which often throw hydration errors during Next.js SSR). Instead, it calculates the last 7 days of daily earnings and renders an interactive, responsive coordinate chart using **pure SVG** grids, paths, and points.

### 2. Transaction Exporting
Features client-side data serialization that aggregates completed donations, escapes CSV delimiters, and triggers a download link for a `.csv` file. This lets creators export payment logs for bookkeeping and tax auditing.

---

## ⚙️ Setup & Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repo-url>
    cd paterion-clone
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables (`.env.local`)**:
    Create a `.env.local` file in the root directory and populate it:
    ```env
    # GitHub OAuth Keys (https://github.com/settings/developers)
    GITHUB_ID=your_github_id
    GITHUB_SECRET=your_github_secret

    # NextAuth Config
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=your_nextauth_secret_hash  # Generate: openssl rand -base64 32

    # Database Configuration
    MONGODB_URI=mongodb://localhost:27017/chai

    # Symmetric Key for AES-256-GCM (64-character hex string / 32 bytes)
    # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ENCRYPTION_KEY=your_32_byte_hex_key
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    *The dev server is configured in `package.json` to strictly bind to **port 3000** to ensure GitHub OAuth callbacks match correctly.*

5.  **Compile Production Build**:
    ```bash
    npm run build
    ```
