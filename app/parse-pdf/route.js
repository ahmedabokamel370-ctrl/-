import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف' }, { status: 400 });
    }

    // قم بمعالجة ملف الـ PDF هنا

    return NextResponse.json({ message: 'تم استلام الملف بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء قراءة الملف' }, { status: 500 });
  }
}