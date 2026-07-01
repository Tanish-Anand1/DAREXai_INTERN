"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Users, Plus, Search, X, Pencil, Trash2, Phone, Mail, Building2,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string;
};

function getCsrf() {
  return decodeURIComponent(
    document.cookie.split("; ").find((r) => r.startsWith("darex_csrf="))?.split("=")[1] ?? ""
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": getCsrf(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [toast, setToast] = useState("");

  const contacts = useQuery({
    queryKey: ["contacts", search],
    queryFn: () => api<{ contacts: Contact[] }>(`/api/crm/contacts${search ? `?q=${encodeURIComponent(search)}` : ""}`),
    enabled: Boolean(session?.user?.tenantId),
  });

  const createContact = useMutation({
    mutationFn: () => api("/api/crm/contacts", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setModal(null);
      resetForm();
      showToast("Contact created");
    },
  });

  const updateContact = useMutation({
    mutationFn: () =>
      api(`/api/crm/contacts/${editing!.id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setModal(null);
      setEditing(null);
      resetForm();
      showToast("Contact updated");
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => api(`/api/crm/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      showToast("Contact deleted");
    },
  });

  function resetForm() {
    setForm({ name: "", email: "", phone: "", company: "", notes: "" });
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", company: c.company ?? "", notes: c.notes ?? "" });
    setModal("edit");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Users size={24} style={{ color: "var(--accent-primary)" }} />
            Contacts
          </h1>
          <p className="mt-1" style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            {contacts.data?.contacts.length ?? 0} contacts in your CRM
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal("create"); }}>
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
        <input
          className="field"
          style={{ paddingLeft: "36px" }}
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.isLoading ? (
              <tr><td colSpan={5} className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>Loading...</td></tr>
            ) : contacts.data?.contacts.length ? (
              contacts.data.contacts.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>
                    {c.email ? (
                      <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Mail size={13} /> {c.email}
                      </span>
                    ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                  </td>
                  <td>
                    {c.phone ? (
                      <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Phone size={13} /> {c.phone}
                      </span>
                    ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                  </td>
                  <td>
                    {c.company ? (
                      <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Building2 size={13} /> {c.company}
                      </span>
                    ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" style={{ color: "var(--danger)" }} onClick={() => { if (confirm("Delete this contact?")) deleteContact.mutate(c.id); }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="empty-state" style={{ padding: "48px" }}>No contacts yet. Create your first contact.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal === "create" ? "New Contact" : "Edit Contact"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                modal === "create" ? createContact.mutate() : updateContact.mutate();
              }}
            >
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Name *</label>
                <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Email</label>
                  <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Phone</label>
                  <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Company</label>
                <input className="field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Notes</label>
                <textarea className="field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!form.name.trim() || createContact.isPending || updateContact.isPending}>
                  {modal === "create" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <span style={{ color: "var(--success)" }}>✓</span>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
