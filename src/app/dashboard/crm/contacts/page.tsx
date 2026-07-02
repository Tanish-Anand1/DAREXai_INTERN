"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Users, Plus, Search, X, Pencil, Trash2, Phone, Mail, Building2, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string;
};

import { clientFetch } from "@/lib/client-api";

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
    queryFn: () => clientFetch<{ contacts: Contact[] }>(`/api/crm/contacts${search ? `?q=${encodeURIComponent(search)}` : ""}`),
    enabled: Boolean(session?.user?.tenantId),
  });

  const createContact = useMutation({
    mutationFn: () => clientFetch("/api/crm/contacts", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setModal(null);
      resetForm();
      showToast("Contact created successfully");
    },
  });

  const updateContact = useMutation({
    mutationFn: () =>
      clientFetch(`/api/crm/contacts/${editing!.id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setModal(null);
      setEditing(null);
      resetForm();
      showToast("Contact updated successfully");
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => clientFetch(`/api/crm/contacts/${id}`, { method: "DELETE" }),
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
      {}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-subtle pb-4">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Users size={20} className="text-secondary" />
            Contacts
          </h1>
          <p className="text-xs text-secondary mt-1">
            {contacts.data?.contacts.length ?? 0} active contacts in your CRM
          </p>
        </div>
        <button className="btn btn-primary text-xs py-2 px-3" onClick={() => { resetForm(); setModal("create"); }}>
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          className="field text-xs"
          style={{ paddingLeft: "36px" }}
          placeholder="Search contacts by name, company, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Contact Name</th>
              <th>Email Address</th>
              <th>Phone Number</th>
              <th>Company</th>
              <th style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-xs text-secondary">
                    <Loader2 size={14} className="animate-spin text-primary" style={{ color: "var(--accent-primary)" }} />
                    Loading contacts...
                  </div>
                </td>
              </tr>
            ) : contacts.data?.contacts.length ? (
              contacts.data.contacts
                .filter((c) => {
                  const q = search.toLowerCase();
                  return (c.name || "").toLowerCase().includes(q) ||
                         (c.company || "").toLowerCase().includes(q) ||
                         (c.email || "").toLowerCase().includes(q) ||
                         (c.phone || "").toLowerCase().includes(q);
                })
                .map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-primary">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold avatar-gradient">
                        {(c.name ?? "").split(" ").map(n => n ? n[0] : "").join("").toUpperCase().slice(0, 2) || "C"}
                      </div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td>
                    {c.email ? (
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Mail size={12} className="text-tertiary" /> {c.email}
                      </span>
                    ) : <span className="text-tertiary">—</span>}
                  </td>
                  <td>
                    {c.phone ? (
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Phone size={12} className="text-tertiary" /> {c.phone}
                      </span>
                    ) : <span className="text-tertiary">—</span>}
                  </td>
                  <td>
                    {c.company ? (
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Building2 size={12} className="text-tertiary" /> {c.company}
                      </span>
                    ) : <span className="text-tertiary">—</span>}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ color: "var(--danger)" }}
                        onClick={() => { if (confirm("Are you sure you want to delete this contact?")) deleteContact.mutate(c.id); }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-state py-12">
                  <Users size={32} className="text-tertiary mb-1" />
                  <p className="text-xs">No contacts found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title font-bold gradient-text">{modal === "create" ? "New Contact" : "Edit Contact"}</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
              </div>
              <form
                className="space-y-4 text-xs"
                onSubmit={(e) => {
                  e.preventDefault();
                  modal === "create" ? createContact.mutate() : updateContact.mutate();
                }}
              >
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Name *</label>
                  <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Email</label>
                    <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Phone</label>
                    <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Company</label>
                  <input className="field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Notes</label>
                  <textarea className="field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" className="btn btn-secondary text-xs" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary text-xs" disabled={!form.name.trim() || createContact.isPending || updateContact.isPending}>
                    {modal === "create" ? "Create Contact" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="toast"
          >
            <span style={{ color: "var(--success)" }}>✓</span>
            <span className="text-xs text-primary">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
