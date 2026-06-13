# 🔥 URGENT: Fix "Insecure Transport Prohibited" Error

## The Problem

Your Render deployment is failing with this error:
```
Connections using insecure transport are prohibited
```

## The Cause

The `SPRING_DATASOURCE_URL` environment variable you set in Render **does not have the required SSL parameters**.

## The Fix (Step by Step)

### Step 1: Go to Render Dashboard

1. Log in to [Render](https://dashboard.render.com)
2. Click on your `tms-backend` service
3. Click on **"Environment"** in the left sidebar

### Step 2: Find SPRING_DATASOURCE_URL

Look for the environment variable named `SPRING_DATASOURCE_URL`

### Step 3: Check Current Value

Your current value probably looks like this (❌ WRONG):
```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms
```

Or maybe like this (❌ ALSO WRONG):
```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?useSSL=true
```

### Step 4: Update to Correct Value

**Click "Edit"** and replace the entire value with this (✅ CORRECT):

```
jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/tms?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true
```

### Step 5: Verify the Value

**IMPORTANT**: After pasting, scroll through the value in Render and verify you see:

- ✅ `sslMode=VERIFY_IDENTITY`
- ✅ `requireSSL=true`
- ✅ `enabledTLSProtocols=TLSv1.2,TLSv1.3`
- ✅ `serverTimezone=UTC`
- ✅ `createDatabaseIfNotExist=true`

If ANY parameter is missing, the deployment will FAIL again.

### Step 6: Save and Redeploy

1. Click **"Save Changes"**
2. Go back to your service dashboard
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for the deployment to complete

### Step 7: Verify Success

Check the deployment logs. You should see:

✅ **Success indicators**:
```
Flyway Community Edition ... by Redgate
Successfully validated 7 migrations
Creating Schema History table
Successfully applied 7 migrations
```

❌ **Failure indicators**:
```
Connections using insecure transport are prohibited
SSL Error
Connection refused
```

## Why This Happens

When you set environment variables in Render (or any cloud platform), they **completely override** the defaults in your `application.yml` file.

Even though we added SSL parameters to `application.yml`, if you set `SPRING_DATASOURCE_URL` in Render **without** those parameters, the application uses your incomplete environment variable instead.

## Double-Check All Environment Variables

While you're in the Environment tab, verify these are also set correctly:

| Variable Name | Required Value Example |
|---------------|------------------------|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://gateway01...?sslMode=VERIFY_IDENTITY&requireSSL=true&enabledTLSProtocols=TLSv1.2,TLSv1.3&serverTimezone=UTC&createDatabaseIfNotExist=true` |
| `SPRING_DATASOURCE_USERNAME` | `2n8ARf4DxRuab3Z.root` |
| `SPRING_DATASOURCE_PASSWORD` | `Qc46tGD6PmHH03C8` |
| `JWT_SECRET` | Your base64-encoded secret |
| `FRONTEND_URL` | `https://tms-lac.vercel.app` |
| `SPRING_MAIL_USERNAME` | `your-email@gmail.com` |
| `SPRING_MAIL_PASSWORD` | 16-character Gmail App Password |

## Still Getting Errors?

If you're still seeing the SSL error after following these steps:

### Check 1: Did Render Actually Use the New Value?

In the deployment logs, look for a line that shows the connection URL (password will be hidden):
```
HikariPool-1 - Starting...
HikariPool-1 - Driver does not support get/set network timeout for connections
```

If you see SSL errors immediately after, the environment variable wasn't picked up.

### Check 2: Did You Click "Save Changes"?

Make sure you clicked the **"Save Changes"** button after editing the environment variable.

### Check 3: Did You Trigger a New Deployment?

Simply saving environment variables doesn't automatically redeploy. You must:
- Use the **"Manual Deploy"** button, OR
- Push a new commit to trigger a deploy

### Check 4: Copy-Paste Error?

The most common issue is copying the URL incorrectly. Make sure:
- No extra spaces at the beginning or end
- All `&` characters are present between parameters
- No line breaks in the middle of the URL

## Need More Help?

1. Check the **full deployment logs** in Render
2. Look for the specific error message (should be near the end)
3. Verify your TiDB Cloud database is running and accessible
4. Make sure your TiDB Cloud credentials are correct

## Quick Test

Once deployed successfully, test your API:

```bash
curl https://your-app.onrender.com/health/mail
```

Should return:
```json
{"status":"UP"}
```

If you get a response (even if it's an error about mail), it means the database connection worked! The SSL issue is fixed.
