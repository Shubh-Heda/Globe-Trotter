# GlobeTrotter — Feature Requirements

Extracted from `GlobeTrotter.pdf` (Problem Statement). These are the 13 screens/features
the hackathon organizers have asked us to build, in the order given.

---

## 1. Login / Signup Screen
**Purpose:** Authenticate users to manage personal travel plans.

**Key Functionality/Components:**
- Email & password fields
- Login button
- Signup link
- "Forgot Password" flow
- Basic validation

---

## 2. Dashboard / Home Screen
**Purpose:** Allows users to navigate to their trips and explore inspiration.

**Key Functionality/Components:**
- Welcome message
- List of recent trips
- "Plan New Trip" button
- Recommended destinations
- Budget highlights

---

## 3. Create Trip Screen
**Purpose:** Begins the process of creating a personalized travel plan.

**Key Functionality/Components:**
- Trip name
- Start & end dates
- Trip description
- Cover photo upload (optional)
- Save button

---

## 4. My Trips (Trip List) Screen
**Purpose:** Easily access and manage existing or upcoming trips.

**Key Functionality/Components:**
- Trip cards showing name, date range, destination count
- Edit / view / delete actions

---

## 5. Itinerary Builder Screen
**Purpose:** Construct the full day-wise trip plan in an interactive format.

**Key Functionality/Components:**
- "Add Stop" button
- Select city and travel dates
- Assign activities to each stop
- Reorder cities

---

## 6. Itinerary View Screen
**Purpose:** Review the full plan in a structured format (timeline or grouped by cities).

**Key Functionality/Components:**
- Day-wise layout
- City headers
- Activity blocks with time and cost
- View mode toggle (calendar/list)

---

## 7. City Search
**Purpose:** Discover and include relevant cities in the itinerary.

**Key Functionality/Components:**
- Search bar
- List of cities with meta info (country, cost index, popularity)
- "Add to Trip" button
- Filter by country/region

---

## 8. Activity Search
**Purpose:** Enrich trips with experiences like sightseeing, food tours, or adventure activities.

**Key Functionality/Components:**
- Activity filters (type, cost, duration)
- Add/remove buttons
- Quick view of description and images

---

## 9. Trip Budget & Cost Breakdown Screen
**Purpose:** Helps travelers stay informed and within budget.

**Key Functionality/Components:**
- Cost breakdown by transport, stay, activities, meals
- Pie/bar charts
- Average cost per day
- Alerts for overbudget days

---

## 10. Trip Calendar / Timeline Screen
**Purpose:** Helps users visualize the journey and daily plan flow.

**Key Functionality/Components:**
- Calendar component
- Expandable day views
- Drag-to-reorder activities
- Quick editing options

---

## 11. Shared/Public Itinerary View Screen
**Purpose:** Allows others to view, get inspired, or copy the trip.

**Key Functionality/Components:**
- Public URL
- Itinerary summary
- "Copy Trip" button
- Social media sharing
- Read-only view

---

## 12. User Profile / Settings Screen
**Purpose:** Enables users to control their data, preferences, and privacy.

**Key Functionality/Components:**
- Editable fields (name, photo, email)
- Language preference
- Delete account
- Saved destinations list

---

## 13. Admin / Analytics Dashboard (Optional)
**Purpose:** Helps in monitoring app adoption, popular cities, and user behavior.

**Key Functionality/Components:**
- Tables and charts of trips created

- Top cities/activities
- User engagement stats
- User management tools

**Mockup:** https://link.excalidraw.com/l/65VNwvy7c4X/6CzbTgEeSr1

---

## Reference: Organizer Evaluation Priorities

From `Minimum requirements given by Hackathon Organizers`, worth keeping in mind while
building the above screens:

**Matters most to them:**
1. Database design and setup — modeling data well, backend APIs, local DBs
2. Minimal use of 3rd party APIs
3. Use of real-time and dynamic data
4. Robust input validation
5. Proper use of git
6. Interactive and clean UI
7. Intuitive navigation

**Evaluation criteria:**
Coding standards, logic, modularity, frontend design, performance, scalability,
security, usability, debugging skill, **database design (most important)**,
approach to problem statement, modular architecture, coding pattern, attention to detail.


