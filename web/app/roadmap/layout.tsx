import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Roadmap | CGM Sensor Tracker',
  description: 'See what we\'re building to make CGM tracking even better',
};

export default function RoadmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}