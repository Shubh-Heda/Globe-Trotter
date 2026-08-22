from sqlalchemy.exc import SQLAlchemyError


class AppError(Exception):
    status_code = 400
    code = "ERROR"
    default_message = "Could not complete the request."

    def __init__(self, message: str | None = None, details: list[dict] | None = None):
        self.message = message or self.default_message
        self.details = details or []
        super().__init__(self.message)


class ValidationFailed(AppError):
    status_code = 400
    code = "VALIDATION_FAILED"
    default_message = "Some fields need a second look."


class NotFound(AppError):
    status_code = 404
    code = "NOT_FOUND"
    default_message = "Not found."


class Unauthorized(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    default_message = "Session expired or invalid. Please log in again."


class InvalidCredentials(AppError):
    status_code = 401
    code = "INVALID_CREDENTIALS"
    default_message = "Incorrect email or password."


class EmailTaken(AppError):
    status_code = 409
    code = "EMAIL_TAKEN"
    default_message = "That email is already registered."


class StopOverlap(AppError):
    status_code = 409
    code = "STOP_OVERLAP"
    default_message = "This stop overlaps another stop's dates."


class StopOutsideTrip(AppError):
    status_code = 400
    code = "STOP_OUTSIDE_TRIP"
    default_message = "This stop falls outside the trip's dates."


class ActivityOutsideStop(AppError):
    status_code = 400
    code = "ACTIVITY_OUTSIDE_STOP"
    default_message = "This activity falls outside the stop's dates."


class RateLimited(AppError):
    status_code = 429
    code = "RATE_LIMITED"
    default_message = "Too many attempts. Please wait and try again."


def translate_integrity_error(exc: SQLAlchemyError) -> AppError:
    orig = getattr(exc, "orig", None)
    diag = getattr(orig, "diag", None)
    sqlstate = getattr(diag, "sqlstate", None) or getattr(orig, "sqlstate", None)
    message = str(orig).lower()

    # 23505 = unique_violation. Match on the constraint name, not the bare
    # sqlstate: several unique constraints share it, and reporting them all as
    # EMAIL_TAKEN mislabels (e.g.) a duplicate stop order as an email conflict.
    if "users_email_active_uq" in message:
        return EmailTaken("That email is already registered.")
    if "stop_order_uq" in message:
        return ValidationFailed("Those stops have conflicting positions.")
    if "trips_share_slug_key" in message:
        return AppError("Could not publish this trip. Please try again.")
    if sqlstate == "23P01" or "stop_no_overlap" in message:
        return StopOverlap("This stop overlaps another stop's dates.")
    # 23514 = check_violation. The schema's CHECK constraints are the last line
    # of defence behind schema-level validation; surface them as a readable 400
    # rather than letting them escape as an unhandled 500.
    if sqlstate == "23514":
        if "trip_dates_ordered" in message:
            return ValidationFailed("End date must be on or after the start date.")
        if "trip_span_sane" in message:
            return ValidationFailed("That trip spans too many days.")
        return ValidationFailed("Some fields need a second look.")
    return AppError("Could not complete the request.")


def translate_constraint_trigger_error(exc: SQLAlchemyError) -> AppError:
    orig = getattr(exc, "orig", None)
    message = str(orig)

    if "stop_outside_trip_range" in message:
        return StopOutsideTrip("This stop falls outside the trip's dates.")
    if "activity_outside_stop_range" in message:
        return ActivityOutsideStop("This activity falls outside the stop's dates.")
    return AppError("Could not complete the request.")


def translate_db_error(exc: SQLAlchemyError) -> AppError:
    trigger_error = translate_constraint_trigger_error(exc)
    if trigger_error.code != "ERROR":
        return trigger_error
    return translate_integrity_error(exc)
