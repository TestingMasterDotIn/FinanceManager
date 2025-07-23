# OAuth Authentication Setup Guide

## Overview
This guide will help you set up Google, GitHub, and LinkedIn authentication for your Loan Master application using Supabase Auth.

## ✅ What's Already Done

### 1. Frontend Implementation
- ✅ Added `signInWithProvider` method to `useAuth` hook
- ✅ Added social login buttons to `AuthForm` component
- ✅ Implemented proper loading states and error handling
- ✅ Added visual icons for each provider (Google, GitHub, LinkedIn)

### 2. Authentication Flow
- ✅ OAuth providers redirect to `/dashboard` after successful authentication
- ✅ Proper error handling for failed authentication attempts
- ✅ Loading states for each provider during authentication

## 🔧 Supabase Configuration Required

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **loanMaster_Bolt**
3. Navigate to **Authentication** → **Providers**

### Step 2: Configure Google OAuth

#### 2.1 Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **OAuth consent screen**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add these redirect URIs:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (for local development)
   ```

#### 2.2 Configure in Supabase
1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: `your-google-client-id`
   - **Client Secret**: `your-google-client-secret`
4. **Save** changes

### Step 3: Configure GitHub OAuth

#### 3.1 Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: `Loan Master`
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
4. **Register application**
5. Copy **Client ID** and generate **Client Secret**

#### 3.2 Configure in Supabase
1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **GitHub** provider
3. Add your GitHub OAuth credentials:
   - **Client ID**: `your-github-client-id`
   - **Client Secret**: `your-github-client-secret`
4. **Save** changes

### Step 4: Configure LinkedIn OAuth

#### 4.1 Create LinkedIn OAuth App
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a **New App**
3. Fill in required details and verify
4. Go to **Auth** tab
5. Add these redirect URLs:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   ```
6. Copy **Client ID** and **Client Secret**

#### 4.2 Configure in Supabase
1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **LinkedIn** provider
3. Add your LinkedIn OAuth credentials:
   - **Client ID**: `your-linkedin-client-id`
   - **Client Secret**: `your-linkedin-client-secret`
4. **Save** changes

## 🔗 Important URLs to Update

### Your Supabase Project Reference
Replace `[YOUR_SUPABASE_PROJECT_REF]` with your actual project reference from:
- Supabase Dashboard → Settings → API → Project URL

### Redirect URLs for Each Provider
Use this format for all OAuth providers:
```
https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
```

## 🚀 Testing the Integration

### 1. Local Development
1. Start your development server: `npm run dev`
2. Navigate to the sign-in page
3. Try each social login button
4. Verify successful redirect to dashboard

### 2. Production Testing
1. Deploy your application
2. Update OAuth redirect URLs in each provider
3. Test all three social login options

## 📋 Checklist

- [ ] Google OAuth App created and configured
- [ ] GitHub OAuth App created and configured  
- [ ] LinkedIn OAuth App created and configured
- [ ] All providers enabled in Supabase Dashboard
- [ ] Redirect URLs updated in all provider settings
- [ ] Local testing completed successfully
- [ ] Production testing completed successfully

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI" Error
- ✅ Check that redirect URI in OAuth provider matches Supabase callback URL exactly
- ✅ Ensure no trailing slashes or extra characters

#### 2. "OAuth provider not enabled" Error
- ✅ Verify provider is enabled in Supabase Dashboard
- ✅ Check that Client ID and Secret are correctly entered

#### 3. Authentication Works but User Not Redirected
- ✅ Check that `redirectTo` URL in `signInWithProvider` is correct
- ✅ Verify your app handles the auth state change properly

#### 4. User Data Not Available
- ✅ Check that required scopes are requested (usually handled automatically by Supabase)
- ✅ Verify user profile data is accessible through `user` object in `useAuth`

## 📧 Additional Configuration

### Email Templates (Optional)
You can customize the email templates in:
**Supabase Dashboard** → **Authentication** → **Email Templates**

### User Metadata
OAuth providers will automatically populate user metadata with:
- Profile picture
- Full name
- Email address
- Provider-specific information

Access this data through:
```typescript
const { user } = useAuth()
console.log(user?.user_metadata) // Contains provider data
```

## 🔒 Security Notes

1. **Never expose Client Secrets** in your frontend code
2. **Use HTTPS** in production for all redirect URLs
3. **Regularly rotate** OAuth credentials
4. **Monitor** authentication logs in Supabase Dashboard

## 📝 Final Steps

After completing all configurations:

1. **Test each provider** thoroughly
2. **Verify user creation** in Supabase Dashboard → Authentication → Users
3. **Check user experience** from sign-in to dashboard
4. **Monitor for any errors** in browser console and Supabase logs

Your social authentication is now ready! Users can sign in with Google, GitHub, or LinkedIn in addition to email/password authentication.
