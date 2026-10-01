// SKR Burner site — live stats straight from the chain and the app's public database.
// No build step, no keys: every node read here is world-readable and the app itself reads the same ones.
(function () {
  "use strict";
  var DB = "https://skr-burner-default-rtdb.europe-west1.firebasedatabase.app";
  var RPC = "https://solana-rpc.publicnode.com"; // api.mainnet-beta answers 403 to browsers
  var SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
  var WSOL = "So11111111111111111111111111111111111111112";
  var MONTHLY_WALLET = "J7j5utL56FaaGgT1bnHRJUmSmpmptcnMJ6iQvG4QX2Lb";
  var MONTHLY_RESERVE = 0.1, MONTHLY_CAP = 5;
  var AIRDROP_SKR = 121168;

  var price = { skr: 0, sol: 0 };
  var $ = function (id) { return document.getElementById(id); };

  function get(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 12000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).finally(function () { clearTimeout(t); });
  }
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  /* ---------- formatting ---------- */
  function fmtK(n) {
    if (!(n > 0)) return "0";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(1) + "k";
    return Math.round(n).toLocaleString("en-US");
  }
  function fmtSol(n, d) { return (n || 0).toFixed(d == null ? 3 : d) + " SOL"; }
  function fmtUsd(n) {
    if (!(n > 0)) return "";
    return "$" + (n >= 1000 ? Math.round(n).toLocaleString("en-US") : n.toFixed(2));
  }
  function mask(w) { return w && w.length > 10 ? w.slice(0, 4) + "***" + w.slice(-4) : (w || "?"); }
  function ago(ts) {
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return Math.floor(s) + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }
  function setText(id, txt) { var el = $(id); if (el && el.textContent !== txt) el.textContent = txt; }

  // Count-up on first paint only; later refreshes just swap the text.
  // A newer target cancels the running animation: otherwise the first count-up (started with partial
  // data) keeps writing its own target and overwrites the fresh total when it finishes.
  var painted = {}, runs = {};
  function countUp(id, target, render) {
    var el = $(id); if (!el) return;
    var run = runs[id] = (runs[id] || 0) + 1;
    if (painted[id] || !(target > 0)) { painted[id] = true; el.textContent = render(target); return; }
    painted[id] = true;
    var t0 = performance.now(), dur = 1400;
    (function step(now) {
      if (runs[id] !== run) return;
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = render(target * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- price ---------- */
  function loadPrice() {
    return get("https://lite-api.jup.ag/price/v3?ids=" + SKR_MINT + "," + WSOL, 8000).then(function (j) {
      var s = j && j[SKR_MINT] && +j[SKR_MINT].usdPrice, o = j && j[WSOL] && +j[WSOL].usdPrice;
      if (s > 0) price.skr = s; if (o > 0) price.sol = o;
    }).catch(function () {
      return get("https://api.coingecko.com/api/v3/simple/price?ids=solana,seeker&vs_currencies=usd", 8000).then(function (j) {
        if (j.solana && j.solana.usd > 0) price.sol = j.solana.usd;
        if (j.seeker && j.seeker.usd > 0) price.skr = j.seeker.usd;
      }).catch(function () {});
    }).then(function () {
      if (price.skr > 0) setText("p-skr", "$" + price.skr.toFixed(4));
      if (price.sol > 0) setText("p-sol", "$" + price.sol.toFixed(2));
      renderBurnValue();
    });
  }

  var totalBurned = 0;
  function renderBurnValue() {
    if (totalBurned > 0 && price.skr > 0) {
      countUp("s-usd", totalBurned * price.skr, function (v) { return "$" + Math.round(v).toLocaleString("en-US"); });
      setText("live-usd-note", "at $" + price.skr.toFixed(4) + " per SKR, live");
    }
    if (price.skr > 0) setText("pool-air-usd", fmtUsd(AIRDROP_SKR * price.skr));
  }
  function usdSol(n) { return price.sol > 0 ? fmtUsd(n * price.sol) : ""; }

  /* ---------- stats + pools ---------- */
  var paid = { vault: 0, magma: 0, weekly: 0, flag: 0, weeklyWinners: 0, flagWinners: 0 };
  function renderPaid() {
    var tot = paid.vault + paid.magma + paid.weekly + paid.flag;
    countUp("s-paid", tot, function (v) { return v.toFixed(1) + " SOL"; });
    setText("s-paid-sub", "to players" + (usdSol(tot) ? " · " + usdSol(tot) : ""));
    setText("paid-vault", fmtSol(paid.vault, 2)); setText("paid-magma", fmtSol(paid.magma, 2));
    setText("paid-weekly", fmtSol(paid.weekly, 2)); setText("paid-flag", fmtSol(paid.flag, 2));
    setText("paid-winners", (paid.weeklyWinners + paid.flagWinners).toLocaleString("en-US"));
  }

  function loadStats() {
    return get(DB + "/stats.json").then(function (s) {
      totalBurned = +s.totalBurned || 0;
      countUp("s-burned", totalBurned, function (v) { return fmtK(v) + " SKR"; });
      renderBurnValue();
      paid.vault = +s.vaultPaidOut || 0; paid.magma = +s.magmaVaultPaidOut || 0; renderPaid();
      var fv = +s.stoneChestPool || 0, mg = +s.magmaVaultPool || 0, sc = +s.skrChestPool || 0, wk = +s.giveawayPool || 0, cf = +s.ctfPool || 0;
      setText("pool-fv", fmtSol(fv, 3)); setText("pool-fv-usd", usdSol(fv));
      setText("pool-mg", fmtSol(mg, 3)); setText("pool-mg-usd", usdSol(mg));
      setText("pool-sc", fmtK(sc) + " SKR"); setText("pool-sc-usd", price.skr > 0 ? fmtUsd(sc * price.skr) : "");
      setText("pool-wk", fmtSol(Math.max(0, wk - 0.1), 3)); setText("pool-wk-usd", usdSol(Math.max(0, wk - 0.1)));
      setText("pool-cf", fmtSol(Math.max(0, cf - 0.05), 3)); setText("pool-cf-usd", usdSol(Math.max(0, cf - 0.05)));
      setText("pool-fv-prize", "win 40% = " + fmtSol(fv * 0.4, 3));
      setText("pool-mg-prize", "win 40% = " + fmtSol(Math.max(mg * 0.4, Math.min(0.5, mg)), 3));
      setText("pool-sc-prize", "win 40% = " + fmtK(sc * 0.4) + " SKR");
    });
  }

  function loadPaidHistory() {
    return Promise.all([
      get(DB + "/giveaway/weekResults.json").catch(function () { return null; }),
      get(DB + "/ctf/weekResults.json").catch(function () { return null; }),
      get(DB + "/nftStats.json").catch(function () { return null; })
    ]).then(function (r) {
      var gw = r[0] || {}, cw = r[1] || {}, nft = r[2] || {};
      var sum = 0, n = 0;
      Object.keys(gw).forEach(function (k) {
        var ws = gw[k] && gw[k].winners; if (!Array.isArray(ws)) return;
        ws.forEach(function (w) { if (w && w.prize > 0) { sum += w.prize; n++; } });
      });
      paid.weekly = sum; paid.weeklyWinners = n;
      var fs = 0, fn = 0;
      Object.keys(cw).forEach(function (k) { var p = cw[k] && +cw[k].prize; if (p > 0) { fs += p; fn++; } });
      paid.flag = fs; paid.flagWinners = fn;
      renderPaid();
      var nfts = 0; Object.keys(nft).forEach(function (t) { nfts += (nft[t] && +nft[t].count) || 0; });
      countUp("s-nft", nfts, function (v) { return Math.round(v).toLocaleString("en-US"); });
      var tiers = ["low", "medium", "onfire", "legend"], names = ["Low Flame", "Medium", "On Fire", "Legend"];
      setText("nft-tiers", tiers.map(function (t, i) { return names[i] + " " + ((nft[t] && nft[t].count) || 0); }).join(" · "));
    });
  }

  function loadMonthly() {
    return Promise.all([
      post(RPC, { jsonrpc: "2.0", id: 1, method: "getBalance", params: [MONTHLY_WALLET] }).catch(function () { return null; }),
      get(DB + "/burnLotteryConfig.json").catch(function () { return null; }),
      get(DB + "/burnLottery/draws/monthly.json").catch(function () { return null; })
    ]).then(function (r) {
      var bal = r[0] && r[0].result ? r[0].result.value / 1e9 : 0;
      var cfg = r[1] || {};
      var pct = cfg.monthlyPrizePct > 0 ? cfg.monthlyPrizePct : 1;
      // Prizes already drawn but not yet claimed (7-day window) sit in the same wallet: not in play.
      var pending = 0, draws = r[2] || {}, now = Date.now();
      Object.keys(draws).forEach(function (k) {
        var d = draws[k] || {}, ws = d.winners || {}, dl = +d.deadlineAt || 0;
        Object.keys(ws).forEach(function (w) { var x = ws[w] || {}; if (!(x.claimed || x.payoutSig) && dl > now) pending += (+x.shareLamports || 0) / 1e9; });
      });
      var prize = Math.min(Math.max(0, bal - pending - MONTHLY_RESERVE) * pct, MONTHLY_CAP);
      setText("pool-mo", fmtSol(prize, 3)); setText("pool-mo-usd", usdSol(prize));
      setText("pool-mo-sub", "in wallet " + fmtSol(bal, 2) + (pending > 0 ? " · " + fmtSol(pending, 2) + " waiting for last month's winners" : "") + " · 5 winners · cap 5 SOL");
      var now = new Date(), next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 10));
      setText("pool-mo-when", "draw in " + Math.max(0, Math.ceil((next - now) / 86400000)) + " days");
    });
  }

  function loadFlag() {
    return get(DB + "/ctf/current.json").then(function (c) {
      if (!c) return;
      setText("flag-holder", c.displayName || mask(c.holder));
      setText("flag-price", "next snipe " + fmtSol(+c.claimPrice || 0.05, 4));
      setText("flag-week", "week " + (c.week || "?") + " · " + (c.claimCount || 0) + " snipes" + (c.lastClaimAt ? " · last " + ago(c.lastClaimAt) + " ago" : ""));
    });
  }

  /* ---------- burn chart (last 30 days, from burnDays) ---------- */
  function loadChart() {
    return get(DB + "/burnDays.json", 20000).then(function (bd) {
      var days = {};
      Object.keys(bd || {}).forEach(function (w) {
        var d = bd[w] || {};
        Object.keys(d).forEach(function (day) {
          var v = d[day] || {};
          if (!days[day]) days[day] = { skr: 0, usd: 0, w: 0 };
          days[day].skr += +v.skr || 0; days[day].usd += +v.usd || 0; days[day].w += 1;
        });
      });
      var keys = [], today = new Date();
      for (var i = 29; i >= 0; i--) {
        var d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
        keys.push(d.toISOString().slice(0, 10));
      }
      var rows = keys.map(function (k) { return { k: k, skr: days[k] ? days[k].skr : 0, usd: days[k] ? days[k].usd : 0, w: days[k] ? days[k].w : 0 }; });
      var t = rows[rows.length - 1], last7 = rows.slice(-7), last30 = rows;
      var s7 = last7.reduce(function (a, r) { return a + r.skr; }, 0), s30 = last30.reduce(function (a, r) { return a + r.skr; }, 0);
      var u30 = last30.reduce(function (a, r) { return a + r.usd; }, 0);
      var burnersWeek = 0; Object.keys(bd || {}).forEach(function (w) { var d = bd[w]; if (last7.some(function (r) { return d && d[r.k]; })) burnersWeek++; });
      setText("c-today", fmtK(t.skr) + " SKR"); setText("c-today-sub", t.w + " burners today");
      setText("c-7", fmtK(s7) + " SKR"); setText("c-7-sub", burnersWeek + " burners this week");
      setText("c-30", fmtK(s30) + " SKR"); setText("c-30-sub", "≈ " + fmtUsd(u30) + " torched in 30 days");
      drawChart(rows);
    });
  }
  function drawChart(rows) {
    var svg = $("burnchart"); if (!svg) return;
    var W = 900, H = 260, padL = 44, padB = 28, padT = 14, padR = 10;
    var max = Math.max.apply(null, rows.map(function (r) { return r.skr; })) || 1;
    var wmax = Math.max.apply(null, rows.map(function (r) { return r.w; })) || 1;
    var n = rows.length, gw = (W - padL - padR) / n, bw = Math.max(4, gw * 0.62);
    var out = [];
    out.push('<defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb066"/><stop offset="1" stop-color="#ff6600"/></linearGradient></defs>');
    for (var g = 0; g <= 4; g++) {
      var y = padT + (H - padT - padB) * (1 - g / 4);
      out.push('<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,0.06)"/>');
      out.push('<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#6a687a">' + fmtK(max * g / 4) + '</text>');
    }
    var pts = [];
    rows.forEach(function (r, i) {
      var x = padL + i * gw + (gw - bw) / 2;
      var h = (H - padT - padB) * (r.skr / max);
      var y = H - padB - h;
      out.push('<rect class="cbar" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(0, h) + '" rx="3" fill="url(#bg1)"><title>' + r.k + ' · ' + Math.round(r.skr).toLocaleString("en-US") + ' SKR · ' + r.w + ' burners · ' + fmtUsd(r.usd) + '</title></rect>');
      pts.push((x + bw / 2).toFixed(1) + "," + (H - padB - (H - padT - padB) * (r.w / wmax) * 0.9).toFixed(1));
      if (i % 5 === 0 || i === n - 1) out.push('<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#6a687a">' + r.k.slice(5).replace("-", "/") + '</text>');
    });
    out.push('<polyline points="' + pts.join(" ") + '" fill="none" stroke="#f6f5fa" stroke-opacity="0.75" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>');
    svg.innerHTML = out.join("");
  }

  /* ---------- top burners ---------- */
  function loadTop() {
    return get(DB + '/burns.json?orderBy="totalBurned"&limitToLast=10').then(function (b) {
      var rows = Object.keys(b || {}).map(function (k) { return { k: k, v: b[k] || {} }; })
        .filter(function (r) { return r.v.totalBurned > 0; })
        .sort(function (a, c) { return c.v.totalBurned - a.v.totalBurned; });
      var ul = $("topburners"); if (!ul) return;
      var medals = ["🥇", "🥈", "🥉"];
      ul.innerHTML = rows.map(function (r, i) {
        var name = r.v.displayName || r.v.maskedWallet || mask(r.k);
        return '<li><span class="tb__rank">' + (medals[i] || "#" + (i + 1)) + '</span><span class="tb__name">' + esc(name) + '</span><span class="tb__val">' + fmtK(r.v.totalBurned) + ' SKR</span></li>';
      }).join("");
    });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- live feed (same wording as the app) ---------- */
  var SHOW = { burn: 1, mining_session: 1, ctf_steal: 1, ctf_hold_fp: 1, vault_open: 1, magma_vault_open: 1, skr_chest_win: 1, skr_chest_open: 1, coinflip_open: 1, coinflip_win: 1, lottery_win: 1, skr_drop: 1, vault_key: 1, skr_key: 1 };
  function line(ev) {
    var w = esc(ev.displayName || ev.maskedWallet || "someone");
    var n = function (x, d) { return (+x || 0).toFixed(d); };
    switch (ev.type) {
      case "burn": return { t: w + " burned " + fmtK(ev.amount) + " SKR" + (ev.nftTier ? " · minted an NFT" : ""), c: "fire" };
      case "mining_session": return { t: w + " mined " + (ev.burns || 0) + " burns · " + fmtK(ev.totalBurned) + " SKR", c: "fire" };
      case "ctf_steal": return { t: w + " stole the flag · " + n(ev.amount, 4) + " SOL", c: "gold" };
      case "ctf_hold_fp": return { t: w + " got robbed · cashed " + (ev.victimSol > 0 ? n(ev.victimSol, 4) + " SOL" : (ev.fp || 0).toLocaleString("en-US") + " FP"), c: "gold" };
      case "vault_open": return ev.outcome === "win" ? { t: w + " won " + n(ev.prizeSol, 3) + " SOL from the Fire Vault 🏆", c: "win" } : { t: w + " opened the Fire Vault · +" + (ev.fp || 0).toLocaleString("en-US") + " FP", c: "green" };
      case "magma_vault_open": return ev.outcome === "win" ? { t: w + " won " + n(ev.prizeSol, 3) + " SOL from the Magma Vault 🌋", c: "win" } : { t: w + " opened the Magma Vault · +" + (ev.fp || 0).toLocaleString("en-US") + " FP", c: "fire" };
      case "skr_chest_win": return { t: w + " won " + fmtK(ev.prizeSkr) + " SKR from the SKR Chest 🏆", c: "win" };
      case "skr_chest_open": return { t: w + " opened the SKR Chest · +" + (ev.fp || 0).toLocaleString("en-US") + " FP", c: "gold" };
      case "coinflip_open": return { t: w + " opened a " + n(ev.stakeSol, 2) + " SOL coin flip · " + (ev.side === "tails" ? "WATER" : "FIRE") + " 🪙", c: "ember" };
      case "coinflip_win": return { t: w + " won " + n(ev.prizeSol, 3) + " SOL flipping " + String(ev.side || "").toUpperCase() + " 🪙", c: "win" };
      case "lottery_win": return { t: w + " won " + n(ev.prizeSol, 3) + " SOL in the Monthly Draw 🎟️", c: "win" };
      case "skr_drop": return { t: w + (ev.first ? " claimed their first Daily Drop" : " claimed the Daily Drop") + " · +" + (ev.skr || 0) + " SKR", c: "gold" };
      case "vault_key": return { t: w + " found a Fire Key · opens the Fire Vault free", c: "green" };
      case "skr_key": return { t: w + " found an SKR Key · opens the SKR Chest free", c: "gold" };
    }
    return null;
  }
  function loadFeed() {
    return get(DB + '/activity.json?orderBy="$key"&limitToLast=120').then(function (a) {
      var evs = Object.keys(a || {}).map(function (k) { return a[k]; })
        .filter(function (e) { return e && SHOW[e.type]; })
        .sort(function (x, y) { return (y.timestamp || 0) - (x.timestamp || 0); }).slice(0, 14);
      var ul = $("livefeed"); if (!ul) return;
      ul.innerHTML = evs.map(function (e) {
        var l = line(e); if (!l) return "";
        return '<li class="feed__row feed__row--' + l.c + '"><span class="feed__ago">' + ago(e.timestamp || 0) + '</span><span class="feed__txt">' + l.t + '</span></li>';
      }).join("");
    });
  }

  /* ---------- boot + refresh ---------- */
  function safe(fn) { return function () { return fn().catch(function (e) { console.warn("[live]", e && e.message); }); }; }
  function tickFast() { return Promise.all([safe(loadStats)(), safe(loadFeed)(), safe(loadFlag)(), safe(loadMonthly)()]); }
  function tickSlow() { return Promise.all([safe(loadPaidHistory)(), safe(loadChart)(), safe(loadTop)()]); }

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("live")) return;
    safe(loadPrice)().then(function () { tickFast(); tickSlow(); });
    setInterval(safe(loadPrice), 30000);
    setInterval(tickFast, 45000);
    setInterval(tickSlow, 5 * 60000);
    var stamp = $("live-stamp");
    if (stamp) setInterval(function () { stamp.textContent = "updated " + new Date().toLocaleTimeString(); }, 1000);
  });
})();
