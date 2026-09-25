// Minimal, safe Markdown renderer (escape first, then format). No external deps.
(function () {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>')
      .replace(/\[(S\d+)\]/g, '<span class="cite" data-cite="$1">$1</span>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function table(lines) {
    const rows = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map((l) =>
      l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
    const [head, ...body] = rows;
    return `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${
      body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  window.renderMarkdown = function (src) {
    const lines = esc(src || '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^```/.test(line)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++; out.push(`<pre><code>${buf.join('\n')}</code></pre>`); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
        const buf = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) buf.push(lines[i++]);
        out.push(table(buf)); continue;
      }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { const l = Math.min(m[1].length + 1, 5); out.push(`<h${l}>${inline(m[2])}</h${l}>`); i++; continue; }
      if (/^\s*([-*])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
        const ordered = /^\s*\d+[.)]\s+/.test(line);
        const buf = [];
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
          buf.push(`<li>${inline(lines[i].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ''))}</li>`); i++;
        }
        out.push(ordered ? `<ol>${buf.join('')}</ol>` : `<ul>${buf.join('')}</ul>`); continue;
      }
      if (/^&gt;\s?/.test(line)) { out.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`); i++; continue; }
      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }
      if (!line.trim()) { i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*[-*]\s|\s*\d+[.)]\s|&gt;|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join('<br/>'))}</p>`);
    }
    return out.join('\n');
  };
})();
