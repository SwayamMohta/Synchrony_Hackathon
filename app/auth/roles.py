from app.auth.security import require_role

analyst = require_role("analyst", "admin")
admin = require_role("admin")
