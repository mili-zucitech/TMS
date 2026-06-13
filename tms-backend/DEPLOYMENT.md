# TMS Backend Deployment Guide

## Database Connection (TiDB Cloud)

### SSL/TLS Requirements

**CRITICAL**: TiDB Cloud **REQUIRES** SSL/TLS encrypted connections. Insecure connections will be rejected with the error:
```
Connections using insecure transport are prohibited
```

### Environment Variable Configuration

When deploying to Render, Heroku, or any cloud platform, you MUST configure the `SPRING_DATASOURCE_URL` environment variable with ALL SSL parameters included:

#### ✅ CORRECT Configuration

```bash
SPRING_DATASOURCE_URL=jdbc:mysql://your-host.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
```

#### Required SSL Parameters

1. **`sslMode=VERIFY_IDENTITY`** - Verifies the server's SSL certificate
2. **`requireSSL=true`** - Forces SSL connection (rejects insecure fallback)
3. **`enabledTLSProtocols=TLSv1.2,TLSv1.3`** - Specifies allowed TLS versions

#### ❌ INCORRECT Configurations

**Missing SSL parameters:**
```bash
# WRONG - Will fail with "insecure transport prohibited" error
SPRING_DATASOURCE_URL=jdbc:mysql://your-host.tidbcloud.com:4000/tms
```

**Using deprecated useSSL parameter:**
```bash
# WRONG - Old syntax, doesn't work with TiDB Cloud
SPRING_DATASOURCE_URL=jdbc:mysql://your-host.tidbcloud.com:4000/tms?useSSL=true
```

**Using weaker SSL mode:**
```bash
# WRONG - REQUIRED mode allows insecure fallback
SPRING_DATASOURCE_URL=jdbc:mysql://your-host.tidbcloud.com:4000/tms?sslMode=REQUIRED
```

### Render Deployment

#### Step 1: Add Environment Variables

In your Render dashboard, add these environment variables:

```bash
# Database Connection (MUST include all SSL parameters)
SPRING_DATASOURCE_URL=jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
SPRING_DATASOURCE_USERNAME=your-username.root
SPRING_DATASOURCE_PASSWORD=your-password

# JWT Configuration
JWT_SECRET=your-base64-encoded-secret-key-here

# CORS Configuration
FRONTEND_URL=https://your-frontend.vercel.app

# Mail Configuration (Gmail App Password)
SPRING_MAIL_USERNAME=your-email@gmail.com
SPRING_MAIL_PASSWORD=your-16-char-app-password

# Port (usually auto-configured by Render)
PORT=8080
```

#### Step 2: Build Command

```bash
mvn clean package -DskipTests
```

#### Step 3: Start Command

```bash
java -jar target/tms-backend-1.0.0.jar
```

### TiDB Cloud Connection Verification

To verify your database connection string works, you can test it locally:

```bash
# Set environment variables
export SPRING_DATASOURCE_URL="jdbc:mysql://your-host.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true"
export SPRING_DATASOURCE_USERNAME="your-username"
export SPRING_DATASOURCE_PASSWORD="your-password"

# Run the application
mvn spring-boot:run
```

If successful, you should see logs indicating Flyway migrations are running and Hibernate is connecting.

### Common Issues and Solutions

#### Issue 1: "Connections using insecure transport are prohibited"

**Solution**: Ensure your `SPRING_DATASOURCE_URL` includes:
- `sslMode=VERIFY_IDENTITY`
- `requireSSL=true`
- `enabledTLSProtocols=TLSv1.2,TLSv1.3`

#### Issue 2: "Could not create connection to database server"

**Possible causes**:
- Incorrect hostname or port
- Firewall blocking outbound connections on port 4000
- TiDB Cloud cluster is paused or unavailable

**Solution**: Verify the connection string and ensure the TiDB cluster is running

#### Issue 3: "Access denied for user"

**Solution**: Verify username and password are correct. For TiDB Cloud:
- Username format: `<cluster-prefix>.root`
- Ensure the user has proper permissions

### Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive configuration
3. **Rotate secrets regularly** (especially JWT_SECRET and database passwords)
4. **Generate strong JWT secret**:
   ```bash
   openssl rand -base64 64
   ```
5. **Use Gmail App Passwords** (not your actual Gmail password) for mail configuration

### Mail Configuration

Gmail requires App Passwords (not your regular Gmail password):

1. Go to Google Account → Security → 2-Step Verification
2. Enable 2-Step Verification if not already enabled
3. Go to Security → App Passwords
4. Generate a new App Password for "Mail"
5. Use the 16-character password (no spaces) as `SPRING_MAIL_PASSWORD`

### Health Checks

After deployment, verify the application is running:

```bash
# Health check endpoint
curl https://your-app.onrender.com/actuator/health

# Mail health check
curl https://your-app.onrender.com/health/mail
```

### Logs and Debugging

To troubleshoot deployment issues:

1. Check Render logs for startup errors
2. Look for Flyway migration errors
3. Verify SSL connection handshake completes
4. Check for `org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration` errors

### Testing Before Deployment

Always test the build locally before deploying:

```bash
# Run all tests
mvn clean test

# Build the JAR
mvn clean package

# Run the JAR locally
java -jar target/tms-backend-1.0.0.jar
```

## Additional Resources

- [TiDB Cloud Secure Connections](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-tier-clusters)
- [MySQL Connector/J SSL Configuration](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-using-ssl.html)
- [Spring Boot External Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
