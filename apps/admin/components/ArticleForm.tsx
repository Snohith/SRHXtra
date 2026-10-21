"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  Eye,
  FolderOpen,
  Images,
  ImageIcon,
  PenLine,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { Article, Category } from "@srh/contracts";
import { ApiError, api, resolveImageUrl, type ArticleInput } from "@/lib/api";
import { sanitizeHtml } from "@/lib/sanitize";
import { isBodyEmpty, slugifyTitle } from "@/lib/content";
import { useDirtyGuard } from "@/lib/useDirtyGuard";
import MediaPicker from "./MediaPicker";
import RichTextEditor from "./RichTextEditor";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COVER_URL_RE = /^(?:https?:\/\/\S+|\/(?!\/)\S+)$/i;

const formSchema = z.object({
  title: z.string().min(1, "Title is required.").max(300),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .max(200)
    .regex(SLUG_RE, "Lowercase letters, numbers, and hyphens only."),
  excerpt: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  coverImageUrl: z
    .string()
    .max(2000)
    .refine(
      (v) => v === "" || COVER_URL_RE.test(v),
      "Use an http(s) URL or a /uploads/… path.",
    )
    .optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  body: z
    .string()
    .refine((html) => !isBodyEmpty(html), "Body cannot be empty."),
});

export type ArticleFormValues = z.infer<typeof formSchema>;

interface Props {
  article?: Article;
  categories: Category[];
  savingLabel?: string;
  onSaved: (article: Article) => void;
}

/** Normalized snapshot used for dirty tracking and autosave payloads. */
interface Snapshot {
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

const SEO_TITLE_RECOMMENDED = 60;
const SEO_DESC_RECOMMENDED = 160;
const AUTOSAVE_MS = 2500;

function toDefaults(article?: Article): ArticleFormValues {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    categoryId: article?.categoryId != null ? String(article.categoryId) : "",
    coverImageUrl: article?.coverImageUrl ?? "",
    seoTitle: article?.seoTitle ?? "",
    seoDescription: article?.seoDescription ?? "",
    body: article?.body ?? "",
  };
}

function toSnapshot(v: ArticleFormValues): Snapshot {
  return {
    title: v.title?.trim() ?? "",
    slug: v.slug?.trim() ?? "",
    excerpt: v.excerpt?.trim() ?? "",
    categoryId: v.categoryId ?? "",
    coverImageUrl: v.coverImageUrl?.trim() ?? "",
    seoTitle: v.seoTitle?.trim() ?? "",
    seoDescription: v.seoDescription?.trim() ?? "",
    body: v.body ?? "",
  };
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.excerpt === b.excerpt &&
    a.categoryId === b.categoryId &&
    a.coverImageUrl === b.coverImageUrl &&
    a.seoTitle === b.seoTitle &&
    a.seoDescription === b.seoDescription &&
    a.body === b.body
  );
}

function buildInput(v: Snapshot): ArticleInput {
  return {
    title: v.title,
    slug: v.slug,
    excerpt: v.excerpt ? v.excerpt : null,
    body: v.body,
    categoryId: v.categoryId ? Number(v.categoryId) : null,
    coverImageUrl: v.coverImageUrl ? v.coverImageUrl : null,
    seoTitle: v.seoTitle ? v.seoTitle : null,
    seoDescription: v.seoDescription ? v.seoDescription : null,
  };
}

/** Minimum bar for an autosave: valid title, slug, and non-empty body. */
function autosaveReady(v: Snapshot): boolean {
  return v.title.length > 0 && SLUG_RE.test(v.slug) && !isBodyEmpty(v.body);
}

/**
 * Article editor: title, slug, summary, category, featured image, SEO
 * overrides, rich-text body — plus debounced autosave for existing articles
 * (quiet server-side save: no revision/audit/revalidation — the explicit
 * Save click records those) and an unsaved-changes guard on navigation.
 */
