# Domain model

## Core concepts

### Profile
A platform-level identity associated with Supabase auth.users. Each profile contains the application role and a locale/timezone.

### Birth profile
Reusable and sensitive birth details used as an input to astrology and Panchang calculations. This data must be access-controlled and not exposed broadly.

### Pandit
Pandit-specific configuration and business relationship metadata. It does not duplicate user authentication data.

### Client
A Pandit-owned client record. This is separate from a platform account and must not be treated as identical to a user profile.

### Reports
Generic report records that can later represent Kundli, Panchang, Dasha, matching, or custom summary reports.

### AI usage
A usage ledger for a feature such as AI chat or report generation. It is tied to a user or Pandit entitlement plan and a billing period.

### Audit logs
Sensitive administrative event records that capture who performed an action and when without exposing secret values.
