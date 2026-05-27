/**
 * Generates an image from a text prompt using Pollinations.ai (free, no API key required).
 * Returns a Blob of the generated image.
 */
export async function generateImageFromPrompt(prompt: string): Promise<Blob> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao gerar imagem: HTTP ${response.status}`);
  }

  return response.blob();
}
