// 2026 함께하는 장날 초대장: 사운드 효과 모듈 (콘셉트 A 음원, 2026-07-04)
// 음원 출처:
//   unfold  자체 합성 "부드러운 펼침" (scripts/make_unfold_sound.py, 2026-07-04) — 접이식 펼침 전용
//   success 541982 "GASP_Chimes_Success_1" by Rob_Marion (Freesound CC0) — 응답 접수 완료
//   open/page  (구 장 넘김 방식 잔존 음원. 단일 페이지 개편 후 미사용, 폴백 매핑만 유지)
// 재생 실패(파일 누락·미지원) 시 Web Audio 임시 톤으로 폴백한다.
// 소리는 기본 '꺼짐'. 상단 토글로 켠 뒤에만, 그리고 사용자 첫 조작 이후에만 재생된다.
(function () {
  "use strict";

  var KEY = "jangnal2026_sound";
  var ctx = null;
  // 기본값은 '꺼짐'. 사용자가 명시적으로 켠 경우("on")에만 소리를 낸다.
  var enabled;
  try { enabled = localStorage.getItem(KEY) === "on"; } catch (e) { enabled = false; }

  // 볼륨은 낮게 유지해 스크린 리더 음성과 겹쳐도 방해하지 않게 한다.
  var FILES = {
    unfold: { src: "assets/sfx/unfold.wav", vol: 0.5 },
    open: { src: "assets/sfx/open.mp3", vol: 0.4 },
    page: { src: "assets/sfx/page.mp3", vol: 0.5 },
    success: { src: "assets/sfx/success.mp3", vol: 0.4 },
  };

  var players = {};
  function player(name) {
    if (!players[name]) {
      var a = new Audio(FILES[name].src);
      a.preload = "auto";
      a.volume = FILES[name].vol;
      players[name] = a;
    }
    return players[name];
  }
  // 첫 조작에서 바로 재생되도록 미리 버퍼링
  Object.keys(FILES).forEach(player);

  // ---- Web Audio 톤 폴백 ----
  function audioCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(c, freq, start, dur, type, peak) {
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    var t0 = c.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.1, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  var TONES = {
    // 펼침: 낮게 부풀었다 잦아드는 완전5도 배음 (부드럽고 자연스럽게)
    unfold: function (c) { tone(c, 392.0, 0, 0.4, "sine", 0.06); tone(c, 587.33, 0.08, 0.44, "sine", 0.05); },
    open: function (c) { tone(c, 659.25, 0, 0.35); tone(c, 880, 0.12, 0.45); },
    page: function (c) { tone(c, 523.25, 0, 0.12, "triangle", 0.07); },
    success: function (c) { tone(c, 523.25, 0, 0.3); tone(c, 659.25, 0.11, 0.3); tone(c, 783.99, 0.22, 0.5); },
  };

  function fallback(name) {
    if (!TONES[name]) return;
    var c = audioCtx();
    if (!c) return;
    try { TONES[name](c); } catch (e) { /* 무시 */ }
  }

  window.JangnalSound = {
    isEnabled: function () { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* 무시 */ }
    },
    play: function (name) {
      if (!enabled || !FILES[name]) return;
      var a = player(name);
      try {
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { fallback(name); });
      } catch (e) {
        fallback(name);
      }
    },
  };
})();
