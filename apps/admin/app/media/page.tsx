"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FolderOpen,
  Search,
  Upload,
} from "lucide-react";
import type { MediaAsset } from "@srh/contracts";
import { ApiError, api, resolveImageUrl } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

const PAGE_SIZE = 12;

function filename(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] ?? key;
}

function sizeLabel(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Library() {
  const toast = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminMedia({
        page,
        pageSize: PAGE_SIZE,
        search: query || undefined,
      });
      setAssets(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      await api.uploadImage(file);
      toast.push("Image uploaded.");
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function copy(asset: MediaAsset) {
    const url = resolveImageUrl(asset.url) ?? asset.url;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(asset.id);
      toast.push("Image URL copied to the clipboard.");
      setTimeout(() => {
        setCopiedId((cur) => (cur === asset.id ? null : cur));
      }, 1500);
    } catch {
      toast.push(
        "Could not copy — your browser blocked clipboard access.",
        "error",
      );
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Media library</h1>
          <p className="sub">
            {total} image{total === 1 ? "" : "s"} — upload once, reuse as a
            featured image from any story.
          </p>
        </div>
        <div className="head-actions">
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
            className="btn primary"
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload image"}
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="searchin" style={{ flex: "0 1 340px" }}>
          <Search size={15} />
          <input
            type="search"
            placeholder="Search by file name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search media library"
          />
        </div>
      </div>

      {loading ? (
        <div className="mediagrid">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="sk"
              style={{ height: 190, borderRadius: 13 }}
            />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <span className="empty-ico">
              <FolderOpen size={24} />
            </span>
            <h3>{query ? "No files match that search" : "No media yet"}</h3>
            <p>
              {query
                ? "Try a different file name, or clear the search."
                : "Upload your first image — JPEG, PNG, WebP, GIF, or AVIF up to 5MB."}
            </p>
            {!query && (
              <button
                className="btn primary"
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={15} />
                Upload image
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mediagrid">
          {assets.map((a) => (
            <div key={a.id} className="mediacard static">
              <div className="mediacard-imgwrap">
                <img
                  src={resolveImageUrl(a.url) ?? ""}
                  alt={a.altText ?? filename(a.storageKey)}
                  loading="lazy"
                />
                <div className="mediacard-ov">
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => void copy(a)}
                    title="Copy the image URL"
                  >
                    {copiedId === a.id ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedId === a.id ? "Copied" : "Copy URL"}
                  </button>
                  <a
                    className="btn small"
                    href={resolveImageUrl(a.url) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    title="Open the full-size image"
                  >
                    <ExternalLink size={13} />
                    Open
                  </a>
                </div>
              </div>
              <div className="mediacardmeta">
                <span className="mediacard-name" title={a.storageKey}>
                  {filename(a.storageKey)}
                </span>
                <span className="mediacard-size">
                  {sizeLabel(a.byteSize)}
                  {a.width && a.height ? ` · ${a.width}×${a.height}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          <span className="pager-info">
            Page <b>{page}</b> of <b>{pages}</b> · <b>{total}</b> files
          </span>
          <div className="pager-controls">
            <button
              className="btn small"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ← Prev
            </button>
            <button
              className="btn small"
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function MediaPage() {
  return (
    <RequireAuth>
      <Library />
    </RequireAuth>
  );
}
