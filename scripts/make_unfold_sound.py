# 2026 함께하는 장날 초대장: '펼쳐지는' 효과음 합성 스크립트
# 종이 넘김(page)과 구분되는, 부드럽고 자연스럽게 펼쳐지는 느낌의 소리.
# 부드러운 노이즈 스웰(천/종이가 펴지는 결) + 끝에 아주 옅은 따뜻한 배음 블룸.
# 브라우저 내장 디코더로 바로 재생되도록 16bit PCM WAV(mono, 44.1kHz)로 저장한다.
import os, wave, struct
import numpy as np

SR = 44100
DUR = 0.62
n = int(SR * DUR)
t = np.linspace(0, DUR, n, endpoint=False)
rng = np.random.default_rng(70725)  # 재현 가능

# ---- 1) 부드러운 노이즈 스웰 (펼쳐지는 결) ----
noise = rng.standard_normal(n)
# 한 극점(one-pole) 저역통과로 '쉬익' 결을 부드럽게 다듬는다.
def lowpass(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = a * x[i] + (1 - a) * acc
        y[i] = acc
    return y
soft = lowpass(noise, 0.06)
soft = lowpass(soft, 0.06)  # 2차로 더 부드럽게
soft /= np.max(np.abs(soft)) + 1e-9

# 펼침 엔벌로프: 천천히 부풀었다가(어택) 자연스럽게 잦아든다(릴리즈).
attack = np.clip(t / 0.16, 0, 1) ** 1.4
release = np.clip((DUR - t) / 0.42, 0, 1) ** 1.1
env = attack * release
# 천이 펴질 때의 미세한 결(느린 진폭 흔들림)
texture = 1.0 + 0.22 * np.sin(2 * np.pi * 5.5 * t + 0.6) * np.clip(t / 0.2, 0, 1)
swish = soft * env * texture * 0.5

# ---- 2) 끝에 옅은 따뜻한 배음 블룸 (초대의 온기, 아주 은은하게) ----
bloom_env = np.clip((t - 0.18) / 0.24, 0, 1) * np.clip((DUR - t) / 0.34, 0, 1)
bloom = (
    np.sin(2 * np.pi * 392.0 * t) * 0.6 +   # G4
    np.sin(2 * np.pi * 587.33 * t) * 0.4    # D5 (완전5도, 따뜻함)
) * bloom_env * 0.12

sig = swish + bloom

# 아주 짧은 페이드로 클릭 제거
fade = int(SR * 0.008)
sig[:fade] *= np.linspace(0, 1, fade)
sig[-fade:] *= np.linspace(1, 0, fade)

# 소프트 노멀라이즈 (스크린 리더 음성과 겹쳐도 방해되지 않게 낮게)
sig /= np.max(np.abs(sig)) + 1e-9
sig *= 0.55  # 피크 약 -5dBFS, 재생 볼륨은 sound.js에서 추가로 낮춤

pcm = np.clip(sig * 32767, -32768, 32767).astype("<i2")

out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "sfx", "unfold.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("saved", out, os.path.getsize(out), "bytes", "peak", float(np.max(np.abs(sig))))
