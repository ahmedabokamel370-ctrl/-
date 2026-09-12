import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse-fork';

export const runtime = 'nodejs';

// تنظيف وتنسيق النص المستخرج
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// استخراج النص من ملفات PDF
const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return normalizeText(data.text);
  } catch (err) {
    console.error('PDF Parse Error:', err);
    return '';
  }
};

// استخراج النص من الصور عبر OCR (Tesseract)
const extractTextFromImageBuffer = async (buffer) => {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(['ara', 'eng']);
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return normalizeText(text);
  } catch (error) {
    console.error('Image OCR Error:', error);
    return '';
  }
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    // دعم كلا الاسمين للمفتاح لضمان التوافق مع الفرونت إند
    const customApiKey = formData.get('customApiKey') || formData.get('apiKey');
    const count = formData.get('count') || '5';
    const promptText = formData.get('prompt') || '';

    let extractedText = '';

    // 1. استخراج المحتوى من الملف إذا وجد
    if (file && typeof file === 'object' && file.name) {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const fileName = file.name.toLowerCase();
      const fileType = (file.type || '').toLowerCase();

      const isPdf = fileName.endsWith('.pdf') || fileType.includes('pdf');
      const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileType.startsWith('image/');

      if (isPdf) {
        extractedText = await extractTextFromPdf(fileBuffer);
      } else if (isImage) {
        extractedText = await extractTextFromImageBuffer(fileBuffer);
      } else {
        extractedText = normalizeText(fileBuffer.toString('utf-8'));
      }
    }

    // 2. التحقق من وجود مصدر للتوليد (ملف أو نص البرومبت)
    if ((!extractedText || extractedText.length < 10) && (!promptText || promptText.trim().length < 3)) {
      return NextResponse.json(
        { success: false, error: 'يرجى كتابة نص/موضوع الامتحان أو إرفاق ملف يحتوي على المحتوى المطلوب.' },
        { status: 400 }
      );
    }

    // 3. تحديد مفتاح الـ API المستخدم
    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'يرجى أدخل مفتاح API الخاص بك في الحقل المخصص أو إعداده في النظام.' },
        { status: 400 }
      );
    }

    // 4. إعداد تعليمات الذكاء الاصطناعي (System Prompt)
    const contextContent = extractedText ? `SOURCE TEXT:\n"""\n${extractedText.slice(0, 15000)}\n"""` : 'No file provided. Generate quiz solely based on the user instructions topic.';

    const systemPrompt = `You are an expert educational quiz creator. Generate a multiple-choice quiz with strictly ${count} questions based on the provided input.

LANGUAGE RULE:
- Detect the language of the provided text or prompt.
- Generate ALL questions, options, correct answers, and explanations in that exact same language (Arabic if Arabic, English if English).

RULES:
1. Provide exactly 4 options per question.
2. The "correctAnswer" string MUST match one of the items in the "options" array.
3. For each question, provide a short "explanation" for why the answer is correct.

USER INSTRUCTIONS / TOPIC: ${promptText || 'None'}

${contextContent}

Return JSON ONLY in this exact structure:
{
  "title": "Short suitable exam title",
  "questions": [
    {
      "id": 1,
      "question": "Question string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of why Option A is correct."
    }
  ]
}`;

    let rawJsonText = '';

    // 5. التنفيذ عبر Groq أو OpenAI
    if (apiKey.startsWith('gsk_')) {
      let activeModels = [];
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          if (Array.isArray(modelsData.data)) {
            activeModels = modelsData.data.map(m => m.id);
          }
        }
      } catch (e) {
        console.error('Error fetching Groq models:', e);
      }

      const fallbackModels = [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'llama3-8b-8192',
        'gemma2-9b-it'
      ];

      const modelsToTry = Array.from(new Set([...activeModels, ...fallbackModels]))
        .filter(m => !m.includes('mixtral') && !m.includes('guard'));

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
              temperature: 0.2,
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

      if (!rawJsonText) throw new Error(lastError || 'يرجى التأكد من صحة مفتاح Groq الخاص بك وصلاحيته.');

    } else {
      // استخدام OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'مفتاح OpenAI غير صالح أو انتهى الرصيد المتاح.');
      rawJsonText = data.choices?.[0]?.message?.content;
    }

    if (!rawJsonText) {
      throw new Error('لم يرجع الذكاء الاصطناعي أي استجابة.');
    }

    // 6. معالجة وتنسيق كود الـ JSON الناتج
    let cleanJson = rawJsonText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);
    let questions = parsedData.questions || (Array.isArray(parsedData) ? parsedData : []);

    // 7. تحسين وتدقيق الاختيارات وتحديد الخيار الصحيح برقم الفهرس
    questions = questions.map((q) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length === 0) return q;

      const rawCorrect = (q.correctAnswer || '').trim();
      let correctIndex = q.options.findIndex(opt => opt.trim() === rawCorrect);

      if (correctIndex === -1) {
        correctIndex = q.options.findIndex(opt =>
          opt.trim().toLowerCase().includes(rawCorrect.toLowerCase()) ||
          rawCorrect.toLowerCase().includes(opt.trim().toLowerCase())
        );
      }

      if (correctIndex === -1) correctIndex = 0;

      return {
        question: q.question || q.text || 'سؤال بدون عنوان',
        options: q.options,
        correctOption: correctIndex,
        correctAnswer: q.options[correctIndex],
        explanation: q.explanation || 'الإجابة مستخرجة ومباشرة من نص المادة.'
      };
    });

    if (!questions || questions.length === 0) {
      throw new Error('تعذر توليد الأسئلة من البيانات المدخلة.');
    }

    return NextResponse.json({
      success: true,
      title: parsedData.title || 'اختبار جديد',
      usingCustomKey: Boolean(customApiKey && customApiKey.trim()),
      questions: questions
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ أثناء معالجة طلب التوليد' },
      { status: 500 }
    );
  }
}