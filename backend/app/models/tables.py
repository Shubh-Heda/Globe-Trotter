import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    CheckConstraint,
    Computed,
    ForeignKey,
    Index,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    iso2: Mapped[str] = mapped_column()
    region: Mapped[str] = mapped_column()
    currency_code: Mapped[str] = mapped_column()


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("country_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column()
    cost_index: Mapped[int] = mapped_column()
    popularity_score: Mapped[int] = mapped_column(server_default="0")
    image_path: Mapped[str | None] = mapped_column()


class ActivityCategory(Base):
    __tablename__ = "activity_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    slug: Mapped[str] = mapped_column(unique=True)


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (UniqueConstraint("city_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"))
    category_id: Mapped[int] = mapped_column(
        ForeignKey("activity_categories.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column()
    description: Mapped[str | None] = mapped_column()
    base_cost_cents: Mapped[int] = mapped_column(server_default="0")
    duration_minutes: Mapped[int | None] = mapped_column()
    image_path: Mapped[str | None] = mapped_column()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(CITEXT)
    password_hash: Mapped[str] = mapped_column()
    full_name: Mapped[str] = mapped_column()
    home_city_id: Mapped[int | None] = mapped_column(
        ForeignKey("cities.id", ondelete="SET NULL")
    )
    avatar_path: Mapped[str | None] = mapped_column()
    role: Mapped[str] = mapped_column(server_default="USER")
    preferred_language: Mapped[str] = mapped_column(server_default="en")
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    deleted_at: Mapped[datetime | None] = mapped_column()


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column()
    description: Mapped[str | None] = mapped_column()
    start_date: Mapped[date] = mapped_column()
    end_date: Mapped[date] = mapped_column()
    cover_image_path: Mapped[str | None] = mapped_column()
    visibility: Mapped[str] = mapped_column(server_default="PRIVATE")
    share_slug: Mapped[str | None] = mapped_column(unique=True)
    currency_code: Mapped[str] = mapped_column(server_default="INR")
    budget_cap_cents: Mapped[int | None] = mapped_column()
    duration_days: Mapped[int] = mapped_column(
        Computed("end_date - start_date + 1", persisted=True)
    )
    copied_from_trip_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    deleted_at: Mapped[datetime | None] = mapped_column()


class TripStop(Base):
    __tablename__ = "trip_stops"
    __table_args__ = (UniqueConstraint("trip_id", "sort_order"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE")
    )
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="RESTRICT"))
    arrival_date: Mapped[date] = mapped_column()
    departure_date: Mapped[date] = mapped_column()
    sort_order: Mapped[int] = mapped_column()
    stay_cents: Mapped[int] = mapped_column(server_default="0")
    transport_in_cents: Mapped[int] = mapped_column(server_default="0")
    notes: Mapped[str | None] = mapped_column()


class StopActivity(Base):
    __tablename__ = "stop_activities"
    __table_args__ = (
        Index("stop_activities_day_idx", "trip_stop_id", "scheduled_date", "sort_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    trip_stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trip_stops.id", ondelete="CASCADE")
    )
    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id", ondelete="SET NULL")
    )
    custom_name: Mapped[str | None] = mapped_column()
    scheduled_date: Mapped[date] = mapped_column()
    start_time: Mapped[time | None] = mapped_column()
    duration_minutes: Mapped[int | None] = mapped_column()
    cost_cents: Mapped[int] = mapped_column(server_default="0")
    sort_order: Mapped[int] = mapped_column(server_default="0")
    notes: Mapped[str | None] = mapped_column()


class TripExpense(Base):
    __tablename__ = "trip_expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE")
    )
    trip_stop_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trip_stops.id", ondelete="CASCADE")
    )
    category: Mapped[str] = mapped_column()
    label: Mapped[str] = mapped_column()
    amount_cents: Mapped[int] = mapped_column()
    incurred_on: Mapped[date | None] = mapped_column()


class SavedDestination(Base):
    __tablename__ = "saved_destinations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"), primary_key=True
    )
    saved_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
