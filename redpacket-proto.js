/* 一對一紅包可點擊原型，規則依 redpacket.md */
(function () {
  var FRIEND = '好友暱稱';
  var CFG = {
    minDays: 7, single: 2000, daily: 10000, pwd: 1000, msgMax: 20,
    expireMs: 24 * 3600 * 1000, reciprocateMs: 10 * 60 * 1000, topup: 5000
  };
  var DEFAULT_MSG = '恭喜發財，大吉大利';
  var SCEN = {
    ok: { label: '正常', friend: true, days: 120, sentToday: 0 },
    stranger: { label: '好友已解除', friend: false, days: 120, sentToday: 0 },
    newbie: { label: '註冊第 3 天', friend: true, days: 3, sentToday: 0 },
    daily: { label: '今日已發 9,500', friend: true, days: 120, sentToday: 9500 }
  };

  var NOTES = {
    R1: ['R1　聊天頁與「＋」面板', [
      [1, '展開「＋」面板記錄「看到紅包」，點擊記錄「點擊紅包」', '§11'],
      [2, '點擊時才檢查發送資格；不符合就說明原因，不進入發紅包頁', '§7.1、§7.2']
    ]],
    RB: ['RB　無法發送', [
      [1, '依序檢查：好友 → 註冊滿 7 天 → 今日還有額度，說明第一個不符合的原因', '§7.2'],
      [0, '同時記錄「發送受限」事件與原因', '§11']
    ]],
    R2: ['R2　發紅包頁', [
      [1, '金額為正整數；即時檢查單筆上限與今日剩餘額度', '§7.3'],
      [2, '顯示可用餘額；金額超過餘額時，按下「塞進紅包」才提示', '§7.3、§7.5'],
      [3, '祝福語選填，最多 20 字，不可包含網址', '§7.3'],
      [4, '返回時記錄「關閉紅包視窗」與已輸入的金額', '§11']
    ]],
    R3: ['R3　二次確認與交易密碼', [
      [1, '一律二次確認對象、金額與祝福語', '§7.4'],
      [2, '金額達 1,000 以上，確認後再輸入交易密碼', '§7.4']
    ]],
    R4: ['R4　餘額不足', [
      [1, '說明還差多少，提供「取消」和「去儲值」', '§7.5'],
      [2, '從儲值頁回來後，保留已輸入的金額與祝福語', '§7.5']
    ]],
    R5: ['R5　聊天中的紅包訊息', [
      [1, '送出當下就從餘額扣款並凍結，接收者領取時不會因餘額變動而失敗', '§7.6、§8'],
      [2, '發送者看到預計退回的剩餘時間；接收者看到剩餘領取時間', '§7.7'],
      [0, '24 小時未領取自動退回，雙方各收到一則系統訊息；退回不恢復今日額度', '§7.9']
    ]],
    R6: ['R6　開紅包', [
      [1, '彈窗以縮放動畫出現', '§7.10'],
      [2, '點「開」才入帳；同一個紅包只會入帳一次', '§7.8、§8']
    ]]
  };
  var MARQUEE_NOTE = [0, 'v1.1 候選：置頂提醒未領取的紅包；領取後 10 分鐘內顯示收到的金額與「回紅包」按鈕。文案由營運在後台設定', '§7.11、§10'];

  var SVG = {
    speaker: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    smile: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };

  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function mk(n, pos) { return '<span class="mk" aria-hidden="true" style="' + pos + '">' + n + '</span>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function remainText(ms) {
    if (ms <= 60000) return '不到 1 分';
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
    if (h === 0) return m + ' 分';
    return m === 0 ? h + ' 小時' : h + ' 小時 ' + m + ' 分';
  }
  function hasUrl(s) { return /(https?:\/\/|www\.|\.(com|net|tw|cn|io)\b)/i.test(s); }

  function mount() {
    var host = document.getElementById('rp-proto');
    if (!host || host.getAttribute('data-ready')) return;
    host.setAttribute('data-ready', '1');
    host.className = 'proto';
    var opts = Object.keys(SCEN).map(function (k) { return '<option value="' + k + '">' + SCEN[k].label + '</option>'; }).join('');
    host.innerHTML = '' +
      '<div class="phone"><div class="screen"><div class="wf-view" id="rp-view"></div><div class="wf-toast" id="rp-toast" role="status"></div></div></div>' +
      '<div class="proto-side">' +
        '<div class="proto-controls">' +
          '<div class="seg" role="group" aria-label="情境">' +
            '<button type="button" data-mode="send" aria-pressed="true">我發紅包</button>' +
            '<button type="button" data-mode="recv" aria-pressed="false">我收到紅包</button>' +
          '</div>' +
          '<label class="proto-field">帳號情境 <select id="rp-scen">' + opts + '</select></label>' +
          '<span class="proto-sub" id="rp-scen-note"></span>' +
        '</div>' +
        '<div class="proto-controls">' +
          '<button type="button" class="btn ghost sm" id="rp-friend-claim">對方領取</button>' +
          '<button type="button" class="btn ghost sm" id="rp-ff">快轉 24 小時</button>' +
          '<button type="button" class="btn ghost sm" id="rp-reset">重置</button>' +
        '</div>' +
        '<div class="proto-controls">' +
          '<label class="proto-check"><input type="checkbox" id="rp-notes-toggle" checked> 顯示標註</label>' +
          '<label class="proto-check"><input type="checkbox" id="rp-marquee-toggle"> v1.1 跑馬燈</label>' +
        '</div>' +
        '<div class="proto-notes" id="rp-notes" aria-live="polite"></div>' +
        '<div class="proto-hint"><strong>試試看</strong><ul>' +
          '<li>按「紅包」，輸入 1,000 再按「塞進紅包」：餘額只有 800，會跳出餘額不足 → 去儲值 → 回來時輸入還在 → 確認 → 輸入密碼</li>' +
          '<li>送出後按「快轉 24 小時」看退回，或按「對方領取」</li>' +
          '<li>切到「我收到紅包」，點紅包打開；勾選「v1.1 跑馬燈」看置頂提醒與「回紅包」按鈕</li>' +
          '<li>「帳號情境」可以切換：好友已解除（聊天紀錄還在）、註冊第 3 天、今日已發 9,500</li>' +
        '</ul><p class="small">金額、上限與天數皆為示意值。</p></div>' +
      '</div>';
    init(host);
  }

  function init(root) {
    var view = root.querySelector('#rp-view');
    var toastEl = root.querySelector('#rp-toast');
    var notesEl = root.querySelector('#rp-notes');
    var scenSel = root.querySelector('#rp-scen');
    var modeBtns = root.querySelectorAll('[data-mode]');
    var marqueeOn = false;
    var S, nextId, toastTimer;

    function now() { return Date.now() + S.offset; }

    function reset(mode, scen) {
      if (mode === 'recv') scen = 'ok';
      S = {
        mode: mode, scen: scen,
        balance: mode === 'send' ? 800 : 1200,
        sentToday: SCEN[scen].sentToday,
        offset: 0, screen: 'chat', panel: mode === 'send', modal: null,
        draft: { amount: '', msg: '' }, pwd: '', items: [], openId: null
      };
      nextId = 1;
      if (mode === 'recv') {
        S.items.push({ kind: 'env', id: nextId++, from: 'friend', amount: 888, msg: '生日快樂！', sentAt: Date.now() - 5 * 60000, status: 'pending' });
      }
    }

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
    }

    function envs() { return S.items.filter(function (i) { return i.kind === 'env'; }); }
    function findEnv(id) { return envs().filter(function (e) { return e.id === id; })[0]; }
    function dailyLeft() { return CFG.daily - S.sentToday; }
    function sys(text) { S.items.push({ kind: 'sys', text: text }); }

    function processExpiry() {
      envs().forEach(function (e) {
        if (e.status === 'pending' && e.sentAt + CFG.expireMs <= now()) {
          e.status = 'refunded';
          if (e.from === 'me') { S.balance += e.amount; sys('紅包已過期，' + fmt(e.amount) + ' 金幣已退回你的餘額'); }
          else sys(FRIEND + ' 的紅包已過期');
        }
      });
    }

    /* ---------- 聊天頁 ---------- */
    function envBubble(e, first, marks) {
      var left = e.sentAt + CFG.expireMs - now();
      var foot;
      if (e.from === 'me') foot = e.status === 'pending' ? '等待領取 · ' + remainText(left) + '後退回' : e.status === 'claimed' ? '已被領取' : '已退回';
      else foot = e.status === 'pending' ? '點擊領取 · 剩 ' + remainText(left) : e.status === 'claimed' ? '已領取' : '已過期';
      var isNew = e.isNew; e.isNew = false;
      return '<button type="button" class="rp-env st-' + e.status + (isNew ? ' wf-pop-sm' : '') + '" data-act="env" data-id="' + e.id + '">' +
        (first && marks ? mk(1, 'top:-8px;left:-8px') : '') +
        '<span class="rp-env-top"><span class="rp-env-ic"></span><span class="rp-env-msg">' + esc(e.msg) + '</span></span>' +
        '<span class="rp-env-foot">' + foot + (first && marks ? mk(2, 'bottom:-8px;right:-8px') : '') + '</span></button>';
    }

    function marquee() {
      if (!marqueeOn) return '';
      var pending = envs().filter(function (e) { return e.from === 'friend' && e.status === 'pending'; })
        .sort(function (a, b) { return a.sentAt - b.sentAt; })[0];
      if (pending) {
        return '<div class="rp-marquee"><span class="tag">v1.1</span><span class="txt">' + FRIEND + ' 送你一個紅包 · 剩 ' +
          remainText(pending.sentAt + CFG.expireMs - now()) + '</span><button type="button" class="wf-btn solid" data-act="env" data-id="' + pending.id + '">打開</button></div>';
      }
      var recent = envs().filter(function (e) { return e.from === 'friend' && e.status === 'claimed' && now() - e.claimedAt < CFG.reciprocateMs; })[0];
      if (recent) {
        return '<div class="rp-marquee"><span class="tag">v1.1</span><span class="txt">收到 ' + FRIEND + ' 的紅包 ' + fmt(recent.amount) + ' 金幣了</span>' +
          '<button type="button" class="wf-btn solid" data-act="rp">回紅包</button></div>';
      }
      return '';
    }

    function chat() {
      processExpiry();
      var marks = S.modal === null;
      var hasEnv = envs().length > 0;
      var body = '<div class="rp-sys">你們已成為好友，可以開始聊天了</div><div class="rp-time">09/06 15:09</div>' +
        '<div class="rp-row left"><span class="rp-ava">頭像</span><span class="rp-bubble">你好</span></div>' +
        (SCEN[S.scen].friend ? '' : '<div class="rp-sys">你們目前已不是好友</div>');
      var firstDone = false;
      S.items.forEach(function (it) {
        if (it.kind === 'sys') { body += '<div class="rp-sys">' + esc(it.text) + '</div>'; return; }
        var b = envBubble(it, !firstDone, marks);
        firstDone = true;
        body += it.from === 'me'
          ? '<div class="rp-row right">' + b + '<span class="rp-ava">頭像</span></div>'
          : '<div class="rp-row left"><span class="rp-ava">頭像</span>' + b + '</div>';
      });
      var panel = !S.panel ? '' :
        '<div class="rp-panel">' +
          '<div class="rp-tool"><span class="x"></span>照片</div>' +
          '<div class="rp-tool"><span class="x"></span>拍照</div>' +
          '<div class="rp-tool"><span class="x"></span>攝像</div>' +
          '<button type="button" class="rp-tool target" data-act="rp"><span class="x"><span class="rp-env-ic dark"></span></span>紅包' +
            (marks && !hasEnv ? mk(1, 'top:-8px;left:-6px') + mk(2, 'top:-8px;right:-6px') : '') + '</button>' +
        '</div>';
      return '' +
        '<div class="rp-head"><button type="button" class="wf-back" data-act="noop" aria-label="返回">‹</button><span class="rp-badge">6</span>' +
          '<div class="rp-title"><b>' + FRIEND + '</b><span class="rp-online">當前在線</span></div><span class="rp-more">···</span></div>' +
        marquee() +
        '<div class="rp-body" id="rp-body">' + body + '</div>' +
        '<div class="rp-input"><span class="ic">' + SVG.speaker + '</span><span class="rp-field"></span><span class="ic">' + SVG.smile + '</span>' +
          '<button type="button" class="ic" data-act="panel" aria-label="更多功能">' + SVG.plus + '</button></div>' +
        panel;
    }

    /* ---------- 發紅包頁 ---------- */
    function compose() {
      var marks = S.modal === null;
      return '' +
        '<div class="rp-head"><button type="button" class="wf-back" data-act="close-compose" aria-label="返回">‹' + (marks ? mk(4, 'top:-4px;right:-10px') : '') + '</button>' +
          '<div class="rp-title"><b>發紅包</b><span class="rp-online plain">給 ' + FRIEND + '</span></div><span class="rp-more"></span></div>' +
        '<div class="rp-form">' +
          '<label class="rp-fieldrow"><span>金額</span><input id="rp-amt" inputmode="numeric" autocomplete="off" placeholder="0"><span>金幣</span>' + (marks ? mk(1, 'top:-8px;right:-8px') : '') + '</label>' +
          '<div class="rp-hint">單筆上限 ' + fmt(CFG.single) + ' · 今日還可發 ' + fmt(Math.max(0, dailyLeft())) + '</div>' +
          '<div class="rp-err" id="rp-amt-err"></div>' +
          '<label class="rp-fieldrow msg"><input id="rp-msg" maxlength="' + CFG.msgMax + '" autocomplete="off" placeholder="' + DEFAULT_MSG + '">' + (marks ? mk(3, 'top:-8px;right:-8px') : '') + '</label>' +
          '<div class="rp-err" id="rp-msg-err"></div>' +
          '<div class="rp-big" id="rp-big">0</div><div class="rp-unit">金幣</div>' +
          '<div class="rp-bal">可用餘額 ' + fmt(S.balance) + ' 金幣' + (marks ? mk(2, 'top:-2px;right:14px') : '') + '</div>' +
          '<button type="button" class="wf-btn solid wide" id="rp-submit" data-act="submit" disabled>塞進紅包</button>' +
        '</div>';
    }

    function validate() {
      var a = parseInt(S.draft.amount, 10) || 0;
      var amtErr = '', msgErr = '';
      if (a > CFG.single) amtErr = '單筆上限為 ' + fmt(CFG.single) + ' 金幣';
      else if (a > dailyLeft()) amtErr = '超過今日可發額度，今日還可發 ' + fmt(Math.max(0, dailyLeft())) + ' 金幣';
      if (hasUrl(S.draft.msg)) msgErr = '祝福語不能包含網址';
      return { a: a, amtErr: amtErr, msgErr: msgErr, ok: a >= 1 && !amtErr && !msgErr };
    }

    function updateCompose() {
      var v = validate();
      var q = function (id) { return view.querySelector('#' + id); };
      if (!q('rp-big')) return;
      q('rp-big').textContent = fmt(v.a);
      q('rp-amt-err').textContent = v.amtErr;
      q('rp-msg-err').textContent = v.msgErr;
      q('rp-submit').disabled = !v.ok;
    }

    /* ---------- 彈窗 ---------- */
    function modal() {
      if (!S.modal) return '';
      var v = validate(), inner = '', cls = 'wf-modal wf-pop';
      if (S.modal === 'blocked') {
        var sc = SCEN[S.scen];
        var reason = !sc.friend ? '只能發紅包給好友。'
          : sc.days < CFG.minDays ? '註冊滿 ' + CFG.minDays + ' 天後才能發紅包（你目前註冊第 ' + sc.days + ' 天）。'
          : '今天的紅包額度已用完，明天再來吧。';
        inner = '<div class="wf-modal-title">無法發送紅包' + mk(1, 'top:-6px;right:-24px') + '</div><p>' + reason + '</p>' +
          '<div class="rp-btns"><button type="button" class="wf-btn solid" data-act="modal-close">我知道了</button></div>';
      } else if (S.modal === 'insufficient') {
        inner = '<div class="wf-modal-title">餘額不足' + mk(1, 'top:-6px;right:-24px') + '</div>' +
          '<p>這次需要 ' + fmt(v.a) + ' 金幣，目前餘額 ' + fmt(S.balance) + '，還差 ' + fmt(v.a - S.balance) + ' 金幣。</p>' +
          '<div class="rp-btns"><button type="button" class="wf-btn ghost" data-act="modal-close">取消</button>' +
          '<button type="button" class="wf-btn solid" data-act="topup">去儲值' + mk(2, 'top:-10px;right:-10px') + '</button></div>';
      } else if (S.modal === 'confirm') {
        var msg = S.draft.msg.trim() || DEFAULT_MSG;
        inner = '<div class="wf-modal-title">確認發送紅包' + mk(1, 'top:-6px;right:-24px') + '</div>' +
          '<div class="rp-kv"><span>給</span><span>' + FRIEND + '</span><span>金額</span><span>' + fmt(v.a) + ' 金幣</span><span>祝福語</span><span>' + esc(msg) + '</span></div>' +
          '<div class="rp-btns"><button type="button" class="wf-btn ghost" data-act="cancel-confirm">取消</button>' +
          '<button type="button" class="wf-btn solid" data-act="confirm">確認發送' + (v.a >= CFG.pwd ? mk(2, 'top:-10px;right:-10px') : '') + '</button></div>';
      } else if (S.modal === 'password') {
        inner = '<div class="wf-modal-title">輸入交易密碼' + mk(2, 'top:-6px;right:-24px') + '</div>' +
          '<p>金額達 ' + fmt(CFG.pwd) + ' 以上需要驗證</p>' +
          '<input class="rp-pwd" id="rp-pwd" type="password" inputmode="numeric" maxlength="6" autocomplete="off" aria-label="交易密碼">' +
          '<p class="rp-note">原型：輸入任意 6 位數字</p>' +
          '<div class="rp-btns"><button type="button" class="wf-btn ghost" data-act="cancel-pwd">取消</button>' +
          '<button type="button" class="wf-btn solid" id="rp-pwd-ok" data-act="pwd-ok" disabled>確認</button></div>';
      } else if (S.modal === 'open' || S.modal === 'opened') {
        var e = findEnv(S.openId);
        cls = 'rp-open wf-pop';
        inner = '<button type="button" class="x" data-act="modal-close" aria-label="關閉">×</button>' +
          '<div class="ava"></div><div class="who">' + FRIEND + ' 的紅包</div>' +
          (S.modal === 'open'
            ? '<div class="msg">' + esc(e.msg) + '</div><button type="button" class="kai" data-act="claim">開' + mk(2, 'top:-6px;right:-10px') + '</button>'
            : '<div class="amt">' + fmt(e.amount) + ' 金幣</div><div class="sub">已存入你的餘額</div>' +
              '<button type="button" class="wf-btn wide light" data-act="modal-close">好</button>') +
          mk(1, 'top:-9px;left:-9px');
      }
      return '<div class="wf-modal-back"><div class="' + cls + '" role="dialog">' + inner + '</div></div>';
    }

    /* ---------- 標註 ---------- */
    function noteKey() {
      if (S.modal === 'blocked') return 'RB';
      if (S.modal === 'insufficient') return 'R4';
      if (S.modal === 'confirm' || S.modal === 'password') return 'R3';
      if (S.modal === 'open' || S.modal === 'opened') return 'R6';
      if (S.screen === 'compose') return 'R2';
      return envs().length ? 'R5' : 'R1';
    }
    function renderNotes() {
      var key = noteKey(), n = NOTES[key];
      var items = n[1].slice();
      if (marqueeOn && (key === 'R1' || key === 'R5')) items.push(MARQUEE_NOTE);
      notesEl.innerHTML = '<h4>' + n[0] + '</h4><ol>' + items.map(function (it) {
        return '<li><span class="n' + (it[0] ? '' : ' dot') + '">' + (it[0] || '') + '</span><span>' + it[1] + '　<span class="ref">' + it[2] + '</span></span></li>';
      }).join('') + '</ol>';
    }

    function render() {
      view.innerHTML = (S.screen === 'compose' ? compose() : chat()) + modal();
      if (S.screen === 'compose') {
        view.querySelector('#rp-amt').value = S.draft.amount;
        view.querySelector('#rp-msg').value = S.draft.msg;
        updateCompose();
      }
      var body = view.querySelector('#rp-body');
      if (body) body.scrollTop = body.scrollHeight;
      renderNotes();
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === S.mode)); });
      /* 收紅包不受帳號情境限制：選單壓灰，固定為「正常」 */
      scenSel.disabled = S.mode === 'recv';
      scenSel.value = S.scen;
      root.querySelector('#rp-scen-note').textContent = S.mode === 'recv' ? '收紅包不受帳號情境限制' : '';
    }

    function tryOpenCompose() {
      var sc = SCEN[S.scen];
      if (!sc.friend || sc.days < CFG.minDays || dailyLeft() <= 0) { S.modal = 'blocked'; return; }
      S.screen = 'compose';
      S.modal = null;
    }

    function send() {
      var v = validate();
      var msg = S.draft.msg.trim() || DEFAULT_MSG;
      S.balance -= v.a;
      S.sentToday += v.a;
      S.items.push({ kind: 'env', id: nextId++, from: 'me', amount: v.a, msg: msg, sentAt: now(), status: 'pending', isNew: true });
      S.draft = { amount: '', msg: '' };
      S.modal = null;
      S.screen = 'chat';
      S.panel = false;
      toast('紅包已送出，已從餘額扣除 ' + fmt(v.a) + ' 金幣');
    }

    /* ---------- 互動 ---------- */
    view.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      var v;
      switch (act) {
        case 'panel': S.panel = !S.panel; break;
        case 'rp': tryOpenCompose(); break;
        case 'noop': toast('（原型）返回聊天列表'); return;
        case 'close-compose': S.screen = 'chat'; S.draft = { amount: '', msg: '' }; toast('已關閉紅包視窗'); break;
        case 'modal-close': S.modal = null; break;
        case 'submit':
          v = validate();
          if (!v.ok) return;
          S.modal = v.a > S.balance ? 'insufficient' : 'confirm';
          break;
        case 'topup':
          S.balance += CFG.topup;
          S.modal = null;
          toast('（原型）已儲值 ' + fmt(CFG.topup) + ' 金幣，回到發紅包頁');
          break;
        case 'cancel-confirm': S.modal = null; break;
        case 'confirm':
          v = validate();
          if (v.a >= CFG.pwd) S.modal = 'password'; else send();
          break;
        case 'cancel-pwd': S.modal = null; break;
        case 'pwd-ok': send(); break;
        case 'env':
          var e = findEnv(Number(b.getAttribute('data-id')));
          if (e.from === 'friend') {
            if (e.status === 'pending') { S.openId = e.id; S.modal = 'open'; }
            else { toast(e.status === 'claimed' ? '紅包已領取' : '紅包已過期'); return; }
          } else {
            toast('紅包狀態：' + (e.status === 'pending' ? '等待對方領取' : e.status === 'claimed' ? '已被領取' : '已退回'));
            return;
          }
          break;
        case 'claim':
          var c = findEnv(S.openId);
          if (c.status === 'pending') {
            c.status = 'claimed';
            c.claimedAt = now();
            S.balance += c.amount;
            sys('你領取了 ' + FRIEND + ' 的紅包');
          }
          S.modal = 'opened';
          break;
      }
      render();
    });

    view.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'rp-amt') {
        var digits = t.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7);
        if (t.value !== digits) t.value = digits;
        S.draft.amount = digits;
        updateCompose();
      } else if (t.id === 'rp-msg') {
        S.draft.msg = t.value;
        updateCompose();
      } else if (t.id === 'rp-pwd') {
        t.value = t.value.replace(/\D/g, '').slice(0, 6);
        view.querySelector('#rp-pwd-ok').disabled = t.value.length !== 6;
      }
    });

    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        reset(b.getAttribute('data-mode'), scenSel.value);
        render();
      });
    });
    scenSel.addEventListener('change', function () {
      reset(S.mode, scenSel.value);
      render();
      toast('帳號情境：' + SCEN[scenSel.value].label);
    });
    root.querySelector('#rp-reset').addEventListener('click', function () {
      reset(S.mode, S.scen);
      render();
      toast('原型已重置');
    });
    root.querySelector('#rp-ff').addEventListener('click', function () {
      S.offset += CFG.expireMs;
      S.modal = null;
      S.screen = 'chat';
      render();
      toast('已快轉 24 小時');
    });
    root.querySelector('#rp-friend-claim').addEventListener('click', function () {
      var e = envs().filter(function (x) { return x.from === 'me' && x.status === 'pending'; })[0];
      if (!e) { toast('目前沒有等待對方領取的紅包'); return; }
      e.status = 'claimed';
      e.claimedAt = now();
      sys(FRIEND + ' 領取了你的紅包');
      S.screen = 'chat';
      S.modal = null;
      render();
    });
    root.querySelector('#rp-notes-toggle').addEventListener('change', function (ev) {
      root.classList.toggle('no-notes', !ev.target.checked);
    });
    root.querySelector('#rp-marquee-toggle').addEventListener('change', function (ev) {
      marqueeOn = ev.target.checked;
      render();
    });

    setInterval(function () {
      if (S.screen === 'chat' && !S.modal) render();
    }, 30000);

    reset('send', 'ok');
    render();
  }

  window.addEventListener('doc:rendered', mount);
  mount();
})();
