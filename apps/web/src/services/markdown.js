/** Lightweight markdown → HTML used for AI summaries/minutes (Tailwind classes). */
export const formatMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center space-x-2 my-1"><input type="checkbox" class="rounded" disabled><span>$1</span></div>')
    .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center space-x-2 my-1"><input type="checkbox" class="rounded" checked disabled><span class="line-through">$1</span></div>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^---$/gim, '<hr class="my-4 border-gray-200">')
    .replace(/\n/g, '<br>');
};

/** Markdown → inline-styled HTML for PDF rendering (no external CSS). */
export const formatMarkdownForPdf = (text, textColor) => {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, `<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: ${textColor};">$1</h3>`)
    .replace(/^## (.*$)/gim, `<h2 style="font-size: 18px; font-weight: 600; margin: 20px 0 10px 0; color: ${textColor};">$1</h2>`)
    .replace(/^# (.*$)/gim, `<h1 style="font-size: 22px; font-weight: 700; margin: 24px 0 12px 0; color: ${textColor};">$1</h1>`)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, `<div style="display: flex; margin-bottom: 6px; color: ${textColor};"><span style="margin-right: 8px;">•</span><span>$1</span></div>`)
    .replace(/^(\d+)\. (.*$)/gim, `<div style="display: flex; margin-bottom: 6px; color: ${textColor};"><span style="min-width: 24px;">$1.</span><span>$2</span></div>`)
    .replace(/^---$/gim, `<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">`)
    .replace(/\n/g, '<br>');
};
