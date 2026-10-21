"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Search, Upload, X } from "lucide-react";
import type { MediaAsset } from "@srh/contracts";
import { ApiError, api, resolveImageUrl } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface Props {
  onPick: (url: string) => void;
  onClose: () => void;
}

const PAGE_SIZE = 12;

function filename(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] ?? key;
}

/**
 * Modal media-library picker: browse/search uploaded images, upload a new
 * one, or click an asset to use it (e.g. as the featured image).
 */
export default function MediaPicker({ onPick, onClose }: Props) {
  const toast = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounce the search box; any new query resets to page 1.
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

  // Escape closes the picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const asset = await api.uploadImage(file);
      toast.push("Image uploaded — added to the story.");
      onPick(asset.url);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed.");
      setUploading(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Choose from the media library"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalhead">
          <h2>Choose from library</h2>
          <button
            className="iconbtn"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mediabar">
          <div className="searchin" style={{ flex: 1 }}>
            <Search size={15} />
            <input
              type="search"
              placeholder="Search by file name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search media"
            />
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
          <button
            className="btn"
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload new"}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        {loading ? (
          <div className="mediagrid">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="sk"
                style={{ height: 150, borderRadius: 13 }}
              />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="empty" style={{ padding: "40px 12px" }}>
            <span className="empty-ico">
              <FolderOpen size={22} />
            </span>
            <h3>{query ? "No files match" : "No media yet"}</h3>
            <p>
              {query
                ? "Try a different file name."
                : "Upload your first image and it will be reusable from any story."}
            </p>
          </div>
        ) : (
          <div className="mediagrid">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                className="mediacard"
                title={`Use ${filename(a.storageKey)}`}
                onClick={() => {
                  onPick(a.url);
                  onClose();
                }}
              >
                <span className="mediacard-imgwrap">
                  <img
                    src={resolveImageUrl(a.url) ?? ""}
                    alt={a.altText ?? filename(a.storageKey)}
                    loading="lazy"
                  />
                </span>
                <span className="mediacardmeta">
                  <span className="mediacard-name">
                    {filename(a.storageKey)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="pager modalpager">
            <button
              className="btn small"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ← Prev
            </button>
            <span className="small muted">
              Page {page} of {pages} · {total} file{total === 1 ? "" : "s"}
            </span>
            <button
              className="btn small"
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
