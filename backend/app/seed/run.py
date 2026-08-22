"""Seed runner — idempotent upserts on natural keys.

Usage:
    cd backend
    python -m app.seed.run          # seed catalogue only
    python -m app.seed.run --demo   # catalogue + demo users/trips
"""

import argparse
import json
import random
import uuid
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.tables import (
    Activity,
    ActivityCategory,
    City,
    Country,
    StopActivity,
    Trip,
    TripExpense,
    TripStop,
    User,
)

DATA_DIR = Path(__file__).resolve().parent / "data"


def _load(filename: str) -> list[dict]:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


def seed_countries(db: Session) -> tuple[dict[str, int], dict[str, str]]:
    """Upsert countries on iso2. Returns ({iso2: id}, {iso2: region})."""
    rows = _load("countries.json")
    mapping = {}
    region_by_iso2 = {}
    for r in rows:
        existing = db.query(Country).filter(Country.iso2 == r["iso2"]).first()
        if existing:
            existing.name = r["name"]
            existing.region = r["region"]
            existing.currency_code = r["currency_code"]
            mapping[r["iso2"]] = existing.id
        else:
            c = Country(**r)
            db.add(c)
            db.flush()
            mapping[r["iso2"]] = c.id
        region_by_iso2[r["iso2"]] = r["region"]
    db.commit()
    print(f"  Countries: {len(mapping)} upserted")
    return mapping, region_by_iso2


def seed_cities(
    db: Session, country_map: dict[str, int], region_by_iso2: dict[str, str]
) -> dict[str, int]:
    """Upsert cities on (country_id, name). Returns {name: id}."""
    rows = _load("cities.json")
    mapping = {}
    for r in rows:
        country_id = country_map[r["country_iso2"]]
        image_url = r.get("image_url")
        existing = (
            db.query(City)
            .filter(City.country_id == country_id, City.name == r["name"])
            .first()
        )
        if existing:
            existing.cost_index = r["cost_index"]
            existing.popularity_score = r["popularity_score"]
            existing.image_path = image_url
            mapping[r["name"]] = existing.id
        else:
            c = City(
                country_id=country_id,
                name=r["name"],
                cost_index=r["cost_index"],
                popularity_score=r["popularity_score"],
                image_path=image_url,
            )
            db.add(c)
            db.flush()
            mapping[r["name"]] = c.id
    db.commit()
    print(f"  Cities: {len(mapping)} upserted")
    return mapping


def seed_categories(db: Session) -> dict[str, int]:
    """Upsert categories on slug. Returns {slug: id}."""
    rows = _load("categories.json")
    mapping = {}
    for r in rows:
        existing = db.query(ActivityCategory).filter(ActivityCategory.slug == r["slug"]).first()
        if existing:
            existing.name = r["name"]
            mapping[r["slug"]] = existing.id
        else:
            c = ActivityCategory(name=r["name"], slug=r["slug"])
            db.add(c)
            db.flush()
            mapping[r["slug"]] = c.id
    db.commit()
    print(f"  Categories: {len(mapping)} upserted")
    return mapping


def seed_activities(
    db: Session, city_map: dict[str, int], cat_map: dict[str, int]
) -> int:
    """Upsert activities on (city_id, name)."""
    rows = _load("activities.json")
    count = 0
    for r in rows:
        city_id = city_map.get(r["city"])
        cat_id = cat_map.get(r["category_slug"])
        if not city_id or not cat_id:
            continue
        existing = (
            db.query(Activity)
            .filter(Activity.city_id == city_id, Activity.name == r["name"])
            .first()
        )
        if existing:
            existing.description = r.get("description")
            existing.base_cost_cents = r.get("base_cost_cents", 0)
            existing.duration_minutes = r.get("duration_minutes")
        else:
            a = Activity(
                city_id=city_id,
                category_id=cat_id,
                name=r["name"],
                description=r.get("description"),
                base_cost_cents=r.get("base_cost_cents", 0),
                duration_minutes=r.get("duration_minutes"),
            )
            db.add(a)
        count += 1
    db.commit()
    print(f"  Activities: {count} upserted")
    return count


