// 2026 함께하는 장날 초대장: 사운드 효과 모듈
// 지금은 Web Audio 임시 톤. 콘셉트 확정 후 SOUNDS만 실제 음원으로 교체한다.
// (브라우저 정책상 소리는 사용자 첫 조작 이후에만 재생된다.)
(function () {
  "use strict";

  var KEY = "jangnal2026_sound";
  var ctx = null;
  var enabled;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) { enabled = true; }

  function audioCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // 짧은 톤 하나. 볼륨을 낮게 유지해 스크린 리더 음성과 겹쳐도 방해하지 않게 한다.
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

  var SOUNDS = {
    // 초대장 열기: 두 음 상행 차임
    open: function (c) { tone(c, 659.25, 0, 0.35); tone(c, 880, 0.12, 0.45); },
    // 장 넘김: 짧은 틱
    page: function (c) { tone(c, 523.25, 0, 0.12, "triangle", 0.07); },
    // 응답 완료: 세 음 팡파르
    success: function (c) { tone(c, 523.25, 0, 0.3); tone(c, 659.25, 0.11, 0.3); tone(c, 783.99, 0.22, 0.5); },
  };

  window.JangnalSound = {
    isEnabled: function () { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* 무시 */ }
    },
    play: function (name) {
      if (!enabled || !SOUNDS[name]) return;
      var c = audioCtx();
      if (!c) return;
      try { SOUNDS[name](c); } catch (e) { /* 무시 */ }
    },
  };
})();
