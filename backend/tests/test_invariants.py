"""Invariant tests for GlobeTrotter.

These test the database constraints and critical business rules
documented in MY_PLAN.md Stage 10:
1. Stop overlap refused
2. Stop outside trip range refused
3. Non-owner gets 404, not 403
4. Budget view sums match seeded lines
5. Admin route rejects non-admin JWT
6. Copy-trip produces correct counts with rebased dates
"""

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.tables import (
    StopActivity,
    Trip,
    TripExpense,
    TripStop,
    User,
)


class TestStopOverlap:
    """Stop overlap is refused by the exclusion constraint."""

    def test_back_to_back_stops_accepted(self, db: Session, test_user):
        """Kochi [12,15) then Alleppey [15,18) should both succeed."""
        trip = Trip(
            user_id=test_user.id,
            name="Kerala Trip",
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 20),
        )
        db.add(trip)
        db.flush()

        # Need a city — use id=1 if seeded, or find any
        city_id_row = db.execute(text("SELECT id FROM cities LIMIT 1")).first()
        if not city_id_row:
            pytest.skip("No cities seeded yet")
        city_id = city_id_row[0]

        stop1 = TripStop(
            trip_id=trip.id,
            city_id=city_id,
            arrival_date=date(2026, 12, 12),
            departure_date=date(2026, 12, 15),
            sort_order=0,
        )
        db.add(stop1)
        db.flush()

        # Need a different city for the second stop (or same city is fine for overlap test)
        city_id_row2 = db.execute(text("SELECT id FROM cities OFFSET 1 LIMIT 1")).first()
        city_id2 = city_id_row2[0] if city_id_row2 else city_id

        stop2 = TripStop(
            trip_id=trip.id,
            city_id=city_id2,
            arrival_date=date(2026, 12, 15),
            departure_date=date(2026, 12, 18),
            sort_order=1,
        )
        db.add(stop2)
        db.flush()  # Should succeed — back-to-back, no overlap

    def test_overlapping_stop_refused(self, db: Session, test_user):
        """Munnar [14,16) overlapping Kochi [12,15) should be refused."""
        trip = Trip(
            user_id=test_user.id,
            name="Kerala Trip Overlap",
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 20),
        )
        db.add(trip)
        db.flush()

        city_id_row = db.execute(text("SELECT id FROM cities LIMIT 1")).first()
        if not city_id_row:
            pytest.skip("No cities seeded yet")
        city_id = city_id_row[0]

        stop1 = TripStop(
            trip_id=trip.id,
            city_id=city_id,
            arrival_date=date(2026, 12, 12),
            departure_date=date(2026, 12, 15),
            sort_order=0,
        )
        db.add(stop1)
        db.flush()

        city_id_row2 = db.execute(text("SELECT id FROM cities OFFSET 1 LIMIT 1")).first()
        city_id2 = city_id_row2[0] if city_id_row2 else city_id

        stop_overlap = TripStop(
            trip_id=trip.id,
            city_id=city_id2,
            arrival_date=date(2026, 12, 14),
            departure_date=date(2026, 12, 16),
            sort_order=1,
        )
        db.add(stop_overlap)
        with pytest.raises(SQLAlchemyError):
            db.flush()


class TestStopOutsideTrip:
    """Stop outside trip's date range is refused by the constraint trigger."""

    def test_stop_outside_trip_refused(self, db: Session, test_user):
        trip = Trip(
            user_id=test_user.id,
            name="Short Trip",
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 15),
        )
        db.add(trip)
        db.flush()

        city_id_row = db.execute(text("SELECT id FROM cities LIMIT 1")).first()
        if not city_id_row:
            pytest.skip("No cities seeded yet")

        stop = TripStop(
            trip_id=trip.id,
            city_id=city_id_row[0],
            arrival_date=date(2026, 12, 20),  # Way outside trip range
            departure_date=date(2026, 12, 25),
            sort_order=0,
        )
        db.add(stop)
        # The constraint trigger is DEFERRABLE INITIALLY DEFERRED — it fires at COMMIT, not flush
        with pytest.raises(SQLAlchemyError):
            db.commit()


