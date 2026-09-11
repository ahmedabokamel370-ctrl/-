const formData = new FormData();
formData.append('file', pdfFile); // ملف الـ PDF المرفوع من المستخدم

const response = await fetch('/api/parse-pdf', {
  method: 'POST',
  body: formData,
});

const data = await response.json();

if (data.success) {
  console.log('النص المستخرج:', data.text);
} else {
  console.error('خطأ:', data.error);
}