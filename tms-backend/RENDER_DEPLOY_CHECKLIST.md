# Render Deployment Quick Checklist

## ⚠️ CRITICAL: Database SSL Configuration

**The #1 reason for deployment failure is incorrect database URL configuration.**

Your `SPRING_DATASOURCE_URL` environment variable **MUST** include these exact parameters:

```
sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3
```

## 📋 Environment Variables to Set in Render

Copy and paste these into Render's environment variables section, replacing the placeholder values:

### 1. Database Configuration (TiDB Cloud)

**CRITICAL**: The URL below MUST include all SSL parameters. Copy the ENTIRE string exactly as shown.

**SPRING_DATASOURCE_URL:**
```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
```

⚠️ **VERIFY**: After pasting, check that your environment variable includes:
- `sslMode=VERIFY_IDENTITY`
- `requireSSL=true`
- `enabledTLSProtocols=TLSv1.2,TLSv1.3`

If ANY of these are missing, the deployment WILL FAIL.

**SPRING_DATASOURCE_USERNAME:**
```
2n8ARf4DxRuab3Z.root
```

**SPRING_DATASOURCE_PASSWORD:**
```
Qc46tGD6PmHH03C8
```

### 2. JWT Secret

```bash
JWT_SECRET=dG1zLWp3dC1zZWNyZXQta2V5LXZlcnktc2VjdXJlLW1pbi0zMi1jaGFycw==
```

**⚠️ IMPORTANT**: Generate a new secret for production using:
```bash
openssl rand -base64 64
```

### 3. CORS Configuration

```bash
FRONTEND_URL=https://tms-lac.vercel.app
```

Replace with your actual frontend URL (no trailing slash).

### 4. Email Configuration (Gmail)

```bash
SPRING_MAIL_HOST=smtp.gmail.com
```

```bash
SPRING_MAIL_PORT=587
```

```bash
SPRING_MAIL_USERNAME=milisrivastava.zucitech@gmail.com
```

```bash
SPRING_MAIL_PASSWORD=tnlg uznn cbls pbwl
```

**⚠️ IMPORTANT**: Use a Gmail App Password (16 characters), not your regular Gmail password.

### 5. Port (Optional - Render sets this automatically)

```bash
PORT=8080
```

## 🔨 Build Configuration in Render

### Build Command:
```bash
mvn clean package -DskipTests
```

### Start Command:
```bash
java -jar target/tms-backend-1.0.0.jar
```

## ✅ Post-Deployment Verification

After deployment completes, test these endpoints:

### 1. Health Check
```bash
curl https://your-app.onrender.com/actuator/health
```

Expected response:
```json
{"status":"UP"}
```

### 2. Mail Health Check
```bash
curl https://your-app.onrender.com/health/mail
```

Expected response:
```json
{"status":"UP","details":{"mail":"SMTP connection successful"}}
```

### 3. Login Endpoint
```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tms.com","password":"Admin@123"}'
```

Expected: 200 OK or 401 if credentials are wrong (but endpoint should be reachable)

## 🚨 Common Deployment Errors

### Error: "Connections using insecure transport are prohibited"

**THIS IS THE MOST COMMON ERROR**

**Root Cause**: Your `SPRING_DATASOURCE_URL` environment variable in Render is missing SSL parameters.

**Solution**: 

1. Go to Render Dashboard → Your Service → Environment
2. Find the `SPRING_DATASOURCE_URL` variable
3. **Delete it and recreate it** with this EXACT value:

```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
```

4. **Verify** the value shows all parameters:
   - ✅ Contains `sslMode=VERIFY_IDENTITY`
   - ✅ Contains `requireSSL=true`
   - ✅ Contains `enabledTLSProtocols=TLSv1.2,TLSv1.3`

5. Click "Save Changes"
6. **Manually trigger a redeploy** (don't just push code - use Render's Manual Deploy button)

**Why this happens**: When you set an environment variable in Render, it completely overrides the default in `application.yml`. If your environment variable doesn't include the SSL parameters, the database will reject the connection.

**How to verify it's fixed**: After redeployment, check the logs. You should see Flyway migrations running instead of SSL errors.

### Error: "Access denied for user"

**Cause**: Incorrect database credentials

**Fix**: Double-check `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`

### Error: "Could not create connection to database server"

**Possible causes**:
1. TiDB cluster is paused or unavailable
2. Incorrect hostname or port in connection string
3. Firewall blocking port 4000

**Fix**: 
1. Check TiDB Cloud console to ensure cluster is running
2. Verify connection string matches your cluster's endpoint

### Error: "Failed to connect to SMTP server"

**Cause**: Invalid Gmail credentials or App Password not used

**Fix**: 
1. Ensure you're using a Gmail App Password (not regular password)
2. Verify `SPRING_MAIL_USERNAME` and `SPRING_MAIL_PASSWORD` are correct

### Error: "Invalid CORS request"

**Cause**: Frontend URL not in allowed origins

**Fix**: Ensure `FRONTEND_URL` matches your actual frontend domain (no trailing slash)

## 📝 Notes

- Render automatically detects Java applications and Maven projects
- The first deployment may take 5-10 minutes as dependencies are downloaded
- Subsequent deployments are faster due to caching
- Render provides free SSL certificates automatically
- Check Render logs for detailed error messages if deployment fails

## 🔗 Useful Links

- [Render Java Deployment Guide](https://render.com/docs/deploy-java)
- [TiDB Cloud Connection Guide](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-tier-clusters)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
