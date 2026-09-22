/**
 * Module xử lý và chuẩn hóa âm thanh chuyên sâu cho đề tài Nghiên cứu Khoa học UIT:
 * - Chuẩn hóa về WAV PCM 16-bit (pcm_s16le)
 * - Tần số lấy mẫu: 16.000 Hz (16 kHz)
 * - Kênh âm thanh: Mono (1 kênh)
 * - Thuật toán Resampling (Downsampling) chống bẫy Sample Rate trên iPhone / Android
 * - Bộ thu âm WavRecorder tắt triệt để echoCancellation / noiseSuppression / autoGainControl
 */

/**
 * Thuật toán nội suy tuyến tính (Linear Interpolation) hạ tần số lấy mẫu về đúng 16.000 Hz
 */
export function downsampleTo16k(
  inputBuffer: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16000
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return inputBuffer
  }

  const sampleRatio = inputSampleRate / targetSampleRate
  const newLength = Math.round(inputBuffer.length / sampleRatio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const originIndex = i * sampleRatio
    const leftIndex = Math.floor(originIndex)
    const rightIndex = Math.min(leftIndex + 1, inputBuffer.length - 1)
    const weight = originIndex - leftIndex

    // Nội suy tuyến tính bảo toàn biên độ năng lượng
    result[i] = inputBuffer[leftIndex] * (1 - weight) + inputBuffer[rightIndex] * weight
  }

  return result
}

/**
 * Đóng gói mảng Float32 thành file WAV PCM 16-bit (pcm_s16le, RIFF container)
 */
export function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // Helper ghi chuỗi ASCII
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  /* RIFF identifier */
  writeString(0, "RIFF")
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true)
  /* RIFF type & format */
  writeString(8, "WAVE")
  /* format chunk identifier */
  writeString(12, "fmt ")
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format: 1 = PCM */
  view.setUint16(20, 1, true)
  /* channel count: 1 = Mono */
  view.setUint16(22, 1, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate = sampleRate * channels * bytesPerSample = 16000 * 1 * 2 = 32000 */
  view.setUint32(28, sampleRate * 2, true)
  /* block align = channels * bytesPerSample = 1 * 2 = 2 */
  view.setUint16(32, 2, true)
  /* bits per sample = 16 */
  view.setUint16(34, 16, true)
  /* data chunk identifier */
  writeString(36, "data")
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true)

  // Ghi mẫu âm thanh 16-bit signed PCM
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]))
    const int16Val = s < 0 ? s * 0x8000 : s * 0x7fff
    view.setInt16(offset, int16Val, true)
    offset += 2
  }

  return new Blob([view], { type: "audio/wav" })
}

/**
 * Trình thu âm trực tiếp xuất chuẩn WAV PCM 16-bit 16kHz Mono:
 * - Tắt hoàn toàn lọc ồn, lọc tiếng vọng và cân bằng âm lượng tự động
 * - Hỗ trợ bắt sóng âm lượng trực quan (live volume)
 * - Tự động resample về đúng 16.000 Hz bất kể sound card di động chạy 44.1kHz hay 48kHz
 */
export class WavRecorder {
  private audioCtx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private analyser: AnalyserNode | null = null
  private chunks: Float32Array[] = []
  private isPaused = false

  async start(): Promise<void> {
    // 1. Yêu cầu micro thu nguyên bản, cấm các bộ lọc can thiệp
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext
    this.audioCtx = new AudioContextClass()

    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 256

    // Buffer 4096 mẫu, 1 kênh Mono
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
    this.chunks = []
    this.isPaused = false

    this.processor.onaudioprocess = (e) => {
      if (this.isPaused) return
      const channelData = e.inputBuffer.getChannelData(0)
      this.chunks.push(new Float32Array(channelData))
    }

    this.source.connect(this.analyser)
    this.analyser.connect(this.processor)

    // Kết nối tới đích qua muteGain (gain = 0) để không bị dội âm thanh ra loa
    const muteGain = this.audioCtx.createGain()
    muteGain.gain.value = 0
    this.processor.connect(muteGain)
    muteGain.connect(this.audioCtx.destination)
  }

