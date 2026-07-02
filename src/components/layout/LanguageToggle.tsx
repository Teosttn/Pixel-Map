"use client";

import { useEffect, useState } from "react";

export function LanguageToggle() {
  const [language, setLanguage] = useState<"zh" | "en">("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem("pixel-map-language");
    const next = saved === "en" ? "en" : "zh";
    setLanguage(next);
    document.documentElement.dataset.language = next;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }, []);

  function toggle() {
    const next = language === "zh" ? "en" : "zh";
    document.documentElement.classList.remove("lang-switching");
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add("lang-switching");
      window.setTimeout(() => document.documentElement.classList.remove("lang-switching"), 320);
    });
    setLanguage(next);
    window.localStorage.setItem("pixel-map-language", next);
    document.documentElement.dataset.language = next;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }

  return (
    <button
      className="language-toggle"
      type="button"
      onClick={toggle}
      aria-label={language === "zh" ? "Switch to English" : "切换到中文"}
    >
      <span className="lang-option" data-active={language === "zh"}>
        中
      </span>
      <span className="lang-option" data-active={language === "en"}>
        EN
      </span>
    </button>
  );
}
