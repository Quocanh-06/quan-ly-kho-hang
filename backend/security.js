// Middleware bảo mật cơ bản cho hệ thống gia đình (tài nguyên free)
function securityHeaders(req, res, next) {
  // Ngăn clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Ngăn MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Không cho trình duyệt guess content-type
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Hạn chế thông tin server
  res.removeHeader ? res.removeHeader('X-Powered-By') : null;
  res.setHeader('X-Powered-By', 'Inventory-Family');
  next();
}

function strictCors(allowedOrigin) {
  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    // Cho phép tất cả nếu ALLOWED_ORIGIN là '*'
    if (allowedOrigin === '*') {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  };
}

// Giới hạn kích thước body để tránh payload bomba (100KB) - dùng Content-Length header
function bodySizeLimit(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 100 * 1024) {
    return res.status(413).json({ error: 'Request quá lớn' });
  }
  next();
}

// Ẩn chi tiết lỗi trong production, chỉ trả về message chung
function sanitizeError(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || err.statusCode || 500;
  const message = isProd && status === 500
    ? 'Lỗi hệ thống, vui lòng thử lại sau'
    : (err.message || 'Lỗi không xác định');
  res.status(status).json({ error: message });
}

module.exports = { securityHeaders, strictCors, bodySizeLimit, sanitizeError };
