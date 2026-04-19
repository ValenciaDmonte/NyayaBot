/**
 * middleware/validateRequest.js
 *
 * WHY: Instead of writing manual validation in every route handler, we use
 * Zod schemas + this middleware factory. It keeps route handlers clean and
 * ensures consistent 400 error format for all invalid requests.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), loginHandler)
 */

const validate = (schema) => (req, res, next) => {
  try {
    // Parse and validate req.body — Zod also strips unknown fields (safe by default)
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    // Pass Zod errors to the central errorHandler which formats them nicely
    next(err);
  }
};

module.exports = { validate };