export default function ArticleForm({
  article,
  categories,
  savingLabel,
  onSaved,
}: Props) {
  const [preview, setPreview] = useState(false);
  const [cleanPreview, setCleanPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(!!article);
  // Last content known to be persisted server-side (manual save or autosave).
  const savedRef = useRef<Snapshot>(toSnapshot(toDefaults(article)));
  // Snapshot that failed autosave — suppresses retry loops until it changes.
  const failedRef = useRef<Snapshot | null>(null);
  // Mirrors the latest form values for async completions (see runAutoSave).
  const valuesRef = useRef<Snapshot>(toSnapshot(toDefaults(article)));
  // In-flight quiet autosave; manual Save waits for it so the newer content
  // is the last write (not a stale autosave landing after "Saved").
  const autosaveRef = useRef<Promise<void> | null>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(article),
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const defaults = toDefaults(article);
    reset(defaults);
    slugTouched.current = !!article;
    savedRef.current = toSnapshot(defaults);
    valuesRef.current = toSnapshot(defaults);
    failedRef.current = null;
    setDirty(false);
  }, [article, reset]);

  const title = watch("title") ?? "";
  const slug = watch("slug") ?? "";
  const body = watch("body") ?? "";
  const excerpt = watch("excerpt") ?? "";
  const categoryId = watch("categoryId") ?? "";
  const cover = watch("coverImageUrl") ?? "";
  const seoTitle = watch("seoTitle") ?? "";
  const seoDescription = watch("seoDescription") ?? "";

  const values = useMemo(
    () =>
      toSnapshot({
        title,
        slug,
        excerpt,
        categoryId,
        coverImageUrl: cover,
        seoTitle,
        seoDescription,
        body,
      }),
    [title, slug, excerpt, categoryId, cover, seoTitle, seoDescription, body],
  );

  useEffect(() => {
    valuesRef.current = values;
    setDirty(!sameSnapshot(values, savedRef.current));
  }, [values]);

  // Warn before navigating away (tab close/reload + in-app links) when dirty.
  useDirtyGuard(dirty);

  // Autosave: debounce after the last edit; quiet save server-side.
  useEffect(() => {
    if (!article || !dirty || isSubmitting || autoSaving) return;
    if (failedRef.current && sameSnapshot(values, failedRef.current)) return;
    if (!autosaveReady(values)) return;
    const timer = setTimeout(() => {
      const run = runAutoSave(article.id, values);
      autosaveRef.current = run;
      void run.finally(() => {
        if (autosaveRef.current === run) autosaveRef.current = null;
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [article, dirty, isSubmitting, autoSaving, values]);

  async function runAutoSave(articleId: string, snapshot: Snapshot) {
    setAutoSaving(true);
    try {
      await api.updateArticle(articleId, buildInput(snapshot), {
        quiet: true,
      });
      savedRef.current = snapshot;
      failedRef.current = null;
      // Completion may land while newer keystrokes exist — recompute against
      // the latest values so "dirty" stays truthful and re-arms autosave.
      setDirty(!sameSnapshot(valuesRef.current, snapshot));
      setLastSavedAt(new Date());
    } catch (err) {
      failedRef.current = snapshot;
      setError(
        err instanceof ApiError
          ? `Autosave failed — ${err.message}`
          : "Autosave failed — keep editing or save manually.",
      );
    } finally {
      setAutoSaving(false);
    }
  }

  // Auto-generate the slug from the title until the author edits it by hand.
  // Stay quiet while the title is empty: a pristine new form must not look
  // dirty (or arm the navigation guard) before the first keystroke.
  useEffect(() => {
    if (slugTouched.current || !title.trim()) return;
    setValue("slug", slugifyTitle(title), { shouldValidate: true });
  }, [title, setValue]);

  // Sanitize in the browser whenever the preview is shown or the body changes.
  useEffect(() => {
    if (!preview) return;
    let live = true;
    void sanitizeHtml(body || "").then((html) => {
      if (live) setCleanPreview(html);
    });
    return () => {
      live = false;
    };
  }, [preview, body]);

  async function save(formValues: ArticleFormValues) {
    setError(null);
    // Let any in-flight quiet autosave finish first; otherwise it can land
    // after this manual save and silently restore older content.
    await autosaveRef.current;
    const snapshot = toSnapshot(formValues);
    try {
      const saved = article
        ? await api.updateArticle(article.id, buildInput(snapshot))
        : await api.createArticle(buildInput(snapshot));
      savedRef.current = snapshot;
      failedRef.current = null;
      setDirty(false);
      setLastSavedAt(new Date());
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    }
  }

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const asset = await api.uploadImage(file);
      setValue("coverImageUrl", asset.url, { shouldValidate: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const coverPreview = resolveImageUrl(cover || null);
  const seoTitleLen = seoTitle.trim().length;
  const seoDescLen = seoDescription.trim().length;
  const hasSeoLists = !!(article?.seoTitle || article?.seoDescription);
  const chosenCategory = categories.find((c) => String(c.id) === categoryId);

  const saveState = autoSaving
    ? { cls: "busy", text: "Autosaving…" }
    : dirty
      ? { cls: "warn", text: "Unsaved changes" }
      : lastSavedAt
        ? { cls: "ok", text: `Saved ${lastSavedAt.toLocaleTimeString()}` }
        : null;

  // noValidate: type="url" rejects the /uploads/... paths the media library stores.
  return (
    <form className="editor" noValidate onSubmit={handleSubmit(save)}>
      <div className="editor-topbar">
        <div className="segmented" role="group" aria-label="Editing mode">
          <button
            type="button"
            className={`seg${preview ? "" : " active"}`}
            onClick={() => setPreview(false)}
          >
            <PenLine size={13} />
            Write
          </button>
          <button
            type="button"
            className={`seg${preview ? " active" : ""}`}
            onClick={() => setPreview(true)}
          >
            <Eye size={13} />
            Preview
          </button>
        </div>

        <div className="editor-topbar-right">
          {article && saveState && (
            <span
              className={`saveindicator ${saveState.cls}`}
              aria-live="polite"
            >
              {saveState.text}
            </span>
          )}
          {!article && dirty && (
            <span className="saveindicator warn" aria-live="polite">
              Unsaved changes
            </span>
          )}
          {!preview && (
            <button
              className="btn primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (savingLabel ?? "Saving…")
                : (savingLabel ?? "Save draft")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {preview ? (
        <article className="preview">
          <div className="preview-head">
            <Eye size={13} />
            Reader preview — sanitized exactly as the public site renders it
          </div>
          <h1>{title || "Untitled"}</h1>
          {excerpt && <p className="lede">{excerpt}</p>}
          <p className="row-sub" style={{ marginTop: 10 }}>
            <span className="rowcat">
              {chosenCategory?.name ?? "Uncategorized"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="rowsup">/news/{slug || "your-slug"}</span>
          </p>
          {coverPreview && (
            <img className="cover" src={coverPreview} alt="Featured image" />
          )}
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: cleanPreview }}
          />
        </article>
      ) : (
        <div className="editor-grid">
          <div className="editor-main">
            <label className="field" style={{ marginBottom: 0 }}>
              Title
              <input
                type="text"
                className="input-title"
                {...register("title")}
                placeholder="SRH clinch a last-over thriller"
              />
              {errors.title && (
                <span className="ferror">{errors.title.message}</span>
              )}
            </label>

            <label className="field" style={{ marginBottom: 0 }}>
              Slug
              <span className="hint">URL path — auto-generated, editable.</span>
              <span className="slug-box">
                <span className="slug-prefix">/news/</span>
                <input
                  type="text"
                  {...register("slug", {
                    onChange: () => {
                      slugTouched.current = true;
                    },
                  })}
                  placeholder="srh-clinch-a-last-over-thriller"
                />
              </span>
              {errors.slug && (
                <span className="ferror">{errors.slug.message}</span>
              )}
            </label>

            <label className="field" style={{ marginBottom: 0 }}>
              Summary
              <span className="hint">
                Standfirst shown under the headline and in listings.
              </span>
              <textarea
                rows={3}
                {...register("excerpt")}
                placeholder="One or two sentences…"
              />
              {errors.excerpt && (
                <span className="ferror">{errors.excerpt.message}</span>
              )}
            </label>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Body</label>
              <RichTextEditor
                value={body}
                onChange={(html) =>
                  setValue("body", html, { shouldValidate: true })
                }
              />
              {errors.body && (
                <span className="ferror">{errors.body.message}</span>
              )}
            </div>
          </div>

          <aside className="editor-rail">
            <section className="rail-card">
              <h3 className="rail-title">
                <FolderOpen size={13} />
                Organize
              </h3>
              <div className="card-fields">
                <label className="field">
                  Category
                  <select {...register("categoryId")}>
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rail-card">
              <h3 className="rail-title">
                <ImageIcon size={13} />
                Featured image
              </h3>

              <div className="cover-drop">
                {coverPreview ? (
                  <div className="cover-preview">
                    <img
                      className="coverthumb"
                      src={coverPreview}
                      alt="Featured image"
                    />
                    <button
                      type="button"
                      className="btn small cover-clear"
                      aria-label="Remove featured image"
                      title="Remove featured image"
                      onClick={() =>
                        setValue("coverImageUrl", "", { shouldValidate: true })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="cover-empty">
                    <ImageIcon size={20} />
                    <span>No featured image yet</span>
                    <span className="small">
                      A 16:9 crop looks best in listings.
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />

              <div className="cover-actions">
                <button
                  type="button"
                  className="btn small"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={13} />
                  {uploading ? "Uploading…" : "Upload"}
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setPickerOpen(true)}
                >
                  <Images size={13} />
                  Library…
                </button>
              </div>

              <label className="field" style={{ marginTop: 12 }}>
                <span className="hint">Or paste an image URL</span>
                <input
                  id="cover-url"
                  type="url"
                  {...register("coverImageUrl")}
                  placeholder="https://… or /uploads/…"
                />
                {errors.coverImageUrl && (
                  <span className="ferror">{errors.coverImageUrl.message}</span>
                )}
              </label>
            </section>

            <details className="rail-card seo" open={hasSeoLists || undefined}>
              <summary className="seo-toggle">
                <Search size={13} />
                SEO &amp; social
                <ChevronDown size={14} className="chev" />
              </summary>
              <div className="seo-body">
                <label className="field">
                  Meta title
                  <input
                    type="text"
                    {...register("seoTitle")}
                    placeholder={title || "Defaults to the headline"}
                  />
                  <span
                    className={`counter${seoTitleLen > SEO_TITLE_RECOMMENDED ? " warn" : ""}`}
                  >
                    {seoTitleLen}/{SEO_TITLE_RECOMMENDED} recommended
                  </span>
                  {errors.seoTitle && (
                    <span className="ferror">{errors.seoTitle.message}</span>
                  )}
                </label>

                <label className="field">
                  Meta description
                  <textarea
                    rows={3}
                    {...register("seoDescription")}
                    placeholder={
                      excerpt || "Defaults to the summary — ~160 characters."
                    }
                  />
                  <span
                    className={`counter${seoDescLen > SEO_DESC_RECOMMENDED ? " warn" : ""}`}
                  >
                    {seoDescLen}/{SEO_DESC_RECOMMENDED} recommended
                  </span>
                  {errors.seoDescription && (
                    <span className="ferror">
                      {errors.seoDescription.message}
                    </span>
                  )}
                </label>

                <div className="serp" aria-label="Search result preview">
                  <div className="serp-url">
                    srhxtra.example › news ›{" "}
                    {(slug || "your-slug").slice(0, 40)}
                  </div>
                  <div className="serp-title">
                    {(seoTitle.trim() || title || "Untitled").slice(0, 90)}
                  </div>
                  <div className="serp-desc">
                    {(
                      seoDescription.trim() ||
                      excerpt.trim() ||
                      "Add a summary or meta description to control this snippet."
                    ).slice(0, 200)}
                  </div>
                </div>
              </div>
            </details>
          </aside>
        </div>
      )}

      {pickerOpen && (
        <MediaPicker
          onPick={(url) =>
            setValue("coverImageUrl", url, { shouldValidate: true })
          }
          onClose={() => setPickerOpen(false)}
        />
      )}
    </form>
  );
}
