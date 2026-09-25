import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Next.js App Router emits inline bootstrap scripts; nonce-based CSP
      // would require dynamic response middleware and is not needed yet.
      `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://*.supabase.co",
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ];

    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
