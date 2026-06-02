"use client";

import type { MarketingProduct, MarketingSiteContent } from "@annix/product-data/marketing";
import { cloneDeep } from "es-toolkit/compat";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { marketingAdminApi } from "@/app/lib/marketing/api";
import {
  useDiscardMarketingDraft,
  useMarketingDraft,
  useMarketingStatus,
  usePublishMarketing,
  useSaveMarketingDraft,
} from "@/app/lib/query/hooks";

type Mutator = (draft: MarketingSiteContent) => void;

function Text(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const isTextarea = props.textarea === true;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      {isTextarea ? (
        <textarea
          rows={3}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
      )}
    </label>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{props.title}</h2>
      <div className="space-y-4">{props.children}</div>
    </section>
  );
}

function StringList(props: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const values = props.values;
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${props.label}-${index}`} className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(event) => {
                const next = values.map((v, i) => (i === index ? event.target.value : v));
                props.onChange(next);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => props.onChange(values.filter((_, i) => i !== index))}
              className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => props.onChange([...values, ""])}
          className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function ProductRow(props: {
  product: MarketingProduct;
  patch: (mutate: (product: MarketingProduct) => void) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const product = props.product;
  const [uploading, setUploading] = useState(false);
  const portalCodeValue = product.portalCode === null ? "" : product.portalCode;
  const appKey = product.appKey;
  const imageUrl = product.imageUrl ? product.imageUrl : "";

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) return;
    setUploading(true);
    try {
      const result = await marketingAdminApi.uploadImage(file);
      props.patch((p) => {
        p.imageUrl = result.url;
      });
    } catch {
      props.onError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function useBrandArtwork() {
    if (!appKey) {
      props.onError("Set an App key (brand) first to pull its card artwork.");
      return;
    }
    props.patch((p) => {
      p.imageUrl = `/api/public/branding/${appKey}/asset/loginCard`;
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text
          label="Name"
          value={product.name}
          onChange={(v) =>
            props.patch((p) => {
              p.name = v;
            })
          }
        />
        <Text
          label="Category"
          value={product.category}
          onChange={(v) =>
            props.patch((p) => {
              p.category = v;
            })
          }
        />
      </div>
      <div className="mt-3">
        <Text
          label="Blurb"
          textarea
          value={product.blurb}
          onChange={(v) =>
            props.patch((p) => {
              p.blurb = v;
            })
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text
          label="App key (brand)"
          value={appKey}
          onChange={(v) =>
            props.patch((p) => {
              p.appKey = v;
            })
          }
        />
        <Text
          label="Portal code"
          value={portalCodeValue}
          onChange={(v) =>
            props.patch((p) => {
              p.portalCode = v ? v : null;
            })
          }
        />
        <Text
          label="Icon (fallback)"
          value={product.iconSlot}
          onChange={(v) =>
            props.patch((p) => {
              p.iconSlot = v;
            })
          }
        />
        <Text
          label="Detail slug"
          value={product.detailSlug}
          onChange={(v) =>
            props.patch((p) => {
              p.detailSlug = v;
            })
          }
        />
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Card artwork
        </span>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
              No image
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              onClick={useBrandArtwork}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Use branding card
            </button>
            {imageUrl ? (
              <button
                type="button"
                onClick={() =>
                  props.patch((p) => {
                    p.imageUrl = null;
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={product.comingSoon}
            onChange={(event) =>
              props.patch((p) => {
                p.comingSoon = event.target.checked;
              })
            }
          />
          Coming soon
        </label>
        <button
          type="button"
          onClick={props.onRemove}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Remove product
        </button>
      </div>
    </div>
  );
}

export default function MarketingCmsPage() {
  const draftQuery = useMarketingDraft();
  const statusQuery = useMarketingStatus();
  const saveDraft = useSaveMarketingDraft();
  const publish = usePublishMarketing();
  const discard = useDiscardMarketingDraft();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [content, setContent] = useState<MarketingSiteContent | null>(null);

  useEffect(() => {
    if (draftQuery.data) {
      setContent(cloneDeep(draftQuery.data));
    }
  }, [draftQuery.data]);

  function update(mutator: Mutator) {
    setContent((prev) => {
      if (!prev) return prev;
      const next = cloneDeep(prev);
      mutator(next);
      return next;
    });
  }

  async function handleSave() {
    if (!content) return;
    try {
      await saveDraft.mutateAsync(content);
      showToast("Draft saved", "success");
    } catch {
      showToast("Could not save the draft. Please try again.", "error");
    }
  }

  async function handlePublish() {
    const confirmed = await confirm({
      title: "Publish to the live site?",
      message: "This replaces the live annix.co.za content with the current draft.",
      confirmLabel: "Publish",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await saveDraft.mutateAsync(content as MarketingSiteContent);
      await publish.mutateAsync();
      showToast("Published to the live site", "success");
    } catch {
      showToast("Could not publish. Please try again.", "error");
    }
  }

  async function handleDiscard() {
    const confirmed = await confirm({
      title: "Discard draft changes?",
      message: "This reverts the draft to the currently published content.",
      confirmLabel: "Discard",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const reverted = await discard.mutateAsync();
      setContent(cloneDeep(reverted));
      showToast("Draft reverted to the live content", "success");
    } catch {
      showToast("Could not discard the draft. Please try again.", "error");
    }
  }

  const loading = draftQuery.isLoading;
  if (loading || !content) {
    return <div className="p-6 text-gray-500">Loading marketing content…</div>;
  }

  const status = statusQuery.data;
  const lastPublishedAt = status ? status.lastPublishedAt : null;
  const hasDraft = status ? status.hasDraft : false;
  const hero = content.hero;
  const ecosystem = content.ecosystem;
  const industries = content.industries;
  const trustBar = content.trustBar;
  const ctaBand = content.ctaBand;
  const about = content.about;
  const labs = content.labs;
  const footer = content.footer;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketing Site CMS</h1>
          <p className="text-xs text-gray-500">
            {lastPublishedAt
              ? `Last published ${formatDateLongZA(lastPublishedAt)}`
              : "Not yet published"}
            {hasDraft ? " · unpublished draft changes" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/portal/marketing/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Preview
          </a>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={discard.isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Discard draft
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDraft.isPending}
            className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a3a9e] disabled:opacity-50"
          >
            {saveDraft.isPending ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publish.isPending}
            className="rounded-lg bg-[#FF8A00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e67c00] disabled:opacity-50"
          >
            {publish.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <Section title="Hero">
        <Text
          label="Eyebrow"
          value={hero.eyebrow}
          onChange={(v) =>
            update((d) => {
              d.hero.eyebrow = v;
            })
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text
            label="Headline (lead)"
            value={hero.headlineLead}
            onChange={(v) =>
              update((d) => {
                d.hero.headlineLead = v;
              })
            }
          />
          <Text
            label="Headline (emphasis)"
            value={hero.headlineEmphasis}
            onChange={(v) =>
              update((d) => {
                d.hero.headlineEmphasis = v;
              })
            }
          />
        </div>
        <Text
          label="Subheading"
          textarea
          value={hero.subheading}
          onChange={(v) =>
            update((d) => {
              d.hero.subheading = v;
            })
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text
            label="Primary CTA label"
            value={hero.primaryCta.label}
            onChange={(v) =>
              update((d) => {
                d.hero.primaryCta.label = v;
              })
            }
          />
          <Text
            label="Primary CTA link"
            value={hero.primaryCta.href}
            onChange={(v) =>
              update((d) => {
                d.hero.primaryCta.href = v;
              })
            }
          />
          <Text
            label="Secondary CTA label"
            value={hero.secondaryCta.label}
            onChange={(v) =>
              update((d) => {
                d.hero.secondaryCta.label = v;
              })
            }
          />
          <Text
            label="Secondary CTA link"
            value={hero.secondaryCta.href}
            onChange={(v) =>
              update((d) => {
                d.hero.secondaryCta.href = v;
              })
            }
          />
        </div>
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Stats
          </span>
          {hero.stats.map((stat, index) => (
            <div key={`stat-${index}`} className="flex gap-2">
              <input
                type="text"
                value={stat.value}
                onChange={(e) =>
                  update((d) => {
                    d.hero.stats[index].value = e.target.value;
                  })
                }
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Value"
              />
              <input
                type="text"
                value={stat.label}
                onChange={(e) =>
                  update((d) => {
                    d.hero.stats[index].label = e.target.value;
                  })
                }
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Label"
              />
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.hero.stats = d.hero.stats.filter((_, i) => i !== index);
                  })
                }
                className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update((d) => {
                d.hero.stats.push({ value: "", label: "" });
              })
            }
            className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Add stat
          </button>
        </div>
      </Section>

      <Section title="Trust bar">
        <Text
          label="Heading"
          value={trustBar.heading}
          onChange={(v) =>
            update((d) => {
              d.trustBar.heading = v;
            })
          }
        />
        <StringList
          label="Regions / tags"
          values={trustBar.regions}
          onChange={(values) =>
            update((d) => {
              d.trustBar.regions = values;
            })
          }
        />
      </Section>

      <Section title="Ecosystem">
        <Text
          label="Heading"
          value={ecosystem.heading}
          onChange={(v) =>
            update((d) => {
              d.ecosystem.heading = v;
            })
          }
        />
        <Text
          label="Subheading"
          textarea
          value={ecosystem.subheading}
          onChange={(v) =>
            update((d) => {
              d.ecosystem.subheading = v;
            })
          }
        />
        <div className="space-y-3">
          {ecosystem.products.map((product, index) => (
            <ProductRow
              key={`product-${index}`}
              product={product}
              patch={(mutate) =>
                update((d) => {
                  mutate(d.ecosystem.products[index]);
                })
              }
              onRemove={() =>
                update((d) => {
                  d.ecosystem.products = d.ecosystem.products.filter((_, i) => i !== index);
                })
              }
              onError={(message) => showToast(message, "error")}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              update((d) => {
                d.ecosystem.products.push({
                  appKey: "",
                  portalCode: null,
                  name: "New product",
                  category: "",
                  blurb: "",
                  iconSlot: "Sparkles",
                  imageUrl: null,
                  comingSoon: false,
                  detailSlug: "new-product",
                });
              })
            }
            className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            + Add product
          </button>
        </div>
      </Section>

      <Section title="Industries">
        <Text
          label="Heading"
          value={industries.heading}
          onChange={(v) =>
            update((d) => {
              d.industries.heading = v;
            })
          }
        />
        <Text
          label="Subheading"
          textarea
          value={industries.subheading}
          onChange={(v) =>
            update((d) => {
              d.industries.subheading = v;
            })
          }
        />
        <div className="space-y-3">
          {industries.items.map((item, index) => (
            <div key={item.slug} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Text
                  label="Name"
                  value={item.name}
                  onChange={(v) =>
                    update((d) => {
                      d.industries.items[index].name = v;
                    })
                  }
                />
                <Text
                  label="Icon"
                  value={item.iconSlot}
                  onChange={(v) =>
                    update((d) => {
                      d.industries.items[index].iconSlot = v;
                    })
                  }
                />
                <Text
                  label="Slug"
                  value={item.slug}
                  onChange={(v) =>
                    update((d) => {
                      d.industries.items[index].slug = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <Text
                  label="Blurb"
                  value={item.blurb}
                  onChange={(v) =>
                    update((d) => {
                      d.industries.items[index].blurb = v;
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="CTA band">
        <Text
          label="Headline"
          value={ctaBand.headline}
          onChange={(v) =>
            update((d) => {
              d.ctaBand.headline = v;
            })
          }
        />
        <Text
          label="Subheading"
          textarea
          value={ctaBand.subheading}
          onChange={(v) =>
            update((d) => {
              d.ctaBand.subheading = v;
            })
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text
            label="Primary CTA label"
            value={ctaBand.primaryCta.label}
            onChange={(v) =>
              update((d) => {
                d.ctaBand.primaryCta.label = v;
              })
            }
          />
          <Text
            label="Primary CTA link"
            value={ctaBand.primaryCta.href}
            onChange={(v) =>
              update((d) => {
                d.ctaBand.primaryCta.href = v;
              })
            }
          />
          <Text
            label="Secondary CTA label"
            value={ctaBand.secondaryCta.label}
            onChange={(v) =>
              update((d) => {
                d.ctaBand.secondaryCta.label = v;
              })
            }
          />
          <Text
            label="Secondary CTA link"
            value={ctaBand.secondaryCta.href}
            onChange={(v) =>
              update((d) => {
                d.ctaBand.secondaryCta.href = v;
              })
            }
          />
        </div>
      </Section>

      <Section title="About">
        <Text
          label="Heading"
          value={about.heading}
          onChange={(v) =>
            update((d) => {
              d.about.heading = v;
            })
          }
        />
        <Text
          label="Body"
          textarea
          value={about.body}
          onChange={(v) =>
            update((d) => {
              d.about.body = v;
            })
          }
        />
        <div className="space-y-3">
          {about.values.map((value, index) => (
            <div key={`about-value-${index}`} className="rounded-lg border border-gray-200 p-3">
              <Text
                label="Title"
                value={value.title}
                onChange={(v) =>
                  update((d) => {
                    d.about.values[index].title = v;
                  })
                }
              />
              <div className="mt-3">
                <Text
                  label="Body"
                  value={value.body}
                  onChange={(v) =>
                    update((d) => {
                      d.about.values[index].body = v;
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Annix Labs">
        <Text
          label="Heading"
          value={labs.heading}
          onChange={(v) =>
            update((d) => {
              d.labs.heading = v;
            })
          }
        />
        <Text
          label="Subheading"
          textarea
          value={labs.subheading}
          onChange={(v) =>
            update((d) => {
              d.labs.subheading = v;
            })
          }
        />
        <div className="space-y-3">
          {labs.items.map((item, index) => (
            <div key={`labs-item-${index}`} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text
                  label="Name"
                  value={item.name}
                  onChange={(v) =>
                    update((d) => {
                      d.labs.items[index].name = v;
                    })
                  }
                />
                <Text
                  label="Status"
                  value={item.status}
                  onChange={(v) =>
                    update((d) => {
                      d.labs.items[index].status = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <Text
                  label="Blurb"
                  value={item.blurb}
                  onChange={(v) =>
                    update((d) => {
                      d.labs.items[index].blurb = v;
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Footer">
        <Text
          label="Tagline"
          value={footer.tagline}
          onChange={(v) =>
            update((d) => {
              d.footer.tagline = v;
            })
          }
        />
        <Text
          label="Legal line"
          value={footer.legal}
          onChange={(v) =>
            update((d) => {
              d.footer.legal = v;
            })
          }
        />
      </Section>

      {ConfirmDialog}
    </div>
  );
}
