/* 把 #doc[data-src] 指定的 Markdown 渲染成文件頁：表格、流程圖、目錄。完成後發出 doc:rendered 事件。 */
(function () {
  var docEl = document.getElementById('doc');
  if (!docEl) return;
  var src = docEl.getAttribute('data-src');

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function buildToc() {
    var heads = docEl.querySelectorAll('h2');
    var lists = [document.getElementById('toc'), document.getElementById('toc-mobile')];
    var links = [];
    heads.forEach(function (h, i) {
      h.id = 's' + i;
      lists.forEach(function (ol, which) {
        if (!ol) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#s' + i;
        a.textContent = h.textContent;
        if (which === 1) a.addEventListener('click', function () { ol.parentElement.open = false; });
        li.appendChild(a);
        ol.appendChild(li);
        if (which === 0) links.push(a);
      });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = links[Number(e.target.id.slice(1))];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  function wrapTables() {
    docEl.querySelectorAll('table').forEach(function (t) {
      var w = document.createElement('div');
      w.className = 'table-wrap';
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  function renderMermaid() {
    var nodes = [];
    docEl.querySelectorAll('pre code.language-mermaid').forEach(function (code) {
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent;
      code.parentNode.replaceWith(div);
      nodes.push(div);
    });
    if (!nodes.length || !window.mermaid) return;
    mermaid.initialize({ startOnLoad: false, theme: isDark() ? 'dark' : 'neutral', securityLevel: 'strict' });
    mermaid.run({ nodes: nodes });
  }

  fetch(src)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (md) {
      docEl.innerHTML = marked.parse(md);
      docEl.querySelectorAll('a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
      wrapTables();
      renderMermaid();
      buildToc();
      window.dispatchEvent(new CustomEvent('doc:rendered'));
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function () {
      docEl.innerHTML = '<p class="status">文件載入失敗。<a href="' + src + '">直接開啟 Markdown 原檔</a></p>';
    });
})();
