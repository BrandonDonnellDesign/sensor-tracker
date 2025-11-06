# 🌐 Netlify Deployment Setup for Automated Notifications

## 🚀 **Quick Netlify Setup**

### **1. Environment Variables**
In your Netlify dashboard, go to Site Settings → Environment Variables and add:

```bash
CRON_SECRET=your-secure-random-string-here-make-it-long-and-random
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### **2. Build Settings**
```bash
Build command: npm run build
Publish directory: .next
Node version: 18
```

### **3. Deploy Configuration**
The `netlify.toml` file is already configured with:
- ✅ Next.js plugin
- ✅ API route redirects
- ✅ Security headers
- ✅ Function settings

### **4. Scheduled Functions**
The scheduled function at `netlify/functions/scheduled-notifications.ts` will:
- ✅ Run every 5 minutes automatically
- ✅ Call your notification generation API
- ✅ Log results for monitoring
- ✅ Handle errors gracefully

## 📋 **Deployment Checklist**

### **Pre-deployment:**
- [ ] Environment variables set in Netlify dashboard
- [ ] Database migrations run: `npx supabase migration up`
- [ ] Code pushed to your Git repository
- [ ] `netlify.toml` configuration file in place

### **Post-deployment:**
- [ ] Test scheduled function: Check Netlify Functions tab
- [ ] Verify WebSocket connections: Visit `/debug/websockets`
- [ ] Test notification flow: Log insulin, check for alerts
- [ ] Monitor function logs: Netlify dashboard → Functions → Logs

## 🔧 **Netlify-Specific Features**

### **Function Monitoring**
```bash
# View function logs in Netlify dashboard
Site → Functions → scheduled-notifications → View logs

# Or use Netlify CLI
netlify functions:list
netlify functions:invoke scheduled-notifications
```

### **Manual Testing**
```bash
# Test the scheduled function manually
curl -X POST https://yourdomain.netlify.app/.netlify/functions/scheduled-notifications
```

### **Environment Variable Management**
```bash
# Using Netlify CLI
netlify env:set CRON_SECRET "your-secret-here"
netlify env:list
```

## 🚨 **Troubleshooting Netlify Issues**

### **Scheduled Function Not Running?**
1. Check Netlify Functions dashboard for errors
2. Verify environment variables are set
3. Check function logs for execution history
4. Ensure `@netlify/functions` package is installed

### **API Routes Not Working?**
1. Verify `netlify.toml` redirects are correct
2. Check Next.js build completed successfully
3. Test API routes directly: `https://yourdomain.netlify.app/api/health`

### **WebSocket Issues?**
1. Ensure Supabase Realtime is enabled in your project
2. Check browser console for WebSocket connection errors
3. Verify user authentication is working
4. Test with `/debug/websockets` page

### **Build Failures?**
1. Check Node.js version (should be 18+)
2. Verify all dependencies are installed
3. Run `npm run build` locally first
4. Check Netlify build logs for specific errors

## 📊 **Monitoring & Analytics**

### **Netlify Analytics**
- Function execution count
- Error rates and response times
- Bandwidth usage
- User traffic patterns

### **Custom Monitoring**
```javascript
// Add to your notification API
console.log('📊 Notification stats:', {
  timestamp: new Date().toISOString(),
  processedUsers: count,
  totalNotifications: total,
  executionTime: Date.now() - startTime
});
```

### **Health Checks**
```bash
# Create a health check endpoint
GET /api/health
→ Returns system status, database connectivity, function health
```

## 🎯 **Netlify Advantages for Your App**

### **✅ Benefits:**
- **Global CDN**: Fast loading worldwide
- **Automatic HTTPS**: SSL certificates managed
- **Git Integration**: Deploy on every push
- **Scheduled Functions**: Built-in cron functionality
- **Edge Functions**: Ultra-low latency processing
- **Form Handling**: Easy contact/feedback forms
- **Analytics**: Built-in traffic and performance monitoring

### **🔧 Optimization Tips:**
- Use **Edge Functions** for ultra-fast API responses
- Enable **Asset Optimization** for faster loading
- Set up **Split Testing** for notification effectiveness
- Use **Netlify Identity** if you need additional auth features

## 🎉 **You're Ready!**

Your Netlify deployment will now have:
- ✅ **Automated notifications** running every 5 minutes
- ✅ **Real-time WebSocket** delivery via Supabase
- ✅ **Global performance** with CDN
- ✅ **Automatic scaling** for any number of users
- ✅ **Built-in monitoring** and error handling

Deploy and watch your life-saving notification system come to life! 🚀