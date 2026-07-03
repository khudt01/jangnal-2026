// 2026 함께하는 장날 초대장: RSVP 폼 로직
(function () {
  "use strict";

  var cfg = window.JANGNAL_CONFIG;
  var form = document.getElementById("rsvp-form");
  var statusEl = document.getElementById("status");
  var doneEl = document.getElementById("done");
  var doneTitle = document.getElementById("done-title");
  var doneMsg = document.getElementById("done-msg");
  var submitBtn = document.getElementById("submit-btn");
  var attendOnly = document.getElementById("attend-only");
  var accEtc = document.getElementById("acc-etc");
  var accNoteWrap = document.getElementById("acc-note-wrap");
  var STORAGE_KEY = "jangnal2026_rsvp";
  var inFlight = false;

  // ---- 장 넘김 (한 장씩 보기, 콘셉트 확정 전 공통 프레임) ----
  // JS가 없으면 모든 장이 그대로 펼쳐져 보인다 (점진적 향상).
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  var openBtn = document.getElementById("open-btn");
  var soundToggle = document.getElementById("sound-toggle");

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function goStep(i, opts) {
    opts = opts || {};
    steps.forEach(function (s, j) { s.hidden = j !== i; });
    if (!opts.silent) window.JangnalSound.play(opts.sound || "page");
    if (!opts.noFocus) {
      var h = steps[i].querySelector("h1, h2");
      if (h) {
        h.setAttribute("tabindex", "-1");
        h.focus();
      }
      window.scrollTo(0, 0);
    }
  }

  // 표지 '초대장 열기': 종이 초대장이 젖혀지며 열리는 연출 후 첫 장으로.
  // 모션을 줄이는 사용자에겐 연출 없이 바로 넘어간다.
  function openInvitation() {
    var hero = steps[0];
    if (reduceMotion()) {
      goStep(1, { sound: "open" });
      return;
    }
    window.JangnalSound.play("open");
    hero.classList.add("cover-opening");
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      hero.classList.remove("cover-opening");
      goStep(1, { silent: true }); // 열림 소리는 이미 재생됨
    }
    hero.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 700); // animationend 누락 대비 폴백
  }

  function initSteps() {
    if (steps.length < 2) return;
    steps.forEach(function (s, i) {
      if (i === 0) return;
      var nav = document.createElement("div");
      nav.className = "step-nav";
      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "secondary";
      prev.textContent = i === 1 ? "표지로" : "이전 장";
      prev.addEventListener("click", function () { goStep(i - 1); });
      nav.appendChild(prev);
      if (i < steps.length - 1) {
        var next = document.createElement("button");
        next.type = "button";
        next.className = "step-next";
        next.textContent = "다음 장: " + steps[i + 1].getAttribute("data-step");
        next.addEventListener("click", function () { goStep(i + 1); });
        nav.appendChild(next);
      }
      s.appendChild(nav);
    });
    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openInvitation();
    });
    goStep(0, { silent: true, noFocus: true });
  }

  function syncSoundToggle() {
    soundToggle.textContent = window.JangnalSound.isEnabled() ? "소리 켜짐" : "소리 꺼짐";
  }
  soundToggle.hidden = false;
  soundToggle.addEventListener("click", function () {
    window.JangnalSound.setEnabled(!window.JangnalSound.isEnabled());
    syncSoundToggle();
    window.JangnalSound.play("page");
  });
  syncSoundToggle();
  initSteps();

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function radioValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function showError(id, show) {
    var el = document.getElementById("err-" + id);
    if (el) el.hidden = !show;
  }

  function markInvalid(input, invalid, errId) {
    if (!input) return;
    if (invalid) {
      input.setAttribute("aria-invalid", "true");
      if (errId) {
        var desc = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (desc.indexOf("err-" + errId) === -1) desc.push("err-" + errId);
        input.setAttribute("aria-describedby", desc.join(" "));
      }
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  // 불참 선택 시 참석 전용 항목 숨김
  function syncAttendance() {
    var v = radioValue("attendance");
    attendOnly.hidden = v === "불참";
  }
  Array.prototype.forEach.call(
    form.querySelectorAll('input[name="attendance"]'),
    function (r) { r.addEventListener("change", syncAttendance); }
  );

  // 편의제공 '기타' 선택 시 내용 입력란 표시
  accEtc.addEventListener("change", function () {
    accNoteWrap.hidden = !accEtc.checked;
    if (accEtc.checked) document.getElementById("accommodation_note").focus();
  });

  // 저장된 응답 프리필 (재방문 수정 편의)
  function prefill() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { saved = null; }
    if (!saved) return;
    if (saved.name) document.getElementById("name").value = saved.name;
    if (saved.phone) document.getElementById("phone").value = saved.phone;
    ["attendance", "category"].forEach(function (n) {
      if (!saved[n]) return;
      var el = form.querySelector('input[name="' + n + '"][value="' + saved[n] + '"]');
      if (el) el.checked = true;
    });
    if (saved.companions != null) document.getElementById("companions").value = String(saved.companions);
    (saved.accommodations || []).forEach(function (a) {
      var el = form.querySelector('input[name="accommodations"][value="' + a + '"]');
      if (el) el.checked = true;
    });
    if (saved.accommodation_note) {
      document.getElementById("accommodation_note").value = saved.accommodation_note;
    }
    if (saved.note) document.getElementById("note").value = saved.note;
    accNoteWrap.hidden = !accEtc.checked;
    syncAttendance();
  }
  prefill();

  function validate() {
    var firstInvalid = null;
    var count = 0;

    var attendance = radioValue("attendance");
    var attendanceInvalid = !attendance;
    showError("attendance", attendanceInvalid);
    if (attendanceInvalid) {
      firstInvalid = firstInvalid || form.querySelector('input[name="attendance"]');
      count++;
    }

    var nameInput = document.getElementById("name");
    var nameInvalid = nameInput.value.trim() === "";
    showError("name", nameInvalid);
    markInvalid(nameInput, nameInvalid, "name");
    if (nameInvalid) { firstInvalid = firstInvalid || nameInput; count++; }

    var phoneInput = document.getElementById("phone");
    var digits = phoneInput.value.replace(/\D/g, "");
    var phoneInvalid = !/^[0-9]{8,11}$/.test(digits);
    showError("phone", phoneInvalid);
    markInvalid(phoneInput, phoneInvalid, "phone");
    if (phoneInvalid) { firstInvalid = firstInvalid || phoneInput; count++; }

    var category = radioValue("category");
    var categoryInvalid = !category;
    showError("category", categoryInvalid);
    if (categoryInvalid) {
      firstInvalid = firstInvalid || form.querySelector('input[name="category"]');
      count++;
    }

    var privacy = document.getElementById("privacy");
    var privacyInvalid = !privacy.checked;
    showError("privacy", privacyInvalid);
    if (privacyInvalid) { firstInvalid = firstInvalid || privacy; count++; }

    return { ok: count === 0, firstInvalid: firstInvalid, count: count };
  }

  function payload() {
    var accommodations = Array.prototype.map.call(
      form.querySelectorAll('input[name="accommodations"]:checked'),
      function (el) { return el.value; }
    );
    return {
      website: document.getElementById("website").value,
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.replace(/\D/g, ""),
      attendance: radioValue("attendance"),
      category: radioValue("category"),
      companions: parseInt(document.getElementById("companions").value, 10) || 0,
      accommodations: accommodations,
      accommodation_note: document.getElementById("accommodation_note").value.trim(),
      note: document.getElementById("note").value.trim(),
      privacy_agreed: document.getElementById("privacy").checked,
    };
  }

  function showDone(updated, attendance) {
    window.JangnalSound.play("success");
    form.hidden = true;
    doneEl.hidden = false;
    doneTitle.textContent = updated ? "응답을 수정했습니다" : "응답이 접수되었습니다";
    doneMsg.textContent =
      attendance === "참석"
        ? "고맙습니다. 7월 25일 토요일에 뵙겠습니다. 응답을 바꾸시려면 아래 버튼을 눌러 다시 제출해 주세요."
        : "알려주셔서 고맙습니다. 마음은 함께 모시겠습니다. 응답을 바꾸시려면 아래 버튼을 눌러 다시 제출해 주세요.";
    doneTitle.setAttribute("tabindex", "-1");
    doneTitle.focus();
  }

  document.getElementById("edit-btn").addEventListener("click", function () {
    doneEl.hidden = true;
    form.hidden = false;
    setStatus("", "");
    document.getElementById("name").focus();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (inFlight) return;

    var v = validate();
    if (!v.ok) {
      setStatus("입력하지 않은 항목이 " + v.count + "개 있습니다. 확인해 주세요.", "error");
      if (v.firstInvalid) v.firstInvalid.focus();
      return;
    }

    inFlight = true;
    submitBtn.setAttribute("aria-disabled", "true");
    setStatus("보내는 중입니다...", "");

    var body = payload();
    fetch(cfg.FUNCTIONS_URL + "/submit-rsvp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + cfg.ANON_KEY,
      },
      body: JSON.stringify(body),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(body)); } catch (err) { /* 무시 */ }
          setStatus("", "");
          showDone(data.updated, body.attendance);
        } else {
          setStatus((data && data.error) || "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error");
        }
      })
      .catch(function () {
        setStatus("연결에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.", "error");
      })
      .finally(function () {
        inFlight = false;
        submitBtn.removeAttribute("aria-disabled");
      });
  });
})();
