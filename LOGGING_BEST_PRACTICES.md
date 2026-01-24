# Logging Best Practices

Effective logging is crucial for debugging, monitoring, and security. This guide outlines how to use the DABDUB logging system correctly.

## 1. Log Levels

We use the standard Winston/RFC5424 log levels. Choose the appropriate level for your message:

- **`error`**: Critical failures that require immediate attention (e.g., database down, 500 errors).
- **`warn`**: Potential issues that don't stop the application but should be investigated (e.g., deprecated API usage, near-limit resource consumption).
- **`info`**: General operational information (e.g., service started, successful payment, user registered).
- **`debug`**: Detailed information for debugging (e.g., internal state, function entry/exit). Not visible in production.
- **`verbose`**: Highly detailed logs, useful for tracing specific flows.

## 2. Context-Aware Logging

Always provide context in your logs to make them searchable.

```typescript
// Good
this.logger.log('Payment processed successfully', {
  userId: user.id,
  orderId: order.id,
  amount: order.amount,
  status: 'SUCCESS',
});

// Bad
this.logger.log(`User ${user.id} paid ${order.amount}`);
```

## 3. Sensitive Data Masking

The logging system automatically masks sensitive fields like `password`, `token`, `secret`, and `creditCard`. 

- **Do NOT** log sensitive data manually in the message string.
- **DO** include sensitive data in the metadata object if necessary; the system will mask it.

## 4. Request Correlation (Request ID)

Each request is assigned a unique `X-Request-Id`. This ID is automatically included in logs and returned in responses. Use it to trace the lifecycle of a single request across filters and services.

## 5. Structured Logging

In production, logs are output in **JSON format**. This makes them compatible with log aggregation tools like ELK Stack or Datadog. Avoid multi-line strings in log messages; instead, use the metadata object to include structured data.

## 6. Log Rotation

Logs are automatically rotated daily:
- **`application-YYYY-MM-DD.log`**: All logs (info and above). Kept for 14 days.
- **`error-YYYY-MM-DD.log`**: Only error logs. Kept for 30 days.

## 7. Performance

Logging is generally efficient, but avoid heavy operations (like complex JSON serialization or DB lookups) inside log calls.
