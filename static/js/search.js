(() => {
  const form = document.getElementById("site-search");
  if (!form) return;

  const input = document.getElementById("search-query");
  const results = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  const matches = document.getElementById("search-matches");
  const archive = document.getElementById("post-archive");
  let indexPromise;
  let revision = 0;
  let timer;

  // Fetch once, only when someone searches. A failed fetch can be retried.
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(form.dataset.index)
        .then((response) => {
          if (!response.ok) throw new Error("Search index unavailable");
          return response.json();
        })
        .then((pages) => pages.map((page) => ({
          ...page,
          titleLower: page.title.toLowerCase(),
          searchable: `${page.title} ${page.tags.join(" ")} ${page.text}`.toLowerCase(),
        })))
        .catch((error) => {
          indexPromise = undefined;
          throw error;
        });
    }
    return indexPromise;
  }

  async function search() {
    const current = ++revision;
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    matches.replaceChildren();
    results.hidden = terms.length === 0;
    archive.hidden = terms.length > 0;
    if (!terms.length) return;
    status.textContent = "Searching…";

    try {
      const pages = await loadIndex();
      if (current !== revision) return;
      const found = pages.filter((page) => terms.every((term) => page.searchable.includes(term)));
      found.sort((a, b) => {
        const score = (page) => terms.filter((term) => page.titleLower.includes(term)).length;
        return score(b) - score(a);
      });
      status.textContent = found.length
        ? `${found.length} result${found.length === 1 ? "" : "s"}`
        : "No results found. Try different keywords.";
      for (const page of found) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = page.url;
        link.textContent = page.title;
        const snippet = document.createElement("p");
        const position = page.text.toLowerCase().indexOf(terms[0]);
        const start = Math.max(0, position - 60);
        snippet.textContent = `${start ? "…" : ""}${page.text.slice(start, start + 180)}${page.text.length > start + 180 ? "…" : ""}`;
        item.append(link, snippet);
        matches.append(item);
      }
    } catch {
      if (current !== revision) return;
      status.textContent = "Search could not load. Please try again.";
      archive.hidden = false;
    }
  }

  form.parentElement.hidden = false;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(timer);
    search();
  });
  input.addEventListener("input", () => {
    ++revision;
    clearTimeout(timer);
    if (!input.value.trim()) search();
    else timer = setTimeout(search, 150);
  });
})();
