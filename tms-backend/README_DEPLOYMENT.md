# TMS Backend - Deployment Quick Start

## 🚨 YOU ARE SEEING THIS BECAUSE OF AN SSL ERROR

Your deployment is failing with:
```
Connections using insecure transport are prohibited
```

## ✅ Quick Fix (2 Minutes)

### 1. Open Render Dashboard
Go to: https://dashboard.render.com → Your Service → **Environment**

### 2. Update SPRING_DATASOURCE_URL

Find the `SPRING_DATASOURCE_URL` variable and change it to this **EXACT** value:

```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
```

### 3. Save and Redeploy

1. Click **"Save Changes"**
2. Go to your service dashboard
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### 4. Verify

Check the logs for:
```
✅ Flyway Community Edition
✅ Successfully validated X migrations
✅ Successfully applied X migrations
```

**That's it!** The SSL error should be gone.

---

## 📚 Detailed Documentation

If you need more details, see:

- **[RENDER_SSL_FIX.md](./RENDER_SSL_FIX.md)** - Step-by-step SSL error fix with screenshots
- **[RENDER_DEPLOY_CHECKLIST.md](./RENDER_DEPLOY_CHECKLIST.md)** - Complete deployment checklist
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment guide with troubleshooting

---

## 🎯 The Root Cause

TiDB Cloud **requires** SSL/TLS connections. Your environment variable was missing these required parameters:
- `sslMode=VERIFY_IDENTITY`
- `requireSSL=true`  
- `enabledTLSProtocols=TLSv1.2,TLSv1.3`

Without these, the database rejects the connection as "insecure transport."

---

## ⚡ All Environment Variables

For reference, here are ALL the environment variables you should have in Render:

| Variable | Value Template |
|----------|----------------|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://host:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true` |
| `SPRING_DATASOURCE_USERNAME` | `your-username.root` |
| `SPRING_DATASOURCE_PASSWORD` | `your-password` |
| `JWT_SECRET` | Base64-encoded secret (generate with `openssl rand -base64 64`) |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (no trailing slash) |
| `SPRING_MAIL_USERNAME` | `your-email@gmail.com` |
| `SPRING_MAIL_PASSWORD` | Gmail App Password (16 characters, no spaces) |

---

## 🛠️ Build Configuration

In Render, set:

**Build Command:**
```bash
mvn clean package -DskipTests
```

**Start Command:**
```bash
java -jar target/tms-backend-1.0.0.jar
```

---

## ❓ Still Not Working?

Common issues:

1. **Copy-paste error** - Make sure the entire URL is copied with no line breaks
2. **Didn't save** - Click "Save Changes" after editing
3. **Didn't redeploy** - Use "Manual Deploy" button
4. **Wrong credentials** - Verify username and password are correct
5. **TiDB Cloud down** - Check if your database cluster is running

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## ✉️ Support

If you're still stuck:
1. Check Render logs for the specific error
2. Verify your TiDB Cloud cluster is active
3. Double-check all environment variables match the table above
4. Make sure there are no typos in the SSL parameters
