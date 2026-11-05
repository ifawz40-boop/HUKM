import type { ErrorRequestHandler } from 'express';

/**
 * Convert parser and unexpected API failures into predictable JSON responses.
 * Never expose internal exception messages, provider payloads, or stack traces.
 */
export const apiErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const isApiRequest = req.path === '/api' || req.path.startsWith('/api/');
  if (!isApiRequest) {
    next(error);
    return;
  }

  const details = error && typeof error === 'object'
    ? error as { type?: string; status?: number }
    : {};

  const isPayloadTooLarge = details.type === 'entity.too.large' || details.status === 413;
  const isMalformedJson = details.type === 'entity.parse.failed';
  const statusCode = isPayloadTooLarge ? 413 : isMalformedJson ? 400 : 500;
  const code = isPayloadTooLarge
    ? 'PAYLOAD_TOO_LARGE'
    : isMalformedJson
      ? 'INVALID_JSON'
      : 'INTERNAL_SERVER_ERROR';
  const message = isPayloadTooLarge
    ? 'حجم البيانات المرسلة أكبر من الحد المسموح به.'
    : isMalformedJson
      ? 'صيغة JSON المرسلة غير صالحة.'
      : 'حدث خطأ داخلي أثناء معالجة الطلب. يرجى المحاولة لاحقاً.';

  res.status(statusCode).json({
    success: false,
    code,
    message,
  });
};