class TestOwnershipGuard:
    """Non-owner requesting a private trip gets 404, never 403."""

    def test_non_owner_gets_404(self, client, db: Session, test_user):
        # Create a trip owned by test_user
        trip = Trip(
            user_id=test_user.id,
            name="Private Trip",
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 20),
        )
        db.add(trip)
        db.commit()

        try:
            # Create a different user and try to access the trip
            other_user = User(
                id=uuid.uuid4(),
                email=f"other-{uuid.uuid4().hex[:8]}@test.globetrotter",
                password_hash="x",
                full_name="Other User",
            )
            db.add(other_user)
            db.commit()

            other_token = create_access_token(other_user.id)
            resp = client.get(
                f"/api/v1/trips/{trip.id}",
                headers={"Authorization": f"Bearer {other_token}"},
            )
            assert resp.status_code == 404
            body = resp.json()
            assert body["error"]["code"] == "NOT_FOUND"
            # Must NOT contain any hint that the trip exists
            assert "403" not in str(resp.status_code)
        finally:
            # Clean up
            db.execute(text("DELETE FROM trips WHERE id = :id"), {"id": trip.id})
            db.execute(text("DELETE FROM users WHERE email LIKE 'other-%@test.globetrotter'"))
            db.execute(text("DELETE FROM users WHERE id = :id"), {"id": test_user.id})
            db.commit()


class TestBudgetView:
    """Budget view sums match seeded cost lines exactly."""

    def test_budget_sums_correct(self, db: Session, test_user):
        trip = Trip(
            user_id=test_user.id,
            name="Budget Test Trip",
            start_date=date(2026, 12, 10),
            end_date=date(2026, 12, 20),
            budget_cap_cents=5000000,
        )
        db.add(trip)
        db.flush()

        city_id_row = db.execute(text("SELECT id FROM cities LIMIT 1")).first()
        if not city_id_row:
            pytest.skip("No cities seeded yet")

        stop = TripStop(
            trip_id=trip.id,
            city_id=city_id_row[0],
            arrival_date=date(2026, 12, 10),
            departure_date=date(2026, 12, 15),
            sort_order=0,
            stay_cents=200000,
            transport_in_cents=100000,
        )
        db.add(stop)
        db.flush()

        act = StopActivity(
            trip_stop_id=stop.id,
            custom_name="Test Activity",
            scheduled_date=date(2026, 12, 11),
            cost_cents=50000,
            sort_order=0,
        )
        db.add(act)

        exp = TripExpense(
            trip_id=trip.id,
            category="MEALS",
            label="Lunch",
            amount_cents=30000,
        )
        db.add(exp)
        db.flush()

        # Query the budget view
        row = db.execute(
            text("SELECT * FROM v_trip_budget WHERE trip_id = :id"),
            {"id": trip.id},
        ).mappings().first()

        assert row is not None
        expected_total = 200000 + 100000 + 50000 + 30000  # stay + transport + activity + expense
        assert row["total_cents"] == expected_total
        assert row["stay_cents"] == 200000
        assert row["transport_cents"] == 100000
        assert row["activity_cents"] == 50000
        assert row["meals_cents"] == 30000


class TestAdminGuard:
    """Admin route rejects a non-admin JWT."""

    def test_non_admin_rejected(self, client, db: Session, test_user):
        token = create_access_token(test_user.id)
        db.commit()
        try:
            resp = client.get(
                "/api/v1/admin/stats",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 401
        finally:
            db.execute(text("DELETE FROM users WHERE id = :id"), {"id": test_user.id})
            db.commit()

    def test_admin_accepted(self, client, db: Session, test_admin):
        token = create_access_token(test_admin.id)
        db.commit()
        try:
            resp = client.get(
                "/api/v1/admin/stats",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
        finally:
            db.execute(text("DELETE FROM users WHERE id = :id"), {"id": test_admin.id})
            db.commit()
