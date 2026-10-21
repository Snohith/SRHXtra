"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import type { Category } from "@srh/contracts";
import { ApiError, api } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";
import ArticleForm from "@/components/ArticleForm";

function NewArticle() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .categories()
      .then(setCategories)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Could not load categories.",
        );
      });
  }, []);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>New article</h1>
          <p className="sub">
            Saved as a draft — publish it from the article page.
            <span className="chip">
              <Sparkles size={12} />
              Autosaves quietly once created
            </span>
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn" href="/articles">
            <ArrowLeft size={14} />
            All articles
          </Link>
        </div>
      </div>
      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <ArticleForm
        categories={categories}
        onSaved={(a) => router.push(`/articles/${a.id}`)}
      />
    </>
  );
}

export default function NewArticlePage() {
  return (
    <RequireAuth>
      <NewArticle />
    </RequireAuth>
  );
}
