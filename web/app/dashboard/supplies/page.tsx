import { redirect } from 'next/navigation';

export default function SuppliesPage() {
  // Redirect to the combined inventory page
  redirect('/dashboard/inventory');
}

export const metadata = {
  title: 'Supplies Inventory - CGM Sensor Tracker',
  description: 'Track your diabetes supplies inventory',
};
