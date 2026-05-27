/**
 * Social media text formatters for Instagram, LinkedIn, and TikTok.
 */

export function formatForInstagram(
  title: string,
  subtitle: string,
  body: string,
  hashtags?: string
): string {
  const parts: string[] = [];

  if (title) parts.push(`✨ ${title.toUpperCase()}`);
  parts.push("");
  if (subtitle) parts.push(`📌 ${subtitle}`);
  parts.push("");
  if (body) parts.push(body);
  parts.push("");
  parts.push("💾 Salve esse post para não esquecer!");
  parts.push("");
  parts.push(hashtags || "#socialmedia #marketing #conteudo #instagram #dicas");

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatForLinkedIn(
  title: string,
  subtitle: string,
  body: string
): string {
  const parts: string[] = [];

  if (title) parts.push(title.toUpperCase());
  parts.push("");
  if (subtitle) parts.push(subtitle);
  parts.push("");
  if (body) parts.push(body);
  parts.push("");
  parts.push("Comente sua opinião abaixo. O que você acha sobre isso?");

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatForTikTok(
  title: string,
  subtitle: string,
  body: string,
  hashtags?: string
): string {
  const parts: string[] = [];

  if (title) parts.push(`🔥 ${title}`);
  parts.push("");
  if (subtitle) parts.push(`👉 ${subtitle}`);
  parts.push("");
  if (body) parts.push(body);
  parts.push("");
  parts.push("Segue pra mais conteúdo assim! 🚀");
  parts.push("");
  parts.push(hashtags || "#viral #fyp #trending #dicas #aprenda");

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
