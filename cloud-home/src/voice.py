"""Generates the two spoken lines with an offline Chinese TTS model.

Needs `pip install sherpa-onnx numpy` and the MeloTTS zh/en model from
https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2
Usage: python3 voice.py <model_dir> <out_dir>
The girl's line is rendered slowly and then resampled up ~3 semitones, which
raises both pitch and formants so it reads as a child's voice.
"""
import sys, wave
import numpy as np
import sherpa_onnx

d, out = sys.argv[1].rstrip('/') + '/', sys.argv[2]
cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=d + 'model.onnx', lexicon=d + 'lexicon.txt', tokens=d + 'tokens.txt', dict_dir=d + 'dict'),
        num_threads=4),
    rule_fsts=f'{d}date.fst,{d}phone.fst,{d}number.fst')
tts = sherpa_onnx.OfflineTts(cfg)


def write(path, x, sr):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def say(text, speed):
    a = tts.generate(text, sid=0, speed=speed)
    return np.array(a.samples, dtype=np.float64), a.sample_rate


# girl: slow, then play back 1.19x faster (+3 semitones)
x, sr = say('我送你回家。', 0.8)
k = 2 ** (3 / 12)
x = np.interp(np.arange(0, len(x) - 1, k), np.arange(len(x)), x)
write(f'{out}/girl.wav', x, sr)

x, sr = say('有时候，温柔就是陪你走一段路。', 0.84)
write(f'{out}/narr.wav', x, sr)
print('ok')
