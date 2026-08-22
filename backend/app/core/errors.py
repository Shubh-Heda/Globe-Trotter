from sqlalchemy.exc import SQLAlchemyError


class AppError(Exception):
    status_code = 400
    code = "ERROR"

    def __init__(self, message: str, details: list[dict] | None = None):
        self.message = message
        self.details = details or []
        super().__init__(message)


class ValidationFailed(AppError):
    status_code = 400
    code = "VALIDATION_FAILED"


class NotFound(AppError):
    status_code = 404
    code = "NOT_FOUND"


class Unauthorized(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class InvalidCredentials(AppError):
    status_code = 401
    code = "INVALID_CREDENTIALS"


class EmailTaken(AppError):
    status_code = 409
    code = "EMAIL_TAKEN"


class StopOverlap(AppError):
    status_code = 409
    code = "STOP_OVERLAP"


class StopOutsideTrip(AppError):
    status_code = 400
    code = "STOP_OUTSIDE_TRIP"


class ActivityOutsideStop(AppError):
    status_code = 400
    code = "ACTIVITY_OUTSIDE_STOP"


class RateLimited(AppError):
    status_code = 429
    code = "RATE_LIMITED"


def translate_integrity_error(exc: SQLAlchemyError) -> AppError:
    orig = getattr(exc, "orig", None)
    diag = getattr(orig, "diag", None)
    sqlstate = getattr(diag, "sqlstate", None) or getattr(orig, "sqlstate", None)
    message = str(orig).lower()

    if sqlstate == "23505" or "users_email_active_uq" in message:
        return EmailTaken("That email is already registered.")
    if sqlstate == "23P01" or "stop_no_overlap" in message:
        return StopOverlap("This stop overlaps another stop's dates.")
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
