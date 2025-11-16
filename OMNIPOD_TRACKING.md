# Omnipod Tracking Guide

## Features Added

Your supplies inventory now has smart Omnipod tracking capabilities!

### Two Tracking Modes

1. **Box Tracking** (Unit: "boxes")
   - Track unopened boxes of Omnipods
   - Each box contains 5 pods
   - Use the standard "Use Item" button to decrement boxes

2. **Individual Pod Tracking** (Unit: "pods")
   - Track individual Omnipods
   - Special "Start Pod" button automatically:
     - Decrements quantity by 1
     - Sets expiration to 3 days from now
   - Perfect for tracking your active pod

### How to Use

#### Adding Omnipods

1. Click "Add Supply Item"
2. Select "Pump Supplies" category
3. Enter item name with "Omnipod" in it (e.g., "Omnipod DASH", "Omnipod 5")
4. Choose unit type:
   - **"Individual Pods"** - for tracking loose pods
   - **"Boxes (5 pods each)"** - for tracking unopened boxes
5. Enter quantity and other details

#### Starting a Pod

When you have individual pods tracked:
1. Find your Omnipod item card
2. Click the green "Start Pod (3 days)" button
3. The system automatically:
   - Reduces quantity by 1
   - Sets expiration date to 3 days from now
   - Shows expiration warnings as the date approaches

#### Managing Boxes

For box tracking:
1. Use the standard "Use Item" button
2. Enter how many boxes you used
3. Manually track when you open a box and want to switch to individual pod tracking

### Tips

- Keep boxes and individual pods as separate inventory items
- When you open a box, you can:
  - Decrement the box count by 1
  - Add 5 to your individual pods count
- Set reorder thresholds to get low stock alerts
- The expiration date field is auto-managed for individual pods (disabled in the form)

### Example Workflow

1. **Initial Setup:**
   - Add "Omnipod Boxes" with quantity 3, unit "boxes"
   - Add "Omnipod Individual" with quantity 0, unit "pods"

2. **Opening a Box:**
   - Use 1 box from "Omnipod Boxes" (now 2 boxes)
   - Edit "Omnipod Individual" to add 5 pods (now 5 pods)

3. **Starting a Pod:**
   - Click "Start Pod" on "Omnipod Individual"
   - Quantity becomes 4, expiration set to 3 days from now

4. **Pod Change Day:**
   - Old pod expires (you'll see expiration warning)
   - Click "Start Pod" again for the next one
