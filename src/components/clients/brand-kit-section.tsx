"use client";

import { useState } from "react";
import { saveBrandKitAction } from "@/lib/actions/brand-kit";
import type { BrandKitRow } from "@/lib/data/brand-kit";

type BrandKitSectionProps = {
  clientId: string;
  initialData: BrandKitRow | null;
};

export function BrandKitSection({ clientId, initialData }: BrandKitSectionProps) {
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color ?? "#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondary_color ?? "#3b82f6");
  const [accentColor, setAccentColor] = useState(initialData?.accent_color ?? "#10b981");
  const [brandVoice, setBrandVoice] = useState(initialData?.brand_voice ?? "");
  const [targetAudience, setTargetAudience] = useState(initialData?.target_audience ?? "");
  const [visualReferences, setVisualReferences] = useState(initialData?.visual_references ?? "");
  const [hashtags, setHashtags] = useState(initialData?.hashtags ?? "");
  const [dos, setDos] = useState(initialData?.dos ?? "");
  const [donts, setDonts] = useState(initialData?.donts ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await saveBrandKitAction({
        clientId,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        brand_voice: brandVoice,
        target_audience: targetAudience,
        visual_references: visualReferences,
        hashtags,
        dos,
        donts
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar brand kit.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: "1.5rem" }}>
      <h2 className="card__section-title">Brand Kit</h2>
      <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
        As informações do brand kit são usadas automaticamente pela IA ao gerar conteúdo para este cliente.
      </p>
      <form onSubmit={handleSave}>
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-primary">Cor Primária</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input
                id="bk-primary"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 40, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #9ca3af)" }}>{primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-secondary">Cor Secundária</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input
                id="bk-secondary"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ width: 40, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #9ca3af)" }}>{secondaryColor}</span>
            </div>
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-accent">Cor de Destaque</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input
                id="bk-accent"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ width: 40, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #9ca3af)" }}>{accentColor}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-voice">Tom de Voz</label>
            <textarea
              id="bk-voice"
              className="node-detail-modal__textarea"
              rows={3}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="Ex: Informal, jovem, descontraído, usa gírias..."
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-audience">Público-Alvo</label>
            <textarea
              id="bk-audience"
              className="node-detail-modal__textarea"
              rows={3}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ex: Empreendedores 25-40 anos, iniciantes em marketing..."
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-refs">Referências Visuais</label>
            <textarea
              id="bk-refs"
              className="node-detail-modal__textarea"
              rows={3}
              value={visualReferences}
              onChange={(e) => setVisualReferences(e.target.value)}
              placeholder="Ex: Minimalista, fotos reais, sem fundo branco..."
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-hashtags">Hashtags Padrão</label>
            <textarea
              id="bk-hashtags"
              className="node-detail-modal__textarea"
              rows={3}
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Ex: #marketing #empreendedorismo #dicas"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-dos">Do&apos;s (O que fazer)</label>
            <textarea
              id="bk-dos"
              className="node-detail-modal__textarea"
              rows={3}
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              placeholder="Ex: Usar dados reais, mencionar cases de sucesso..."
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="node-detail-modal__label" htmlFor="bk-donts">Don&apos;ts (O que não fazer)</label>
            <textarea
              id="bk-donts"
              className="node-detail-modal__textarea"
              rows={3}
              value={donts}
              onChange={(e) => setDonts(e.target.value)}
              placeholder="Ex: Não usar linguagem técnica, evitar promessas exageradas..."
              disabled={isSaving}
            />
          </div>
        </div>

        {error && <p className="message message--error" style={{ marginBottom: "0.75rem" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button type="submit" className="button button--primary" disabled={isSaving}>
            {isSaving ? <span className="ai-spinner ai-spinner--small" /> : null}
            {isSaving ? "Salvando..." : "Salvar Brand Kit"}
          </button>
          {saved && (
            <span style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 500 }}>
              Brand kit salvo!
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
