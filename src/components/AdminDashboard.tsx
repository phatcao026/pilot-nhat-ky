import { useState, useEffect, useCallback, useMemo } from "react"
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "../lib/firebase"

interface AudioFile {
  name: string
  url: string
  size: number
  type: string
}

interface DiaryItem {
  id: string
  created_at?: any
  created_at_iso?: string
  prompt_id?: number | null
  prompt_emoji?: string | null
  prompt_text?: string | null
  content_text?: string
  word_count?: number
  mode?: string
  audio_count?: number
  audio_files?: AudioFile[]
  platform?: string
}

const ADMIN_PIN = "123456"
const TARGET_GOAL = 5000

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [authed, setAuthed] = useState<boolean>(() => {
    return sessionStorage.getItem("uit_admin_logged_in") === "true"
  })
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [diaries, setDiaries] = useState<DiaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "audio" | "text">("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  // Xử lý đăng nhập PIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setAuthed(true)
      sessionStorage.setItem("uit_admin_logged_in", "true")
      setPinError("")
    } else {
      setPinError("Mã PIN không đúng. Vui lòng thử lại!")
    }
  }

  const handleLogout = () => {
    setAuthed(false)
    sessionStorage.removeItem("uit_admin_logged_in")
  }

  // Tải dữ liệu từ Firestore
  const fetchDiaries = useCallback(async () => {
    if (!db) {
      setFetchError("Firebase chưa được cấu hình. Vui lòng kiểm tra lại file .env")
      return
    }
    setLoading(true)
    setFetchError(null)

    try {
      // Ưu tiên tải sắp xếp theo thời gian mới nhất
      let snapshot
      try {
        const q = query(collection(db, "diaries"), orderBy("created_at", "desc"))
        snapshot = await getDocs(q)
      } catch (err) {
        // Fallback nếu chưa tạo index
        snapshot = await getDocs(collection(db, "diaries"))
      }

      const list: DiaryItem[] = []
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as DiaryItem)
      })

      // Sắp xếp client-side theo thời gian
      list.sort((a, b) => {
        const timeA = a.created_at_iso
          ? new Date(a.created_at_iso).getTime()
          : a.created_at?.seconds
            ? a.created_at.seconds * 1000
            : 0
        const timeB = b.created_at_iso
          ? new Date(b.created_at_iso).getTime()
          : b.created_at?.seconds
            ? b.created_at.seconds * 1000
            : 0
        return timeB - timeA
      })

      setDiaries(list)
    } catch (err: any) {
      console.error("Lỗi lấy dữ liệu diaries:", err)
      if (err?.code === "permission-denied") {
        setFetchError(
          "Lỗi quyền truy cập (Permission Denied). Bạn vui lòng vào Firebase Console -> Firestore Database -> tab Rules, đổi thành: 'allow read, write, delete: if true;' để trang Admin có quyền đọc và xuất dữ liệu."
        )
      } else {
        setFetchError(err?.message || "Không thể tải danh sách nhật ký.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) {
      fetchDiaries()
    }
  }, [authed, fetchDiaries])

  // Xóa bài viết
  const handleDelete = async (id: string) => {
    if (!db) return
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "diaries", id))
      setDiaries((prev) => prev.filter((item) => item.id !== id))
      setDeleteId(null)
    } catch (err: any) {
      alert("Lỗi khi xóa bài: " + (err?.message || err))
    } finally {
      setIsDeleting(false)
    }
  }

  // Lọc dữ liệu
  const filteredDiaries = useMemo(() => {
    return diaries.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        (item.content_text &&
          item.content_text.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.prompt_text &&
          item.prompt_text.toLowerCase().includes(searchTerm.toLowerCase()))

      const hasAudio = (item.audio_files && item.audio_files.length > 0) || (item.audio_count && item.audio_count > 0)
      if (filterMode === "audio") return matchSearch && hasAudio
      if (filterMode === "text") return matchSearch && !hasAudio
      return matchSearch
    })
  }, [diaries, searchTerm, filterMode])

  // Thống kê
  const stats = useMemo(() => {
    const total = diaries.length
    const withAudio = diaries.filter(
      (d) => (d.audio_files && d.audio_files.length > 0) || (d.audio_count && d.audio_count > 0)
    ).length
    const totalWords = diaries.reduce((acc, d) => acc + (d.word_count || 0), 0)
    const progressPercent = Math.min(100, ((total / TARGET_GOAL) * 100)).toFixed(2)
    return { total, withAudio, totalWords, progressPercent }
  }, [diaries])

  // Xuất file CSV (Hỗ trợ mở bằng Excel không lỗi font tiếng Việt)
  const exportCSV = () => {
    if (diaries.length === 0) {
      alert("Chưa có dữ liệu để xuất file!")
      return
    }

    const headers = [
      "ID",
      "Thời Gian",
      "Chế Độ",
      "Câu Hỏi Gợi Ý",
      "Nội Dung Nhật Ký",
      "Số Từ",
      "Thiết Bị",
      "Số File Ghi Âm",
      "Link File Âm Thanh",
    ]

    const rows = diaries.map((item) => {
      const dateStr = item.created_at_iso
        ? new Date(item.created_at_iso).toLocaleString("vi-VN")
        : item.created_at?.seconds
          ? new Date(item.created_at.seconds * 1000).toLocaleString("vi-VN")
          : ""
      const cleanText = (item.content_text || "").replace(/"/g, '""')
      const prompt = (item.prompt_text || "").replace(/"/g, '""')
      const audioUrls = (item.audio_files || []).map((a) => a.url).join(" ; ")

      return [
        `"${item.id}"`,
        `"${dateStr}"`,
        `"${item.mode || ""}"`,
        `"${prompt}"`,
        `"${cleanText}"`,
        item.word_count || 0,
        `"${item.platform || ""}"`,
        (item.audio_files || []).length,
        `"${audioUrls}"`,
      ].join(",")
    })

    // Ký tự BOM (\uFEFF) giúp Excel đọc UTF-8 tiếng Việt chuẩn 100%
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `uit_diary_dataset_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Xuất file JSON
  const exportJSON = () => {
    if (diaries.length === 0) return
    const jsonStr = JSON.stringify(diaries, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `uit_diary_dataset_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Màn hình nhập PIN
  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--background)" }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center shadow-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--background)" }}
          >
            🔐
          </div>
          <h2
            className="font-display text-2xl font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Quản trị viên Đề tài UIT
          </h2>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Khu vực dành riêng cho nhóm nghiên cứu để theo dõi dữ liệu và nghe các đoạn nhật ký âm thanh.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN quản trị..."
                className="w-full px-4 py-3 rounded-xl text-center text-lg tracking-widest outline-none transition-all"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                autoFocus
              />
              {pinError && (
                <p className="text-red-500 text-xs mt-2 text-left">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-medium tracking-wide transition-all hover:opacity-90 cursor-pointer"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Mở bảng điều khiển
            </button>
          </form>

          <button
            onClick={onExit}
            className="mt-6 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Quay lại trang chủ viết nhật ký
          </button>
        </div>
      </div>
    )
  }

  // Màn hình Quản trị chính
  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-8 sm:py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📊</span>
              <h1
                className="font-display text-2xl sm:text-3xl font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Bảng Giám Sát Dữ Liệu Nhật Ký
              </h1>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: "var(--muted-foreground)" }}>
              Đề tài Nghiên cứu Khoa học · UIT – ĐHQG-HCM
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              📥 Xuất Excel (CSV)
            </button>
            <button
              onClick={exportJSON}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all hover:opacity-80 active:scale-95 cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                background: "var(--card)",
              }}
            >
              {`{ }`} JSON
            </button>
            <button
              onClick={fetchDiaries}
              disabled={loading}
              className="p-2 rounded-xl border transition-all hover:opacity-80 cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                background: "var(--card)",
              }}
              title="Làm mới danh sách"
            >
              🔄
            </button>
            <button
              onClick={onExit}
              className="px-3 py-2 rounded-xl text-xs border transition-all hover:opacity-80 cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Về trang chủ
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl text-xs text-red-500 border border-red-200 hover:bg-red-50 cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Thanh tiến độ mục tiêu 5.000 bộ dữ liệu */}
        <div
          className="p-5 rounded-2xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              🎯 Tiến độ thu thập mẫu nghiên cứu (Mục tiêu: {TARGET_GOAL.toLocaleString()} bộ)
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {stats.total.toLocaleString()} / {TARGET_GOAL.toLocaleString()} ({stats.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.max(1, Number(stats.progressPercent))}%`,
                background: "var(--primary)",
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Tổng bài viết</p>
              <p className="text-lg sm:text-xl font-semibold" style={{ color: "var(--foreground)" }}>{stats.total}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Có ghi âm Voice</p>
              <p className="text-lg sm:text-xl font-semibold" style={{ color: "var(--foreground)" }}>{stats.withAudio}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Tổng số từ text</p>
              <p className="text-lg sm:text-xl font-semibold" style={{ color: "var(--foreground)" }}>{stats.totalWords.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Bộ nhớ âm thanh</p>
              <p className="text-sm sm:text-base font-semibold text-green-600">Cloudinary 25GB</p>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {fetchError && (
          <div className="p-4 rounded-xl text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-300 leading-relaxed">
            ⚠️ {fetchError}
          </div>
        )}

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterMode === "all" ? "bg-stone-800 text-white" : "hover:opacity-70"
              }`}
              style={{
                background: filterMode === "all" ? "var(--primary)" : "transparent",
                color: filterMode === "all" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              Tất cả ({diaries.length})
            </button>
            <button
              onClick={() => setFilterMode("audio")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterMode === "audio" ? "bg-stone-800 text-white" : "hover:opacity-70"
              }`}
              style={{
                background: filterMode === "audio" ? "var(--primary)" : "transparent",
                color: filterMode === "audio" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              🎙️ Có Voice ({stats.withAudio})
            </button>
            <button
              onClick={() => setFilterMode("text")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterMode === "text" ? "bg-stone-800 text-white" : "hover:opacity-70"
              }`}
              style={{
                background: filterMode === "text" ? "var(--primary)" : "transparent",
                color: filterMode === "text" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              ✍️ Chỉ Text ({diaries.length - stats.withAudio})
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung nhật ký..."
              className="w-full px-3.5 py-2 pl-8 rounded-xl text-xs sm:text-sm outline-none border"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-gray-400">🔍</span>
          </div>
        </div>

        {/* Danh sách dữ liệu */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full text-stone-500 mb-3" />
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Đang tải danh sách nhật ký...</p>
          </div>
        ) : filteredDiaries.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Chưa có dữ liệu nào khớp với bộ lọc
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Hãy thử gửi một bài viết mẫu từ trang chủ hoặc xóa từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDiaries.map((item, index) => {
              const isExpanded = Boolean(expandedIds[item.id])
              const dateStr = item.created_at_iso
                ? new Date(item.created_at_iso).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : item.created_at?.seconds
                  ? new Date(item.created_at.seconds * 1000).toLocaleString("vi-VN")
                  : "Chưa rõ thời gian"

              const text = item.content_text || ""
              const shouldTruncate = text.length > 250 && !isExpanded

              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5 sm:p-6 transition-all hover:shadow-sm"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Top Bar của từng mục */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold">
                        #{diaries.length - index}
                      </span>
                      <span style={{ color: "var(--muted-foreground)" }}>📅 {dateStr}</span>
                      {item.platform && (
                        <span className="px-2 py-0.5 rounded-full border text-[10px]" style={{ borderColor: "var(--border)" }}>
                          {item.platform === "mobile" ? "📱 Điện thoại" : "💻 Máy tính"}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full border text-[10px]" style={{ borderColor: "var(--border)" }}>
                        📝 {item.word_count || 0} từ
                      </span>
                    </div>

                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-red-50"
                      title="Xóa bài này (bài test/rác)"
                    >
                      🗑️ Xóa
                    </button>
                  </div>

                  {/* Gợi ý đã chọn */}
                  {item.prompt_text && (
                    <div
                      className="mb-3 p-2.5 rounded-xl text-xs inline-flex items-center gap-1.5"
                      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                    >
                      <span>{item.prompt_emoji || "💡"}</span>
                      <span className="font-medium" style={{ color: "var(--foreground)" }}>
                        {item.prompt_text}
                      </span>
                    </div>
                  )}

                  {/* Nội dung nhật ký chữ */}
                  {text ? (
                    <div className="mb-4">
                      <p
                        className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap"
                        style={{ color: "var(--foreground)" }}
                      >
                        {shouldTruncate ? `${text.slice(0, 250)}...` : text}
                      </p>
                      {text.length > 250 && (
                        <button
                          onClick={() =>
                            setExpandedIds((prev) => ({ ...prev, [item.id]: !isExpanded }))
                          }
                          className="text-xs text-blue-600 hover:underline mt-1 cursor-pointer"
                        >
                          {isExpanded ? "Thu gọn ▲" : "Xem thêm ▼"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic mb-4 text-stone-400">
                      (Người tham gia không viết chữ, chỉ gửi file ghi âm voice)
                    </p>
                  )}

                  {/* Trình phát âm thanh (Audio Players) */}
                  {item.audio_files && item.audio_files.length > 0 && (
                    <div
                      className="p-3.5 rounded-xl space-y-2.5 mt-3"
                      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium flex items-center gap-1 text-purple-700 dark:text-purple-400">
                          🎙️ File ghi âm ({item.audio_files.length} file):
                        </span>
                      </div>

                      {item.audio_files.map((audio, aIdx) => (
                        <div key={aIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                            <span className="truncate max-w-xs">{audio.name || `File âm thanh #${aIdx + 1}`}</span>
                            <a
                              href={audio.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline inline-flex items-center gap-1"
                            >
                              Tải về ↗
                            </a>
                          </div>
                          {/* Audio Player nghe trực tiếp ngay trên trang */}
                          <audio
                            controls
                            preload="none"
                            src={audio.url}
                            className="w-full h-9 rounded"
                          >
                            Trình duyệt của bạn không hỗ trợ thẻ audio.
                          </audio>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Modal xác nhận xóa */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
            <div
              className="max-w-sm w-full rounded-2xl p-6 shadow-xl text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="font-display text-lg font-medium mb-2" style={{ color: "var(--foreground)" }}>
                Xác nhận xóa bản ghi?
              </h3>
              <p className="text-xs leading-relaxed mb-6" style={{ color: "var(--muted-foreground)" }}>
                Hành động này sẽ xóa vĩnh viễn bài viết này khỏi cơ sở dữ liệu Firestore và không thể khôi phục lại.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-medium border transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                >
                  {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
