"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
          </p>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
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
