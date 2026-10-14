"""Domain errors, mapped to HTTP responses in ``app.main``."""


class StockPulseError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class SymbolNotFoundError(StockPulseError):
    status_code = 404
    code = "symbol_not_found"


class InvalidRequestError(StockPulseError):
    status_code = 422
    code = "invalid_request"


class ProviderUnavailableError(StockPulseError):
    status_code = 503
    code = "provider_unavailable"


class InsufficientDataError(StockPulseError):
    status_code = 422
    code = "insufficient_data"
