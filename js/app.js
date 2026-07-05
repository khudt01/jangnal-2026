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

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // ---- 상단 소리 토글 (기본 꺼짐) ----
  var soundToggle = document.getElementById("sound-toggle");
  function syncSoundToggle() {
    var on = window.JangnalSound.isEnabled();
    soundToggle.textContent = on ? "소리 켜짐" : "소리 꺼짐";
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
  soundToggle.addEventListener("click", function () {
    var next = !window.JangnalSound.isEnabled();
    window.JangnalSound.setEnabled(next);
    syncSoundToggle();
    if (next) window.JangnalSound.play("unfold"); // 켤 때 펼침 소리로 미리듣기
  });
  syncSoundToggle();

  // ---- 접이식(모시는 글·세부 일정): 눌러서 아래로 부드럽게 펼침 ----
  // JS가 없으면 <details>가 그대로 동작해 내용을 펼쳐 볼 수 있다(점진적 향상).
  // JS는 여기에 높이 전환 애니메이션과 '펼침' 소리를 더한다.
  var FOLD_MS = 460;

  function setupFold(details) {
    var summary = details.querySelector("summary");
    var body = details.querySelector(".fold-body");
    if (!summary || !body) return;
    var animating = false;

    details.open = false; // JS 사용 가능: 기본은 접힌 상태로 시작

    summary.addEventListener("click", function (e) {
      e.preventDefault(); // 기본 즉시 토글을 막고 애니메이션으로 대체
      if (animating) return;
      if (details.open) collapse();
      else expand();
    });

    function animate(from, to, after) {
      animating = true;
      body.style.overflow = "hidden";
      body.style.height = from + "px";
      void body.offsetHeight; // 리플로우 강제로 시작 높이 확정
      body.style.transition = "height " + FOLD_MS + "ms cubic-bezier(0.22,0.61,0.36,1)";
      body.style.height = to + "px";
      var done = false;
      function end(e) {
        if (e && e.target !== body) return;
        if (done) return;
        done = true;
        body.removeEventListener("transitionend", end);
        body.style.height = "";
        body.style.overflow = "";
        body.style.transition = "";
        animating = false;
        if (after) after();
      }
      body.addEventListener("transitionend", end);
      setTimeout(end, FOLD_MS + 80); // transitionend 누락 대비 폴백
    }

    function expand() {
      window.JangnalSound.play("unfold");
      details.open = true; // 내용 노출(접근성 트리에 반영)
      if (reduceMotion()) return;
      animate(0, body.scrollHeight);
    }

    function collapse() {
      window.JangnalSound.play("fold");
      if (reduceMotion()) { details.open = false; return; }
      animate(body.scrollHeight, 0, function () { details.open = false; });
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-fold]"), setupFold);

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

  // 라디오 그룹·단일 체크박스: 오류 문구를 aria-describedby로 연결
  // (이름·연락처의 markInvalid와 동일하게, 포커스가 컨트롤에 닿으면 오류가 낭독되도록)
  function markDescribedInvalid(inputs, invalid, errId) {
    Array.prototype.forEach.call(inputs, function (input) {
      var desc = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      var idx = desc.indexOf("err-" + errId);
      if (invalid && idx === -1) desc.push("err-" + errId);
      if (!invalid && idx !== -1) desc.splice(idx, 1);
      if (desc.length) input.setAttribute("aria-describedby", desc.join(" "));
      else input.removeAttribute("aria-describedby");
    });
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
    markDescribedInvalid(form.querySelectorAll('input[name="attendance"]'), attendanceInvalid, "attendance");
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
    markDescribedInvalid(form.querySelectorAll('input[name="category"]'), categoryInvalid, "category");
    if (categoryInvalid) {
      firstInvalid = firstInvalid || form.querySelector('input[name="category"]');
      count++;
    }

    var privacy = document.getElementById("privacy");
    var privacyInvalid = !privacy.checked;
    showError("privacy", privacyInvalid);
    markDescribedInvalid([privacy], privacyInvalid, "privacy");
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
