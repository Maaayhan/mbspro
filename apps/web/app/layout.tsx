import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBSPro - Medical Billing Suggestions",
  description: "AI-powered MBS item suggestions for medical professionals",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">MBSPro</h1>
                  <span className="ml-2 text-sm text-gray-500">
                    Medical Billing Suggestions
                  </span>
                </div>
                <div className="text-sm text-gray-500">Day-1 Prototype</div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="text-center text-sm text-gray-500">
                MBSPro - Powered by AI for Medical Professionals
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
