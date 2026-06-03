import type { MarketingLegalDoc } from "@annix/product-data/marketing";

export function LegalDocBody(props: { body: string }) {
  const blocks = props.body.split("\n\n").map((block) => block.trim());
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.startsWith("## ")) {
          return (
            <h2 key={key} className="pt-4 text-xl font-semibold text-white">
              {block.slice(3)}
            </h2>
          );
        }
        const lines = block.split("\n");
        const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));
        if (isList) {
          return (
            <ul key={key} className="list-disc space-y-2 pl-5 text-white/70">
              {lines.map((line, lineIndex) => (
                <li key={`${key}-${lineIndex}`}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key} className="leading-relaxed text-white/70">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function LegalView(props: { doc: MarketingLegalDoc }) {
  const doc = props.doc;
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1
          className="text-4xl font-bold text-white sm:text-5xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {doc.heading}
        </h1>
        {doc.lastUpdated ? (
          <p className="mt-3 text-sm text-white/40">Last updated: {doc.lastUpdated}</p>
        ) : null}
        <div className="mt-10">
          <LegalDocBody body={doc.body} />
        </div>
      </div>
    </section>
  );
}
