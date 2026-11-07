/* 七日任務可點擊原型（W1–W4），規則依 prd.md */
(function () {
  var root = document.getElementById('proto');
  if (!root) return;

  var screenEl = document.getElementById('proto-screen');
  var notesEl = document.getElementById('proto-notes');
  var DAYS = 7;
  var FULL_REWARD = 30000;

  /* 固定目的地清單（PRD §6.3） */
  var DEST = {
    lobby: { name: '大廳', open: true },
    shop: { name: '商城', open: true },
    friends: { name: '好友', open: true },
    mail: { name: '信箱', open: true },
    game: { name: '指定遊戲', open: true },
    guild: { name: '公會', open: false, cond: '等級 10 開放' }
  };

  function T(day, type, title, target, reward, dest) {
    return { day: day, type: type, title: title, target: target, reward: reward, dest: dest || null };
  }

  /* 每天 3 個任務，共 21 個（PRD §9 每個 Day 1–3 個） */
  var BASE = [
    T(1, 'LOGIN', '登入遊戲', 1, 1000),
    T(1, 'PLAY', '遊玩任意遊戲 5 局', 5, 3000, 'lobby'),
    T(1, 'VISIT', '開啟商城頁面', 1, 1000, 'shop'),
    T(2, 'LOGIN', '登入遊戲', 1, 1000),
    T(2, 'PLAY', '遊玩任意遊戲 10 局', 10, 5000, 'lobby'),
    T(2, 'VISIT', '開啟公會頁面', 1, 2000, 'guild'),
    T(3, 'LOGIN', '登入遊戲', 1, 1000),
    T(3, 'PLAY', '遊玩任意遊戲 10 局', 10, 5000, 'lobby'),
    T(3, 'VISIT', '開啟好友頁面', 1, 2000, 'friends'),
    T(4, 'LOGIN', '登入遊戲', 1, 1000),
    T(4, 'PLAY', '遊玩任意遊戲 15 局', 15, 5000, 'lobby'),
    T(4, 'EARN', '累積獲得 20,000 金幣', 20000, 3000),
    T(5, 'LOGIN', '登入遊戲', 1, 1000),
    T(5, 'PLAY', '遊玩指定遊戲 5 局', 5, 5000, 'game'),
    T(5, 'VISIT', '開啟信箱', 1, 1000, 'mail'),
    T(6, 'LOGIN', '登入遊戲', 1, 1000),
    T(6, 'PLAY', '遊玩任意遊戲 20 局', 20, 6000, 'lobby'),
    T(6, 'EARN', '累積獲得 50,000 金幣', 50000, 4000),
    T(7, 'LOGIN', '登入遊戲', 1, 2000),
    T(7, 'PLAY', '遊玩任意遊戲 20 局', 20, 8000, 'lobby'),
    T(7, 'EARN', '累積獲得 80,000 金幣', 80000, 6000)
  ];

  /* 初始進度：「日-序號」: [進度, 已領取] */
  var INIT = {
    '1-0': [1, true], '1-1': [5, true], '1-2': [1, true],
    '2-0': [1, true], '2-1': [10, true], '2-2': [0, false],
    '3-0': [1, false], '3-1': [7, false], '3-2': [1, false]
  };

  var NOTES = {
    W1: {
      title: 'W1　大廳入口',
      items: [
        [1, '入口顯示剩餘天數；最後一天改為「即將結束」', '§6.5、AC10'],
        [2, '有任何可領取的任務就顯示紅點，全部領完才消失', '§6.5、AC9'],
        [0, '對照組（10%）的玩家看不到這個入口', '§2、AC2'],
        [0, '第一次啟動時，任務頁排入既有的登入彈窗系統，依彈窗系統的順序自動開啟一次', '§6.5']
      ]
    },
    W2: {
      title: 'W2　任務頁',
      items: [
        [1, '已解鎖的天都能點回去，漏掉的任務可以補完成', '§6.1、AC4'],
        [2, '全勤進度以「已完成」計算，不論是否已領取', '§6.2'],
        [3, '「前往」只能跳到固定清單裡的目的地；未開放時提示條件、不跳轉', '§6.3、AC8'],
        [4, '由玩家手動領取；伺服器防止重複發放', '§6.4、AC5'],
        [5, '剩餘天數以伺服器時間計算，修改裝置時間無效', '§5、AC11']
      ]
    },
    W3: {
      title: 'W3　未解鎖的 Day',
      items: [
        [1, 'Day k 在當天伺服器時間 00:00 解鎖', '§6.1、AC3'],
        [2, '先預覽獎勵，讓玩家知道之後回來能拿到什麼', 'US1']
      ]
    },
    W4: {
      title: 'W4　領取反饋',
      items: [
        [1, '獎勵立即入帳，並顯示獲得反饋', '§6.4'],
        [2, '關閉後任務變成「已領取」，入口紅點同步更新', '§6.5、AC9']
      ]
    }
  };

  var LOCK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var LOCK_BIG = LOCK.replace('width="11" height="11"', 'width="36" height="36"').replace('stroke-width="2.2"', 'stroke-width="1.6"');

  var S;

  function reset(today) {
    var seq = {};
    S = {
      today: today,
      day: today,
      screen: 'lobby',
      coins: 12000,
      modal: null,
      tasks: BASE.map(function (b, i) {
        seq[b.day] = seq[b.day] || 0;
        var init = INIT[b.day + '-' + seq[b.day]++] || [0, false];
        return {
          id: i, day: b.day, type: b.type, title: b.title, target: b.target,
          reward: b.reward, dest: b.dest, progress: init[0], claimed: init[1]
        };
      })
    };
  }

  /* ---------- 規則 ---------- */
  function fmt(n) { return n.toLocaleString('en-US'); }
  function unlocked(t) { return t.day <= S.today; }
  /* LOGIN：解鎖後任一次登入即完成（§6.2）；玩家正在線上，所以已解鎖的 LOGIN 都算完成 */
  function isDone(t) { return unlocked(t) && (t.type === 'LOGIN' || t.progress >= t.target); }
  function status(t) {
    if (!unlocked(t)) return 'locked';
    if (t.claimed) return 'claimed';
    if (isDone(t)) return 'claimable';
    return 'progress';
  }
  function ofDay(d) { return S.tasks.filter(function (t) { return t.day === d; }); }
  function anyClaimable() { return S.tasks.some(function (t) { return status(t) === 'claimable'; }); }
  function doneCount() { return S.tasks.filter(isDone).length; }
  function remain() { return DAYS - S.today + 1; }
  function remainLabel() { return remain() === 1 ? '即將結束' : '剩 ' + remain() + ' 天'; }
  function shown(t) { return t.type === 'LOGIN' ? (isDone(t) ? 1 : 0) : Math.min(t.progress, t.target); }
  function progText(t) { return fmt(shown(t)) + ' / ' + fmt(t.target); }
  function pct(t) { return Math.round(shown(t) / t.target * 100); }
  function mk(n, pos) { return '<span class="mk" aria-hidden="true" style="' + pos + '">' + n + '</span>'; }
  function none() { return ''; }

  function countdown(day) {
    var now = new Date();
    var next = new Date(now);
    next.setHours(24, 0, 0, 0);
    var s = Math.max(0, Math.floor((next - now + (day - S.today - 1) * 86400000) / 1000));
    var d = Math.floor(s / 86400);
    s %= 86400;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return (d ? d + ' 天 ' : '') + p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
  }

  /* ---------- 畫面 ---------- */
  function lobby() {
    var claim = anyClaimable();
    var games = '';
    for (var i = 0; i < 6; i++) games += '<div class="wf-game">遊戲</div>';
    return '' +
      '<div class="wf-top"><div class="wf-avatar"></div><span>玩家</span><span class="wf-coins">金幣 ' + fmt(S.coins) + '</span></div>' +
      '<div class="wf-banner">活動 Banner</div>' +
      '<div class="wf-events">' +
        '<div class="wf-event"><span class="ic">優惠</span><span class="lbl">限時優惠</span></div>' +
        '<button type="button" class="wf-event target" data-act="open" aria-label="開啟七日任務">' +
          '<span class="ic">七日<br>任務</span>' +
          (claim ? '<span class="wf-dot"></span>' + mk(2, 'top:-16px;right:-22px') : '') +
          '<span class="lbl' + (remain() === 1 ? ' ending' : '') + '">' + remainLabel() + '</span>' +
          mk(1, 'bottom:-4px;left:-12px') +
        '</button>' +
        '<div class="wf-event"><span class="ic">轉盤</span><span class="lbl">每日轉盤</span></div>' +
      '</div>' +
      '<div class="wf-grid">' + games + '</div>' +
      '<div class="wf-nav"><span>大廳</span><span>商城</span><span>好友</span><span>信箱</span></div>';
  }

  function quests() {
    var sel = S.day;
    var lockedDay = sel > S.today;
    var m = (lockedDay || S.modal !== null) ? none : mk;   /* W3、W4 只顯示自己的編號 */

    var tabs = '';
    for (var d = 1; d <= DAYS; d++) {
      var ts = ofDay(d), cls = 'wf-tab', inner = 'D' + d, dot = '';
      if (d > S.today) { cls += ' locked'; inner += LOCK; }
      else if (ts.every(function (t) { return t.claimed; })) { cls += ' done'; inner += ' ✓'; }
      else if (ts.some(function (t) { return status(t) === 'claimable'; })) { dot = '<span class="d"></span>'; }
      if (d === sel) cls += ' sel';
      tabs += '<button type="button" class="' + cls + '" data-act="day" data-day="' + d + '" aria-pressed="' + (d === sel) + '">' + inner + dot + '</button>';
    }

    var done = doneCount(), total = S.tasks.length;
    var html = '' +
      '<div class="wf-header">' +
        '<button type="button" class="wf-back" data-act="back" aria-label="返回大廳">‹</button>' +
        '<span class="wf-title">七日任務</span>' +
        '<span class="wf-remain' + (remain() === 1 ? ' ending' : '') + '">' + remainLabel() + m(5, 'top:-1px;left:-24px') + '</span>' +
      '</div>' +
      '<div class="wf-tabs-wrap"><div class="wf-tabs">' + tabs + '</div>' + m(1, 'top:0;left:2px') + '</div>' +
      '<div class="wf-body">' +
        '<div class="wf-full">' + m(2, 'top:-8px;left:-8px') +
          '<div class="wf-full-top"><strong>全勤獎</strong><span>' + done + ' / ' + total + '</span></div>' +
          '<div class="wf-bar"><i style="width:' + (done / total * 100) + '%"></i></div>' +
          '<div class="wf-full-reward">完成全部任務可領：金幣 ' + fmt(FULL_REWARD) + '</div>' +
        '</div>';

    if (lockedDay) {
      html += '<div class="wf-locked">' + mk(1, 'top:6px;left:6px') +
        '<div class="wf-lock">' + LOCK_BIG + '</div>' +
        '<div>Day ' + sel + ' 於伺服器時間 00:00 解鎖</div>' +
        '<div class="wf-count" id="wf-count">' + countdown(sel) + '</div>' +
      '</div>';
      ofDay(sel).forEach(function (t, i) {
        html += '<div class="wf-row preview">' + (i === 0 ? mk(2, 'top:-8px;left:-8px') : '') +
          '<div class="wf-row-main"><div class="wf-row-title">' + t.title + '</div>' +
          '<div class="wf-row-sub"><span>獎勵：金幣 ' + fmt(t.reward) + '</span></div></div>' +
          '<span class="wf-claimed">未解鎖</span></div>';
      });
    } else {
      var goMarked = false, claimMarked = false;
      ofDay(sel).forEach(function (t) {
        var st = status(t), act = '';
        if (st === 'claimable') {
          act = '<button type="button" class="wf-btn solid" data-act="claim" data-id="' + t.id + '">領取' + (claimMarked ? '' : m(4, 'top:-10px;right:-10px')) + '</button>';
          claimMarked = true;
        } else if (st === 'claimed') {
          act = '<span class="wf-claimed">已領取</span>';
        } else if (t.dest) {
          var dd = DEST[t.dest];
          act = '<button type="button" class="wf-btn ghost' + (dd.open ? '' : ' off') + '" data-act="go" data-id="' + t.id + '">前往' + (goMarked ? '' : m(3, 'top:-10px;right:-10px')) + '</button>';
          goMarked = true;
        }
        html += '<div class="wf-row' + (st === 'claimed' ? ' claimed' : '') + '">' +
          '<div class="wf-row-main"><div class="wf-row-title">' + t.title + '</div>' +
          '<div class="wf-row-sub"><span>獎勵：金幣 ' + fmt(t.reward) + '</span><span>' + progText(t) + '</span></div>' +
          (t.target > 1 ? '<div class="wf-mini"><i style="width:' + pct(t) + '%"></i></div>' : '') +
          '</div>' + act + '</div>';
      });
    }
    return html + '</div>';
  }

  function modal() {
    if (S.modal === null) return '';
    return '<div class="wf-modal-back"><div class="wf-modal" role="dialog" aria-label="獲得獎勵">' +
      '<div class="wf-modal-title">獲得獎勵</div>' +
      '<div class="wf-reward-icon">金幣</div>' +
      '<div class="wf-reward-amt">+' + fmt(S.modal) + mk(1, 'top:-6px;right:-24px') + '</div>' +
      '<button type="button" class="wf-btn solid wide" data-act="close">確定' + mk(2, 'top:-10px;right:-10px') + '</button>' +
      '</div></div>';
  }

  function screenKey() {
    if (S.modal !== null) return 'W4';
    if (S.screen === 'lobby') return 'W1';
    return S.day > S.today ? 'W3' : 'W2';
  }

  function renderNotes() {
    var n = NOTES[screenKey()];
    notesEl.innerHTML = '<h4>' + n.title + '</h4><ol>' + n.items.map(function (it) {
      return '<li><span class="n' + (it[0] ? '' : ' dot') + '">' + (it[0] || '') + '</span>' +
        '<span>' + it[1] + '　<span class="ref">' + it[2] + '</span></span></li>';
    }).join('') + '</ol>';
  }

  /* ---------- 畫面骨架 ---------- */
  screenEl.innerHTML = '<div class="wf-view" id="wf-view"></div><div class="wf-toast" id="wf-toast" role="status"></div>';
  var viewEl = document.getElementById('wf-view');
  var toastEl = document.getElementById('wf-toast');
  var todayBtns = root.querySelectorAll('[data-today]');
  var toastTimer;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  function render() {
    viewEl.innerHTML = (S.screen === 'lobby' ? lobby() : quests()) + modal();
    var tabsEl = viewEl.querySelector('.wf-tabs');
    var selTab = viewEl.querySelector('.wf-tab.sel');
    if (tabsEl && selTab) tabsEl.scrollLeft = selTab.offsetLeft - tabsEl.clientWidth / 2 + selTab.clientWidth / 2;
    renderNotes();
    todayBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-today')) === S.today));
    });
  }

  /* ---------- 互動 ---------- */
  viewEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    var t = b.hasAttribute('data-id') ? S.tasks[Number(b.getAttribute('data-id'))] : null;

    if (act === 'open') { S.screen = 'quests'; S.day = S.today; }
    else if (act === 'back') { S.screen = 'lobby'; }
    else if (act === 'day') { S.day = Number(b.getAttribute('data-day')); }
    else if (act === 'claim') {
      if (status(t) === 'claimable') { t.claimed = true; S.coins += t.reward; S.modal = t.reward; }
    }
    else if (act === 'close') { S.modal = null; }
    else if (act === 'go') {
      var d = DEST[t.dest];
      if (!d.open) { toast(d.name + '：' + d.cond + '，暫時無法前往'); return; }
      if (t.type === 'VISIT') { t.progress = t.target; toast('（原型）已開啟' + d.name + '頁面，任務完成'); }
      else if (t.dest === 'lobby') { S.screen = 'lobby'; toast('回到大廳，選一款遊戲開始玩'); }
      else { toast('（原型）前往' + d.name); }
    }
    render();
  });

  document.getElementById('proto-play').addEventListener('click', function () {
    var first = null;
    S.tasks.forEach(function (t) {
      if (t.type === 'PLAY' && t.dest !== 'game' && unlocked(t) && !t.claimed && t.progress < t.target) {
        t.progress++;
        if (!first) first = t;
      }
    });
    toast(first ? '玩了一局：Day ' + first.day + '「' + first.title + '」' + progText(first) : '目前沒有可以推進的遊玩任務');
    render();
  });

  document.getElementById('proto-reset').addEventListener('click', function () {
    reset(S.today);
    render();
    toast('原型已重置');
  });

  todayBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      reset(Number(b.getAttribute('data-today')));
      render();
      toast('情境：今天是 Day ' + S.today);
    });
  });

  document.getElementById('proto-notes-toggle').addEventListener('change', function (e) {
    root.classList.toggle('no-notes', !e.target.checked);
  });

  setInterval(function () {
    var el = document.getElementById('wf-count');
    if (el) el.textContent = countdown(S.day);
  }, 1000);

  reset(3);
  render();
})();
