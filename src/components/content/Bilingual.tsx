export function Bilingual({ zh, en }: { zh: string; en: string }) {
  return (
    <>
      <span className="i18n-zh">{zh}</span>
      <span className="i18n-en">{en}</span>
    </>
  );
}
