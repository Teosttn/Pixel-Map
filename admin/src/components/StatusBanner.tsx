export function StatusBanner({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: string }) {
  return <p className={`status-banner status-banner--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