  pause() {
    this.isPaused = true
  }

  resume() {
    this.isPaused = false
  }

  getVolume(): number {
    if (!this.analyser) return 0
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return Math.min(100, Math.round((sum / dataArray.length / 255) * 100))
  }

  async stop(): Promise<File> {
    this.isPaused = true
    const inputSampleRate = this.audioCtx?.sampleRate || 44100

    this.source?.disconnect()
    this.processor?.disconnect()
    this.analyser?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      await this.audioCtx.close().catch(() => {})
    }

    // Gộp tất cả các chunks thành một mảng Float32 duy nhất
    let totalLength = 0
    for (const chunk of this.chunks) {
      totalLength += chunk.length
    }
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    // Nội suy hạ tần số về đúng 16.000 Hz
    const resampled = downsampleTo16k(merged, inputSampleRate, 16000)

    // Đóng gói WAV PCM 16-bit
    const wavBlob = encodeWAV(resampled, 16000)
    const stamp = new Date()
      .toLocaleTimeString("vi-VN", { hour12: false })
      .replace(/:/g, "-")

    return new File([wavBlob], `ghi-am-${stamp}.wav`, { type: "audio/wav" })
  }

  cancel() {
    this.isPaused = true
    this.source?.disconnect()
    this.processor?.disconnect()
    this.analyser?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {})
    }
    this.chunks = []
  }
}

/**
 * Xử lý file âm thanh tải lên (MP3, M4A, WAV, AAC...):
 * 1. Kiểm tra dung lượng <= 20MB
 * 2. Giải mã âm thanh trong RAM
 * 3. Kiểm tra thời lượng dưới 300s (5 phút)
 * 4. Chuyển đổi và nội suy hạ tần số về đúng 16.000 Hz Mono
 * 5. Xuất ra File .wav chuẩn PCM 16-bit
 */
export async function convertUploadedFileToWav16kMono(
  file: File
): Promise<{ file: File; duration: number }> {
  // 1. Chặn file > 20MB
  const MAX_SIZE_MB = 20
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(
      `File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn tối đa là ${MAX_SIZE_MB}MB.`
    )
  }

  // 2. Giải mã bằng AudioContext
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) {
    throw new Error("Trình duyệt không hỗ trợ Web Audio API.")
  }

  const audioCtx = new AudioContextClass()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    // 3. Kiểm tra thời lượng dưới 5 phút (300 giây)
    const duration = decodedBuffer.duration
    if (duration <= 0) {
      throw new Error(
        `File "${file.name}" không có dữ liệu âm thanh hợp lệ.`
      )
    }
    if (duration > 300) {
      throw new Error(
        `File "${file.name}" dài quá 5 phút (${Math.round(duration / 60)} phút ${Math.round(duration % 60)} giây). Thời lượng tối đa cho phép là dưới 5 phút (300 giây).`
      )
    }

    // 4. Gộp kênh thành Mono (nếu là stereo)
    let monoSamples: Float32Array
    if (decodedBuffer.numberOfChannels === 1) {
      monoSamples = decodedBuffer.getChannelData(0)
    } else {
      const ch0 = decodedBuffer.getChannelData(0)
      const ch1 = decodedBuffer.getChannelData(1)
      monoSamples = new Float32Array(ch0.length)
      for (let i = 0; i < ch0.length; i++) {
        monoSamples[i] = (ch0[i] + ch1[i]) / 2 // Trung bình cộng 2 kênh
      }
    }

    // 5. Hạ tần số về 16.000 Hz
    const resampled16k = downsampleTo16k(monoSamples, decodedBuffer.sampleRate, 16000)

    // 6. Đóng gói WAV PCM 16-bit
    const wavBlob = encodeWAV(resampled16k, 16000)
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")

    const newFile = new File([wavBlob], `${cleanBaseName}_16k_mono.wav`, {
      type: "audio/wav",
    })

    return { file: newFile, duration }
  } finally {
    try {
      await audioCtx.close()
    } catch {}
  }
}
