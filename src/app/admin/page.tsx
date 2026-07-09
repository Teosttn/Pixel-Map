import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "Admin",
  description: "Static GitHub-backed content management for Pixel-Map."
};

export default function AdminPage() {
  return (
    <main className="page admin-page">
      <p className="eyebrow">control room</p>
      <h1 className="page-title">Admin</h1>
      <p className="lede">
        Manage tabs, articles, and uploads by committing content changes back to the GitHub
        repository.
      </p>
      <AdminConsole />
    </main>
  );
}
