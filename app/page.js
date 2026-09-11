'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleStartExam = (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('يرجى إدخال رمز الـ PIN');
      return;
    }
    router.push(`/exam?pin=${encodeURIComponent(pin.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131B2E] p-8 rounded-2xl shadow-2xl border border-gray-800 text-center">
        <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 text-2xl font-bold">
          🎓
        </div>

        <h1 className="text-2xl font-bold mb-2 text-white">منصة الاختبارات الذكية</h1>
        <p className="text-gray-400 text-sm mb-6">أدخل رمز الـ PIN لبدء الاختبار</p>

        <form onSubmit={handleStartExam} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="رمز PIN (جرب: 1234 أو 9999)"
              className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-white text-center text-lg focus:outline-none focus:border-blue-500 font-mono"
            />
            {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl transition cursor-pointer text-white"
          >
            بدء الاختبار
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 flex justify-between text-xs font-medium">
          <Link href="/analytics" className="text-amber-400 hover:underline">
            🏆 لوحة الأوائل
          </Link>
          <Link href="/teacher" className="text-blue-400 hover:underline">
            ⚙️ لوحة المعلم
          </Link>
        </div>
      </div>

      {/* التذييل الثابت */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1 w-full max-w-md">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span></p>
      </footer>
    </div>
  );
}