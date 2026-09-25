type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function redact(value: string): string {
  return value.length > 4 ? `${value.slice(0, 2)}***` : '***';
}

export function log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata, (_key, value) => {
    if (typeof value === 'string' && /token|secret|key|password/i.test(_key)) {
      return redact(value);
    }
    return value;
  })) : undefined;

  if (process.env.NODE_ENV !== 'production') {
    console[level](`[${level.toUpperCase()}] ${message}`, safeMetadata ?? {});
  }
}
