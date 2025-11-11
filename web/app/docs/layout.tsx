import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | CGM Tracker',
  description: 'Interactive API documentation for CGM Tracker REST API',
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
