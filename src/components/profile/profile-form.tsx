"use client";

import { useState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";

type ProfileFormProps = {
  initialFullName: string | null;
  initialRoleInCompany: string | null;
  email: string;
};

const ROLE_SUGGESTIONS = [
  "Social Media Manager",
  "Diretor de Marketing",
  "Analista de Marketing",
  "Gestor de Conteúdo",
  "Estrategista Digital",
  "Head de Marketing",
  "Designer",
  "Copywriter",
  "Empreendedor"
];

export function ProfileForm({ initialFullName, initialRoleInCompany, email }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [roleInCompany, setRoleInCompany] = useState(initialRoleInCompany ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");
    try {
      await updateProfileAction({ full_name: fullName, role_in_company: roleInCompany });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {error && <p className="message message--error">{error}</p>}
      {success && <p className="message message--success">Perfil atualizado com sucesso!</p>}

      <div className="form-field">
        <label className="form-label">E-mail</label>
        <input className="form-input" value={email} disabled readOnly />
      </div>

      <div className="form-field">
        <label className="form-label">Nome completo</label>
        <input
          className="form-input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome completo"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Função na empresa</label>
        <input
          className="form-input"
          value={roleInCompany}
          onChange={(e) => setRoleInCompany(e.target.value)}
          placeholder="Ex: Social Media Manager, Diretor de Marketing..."
          list="role-suggestions"
        />
        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <span className="form-hint">Sua função aparecerá no seu perfil e contexto da IA.</span>
      </div>

      <div className="profile-form__footer">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
