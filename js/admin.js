// 2026 함께하는 장날: 관리자 현황 페이지
(function () {
  "use strict";

  var cfg = window.JANGNAL_CONFIG;
  var tokenInput = document.getElementById("token");
  var statusEl = document.getElementById("status");
  var resultEl = document.getElementById("result");
  var statsEl = document.getElementById("stats");
  var tbody = document.querySelector("#table tbody");
  var TOKEN_KEY = "jangnal2026_admin_token";
  var lastRows = [];

  tokenInput.value = localStorage.getItem(TOKEN_KEY) || "";

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function fmtPhone(p) {
    if (/^01[0-9]{9}$/.test(p)) return p.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
    if (/^01[0-9]{8}$/.test(p)) return p.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
    if (/^02\d{7,8}$/.test(p)) return p.replace(/^(02)(\d{3,4})(\d{4})$/, "$1-$2-$3");
    if (/^\d{10}$/.test(p)) return p.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
    return p;
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
  }

  function accText(r) {
    var items = (r.accommodations || []).filter(function (a) { return a !== "기타"; });
    if (r.accommodation_note) {
      items.push("기타: " + r.accommodation_note);
    } else if ((r.accommodations || []).indexOf("기타") !== -1) {
      items.push("기타");
    }
    return items.join(", ");
  }

  function render(data) {
    var s = data.stats;
    statsEl.innerHTML = "";
    var lines = [
      "전체 응답 " + s.total + "건",
      "참석 " + s.attending + "명, 동반 포함 " + s.attendingWithCompanions + "명",
      "불참 " + s.declined + "명",
    ];
    Object.keys(s.byCategory).forEach(function (k) {
      lines.push("참석 구분별, " + k + " " + s.byCategory[k] + "명");
    });
    Object.keys(s.byAccommodation).forEach(function (k) {
      lines.push("편의제공, " + k + " " + s.byAccommodation[k] + "명");
    });
    lines.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      statsEl.appendChild(li);
    });

    tbody.innerHTML = "";
    data.rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [
        fmtTime(r.created_at),
        r.attendance,
        r.name,
        fmtPhone(r.phone),
        r.category,
        r.companions > 0 ? r.companions + "명" : "",
        accText(r),
        r.note || "",
      ].forEach(function (v, i) {
        var td = document.createElement("td");
        if (i >= 6) td.className = "wrap";
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function load() {
    var token = tokenInput.value.trim();
    if (!token) {
      setStatus("열람 암호를 입력해 주세요.", "error");
      tokenInput.focus();
      return;
    }
    setStatus("불러오는 중입니다...", "");
    fetch(cfg.FUNCTIONS_URL + "/admin-data", {
      headers: {
        Authorization: "Bearer " + cfg.ANON_KEY,
        "x-admin-token": token,
      },
    })
      .then(function (res) {
        if (res.status === 401) throw new Error("unauthorized");
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) throw new Error("failed");
        localStorage.setItem(TOKEN_KEY, token);
        lastRows = data.rows;
        render(data);
        resultEl.hidden = false;
        setStatus("불러왔습니다. 전체 " + data.stats.total + "건, 참석 " + data.stats.attending + "명.", "success");
      })
      .catch(function (e) {
        resultEl.hidden = true;
        setStatus(
          e.message === "unauthorized"
            ? "열람 암호가 올바르지 않습니다."
            : "불러오기에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          "error"
        );
      });
  }

  document.getElementById("load-btn").addEventListener("click", load);
  document.getElementById("refresh-btn").addEventListener("click", load);
  tokenInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") load();
  });

  // CSV 내려받기 (클라이언트 생성, UTF-8 BOM)
  document.getElementById("csv-btn").addEventListener("click", function () {
    if (!lastRows.length) {
      setStatus("먼저 현황을 불러와 주세요.", "error");
      return;
    }
    var header = [
      "제출시각", "수정시각", "참석여부", "이름", "연락처",
      "구분(자기선택)", "동반인원", "편의제공", "편의제공 기타", "남기실 말씀",
    ];
    function esc(v) {
      v = v == null ? "" : String(v);
      if (/[",\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }
    var lines = [header.join(",")];
    lastRows.forEach(function (r) {
      lines.push([
        fmtTime(r.created_at),
        fmtTime(r.updated_at),
        r.attendance,
        r.name,
        fmtPhone(r.phone),
        r.category,
        r.companions,
        (r.accommodations || []).join("; "),
        r.accommodation_note || "",
        r.note || "",
      ].map(esc).join(","));
    });
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    var now = new Date();
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    a.href = URL.createObjectURL(blob);
    a.download =
      "참석현황_" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) +
      "_" + pad(now.getHours()) + pad(now.getMinutes()) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    setStatus("CSV 파일을 내려받았습니다.", "success");
  });

  if (tokenInput.value) load();
})();
