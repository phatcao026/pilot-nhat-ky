import { useState, useRef, useEffect, useCallback } from "react"
import uitDiaryLogo from "./imports/Logo_UIT_RutGon_Transparent.png"
import { submitDiary } from "./lib/diaryService"
import AdminDashboard from "./components/AdminDashboard"

type Page = "intro" | "diary" | "voice" | "contact" | "thankyou"
type Mode = "both" | "text" | "voice"

const PROMPTS = [
  { emoji: "✨", text: "Hôm nay điều gì làm bạn suy nghĩ nhiều nhất?" },
  { emoji: "💭", text: "Một cảm xúc khó gọi tên mà bạn vừa trải qua…" },
  { emoji: "🌷", text: "Một niềm vui nhỏ hay nỗi buồn thoáng qua trong ngày…" },
  { emoji: "📝", text: "Viết như một trang nhật ký bạn vẫn thường viết" },
]

const CONTACTS = { email: "caotienphat0206@gmail.com", zalo: "0377740947" }

function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/* ---------- Line icons ---------- */
function IconFeather({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M20.2 4.8c-3 .3-8 1.8-11 4.8-2.2 2.2-3 5.2-3.2 7.6L4 19.2M9 15h5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.2 4.8C17 8 13 12 9 15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconShield({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M8 1.5l5 2v4c0 3-2.2 5.3-5 6.5-2.8-1.2-5-3.5-5-6.5v-4l5-2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.8 8l1.6 1.6L10.4 6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconMic({ className = "" }: { className?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <rect
        x="9"
        y="2.5"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconWave({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M3 12h1.5M7 8v8M11 4.5v15M15 8v8M19 10.5v3M21 12h.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M25 6C14 6 7 11 7 20c0 3 1 5 1 5s10 1 15-5c5-6 2-14 2-14z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 25c3-8 8-12 14-15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconBookmark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M3.5 1.5h7v11l-3.5-2.5L3.5 12.5v-11z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconMail({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <rect
        x="2.5"
        y="4"
        width="15"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M3 5.5l7 4.5 7-4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function IconChat({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      style={{ color: "var(--accent)" }}
    >
      <path
        d="M3 5.5A2.5 2.5 0 015.5 3h9A2.5 2.5 0 0117 5.5v6A2.5 2.5 0 0114.5 14H8l-3.5 3v-3H5.5A2.5 2.5 0 013 11.5v-6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface FormData {
  text: string
  selectedPrompt: number | null
  voiceFiles: File[]
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  full,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  full?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${
        full ? "w-full sm:w-auto " : ""
      }px-9 py-3.5 rounded-full text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed`}
      style={{
        background: "var(--primary)",
        color: "var(--primary-foreground)",
      }}
    >
      {children}
    </button>
  )
}

function NavRow({
  onBack,
  onNext,
  nextLabel = "Tiếp tục",
  nextDisabled = false,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="flex justify-between items-center mt-10">
      {onBack ? (
        <button
          onClick={onBack}
          className="text-sm transition-all hover:opacity-60"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Quay lại
        </button>
      ) : (
        <span />
      )}
      <PrimaryButton onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </PrimaryButton>
    </div>
  )
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string
  title: string
  sub?: string
}) {
  return (
    <div className="mb-7">
      {eyebrow && (
        <p
          className="eyebrow text-[11px] mb-3"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className="font-display text-[26px] sm:text-[30px] leading-tight mb-2"
        style={{ color: "var(--foreground)", fontWeight: 500 }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

/* ---------- PAGE 1: Intro ---------- */
const MODE_OPTIONS: {
  id: Mode
  title: string
  desc: string
  icon: (p: { className?: string }) => React.ReactNode
}[] = [
  {
    id: "both",
    title: "Viết & Ghi âm",
    desc: "Chia sẻ trọn vẹn bằng cả con chữ lẫn giọng nói.",
    icon: (p) => <IconBookmark {...p} />,
  },
  {
    id: "text",
    title: "Chỉ viết nhật ký",
    desc: "Gói ghém tâm tư qua từng dòng chữ.",
    icon: (p) => <IconFeather {...p} />,
  },
  {
    id: "voice",
    title: "Chỉ ghi âm",
    desc: "Kể lại bằng chính giọng nói của bạn.",
    icon: (p) => <IconMic {...p} />,
  },
]

function PageIntro({
  mode,
  onSelectMode,
  onNext,
}: {
  mode: Mode
  onSelectMode: (m: Mode) => void
  onNext: () => void
}) {
  return (
    <div>
      <div className="text-center mb-12">
        <p
          className="eyebrow text-[11px] mb-5"
          style={{ color: "var(--accent)" }}
        >
          Hôm nay · {todayLabel()}
        </p>
        <h1
          className="font-display mb-5"
          style={{
            color: "var(--foreground)",
            fontSize: "clamp(3rem, 9vw, 4.75rem)",
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          Nhật Ký
        </h1>
        <p
          className="text-[14px] leading-relaxed max-w-md mx-auto"
          style={{ color: "var(--muted-foreground)" }}
        >
          Một nơi để bạn viết ra những điều đang ở trong lòng
          <br />
          <span
            className="italic font-display"
            style={{ color: "var(--foreground)" }}
          >
            nhẹ nhàng, riêng tư và không phán xét.
          </span>
        </p>
      </div>

      <section
        className="rounded-2xl p-7 sm:p-9"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center p-1"
            style={{ border: "1px solid var(--border)", background: "#fff" }}
          >
            <img
              src={uitDiaryLogo}
              alt="Logo UIT"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p
              className="eyebrow text-[10px] mb-1.5"
              style={{ color: "var(--accent)" }}
            >
              Đề tài nghiên cứu · UIT
            </p>
            <h2
              className="font-display text-[20px] leading-tight"
              style={{ color: "var(--foreground)", fontWeight: 500 }}
            >
              Đôi lời từ nhóm nghiên cứu
            </h2>
          </div>
        </div>

        <p
          className="text-[10px] mb-4 eyebrow"
          style={{ color: "var(--muted-foreground)", letterSpacing: "0.1em" }}
        >
          Nhóm sinh viên · Trường ĐH Công nghệ Thông tin ĐHQG-TP.HCM (UIT)
        </p>

        <div className="space-y-4">
          <p
            className="text-[15px] leading-[1.75]"
            style={{ color: "var(--secondary-foreground)" }}
          >
            Chào bạn, tụi mình là một nhóm sinh viên Trường ĐH Công nghệ Thông
            tin ĐHQG-TP.HCM (UIT), đang thực hiện đề tài nghiên cứu khoa học về{" "}
            <em
              className="font-display not-italic"
              style={{ fontStyle: "italic" }}
            >
              Nhận diện cảm xúc trong nhật ký Tiếng Việt
            </em>{" "}
            kết hợp giữa hai phương thức Văn bản và Giọng nói.
          </p>
          <p
            className="text-[15px] leading-[1.75]"
            style={{ color: "var(--secondary-foreground)" }}
          >
            Trang này là một góc nhỏ, nơi tụi mình mong được lắng nghe
            những câu chuyện thật để hiểu hơn cách con người gửi gắm cảm xúc qua
            từng câu chữ và thanh âm.
          </p>
          <p
            className="text-[15px] leading-[1.75]"
            style={{ color: "var(--secondary-foreground)" }}
          >
            Nếu bạn sẵn lòng, hãy sẻ chia cùng tụi mình một điều gì đó hôm nay,
            một niềm vui, một nỗi buồn, hay chỉ là một suy nghĩ thoáng qua. Bạn
            có thể viết lại hoặc ghi âm trực tiếp giọng nói của mình một cách tự
            nhiên nhất nhé; dù chỉ vài dòng tâm sự hay một đoạn thu âm ngắn đều
            vô cùng quý giá với tụi mình.
          </p>
        </div>

        <div
          className="flex items-start gap-2.5 mt-6 pt-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <IconShield className="flex-shrink-0 mt-0.5" />
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--secondary-foreground)" }}
          >
            Mọi câu chữ và bản thu của bạn đều được cam kết{" "}
            <span style={{ color: "var(--foreground)" }}>
              ẩn danh và bảo mật 100%
            </span>
            .
          </p>
        </div>
      </section>

      <div className="mt-10">
        <p
          className="eyebrow text-[11px] mb-4 text-center"
          style={{ color: "var(--accent)" }}
        >
          Bạn muốn chia sẻ theo cách nào?
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onSelectMode(opt.id)}
                className="text-left p-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: active ? "var(--secondary)" : "var(--card)",
                  border: `1.5px solid ${
                    active ? "var(--accent)" : "var(--border)"
                  }`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {opt.icon({ className: "w-[18px] h-[18px]" })}
                </div>
                <p
                  className="text-[14px] mb-1"
                  style={{ color: "var(--foreground)", fontWeight: 500 }}
                >
                  {opt.title}
                </p>
                <p
                  className="text-[12px] leading-snug"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="text-center mt-9">
        <PrimaryButton onClick={onNext} full>
          {mode === "voice" ? "Bắt đầu ghi âm" : "Bắt đầu viết"}
        </PrimaryButton>
      </div>
    </div>
  )
}

/* ---------- PAGE 2: Diary ---------- */
function PageDiary({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (d: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.max(240, ta.scrollHeight) + "px"
  }, [data.text])

  useEffect(() => {
    if (!data.text) return
    setSaved(false)
    const t = setTimeout(() => {
      try {
        localStorage.setItem("journal-draft", data.text)
      } catch {}
      setSaved(true)
    }, 800)
    return () => clearTimeout(t)
  }, [data.text])

  const words = data.text.trim() ? data.text.trim().split(/\s+/).length : 0
  const chars = data.text.length

  return (
    <div>
      <SectionHead
        title="Viết cho ngày hôm nay"
        sub="Không có khuôn mẫu, cũng chẳng có đúng sai. Cứ để dòng suy nghĩ chảy theo cách của riêng nó."
      />

      <section className="mb-6">
        <p
          className="text-[13px] mb-3"
          style={{ color: "var(--muted-foreground)" }}
        >
          Chưa biết bắt đầu từ đâu? Chọn một gợi ý bên dưới nhé:
        </p>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {PROMPTS.map((p, i) => {
            const activeP = data.selectedPrompt === i
            return (
              <button
                key={i}
                onClick={() => onChange({ selectedPrompt: activeP ? null : i })}
                className="flex items-start gap-2.5 text-left px-4 py-3.5 rounded-xl text-[13.5px] transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: activeP ? "var(--primary)" : "var(--card)",
                  color: activeP
                    ? "var(--primary-foreground)"
                    : "var(--secondary-foreground)",
                  border: `1px solid ${
                    activeP ? "var(--primary)" : "var(--border)"
                  }`,
                }}
              >
                <span className="text-[15px] leading-none mt-0.5 opacity-90">
                  {p.emoji}
                </span>
                <span className="leading-snug">{p.text}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--card)" }}
      >
        {data.selectedPrompt !== null && (
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{
              background: "var(--muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <IconBookmark />
            <span
              className="flex-1 text-[12.5px] leading-snug italic font-display"
              style={{ color: "var(--secondary-foreground)" }}
            >
              {PROMPTS[data.selectedPrompt].text}
            </span>
            <button
              onClick={() => onChange({ selectedPrompt: null })}
              className="text-xs px-1.5 py-0.5 rounded transition-all hover:opacity-60"
              style={{ color: "var(--muted-foreground)" }}
              aria-label="Bỏ gợi ý"
            >
              ✕
            </button>
          </div>
        )}
        <textarea
          ref={taRef}
          value={data.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Bạn đang cảm thấy thế nào vào lúc này? Cứ để những dòng suy nghĩ tự nhiên tuôn chảy nhé…"
          className="w-full px-6 py-5 text-[16px] leading-[1.85] outline-none resize-none block"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            fontFamily: "var(--font-sans)",
            minHeight: 240,
          }}
        />
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-1 px-6 py-3.5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span
            className="text-[11px] eyebrow"
            style={{
              color: "var(--muted-foreground)",
              letterSpacing: "0.08em",
            }}
          >
            {words} từ
          </span>
          <span
            className="text-[11px] eyebrow"
            style={{
              color: "var(--muted-foreground)",
              letterSpacing: "0.08em",
            }}
          >
            {chars} ký tự
          </span>
          <span
            className="text-[11px] ml-auto flex items-center gap-1.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: data.text && saved ? "#7a8f5f" : "var(--border)",
              }}
            />
            {data.text && saved ? "Đã lưu nháp" : "Đang lưu nháp…"}
          </span>
        </div>
      </div>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!data.text.trim()}
      />
    </div>
  )
}

/* ---------- PAGE 3: Voice ---------- */
function VoiceFileItem({
  file,
  sizeLabel,
  onRemove,
}: {
  file: File
  sizeLabel: string
  onRemove: () => void
}) {
  const [url, setUrl] = useState<string>("")
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  return (
    <div
      className="px-4 py-3.5 rounded-xl"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <IconWave className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] truncate"
            style={{ color: "var(--foreground)" }}
          >
            {file.name}
          </p>
          <p
            className="text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {sizeLabel}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-[12px] px-2 py-1 rounded transition-all hover:opacity-60"
          style={{ color: "var(--muted-foreground)" }}
        >
          Gỡ bỏ
        </button>
      </div>
      {url && (
        <audio
          src={url}
          controls
          className="w-full mt-3"
          style={{ height: 38 }}
        />
      )}
    </div>
  )
}

function PageVoice({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData
  onChange: (d: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // ---- Live recording state ----
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recError, setRecError] = useState<string | null>(null)

  const canRecord =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const audio = Array.from(files).filter(
      (f) =>
        f.type.startsWith("audio/") ||
        /\.(mp3|m4a|wav|ogg|aac|wma|opus)$/i.test(f.name),
    )
    onChange({ voiceFiles: [...data.voiceFiles, ...audio] })
  }
  const removeFile = (i: number) =>
    onChange({ voiceFiles: data.voiceFiles.filter((_, idx) => idx !== i) })
  const fmtSize = (b: number) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(0)} KB`
      : `${(b / 1024 / 1024).toFixed(1)} MB`
  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [data.voiceFiles],
  )

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startRecording = async () => {
    setRecError(null)
    if (!canRecord) {
      setRecError(
        "Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp. Bạn có thể tải file lên bên dưới nhé.",
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((m) => MediaRecorder.isTypeSupported(m))
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const type = mr.mimeType || "audio/webm"
        const ext = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm"
        const blob = new Blob(chunksRef.current, { type })
        const stamp = new Date()
          .toLocaleTimeString("vi-VN", { hour12: false })
          .replace(/:/g, "-")
        const file = new File([blob], `ghi-am-${stamp}.${ext}`, { type })
        onChange({ voiceFiles: [...data.voiceFiles, file] })
        releaseStream()
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setPaused(false)
      setElapsed(0)
      stopTimer()
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      releaseStream()
      setRecError(
        "Không truy cập được micro. Vui lòng cho phép quyền ghi âm rồi thử lại, hoặc tải file lên bên dưới.",
      )
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
    setPaused(false)
    stopTimer()
  }

  const togglePause = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (mr.state === "recording") {
      mr.pause()
      setPaused(true)
      stopTimer()
    } else if (mr.state === "paused") {
      mr.resume()
      setPaused(false)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    }
  }

  useEffect(() => {
    return () => {
      stopTimer()
      if (mediaRecorderRef.current?.state !== "inactive") {
        try {
          mediaRecorderRef.current?.stop()
        } catch {}
      }
      releaseStream()
    }
  }, [])

  return (
    <div>
      <SectionHead
        title="Kể lại bằng giọng nói"
        sub="Đôi khi giọng nói mang theo những cảm xúc mà con chữ khó lòng diễn tả hết. Bạn có thể ghi âm trực tiếp ngay tại đây, hoặc tải lên file có sẵn, hoàn toàn tùy bạn."
      />

      {/* ---- Live recorder ---- */}
      <div
        className="rounded-2xl p-7 mb-5 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p
          className="eyebrow text-[10px] mb-5"
          style={{ color: "var(--accent)" }}
        >
          Ghi âm trực tiếp
        </p>

        <div
          className="font-display mb-5 tabular-nums"
          style={{
            color: recording ? "var(--foreground)" : "var(--muted-foreground)",
            fontSize: "2.5rem",
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {fmtTime(elapsed)}
        </div>

        {recording && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: paused ? "var(--muted-foreground)" : "#c0563a",
                animation: paused ? "none" : "pulse 1.2s ease-in-out infinite",
              }}
            />
            <span
              className="text-[12px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {paused ? "Đang tạm dừng" : "Đang ghi âm…"}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {!recording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <IconMic className="w-[18px] h-[18px]" />
              Bắt đầu ghi âm
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="px-6 py-3.5 rounded-full text-sm tracking-wide transition-all hover:opacity-80 active:scale-[0.98]"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--secondary-foreground)",
                }}
              >
                {paused ? "Tiếp tục" : "Tạm dừng"}
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-[2px] bg-current" />
                Dừng & lưu lại
              </button>
            </>
          )}
        </div>

        {recError && (
          <p
            className="text-[12.5px] mt-5 leading-relaxed max-w-sm mx-auto"
            style={{ color: "#b0452c" }}
          >
            {recError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 my-6">
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span
          className="eyebrow text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          hoặc tải file lên
        </span>
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          background: dragging ? "var(--secondary)" : "transparent",
          border: `1.5px dashed ${
            dragging ? "var(--accent)" : "var(--border)"
          }`,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.wma,.opus"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="flex justify-center mb-4">
          <IconMic />
        </div>
        <p
          className="text-[15px] mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Kéo thả file vào đây, hoặc nhấn để chọn
        </p>
        <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          MP3 · M4A · WAV · OGG · AAC — tối đa 50 MB mỗi file
        </p>
      </div>

      {data.voiceFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.voiceFiles.map((file, i) => (
            <VoiceFileItem
              key={i}
              file={file}
              sizeLabel={fmtSize(file.size)}
              onRemove={() => removeFile(i)}
            />
          ))}
        </div>
      )}

      <p
        className="text-[12px] mt-4 italic"
        style={{ color: "var(--muted-foreground)" }}
      >
        Bước này hoàn toàn tùy chọn, bạn có thể bỏ qua nếu chỉ muốn chia sẻ
        bằng con chữ.
      </p>

      <NavRow onBack={onBack} onNext={onNext} />
    </div>
  )
}


function PageContact({
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: string | null
}) {
  return (
    <div>
      <SectionHead
        title="Gửi lại tâm tư của bạn"
        sub="Cảm ơn bạn đã dành thời gian ngồi lại và viết. Khi đã sẵn sàng, hãy gửi những dòng này đến tụi mình nhé."
      />

      <section
        className="rounded-2xl p-7 sm:p-9 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ border: "1px solid var(--border)" }}
        >
          <IconShield />
        </div>
        <h3
          className="font-display text-[20px] leading-tight mb-2"
          style={{ color: "var(--foreground)", fontWeight: 500 }}
        >
          Sẵn sàng gửi những dòng này đi?
        </h3>
        <p
          className="text-[14px] leading-relaxed max-w-sm mx-auto mb-7"
          style={{ color: "var(--muted-foreground)" }}
        >
          Tâm sự của bạn được giữ kín tuyệt đối, gửi đi hoàn toàn ẩn danh và chỉ
          phục vụ cho đề tài nghiên cứu khoa học.
        </p>

        {submitError && (
          <div className="p-3.5 mb-6 rounded-xl text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 max-w-md mx-auto text-left">
            ⚠️ {submitError}
          </div>
        )}

        <PrimaryButton onClick={onSubmit} disabled={isSubmitting} full>
          {isSubmitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Đang gửi dữ liệu ẩn danh...
            </span>
          ) : (
            "Gửi tâm tư ẩn danh"
          )}
        </PrimaryButton>
      </section>

      <div className="flex justify-start mt-8">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="text-sm transition-all hover:opacity-60 disabled:opacity-40"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Quay lại
        </button>
      </div>
    </div>
  )
}

/* ---------- Đóng góp thêm nhật ký cũ ---------- */
function SupportCard() {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const copyEmail = useCallback(() => {
    navigator.clipboard
      ?.writeText(CONTACTS.email)
      .then(() => {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 1600)
      })
      .catch(() => {})
  }, [])

  return (
    <section
      className="rounded-2xl p-7 sm:p-8 text-left"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <h3
        className="font-display text-[20px] leading-tight mb-3"
        style={{ color: "var(--foreground)", fontWeight: 500 }}
      >
        Đóng góp thêm nhật ký cũ?
      </h3>
      <p
        className="text-[14.5px] leading-[1.7] mb-6"
        style={{ color: "var(--secondary-foreground)" }}
      >
        Để mô hình có thêm nguồn ngữ liệu chân thực và đa dạng, nhóm nghiên cứu
        rất hy vọng nhận được sự giúp đỡ từ những bạn có thói quen viết nhật ký
        thường xuyên. Nếu bạn sẵn lòng sẻ chia thêm các trang viết cũ (qua file
        Word, Notion, bản xuất văn bản...), đó sẽ là sự hỗ trợ vô cùng to lớn
        và quý báu đối với đề tài của chúng mình:
      </p>

      <div
        className="rounded-xl px-4 sm:px-5 divide-y my-5"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          borderColor: "var(--border)",
        }}
      >
        {/* Dòng Email */}
        <div className="py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base flex-shrink-0">✉️</span>
            <span
              className="font-medium text-[14px]"
              style={{ color: "var(--foreground)" }}
            >
              Email:
            </span>
            <span
              className="text-[14px] break-all"
              style={{ color: "var(--secondary-foreground)" }}
            >
              {CONTACTS.email}
            </span>
          </div>
          <button
            onClick={copyEmail}
            className="text-[12px] px-3.5 py-1.5 rounded-full transition-all hover:opacity-85 active:scale-95 cursor-pointer font-medium flex-shrink-0 ml-auto sm:ml-0"
            style={{
              border: "1px solid var(--border)",
              color: "var(--secondary-foreground)",
            }}
          >
            {copiedEmail ? "✓ Đã sao chép" : "Sao chép"}
          </button>
        </div>

        {/* Dòng Zalo */}
        <div className="py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base flex-shrink-0">💬</span>
            <span
              className="font-medium text-[14px]"
              style={{ color: "var(--foreground)" }}
            >
              Zalo:
            </span>
            <span
              className="text-[14px]"
              style={{ color: "var(--secondary-foreground)" }}
            >
              {CONTACTS.zalo}
            </span>
          </div>
          <a
            href={`https://zalo.me/${CONTACTS.zalo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] px-4 py-1.5 rounded-full transition-all hover:opacity-90 active:scale-95 inline-flex items-center justify-center font-medium cursor-pointer flex-shrink-0 ml-auto sm:ml-0"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Mở Zalo
          </a>
        </div>
      </div>

      <p
        className="text-[13px] mt-6 text-center leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        🔒 Cam kết bảo mật & ẩn danh tuyệt đối 100%.
      </p>
    </section>
  )
}

/* ---------- Thank you ---------- */
function ThankYou({ onAgain }: { onAgain: () => void }) {
  return (
    <div
      className="min-h-screen px-4 py-16 sm:py-20"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-xl mx-auto">
        <div className="text-center">
          <h1
            className="font-display mb-4"
            style={{
              color: "var(--foreground)",
              fontSize: "clamp(2.25rem, 6vw, 3rem)",
              fontWeight: 500,
              lineHeight: 1.1,
            }}
          >
            Cảm ơn vì đã mở lòng
          </h1>
          <div
            className="text-[15px] sm:text-[16px] leading-[1.8] mb-9 max-w-md mx-auto space-y-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <p>Chia sẻ của bạn đã được gửi đi và hoàn toàn ẩn danh.</p>
            <p>Chúc bạn có một ngày tốt lành.</p>
          </div>
          <button
            onClick={onAgain}
            className="px-8 py-3 rounded-full text-sm tracking-wide transition-all duration-200 hover:opacity-70 cursor-pointer"
            style={{
              border: "1px solid var(--foreground)",
              color: "var(--foreground)",
            }}
          >
            Chia sẻ thêm câu chuyện khác
          </button>
        </div>

        <div className="mt-14">
          <SupportCard />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("intro")
  const [mode, setMode] = useState<Mode>("both")
  const [data, setData] = useState<FormData>({
    text: "",
    selectedPrompt: null,
    voiceFiles: [],
  })
  const update = (d: Partial<FormData>) =>
    setData((prev) => ({ ...prev, ...d }))
  const go = (p: Page) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitDiary({
        text: data.text,
        selectedPrompt:
          data.selectedPrompt !== null ? PROMPTS[data.selectedPrompt] : null,
        promptIndex: data.selectedPrompt,
        mode: mode,
        voiceFiles: data.voiceFiles,
      })

      try {
        localStorage.removeItem("journal-draft")
      } catch {}

      go("thankyou")
    } catch (err: any) {
      console.error("Lỗi khi gửi nhật ký:", err)
      setSubmitError(
        err?.message ||
          "Không thể gửi dữ liệu lúc này. Vui lòng kiểm tra kết nối mạng và thử lại!"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setData({ text: "", selectedPrompt: null, voiceFiles: [] })
    setSubmitError(null)
    go("intro")
  }

  // The ordered steps for the chosen mode, framing intro → … → contact.
  const flow: Page[] =
    mode === "text"
      ? ["intro", "diary", "contact"]
      : mode === "voice"
        ? ["intro", "voice", "contact"]
        : ["intro", "diary", "voice", "contact"]

  const stepAfter = (p: Page): Page => {
    const i = flow.indexOf(p)
    return flow[Math.min(i + 1, flow.length - 1)]
  }
  const stepBefore = (p: Page): Page => {
    const i = flow.indexOf(p)
    return flow[Math.max(i - 1, 0)]
  }

  const [showAdmin, setShowAdmin] = useState<boolean>(() => {
    return window.location.hash === "#admin" || window.location.pathname === "/admin"
  })

  useEffect(() => {
    const handleHash = () => {
      setShowAdmin(window.location.hash === "#admin" || window.location.pathname === "/admin")
    }
    window.addEventListener("hashchange", handleHash)
    return () => window.removeEventListener("hashchange", handleHash)
  }, [])

  if (showAdmin) {
    return (
      <AdminDashboard
        onExit={() => {
          setShowAdmin(false)
          window.location.hash = ""
        }}
      />
    )
  }

  if (page === "thankyou") return <ThankYou onAgain={reset} />

  return (
    <div
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: "var(--background)" }}
    >
      <main className="max-w-2xl mx-auto">
        {page === "intro" && (
          <PageIntro
            mode={mode}
            onSelectMode={setMode}
            onNext={() => go(stepAfter("intro"))}
          />
        )}
        {page === "diary" && (
          <PageDiary
            data={data}
            onChange={update}
            onNext={() => go(stepAfter("diary"))}
            onBack={() => go(stepBefore("diary"))}
          />
        )}
        {page === "voice" && (
          <PageVoice
            data={data}
            onChange={update}
            onNext={() => go(stepAfter("voice"))}
            onBack={() => go(stepBefore("voice"))}
          />
        )}
        {page === "contact" && (
          <PageContact
            onBack={() => go(stepBefore("contact"))}
            onSubmit={submit}
            isSubmitting={submitting}
            submitError={submitError}
          />
        )}
      </main>

      <footer
        className="max-w-2xl mx-auto mt-16 pt-6 text-center flex items-center justify-center gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p
          className="eyebrow text-[10px]"
          style={{ color: "var(--muted-foreground)", letterSpacing: "0.14em" }}
        >
          Đề tài Nghiên cứu Khoa học · UIT – ĐHQG-HCM
        </p>
        <button
          onClick={() => {
            window.location.hash = "admin"
            setShowAdmin(true)
          }}
          title="Khu vực Quản trị viên UIT"
          className="opacity-25 hover:opacity-100 transition-opacity text-xs cursor-pointer ml-1"
        >
          🔒
        </button>
      </footer>
    </div>
  )
}
