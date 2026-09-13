import "./globals.css";

export const metadata = {
  title: "منصة الاختبارات الذكية",
  description: "منصة امتحانات تفاعلية بالذكاء الاصطناعي",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="bg-[#0B0F19] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
{/* التذييل الثابت */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>جميع الحقوق محفوظة © 2024</p>
      </footer>