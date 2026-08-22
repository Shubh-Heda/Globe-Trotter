# GlobeTrotter (TripCraft) ✈️

**GlobeTrotter** (internally referred to as **TripCraft** in the UI) is an interactive, multi-city trip planner built for the **Odoo x LDCE Hackathon**. It helps travelers turn a list of dream destinations into committed travel plans by organizing stops, scheduling daily activities, visualising budget breakdowns, and facilitating read-only sharing.

---

## 🌟 Key Features & Website Pages

### 1. Authentication (Login / Signup)
* **Register**: Create an account with inline validations checking for a valid email, name length, and a secure password (requires at least 8 characters, an uppercase letter, and a digit) to match API security rules.
* **Log In**: Secure sign-in yielding a 12-hour JWT token saved in `localStorage`. 
* **Password Recovery Alert**: User-facing modal notifying that email integration is offline and instructing passwords to be managed inside settings.

### 2. Main Dashboard (`/dashboard`)
* **Personalized Greeting**: Fetches user info from the `/api/v1/users/me` endpoint to display a custom welcome banner.
* **Next Trip Countdown**: Highlights the closest upcoming adventure and calculates the exact countdown in days.
* **Interactive Trip Filtering**: Filter tabs to display **All**, **Upcoming**, **Ongoing**, or **Completed** trips.
* **Plan New Trip Modal**: Quick modal form allowing users to name a trip, set dates, add description, choose a budget cap, and pick one of the preset color cover styles.
* **Budget Overview Progress**: Interactive visual progress bar indicating overall cost estimation against the total budget cap for active trips.
* **Recommended Destinations Sidebar**: Displaying popular spots (Kochi, Kyoto, Barcelona, etc.) with cost index labels and ratings.

### 3. My Trips (`/trips`)
* **Boarding Pass Cards**: Displays all planned, upcoming, and saved trips styled like physical boarding passes.
* **At-a-Glance Meta**: Summarizes the dates, number of stops, and complete multi-city routing (e.g. `Kochi → Alleppey → Kumarakom`).
* **Filters**: Quick filters for "All", "Upcoming", "Planning", and "Saved" trips.

### 4. Explore Destinations (`/explore`)
* **Shortlisted Atlas**: Showcase of top cities worth the flight, with detailed blurbs and statistical grids.
* **Interactive Sorting**: Instantly sort destinations by **popularity score** or by **highest cost index** to align plans with budget realities.

### 5. Budget Overview (`/budget`)
* **Cost Breakdown**: Highlights total planned expenditure grouped by category: **Transport**, **Stay**, **Activities**, and **Meals**.
* **Visual Progress Bars**: Percent-based bars indicating category cost weights.
* **Per-Trip Estimates**: Displays average budget allocation across active trips.

---

## 🛠️ Technology Stack

* **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (SPA)
* **State Management**: Zustand (for light session/token store)
* **Server State**: TanStack Query (for clean API integration)
* **Backend**: FastAPI (Python 3.11+) + SQLAlchemy 2.0 ORM (Sync sessions)
* **Database**: PostgreSQL 16 (shared instance, utilizing `pg_trgm` fuzzy search, `citext` for email, and date-range exclusion constraints)
* **Auth Cryptography**: Argon2id password hashing + HS256 JWT access tokens

---

## 🚀 Running the Project Locally

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **Python** (3.11+) installed on your machine.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the example env file and populate your `DATABASE_URL` (PostgreSQL connection string) and `JWT_SECRET`:
   ```bash
   cp .env.example .env
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations to set up tables, triggers, and views:
   ```bash
   python ../scripts/migrate.py
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will be available at `http://127.0.0.1:8000` (docs/Swagger at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser. All `/api` fetch calls are automatically proxied to the backend at port 8000.
