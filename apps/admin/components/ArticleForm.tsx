"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Article, Category } from "@srh/contracts";
import { ApiError, api, resolveImageUrl } from "@/lib/api";
import { sanitizeHtml } from "@/lib/sanitize";
import { isBodyEmpty, slugifyTitle } from "@/lib/content";
import RichTextEditor from "./RichTextEditor";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const formSchema = z.object({
  title: z.string().min(1, "Title is required.").max(300),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .max(200)
    .regex(SLUG_RE, "Lowercase letters, numbers, and hyphens only."),
  excerpt: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  coverImageUrl: z.string().max(2000).optional(),
  body: z.string().refine((html) => !isBodyEmpty(html), "Body cannot be empty."),
});

export type ArticleFormValues = z.infer<typeof formSchema>;

interface Props {
  article?: Article;
  categories: Category[];
  savingLabel?: string;
  onSaved: (article: Article) => void;
}

function toDefaults(article?: Article): ArticleFormValues {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    categoryId: article?.categoryId != null ? String(article.categoryId) : "",
    coverImageUrl: article?.coverImageUrl ?? "",
    body: article?.body ?? "",
  };
}

/**
 * Article editor: title, slug, summary, category, featured image, rich-text
 * body — plus save-draft and a sanitized preview.
 */
export default function ArticleForm({ article, categories, savingLabel, onSaved }: Props) {
  const [preview, setPreview] = useState(false);
  const [cleanPreview, setCleanPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(!!article);

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
    reset(toDefaults(article));
    slugTouched.current = !!article;
  }, [article, reset]);

  const title = watch("title");
  const slug = watch("slug");
  const body = watch("body");
  const excerpt = watch("excerpt");
  const cover = watch("coverImageUrl");

  // Auto-generate the slug from the title until the author edits it by hand.
  useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugifyTitle(title), { shouldValidate: true });
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

  async function save(values: ArticleFormValues) {
    setError(null);
    try {
      const input = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        excerpt: values.excerpt?.trim() ? values.excerpt.trim() : null,
        body: values.body,
        categoryId: values.categoryId ? Number(values.categoryId) : null,
        coverImageUrl: values.coverImageUrl?.trim() ? values.coverImageUrl.trim() : null,
      };
      const saved = article
        ? await api.updateArticle(article.id, input)
        : await api.createArticle(input);
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

  return (
    <div className="panel">
      {error && <div className="alert error">{error}</div>}
      <div className="btnrow" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="btn"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Back to editing" : "Preview"}
        </button>
      </div>

      {preview ? (
        <article className="preview">
          <h1>{title || "Untitled"}</h1>
          {excerpt && <p className="muted">{excerpt}</p>}
          {coverPreview && (
            <img className="cover" src={coverPreview} alt="Featured image preview" />
          )}
          <div className="body" dangerouslySetInnerHTML={{ __html: cleanPreview }} />
        </article>
      ) : (
        <form onSubmit={handleSubmit(save)}>
          <label className="field">
            Title
            <input type="text" {...register("title")} placeholder="SRH clinch a last-over thriller" />
            {errors.title && <span className="ferror">{errors.title.message}</span>}
          </label>

          <label className="field">
            Slug
            <span className="hint">URL path — auto-generated, editable.</span>
            <input
              type="text"
              {...register("slug", { onChange: () => { slugTouched.current = true; } })}
              placeholder="srh-clinch-a-last-over-thriller"
            />
            {errors.slug && <span className="ferror">{errors.slug.message}</span>}
            {slug && <span className="hint">/news/{slug}</span>}
          </label>

          <label className="field">
            Summary
            <span className="hint">Standfirst shown under the headline and in listings.</span>
            <textarea rows={3} {...register("excerpt")} placeholder="One or two sentences…" />
            {errors.excerpt && <span className="ferror">{errors.excerpt.message}</span>}
          </label>

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

          <div className="field">
            <label htmlFor="cover-url">Featured image</label>
            <span className="hint">Paste an image URL or upload a file (JPEG/PNG/WebP/GIF/AVIF, ≤5MB).</span>
            <input
              id="cover-url"
              type="url"
              {...register("coverImageUrl")}
              placeholder="https://… or /uploads/…"
            />
            {errors.coverImageUrl && (
              <span className="ferror">{errors.coverImageUrl.message}</span>
            )}
            <div className="btnrow" style={{ marginTop: 8 }}>
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
              <button
                type="button"
                className="btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload image"}
              </button>
              {cover && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setValue("coverImageUrl", "", { shouldValidate: true })}
                >
                  Remove
                </button>
              )}
            </div>
            {coverPreview && (
              <img className="coverthumb" src={coverPreview} alt="Featured image" />
            )}
          </div>

          <div className="field">
            <label>Body</label>
            <RichTextEditor value={body} onChange={(html) => setValue("body", html, { shouldValidate: true })} />
            {errors.body && <span className="ferror">{errors.body.message}</span>}
          </div>

          <div className="btnrow">
            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (savingLabel ?? "Saving…") : (savingLabel ?? "Save draft")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
