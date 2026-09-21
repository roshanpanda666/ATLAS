/**
 * Multi-Source Web Search Engine
 * Concurrently queries DuckDuckGo general web, ArXiv (academic/research),
 * Hacker News (tech/engineering), GitHub (open source), and Wikipedia
 * to deliver comprehensive findings from diverse websites across the internet.
 */

export interface SearchResultItem {
  source: string;
  domain: string;
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResult {
  results: string;
  sources: string[];
  items: SearchResultItem[];
}

/**
 * Searches DuckDuckGo Lite for general web results across arbitrary domains.
 */
async function searchDuckDuckGo(query: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: 'q=' + encodeURIComponent(query),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const linkRegex =
      /<a\s+[^>]*href=['"]([^'"]+)['"][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a\s+[^>]*class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g;

    const links: { title: string; url: string; domain: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      let rawUrl = m[1] || m[3];
      const title = (m[2] || m[4]).replace(/<[^>]*>/g, '').trim();

      if (rawUrl.includes('uddg=')) {
        try {
          const u = new URL(rawUrl, 'https://lite.duckduckgo.com');
          rawUrl = decodeURIComponent(u.searchParams.get('uddg') || rawUrl);
        } catch {
          // ignore parsing error
        }
      }

      let domain = 'web';
      try {
        domain = new URL(rawUrl).hostname.replace(/^www\./, '');
      } catch {
        // ignore url parse
      }

      links.push({ title, url: rawUrl, domain });
    }

    const snippets: string[] = [];
    let s: RegExpExecArray | null;
    while ((s = snippetRegex.exec(html)) !== null) {
      const cleanSnippet = s[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      snippets.push(cleanSnippet);
    }

    const items: SearchResultItem[] = [];
    for (let i = 0; i < Math.min(links.length, snippets.length, 5); i++) {
      const link = links[i];
      if (link && snippets[i]) {
        items.push({
          source: `Web (${link.domain})`,
          domain: link.domain,
          title: link.title,
          snippet: snippets[i],
          url: link.url,
        });
      }
    }
    return items;
  } catch (err) {
    console.error('DDG search error:', err);
    return [];
  }
}

/**
 * Searches ArXiv for academic research papers, preprints, and surveys.
 */
async function searchArXiv(query: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`,
      { headers: { 'User-Agent': 'Atlas-Assistant/1.0' } }
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);
    const items: SearchResultItem[] = [];

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);

      if (titleMatch && summaryMatch) {
        const title = titleMatch[1].replace(/\s+/g, ' ').trim();
        const snippet = summaryMatch[1].replace(/\s+/g, ' ').trim().slice(0, 220) + '…';
        const url = idMatch ? idMatch[1].trim() : 'https://arxiv.org';
        items.push({
          source: 'ArXiv Research',
          domain: 'arxiv.org',
          title,
          snippet,
          url,
        });
      }
    }
    return items;
  } catch (err) {
    console.error('ArXiv search error:', err);
    return [];
  }
}

/**
 * Searches Hacker News Algolia index for tech community discussions, articles, and engineering insights.
 */
async function searchHackerNews(query: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=3`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items: SearchResultItem[] = [];

    for (const hit of data.hits || []) {
      if (hit.title) {
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        let domain = 'news.ycombinator.com';
        try {
          if (hit.url) domain = new URL(hit.url).hostname.replace(/^www\./, '');
        } catch {
          // ignore
        }

        items.push({
          source: `Hacker News (${domain})`,
          domain,
          title: hit.title,
          snippet: `${hit.points || 0} points • ${hit.num_comments || 0} comments • Published discussion and analysis`,
          url,
        });
      }
    }
    return items;
  } catch (err) {
    console.error('HN search error:', err);
    return [];
  }
}

/**
 * Searches GitHub API for open-source repositories and libraries related to the query.
 */
async function searchGitHub(query: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=2`,
      { headers: { 'User-Agent': 'Atlas-Search/1.0', Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items: SearchResultItem[] = [];

    for (const repo of data.items || []) {
      items.push({
        source: 'GitHub Open Source',
        domain: 'github.com',
        title: repo.full_name,
        snippet: `${repo.description || 'Open source software'} (⭐ ${repo.stargazers_count?.toLocaleString() || 0} stars)`,
        url: repo.html_url,
      });
    }
    return items;
  } catch (err) {
    console.error('GitHub search error:', err);
    return [];
  }
}

/**
 * Searches Wikipedia OpenSearch API for encyclopedic overviews.
 */
async function searchWikipedia(query: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=2&format=json`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items: SearchResultItem[] = [];

    if (data[1]?.length && data[2]?.length) {
      for (let i = 0; i < data[1].length; i++) {
        if (data[1][i] && data[2][i]) {
          items.push({
            source: 'Wikipedia',
            domain: 'en.wikipedia.org',
            title: data[1][i],
            snippet: data[2][i],
            url: data[3]?.[i] || 'https://en.wikipedia.org',
          });
        }
      }
    }
    return items;
  } catch (err) {
    console.error('Wikipedia search error:', err);
    return [];
  }
}

/**
 * Executes a multi-website search across DuckDuckGo, ArXiv, Hacker News, GitHub, and Wikipedia in parallel.
 */
export async function performWebSearchDetailed(query: string): Promise<WebSearchResult> {
  const [ddgResults, arxivResults, hnResults, ghResults, wikiResults] = await Promise.allSettled([
    searchDuckDuckGo(query),
    searchArXiv(query),
    searchHackerNews(query),
    searchGitHub(query),
    searchWikipedia(query),
  ]);

  const allItems: SearchResultItem[] = [
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
    ...(arxivResults.status === 'fulfilled' ? arxivResults.value : []),
    ...(hnResults.status === 'fulfilled' ? hnResults.value : []),
    ...(ghResults.status === 'fulfilled' ? ghResults.value : []),
    ...(wikiResults.status === 'fulfilled' ? wikiResults.value : []),
  ];

  const uniqueDomains = Array.from(new Set(allItems.map((item) => item.domain).filter(Boolean)));

  if (allItems.length === 0) {
    return {
      results: `No live snippets returned for "${query}". Please synthesize an authoritative answer using your pre-existing knowledge base.`,
      sources: [],
      items: [],
    };
  }

  // Format into rich, categorized markdown with website badges and direct links
  const formattedResults = allItems
    .map(
      (item) =>
        `• [${item.source}] **${item.title}**: ${item.snippet} (Source URL: ${item.url})`
    )
    .join('\n\n');

  return {
    results: formattedResults,
    sources: uniqueDomains,
    items: allItems,
  };
}

/**
 * Standard performWebSearch returning the formatted markdown string.
 */
export async function performWebSearch(query: string): Promise<string> {
  const detailed = await performWebSearchDetailed(query);
  return detailed.results;
}
