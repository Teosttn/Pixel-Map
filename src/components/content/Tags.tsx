import Link from "next/link";

export function Tags({ tags, linked = true }: { tags: string[]; linked?: boolean }) {
  if (!tags.length) return null;

  return (
    <div className="tag-row">
      {tags.map((tag) =>
        linked ? (
          <Link className="tag" href={`/tags/${encodeURIComponent(tag)}`} key={tag}>
            #{tag}
          </Link>
        ) : (
          <span className="tag" key={tag}>
            #{tag}
          </span>
        )
      )}
    </div>
  );
}