def seed_demo(db: Session, city_map: dict[str, int]) -> None:
    """Generate ~20 demo users and ~80 trips with stops and activities."""
    city_ids = list(city_map.values())
    city_names = {v: k for k, v in city_map.items()}
    all_activities = db.query(Activity).all()
    acts_by_city: dict[int, list[Activity]] = {}
    for a in all_activities:
        acts_by_city.setdefault(a.city_id, []).append(a)

    users = []
    for i in range(20):
        email = f"demo{i+1}@globetrotter.test"
        existing = db.execute(
            text("SELECT id FROM users WHERE email = :e AND deleted_at IS NULL"),
            {"e": email},
        ).first()
        if existing:
            users.append(existing[0])
            continue
        u = User(
            email=email,
            password_hash=hash_password("demo1234"),
            full_name=f"Demo User {i+1}",
            role="ADMIN" if i == 0 else "USER",
        )
        db.add(u)
        db.flush()
        users.append(u.id)
    db.commit()
    print(f"  Demo users: {len(users)}")

    categories = ["TRANSPORT", "STAY", "ACTIVITY", "MEALS", "OTHER"]
    trip_count = 0
    for user_id in users:
        num_trips = random.randint(3, 5)
        for _ in range(num_trips):
            start = date.today() + timedelta(days=random.randint(-60, 120))
            duration = random.randint(3, 14)
            end = start + timedelta(days=duration)
            trip = Trip(
                user_id=user_id,
                name=f"Trip to {random.choice(list(city_map.keys()))}",
                start_date=start,
                end_date=end,
                currency_code="INR",
                budget_cap_cents=random.choice([None, 5000000, 10000000, 20000000]),
            )
            db.add(trip)
            db.flush()

            # Add 1–4 stops
            num_stops = random.randint(1, min(4, duration))
            chosen_cities = random.sample(city_ids, min(num_stops, len(city_ids)))
            days_per_stop = max(1, duration // num_stops)
            current = start
            for si, cid in enumerate(chosen_cities):
                arr = current
                dep = arr + timedelta(days=days_per_stop)
                if dep > end:
                    dep = end
                if dep <= arr:
                    break
                stop = TripStop(
                    trip_id=trip.id,
                    city_id=cid,
                    arrival_date=arr,
                    departure_date=dep,
                    sort_order=si,
                    stay_cents=random.randint(100000, 500000),
                    transport_in_cents=random.randint(50000, 300000),
                )
                db.add(stop)
                db.flush()

                # Add 1–3 activities per stop
                city_acts = acts_by_city.get(cid, [])
                if city_acts:
                    for ai, act in enumerate(
                        random.sample(city_acts, min(random.randint(1, 3), len(city_acts)))
                    ):
                        sched = arr + timedelta(days=random.randint(0, (dep - arr).days - 1))
                        sa = StopActivity(
                            trip_stop_id=stop.id,
                            activity_id=act.id,
                            scheduled_date=sched,
                            cost_cents=act.base_cost_cents,
                            sort_order=ai,
                        )
                        db.add(sa)

                current = dep

            # Add 0–3 expenses
            for _ in range(random.randint(0, 3)):
                exp = TripExpense(
                    trip_id=trip.id,
                    category=random.choice(categories),
                    label=random.choice(["Flight", "Hotel", "Train", "Taxi", "Lunch", "Souvenir"]),
                    amount_cents=random.randint(10000, 500000),
                    incurred_on=start + timedelta(days=random.randint(0, duration)),
                )
                db.add(exp)

            trip_count += 1

    db.commit()
    print(f"  Demo trips: {trip_count}")


def main():
    parser = argparse.ArgumentParser(description="Seed the GlobeTrotter database")
    parser.add_argument("--demo", action="store_true", help="Add demo volume data")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        print("Seeding catalogue data...")
        country_map, region_by_iso2 = seed_countries(db)
        city_map = seed_cities(db, country_map, region_by_iso2)
        cat_map = seed_categories(db)
        seed_activities(db, city_map, cat_map)

        if args.demo:
            print("\nSeeding demo data...")
            seed_demo(db, city_map)

        print("\nDone!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
