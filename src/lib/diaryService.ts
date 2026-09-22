import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, isFirebaseConfigured } from "./firebase"

export interface AudioUploadResult {
  name: string
  url: string
  size: number
  type: string
}

export interface DiarySubmissionParams {
  text: string
  selectedPrompt: { emoji: string; text: string } | null
  promptIndex: number | null
  mode: "both" | "text" | "voice"
  voiceFiles: File[]
}

/**
 * Tải file ghi âm âm thanh trực tiếp lên Cloudinary (miễn phí 25GB, không cần thẻ)
 */
async function uploadAudioToCloudinary(file: File): Promise<string> {
  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "jluqa4mz"
  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "uit_diary"

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  formData.append("folder", "uit_diary_audio")

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(
      errData?.error?.message ||
        `Lỗi khi tải file ghi âm lên Cloudinary (HTTP ${response.status})`
    )
  }

  const result = await response.json()
  return result.secure_url
}

/**
 * Gửi toàn bộ dữ liệu nhật ký:
 * 1. Tải các file ghi âm lên Cloudinary -> lấy đường link trực tiếp (URL).
 * 2. Lưu nội dung chữ cùng các đường link âm thanh vào Firebase Firestore.
 */
export async function submitDiary({
  text,
  selectedPrompt,
  promptIndex,
  mode,
  voiceFiles,
}: DiarySubmissionParams): Promise<string> {
  // 1. Tải các file ghi âm lên Cloudinary (nếu có)
  const uploadedAudios: AudioUploadResult[] = []
  if (voiceFiles.length > 0) {
    for (let i = 0; i < voiceFiles.length; i++) {
      const file = voiceFiles[i]
      const audioUrl = await uploadAudioToCloudinary(file)

      uploadedAudios.push({
        name: file.name,
        url: audioUrl,
        size: file.size,
        type: file.type || "audio/webm",
      })
    }
  }

  // Nếu chưa cấu hình Firebase đầy đủ, fallback demo
  if (!isFirebaseConfigured() || !db) {
    console.warn(
      "[UIT Diary] Firebase chưa điền đầy đủ API key trong .env. Đã lưu file audio lên Cloudinary thành công:"
    )
    console.log("Audio URLs:", uploadedAudios)
    await new Promise((res) => setTimeout(res, 800))
    return "demo-submission-id"
  }

  // 2. Tính toán số từ
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  // 3. Xác định loại thiết bị gửi
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const platform = isMobile ? "mobile" : "desktop"

  // 4. Lưu bản ghi vào Cloud Firestore
  const docRef = await addDoc(collection(db, "diaries"), {
    created_at: serverTimestamp(),
    created_at_iso: new Date().toISOString(),
    prompt_id: promptIndex,
    prompt_emoji: selectedPrompt ? selectedPrompt.emoji : null,
    prompt_text: selectedPrompt ? selectedPrompt.text : null,
    content_text: text.trim(),
    word_count: wordCount,
    mode: mode,
    audio_count: uploadedAudios.length,
    audio_files: uploadedAudios,
    platform: platform,
    consent_research: true,
  })

  return docRef.id
}
