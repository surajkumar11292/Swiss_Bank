export class ApiException extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(msg) {
    return new ApiException(400, msg);
  }

  static unauthorized(msg = 'Not authenticated') {
    return new ApiException(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiException(403, msg);
  }

  static notFound(msg = 'Not found') {
    return new ApiException(404, msg);
  }

  static conflict(msg) {
    return new ApiException(409, msg);
  }

  static totpRequired(msg) {
    return new ApiException(428, msg, 'TOTP_REQUIRED');
  }

  static totpInvalid(msg) {
    return new ApiException(403, msg, 'TOTP_INVALID');
  }
}

const HTTP_STATUS_NAMES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  428: 'Precondition Required',
  500: 'Internal Server Error',
};

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const errorName = HTTP_STATUS_NAMES[status] || (status >= 500 ? 'Internal Server Error' : 'Error');
  const message = err.message || 'Unexpected error';

  const responseBody = {
    timestamp: new Date().toISOString(),
    status,
    error: errorName,
    message,
  };

  if (err.code) {
    responseBody.code = err.code;
  }

  if (err.fieldErrors) {
    responseBody.fieldErrors = err.fieldErrors;
  }

  if (status >= 500) {
    console.error('[Unhandled Error]', err);
  }

  res.status(status).json(responseBody);
}
