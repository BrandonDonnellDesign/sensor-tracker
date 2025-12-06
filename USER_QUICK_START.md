# User Quick Start Guide

## 🎯 What's New?

Your diabetes supply tracker just got a major upgrade! Here's what you can do now:

---

## 📦 Automatic Order Tracking

### Supported Pharmacies:
- ✅ Amazon Pharmacy
- ✅ CVS Pharmacy (NEW!)
- ✅ Walgreens (NEW!)
- ✅ Omnipod/Insulet
- ✅ Dexcom

### How It Works:
1. **Connect Gmail** (one-time setup)
   - Go to Settings
   - Click "Connect Gmail"
   - Authorize access

2. **Automatic Sync**
   - System checks your email every 5 minutes
   - Finds pharmacy order emails
   - Extracts order details
   - Updates your inventory

3. **Get Notified**
   - Order shipped: "Your CVS order is on the way!"
   - Order delivered: "Your order arrived - inventory updated!"
   - Low stock: "Only 2 sensors remaining"

### What Gets Tracked:
- 🔵 CGM Sensors (Dexcom G6, G7)
- 🩸 Test Strips
- 💉 Insulin
- 📌 Lancets
- 🔧 Pump Supplies (Omnipod, infusion sets)

---

## 📥 Export Your Data

### Why Export?
- 📋 Insurance claims
- 👨‍⚕️ Doctor appointments
- 💾 Personal backup
- 📊 Track your own trends

### How to Export:

1. **Go to Settings**
   - Click your profile
   - Select "Settings"
   - Find "Data Export" section

2. **Choose Format**
   - **JSON** - Complete data with all details
   - **CSV** - Easy to open in Excel/Google Sheets

3. **Select What to Include**
   - ☑ Glucose readings
   - ☑ Insulin doses
   - ☑ Food logs
   - ☑ Sensor history
   - ☑ Supply orders
   - ☑ Current inventory

4. **Click Export**
   - File downloads automatically
   - Named with today's date
   - Ready to share or save

### Example Uses:

**For Insurance:**
```
"I need to show my supply usage for the past 3 months"
→ Export CSV with sensors and orders
→ Open in Excel
→ Submit to insurance
```

**For Doctor:**
```
"My doctor wants to see my glucose trends"
→ Export JSON with glucose data
→ Share file with doctor
→ They can analyze patterns
```

**For Yourself:**
```
"I want to track my supply costs"
→ Export CSV with orders
→ Add up costs in spreadsheet
→ Budget for next year
```

---

## 🔍 Check Sync Status

### View Recent Syncs:
1. Go to **Settings > Gmail Debug**
2. See:
   - Last sync time
   - Emails processed
   - Orders matched
   - Any errors

### What You'll See:
```
✅ Last sync: 5 minutes ago
📧 Emails processed: 3
📦 Orders matched: 2
⚠️ Errors: 0
```

### If Something's Wrong:
- Go to **Dashboard > Gmail Sync** to see detailed errors
- Check if Gmail is still connected
- Look for error messages
- Try manual sync
- Contact support if needed

---

## 🔔 Notifications

### You'll Get Notified For:

**Orders:**
- 📦 "Your CVS order has shipped!"
- 📦 "Your order was delivered - 3 sensors added to inventory"

**Inventory:**
- 📉 "Low stock alert: Only 2 sensors remaining"
- 🔄 "Time to reorder supplies"

**Sensors:**
- ⏰ "Sensor expires in 2 days"
- ⚠️ "Sensor overdue for replacement"

**Health:**
- 💉 "High insulin on board - monitor glucose"
- 📊 "Rising glucose detected"

### Notification Settings:
- Go to Settings > Notifications
- Choose what you want to receive
- Set priority levels
- Enable/disable push notifications

---

## 💡 Tips & Tricks

### Maximize Automatic Tracking:
1. **Keep Gmail Connected**
   - Check connection status regularly
   - Reconnect if expired

2. **Use Consistent Email**
   - Order from same email address
   - Pharmacies will send to that email

3. **Check Inventory Regularly**
   - Dashboard > Inventory
   - See what's in stock
   - Plan reorders

### Save Time:
- Let the system track orders automatically
- Export data monthly for records
- Set up low stock alerts
- Review sync status weekly

### Stay Organized:
- Orders automatically matched
- Inventory updates when delivered
- History tracked for you
- Export anytime you need

---

## 🆘 Troubleshooting

### Gmail Not Syncing?
1. Check Settings > Gmail Debug
2. Look for error messages
3. Try disconnecting and reconnecting
4. Make sure Gmail access is still authorized

### Order Not Showing Up?
1. Check if email is from supported pharmacy
2. Wait 5 minutes for next sync
3. Try manual sync
4. Go to Dashboard > Gmail Sync to check unmatched emails

### Inventory Not Updating?
1. Verify order status is "delivered"
2. Check sync errors
3. Manual update if needed
4. Contact support

### Export Not Working?
1. Make sure you're logged in
2. Select at least one data type
3. Check browser download settings
4. Try different format (JSON vs CSV)

---

## 📞 Need Help?

### Resources:
- 📖 Full documentation: `GMAIL_SYNC_FEATURES.md`
- 🎨 Feature guide: `FEATURE_GUIDE.md`
- 🔧 Technical details: `IMPLEMENTATION_SUMMARY.md`

### Support:
- Check Settings > Gmail Debug for errors
- Review notification history
- Export data to verify
- Contact support with details

---

## 🎉 What's Next?

### Coming Soon:
- More pharmacy support (Express Scripts, US Med)
- Better email parsing with AI
- Invoice/receipt parsing
- Mobile app integration
- Advanced analytics

### Your Feedback:
- Tell us what pharmacies you use
- Report any parsing issues
- Suggest new features
- Share your experience

---

## ✅ Quick Checklist

**Setup (One Time):**
- [ ] Connect Gmail account
- [ ] Set notification preferences
- [ ] Review inventory settings
- [ ] Test with a recent order email

**Regular Use:**
- [ ] Check dashboard weekly
- [ ] Review inventory monthly
- [ ] Export data for records
- [ ] Update orders if needed

**Maintenance:**
- [ ] Verify Gmail connection monthly
- [ ] Check sync status regularly
- [ ] Clear old notifications
- [ ] Update preferences as needed

---

## 🚀 Get Started Now!

1. **Connect Gmail** → Settings
2. **Wait for Sync** → 5 minutes
3. **Check Dashboard** → See your orders
4. **Export Data** → Try it out!

**That's it! Your supplies are now tracked automatically.** 🎊

---

*Last Updated: December 5, 2025*
*Version: 1.0*
