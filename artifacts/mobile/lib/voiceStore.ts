type VoiceCb = (text: string) => void;
let _cb: VoiceCb | null = null;

export function setVoiceCallback(cb: VoiceCb) {
  _cb = cb;
}

export function callVoiceCallback(text: string) {
  if (_cb) {
    _cb(text);
    _cb = null;
  }
}

export function clearVoiceCallback() {
  _cb = null;
}
