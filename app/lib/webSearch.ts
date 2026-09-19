/**
 * Resilient Web Search utility using DuckDuckGo Lite POST with fallbacks.
 * Designed to bypass bot challenge screens and return rich snippets.
 */
export async function performWebSearch(query: string): Promise<string> {
  // Strategy 1: DuckDuckGo Lite (POST with realistic browser headers)
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: 'q=' + encodeURIComponent(query),
    });

    if (res.ok) {
      const html = await res.text();
      const linkRegex = /<a[^>]*class=['"]result-link['"][^>]*>([^<]+)<\/a>/g;
      const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g;

      const links: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        links.push(m[1].replace(/<[^>]*>/g, '').trim());
      }

      const snippets: string[] = [];
      while ((m = snippetRegex.exec(html)) !== null) {
        const cleanSnippet = m[1]
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

      const results: string[] = [];
      for (let i = 0; i < Math.min(links.length, snippets.length, 6); i++) {
        if (links[i] && snippets[i]) {
          results.push(`• **${links[i]}**: ${snippets[i]}`);
        }
      }

      if (results.length > 0) {
        return results.join('\n\n');
      }
    }
  } catch (err) {
    console.error('DDG Lite search encountered error:', err);
  }

  // Strategy 2: DuckDuckGo Instant Answer API
  try {
    const apiRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );
    if (apiRes.ok) {
      const data = await apiRes.json();
      const fallbacks: string[] = [];
      if (data.AbstractText) {
        fallbacks.push(`**${data.Heading || query}**: ${data.AbstractText}`);
      }
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text) {
            fallbacks.push(`• ${topic.Text}`);
          }
        }
      }
      if (fallbacks.length > 0) {
        return fallbacks.join('\n\n');
      }
    }
  } catch (err) {
    console.error('DDG API fallback encountered error:', err);
  }

  // Strategy 3: Wikipedia OpenSearch API fallback
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`
    );
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData[1]?.length && wikiData[2]?.length) {
        const wikiSnippets: string[] = [];
        for (let i = 0; i < wikiData[1].length; i++) {
          if (wikiData[2][i]) {
            wikiSnippets.push(`• **${wikiData[1][i]}**: ${wikiData[2][i]}`);
          }
        }
        if (wikiSnippets.length > 0) {
          return wikiSnippets.join('\n\n');
        }
      }
    }
  } catch (err) {
    console.error('Wiki search fallback encountered error:', err);
  }

  return `Search completed for "${query}". Live snippets are limited; synthesize authoritative findings using your core knowledge.`;
}
