import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export const runtime = 'nodejs';
export async function POST(request) {
  try {
    // استيراد ديناميكي يعمل في الـ Runtime فقط
    const { pdf } = await import('pdf-to-img');
    
    // كمل بقية الكود الخاص بك هنا...
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 1. استخراج النص الرقمي العادي من الـ PDF
const extractTextFromPdf = async (buffer) => {
  try {
    const parse = typeof pdfParse === 'function' ? pdfParse : (pdfParse && pdfParse.default ? pdfParse.default : null);
    if (!parse) return '';
    const data = await parse(buffer);
    return data.text || '';
  } catch (err) {
    return '';
  }
};

// 2. استخراج النص من الـ PDF المصور باستخدام Tesseract OCR
const extractTextWithOCR = async (buffer) => {
  try {
    const document = await pdf(buffer, { scale: 2.0 });
    const worker = await createWorker(['ara', 'eng']);
    let combinedText = '';
    let pageCount = 0;

    // قراءة أول 10 صفحات بحد أقصى لضمان السرعة
    for await (const image of document) {
      if (pageCount >= 10) break;
      const { data: { text } } = await worker.recognize(image);
      combinedText += text + '\n';
      pageCount++;
    }

    await worker.terminate();
    return combinedText;
  } catch (error) {
    console.error('OCR Extraction Error:', error);
    return '';
  }
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const customApiKey = formData.get('apiKey');
    const count = formData.get('count') || '5';
    const promptText = formData.get('prompt') || '';

    let extractedText = '';
    let isPdf = false;

    // معالجة الملف المرفوع
    if (file && typeof file === 'object' && file.name) {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        // محاولة استخراج النص العادي أولاً
        extractedText = await extractTextFromPdf(fileBuffer);

        // إذا كان الملف عبارة عن صور (نص أقل من 20 حرف)، يتم تشغيل الـ OCR تلقائياً
        if (!extractedText || extractedText.trim().length < 20) {
          extractedText = await extractTextWithOCR(fileBuffer);
        }
      } else {
        extractedText = fileBuffer.toString('utf-8');
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'تعذر استخراج أية نصوص من الملف. يرجى التأكد من وضوح الصفحات.' },
        { status: 400 }
      );
    }

    // جلب مفتاح API (Groq أو OpenAI)
    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال مفتاح API الخاص بك (Groq أو OpenAI) في الحقل المخصص.' },
        { status: 400 }
      );
    }

    const systemPrompt = `أنت معلم دقيق جداً. قم بإنشاء اختبار اختيار من متعدد مكون من ${count} أسئلة باللغة العربية.

شروط صارمة:
1. جميع الأسئلة والخيارات والإجابات الصحيحة يجب أن تكون مستخرجة بنسبة 100% فقط وحصرياً من المحتوى المرفق.
2. يُمنع منعاً باتاً إبتكار أو إضافة أي سؤال أو معلومة خارج هذا المحتوى.

تعليمات إضافية من المعلم: ${promptText || 'لا يوجد'}

المحتوى المستخرج من المذكرة:
"""
${extractedText.slice(0, 15000)}
"""

يجب إرجاع النتيجة بصيغة JSON فقط بهذا الهيكل حصراً:
{
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الخيار الصحيح بالضبط مطابق لإحدى الخيارات"
    }
  ]
}`;

    let rawJsonText = '';

    // المعالجة عبر Groq API
    if (apiKey.startsWith('gsk_')) {
      let activeModels = [];
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          if (Array.isArray(modelsData.data)) activeModels = modelsData.data.map(m => m.id);
        }
      } catch (e) {}

      const fallbackModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.2-3b-preview'];
      const modelsToTry = Array.from(new Set([...activeModels, ...fallbackModels]))
        .filter(m => !m.includes('mixtral') && !m.match(/^llama3-\d/));

      let lastError = '';
      for (const model of modelsToTry) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: 'user', content: systemPrompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          });

          const data = await response.json();
          if (response.ok && data.choices?.[0]?.message?.content) {
            rawJsonText = data.choices[0].message.content;
            break;
          } else {
            lastError = data.error?.message || `خطأ في النموذج ${model}`;
          }
        } catch (e) {
          lastError = e.message;
        }
      }

      if (!rawJsonText) throw new Error(lastError || 'يرجى التأكد من صحة مفتاح Groq الخاص بك.');

    } else {
      // المعالجة عبر OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'مفتاح OpenAI غير صالح أو لا يوجد رصيد');
      rawJsonText = data.choices?.[0]?.message?.content;
    }

    if (!rawJsonText) {
      throw new Error('لم يرجع الذكاء الاصطناعي أي استجابة.');
    }

    // تنظيف نص الـ JSON واستخراج الأسئلة
    let cleanJson = rawJsonText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);
    const questions = parsedData.questions || (Array.isArray(parsedData) ? parsedData : []);

    if (!questions || questions.length === 0) {
      throw new Error('تعذر استخراج الأسئلة من النص المرفق.');
    }

    return NextResponse.json({
      success: true,
      questions: questions
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ أثناء معالجة الطلب' },
      { status: 500 }
    );
  }
}