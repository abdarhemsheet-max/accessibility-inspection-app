import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  Calendar,
  Shield,
  Database,
  Save,
  Trash2,
  Eye,
  Pencil,
  Trash2 as TrashIcon,
  Minus,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  MapPin,
  Users,
  ListChecks,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  ClipboardCheck,
  Archive,
  Clock,
  FileCheck,
  FileDown,
} from 'lucide-react'

// SUPABASE CONFIGURATION (اختياري - التطبيق يعمل محلياً بدونه)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

// LOCAL STORAGE LAYER - يعمل بدون سيرفر
const STORAGE_KEY = 'field_inspections_local'

const localDb = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  },
  saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  },
  insert(record) {
    const data = this.getAll()
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const entry = { id, ...record, created_at: new Date().toISOString() }
    data.unshift(entry)
    this.saveAll(data)
    return entry
  },
  update(id, updates) {
    const data = this.getAll()
    const idx = data.findIndex(r => r.id === id)
    if (idx === -1) return null
    data[idx] = { ...data[idx], ...updates }
    this.saveAll(data)
    return data[idx]
  },
  remove(id) {
    const data = this.getAll().filter(r => r.id !== id)
    this.saveAll(data)
  },
  query({ search, type }) {
    let data = this.getAll()
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(r => (r.facility_name || '').toLowerCase().includes(s))
    }
    if (type && type !== 'الكل') {
      data = data.filter(r => r.facility_type === type)
    }
    return data
  },
}

const FACILITY_TYPES = ['مسجد جامع', 'مسجد أوقات', 'مركز تحفيظ']

const FINAL_CLASSIFICATIONS = [
  { value: 'مهيأ بالكامل', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300' },
  { value: 'يحتاج تعديلات بسيطة', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300' },
  { value: 'غير مهيأ ويحتاج تدخل جذري', color: 'from-red-500/20 to-red-600/10 border-red-500/40 text-red-300' },
]

const EVALUATION_ROWS = [
  { id: 'external', label: 'المسار الخارجي والدخول', subtitle: '(المواقف، المنحدرات، العتبات)' },
  { id: 'internal', label: 'الحركة الداخلية والأبواب', subtitle: '(اتساع الأبواب، غياب العوائق)' },
  { id: 'restroom', label: 'المرافق الصحية والوضوء', subtitle: '(دورات المياه، الصنابير، المقاعد)' },
  { id: 'equipment', label: 'التجهيزات والخدمات المساندة', subtitle: '(أماكن الصلاة، مصاحف برايل)' },
]

const ITEMS_PER_PAGE = 5

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  }

  const borders = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
  }

  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        bg-white/[0.04] backdrop-blur-2xl border ${borders[type]} 
        rounded-2xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        flex items-center gap-3 min-w-[280px] animate-[slideUp_0.3s_ease-out]`}
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {icons[type]}
      <span className="text-white/90 text-sm font-medium">{message}</span>
    </div>
  )
}

const GlassCard = ({ children, className = '' }) => (
  <div
    className={`bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] 
      rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] relative overflow-hidden
      transition-all duration-500 hover:shadow-[0_8px_48px_rgba(0,0,0,0.5)]
      ${className}`}
  >
    <div className="glass-shimmer absolute inset-0" />
    <div className="relative z-10">{children}</div>
  </div>
)

const GlassInput = ({ label, icon: Icon, type = 'text', value, onChange, placeholder, required, children }) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm text-gray-400 font-medium flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-cyan-400/70" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
    )}
    {children || (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 
          text-white placeholder-gray-500 outline-none transition-all duration-300
          focus:border-cyan-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]
          ${type === 'date' ? 'text-gray-300 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]' : ''}`}
      />
    )}
  </div>
)

const GlassTextarea = ({ label, icon: Icon, value, onChange, placeholder }) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm text-gray-400 font-medium flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-cyan-400/70" />}
        {label}
      </label>
    )}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={4}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 
        text-white placeholder-gray-500 outline-none transition-all duration-300 resize-none
        focus:border-cyan-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
    />
  </div>
)

const Counter = ({ value, onMinus, onPlus }) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={onMinus}
      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] 
        flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] 
        transition-all duration-200 hover:border-cyan-500/30"
    >
      <Minus className="w-4 h-4" />
    </button>
    <span className="text-white text-xl font-bold min-w-[3ch] text-center tabular-nums">{value}</span>
    <button
      type="button"
      onClick={onPlus}
      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] 
        flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] 
        transition-all duration-200 hover:border-cyan-500/30"
    >
      <Plus className="w-4 h-4" />
    </button>
  </div>
)

const SegmentedControl = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-3">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`relative px-5 py-3 rounded-2xl text-sm font-medium transition-all duration-300
          border overflow-hidden group
          ${value === opt.value
            ? `bg-gradient-to-br ${opt.color} shadow-[0_0_30px_rgba(6,182,212,0.15)]`
            : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12]'
          }`}
      >
        <span className="relative z-10">{opt.value}</span>
      </button>
    ))}
  </div>
)

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#0B0F19] border border-white/[0.08] rounded-3xl p-8 max-w-md w-full mx-4 
      shadow-[0_8px_64px_rgba(0,0,0,0.6)]">
      <AlertTriangle className="w-12 h-12 text-amber-400/80 mx-auto mb-4" />
      <p className="text-white text-center text-lg font-medium mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/10 
            border border-red-500/30 text-red-300 font-medium hover:from-red-500/30 hover:to-red-600/20 
            transition-all duration-300"
        >
          تأكيد
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] 
            text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all duration-300"
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
)

export default function App() {
  const [formData, setFormData] = useState({
    visit_date: '',
    facility_name: '',
    region: '',
    facility_type: '',
    cases_count: 0,
    evaluation: EVALUATION_ROWS.reduce((acc, row) => {
      acc[row.id] = { status: '', notes: '' }
      return acc
    }, {}),
    positives: '',
    negatives: '',
    recommendations: '',
    final_classification: '',
  })

  const pdfTemplateRef = useRef(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('الكل')
  const [currentPage, setCurrentPage] = useState(1)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewReport, setViewReport] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const fetchReports = useCallback(async () => {
    setArchiveLoading(true)
    try {
      const sb = getSupabase()
      if (sb) {
        let query = sb.from('field_inspections').select('*').order('created_at', { ascending: false })
        if (filterType !== 'الكل') query = query.eq('facility_type', filterType)
        if (searchTerm.trim()) query = query.ilike('facility_name', `%${searchTerm.trim()}%`)
        const { data, error } = await query
        if (error) throw error
        setReports(data || [])
      } else {
        setReports(localDb.query({ search: searchTerm, type: filterType }))
      }
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching reports:', err)
      showToast('فشل في تحميل التقارير', 'error')
    } finally {
      setArchiveLoading(false)
    }
  }, [searchTerm, filterType, showToast])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEvaluationChange = (rowId, field, value) => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...prev.evaluation,
        [rowId]: { ...prev.evaluation[rowId], [field]: value },
      },
    }))
  }

  const resetForm = () => {
    setFormData({
      visit_date: '',
      facility_name: '',
      region: '',
      facility_type: '',
      cases_count: 0,
      evaluation: EVALUATION_ROWS.reduce((acc, row) => {
        acc[row.id] = { status: '', notes: '' }
        return acc
      }, {}),
      positives: '',
      negatives: '',
      recommendations: '',
      final_classification: '',
    })
    setEditId(null)
  }

  const validateForm = () => {
    if (!formData.visit_date) return 'تاريخ الزيارة مطلوب'
    if (!formData.facility_name.trim()) return 'اسم المسجد / المركز مطلوب'
    return null
  }

  const handleSubmit = async () => {
    const error = validateForm()
    if (error) {
      showToast(error, 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        visit_date: formData.visit_date,
        facility_name: formData.facility_name.trim(),
        region: formData.region,
        facility_type: formData.facility_type,
        cases_count: formData.cases_count,
        evaluation_data: formData.evaluation,
        positives: formData.positives,
        negatives: formData.negatives,
        recommendations: formData.recommendations,
        final_classification: formData.final_classification,
      }

      const sb = getSupabase()
      if (sb) {
        if (editId) {
          const { error: updateError } = await sb.from('field_inspections').update(payload).eq('id', editId)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await sb.from('field_inspections').insert([payload])
          if (insertError) throw insertError
        }
      } else {
        if (editId) {
          localDb.update(editId, payload)
        } else {
          localDb.insert(payload)
        }
      }

      showToast(editId ? 'تم تحديث التقرير بنجاح' : 'تم حفظ التقرير بنجاح', 'success')
      resetForm()
      fetchReports()
    } catch (err) {
      console.error('Error saving report:', err)
      showToast('فشل في حفظ التقرير', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (report) => {
    setFormData({
      visit_date: report.visit_date || '',
      facility_name: report.facility_name || '',
      region: report.region || '',
      facility_type: report.facility_type || '',
      cases_count: report.cases_count || 0,
      evaluation: report.evaluation_data || EVALUATION_ROWS.reduce((acc, row) => {
        acc[row.id] = { status: '', notes: '' }
        return acc
      }, {}),
      positives: report.positives || '',
      negatives: report.negatives || '',
      recommendations: report.recommendations || '',
      final_classification: report.final_classification || '',
    })
    setEditId(report.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showToast('جاري تعديل التقرير', 'warning')
  }

  const handleDelete = async (id) => {
    try {
      const sb = getSupabase()
      if (sb) {
        const { error } = await sb.from('field_inspections').delete().eq('id', id)
        if (error) throw error
      } else {
        localDb.remove(id)
      }
      showToast('تم حذف التقرير بنجاح', 'success')
      fetchReports()
    } catch (err) {
      console.error('Error deleting report:', err)
      showToast('فشل في حذف التقرير', 'error')
    }
    setConfirmDelete(null)
  }

  const exportToPDF = async () => {
    if (!formData.facility_name.trim()) {
      showToast('يرجى إدخال اسم المرفق أولاً', 'warning')
      return
    }
    setPdfExporting(true)
    try {
      const today = new Date().toLocaleDateString('ar-SA')
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = Date.now().toString().slice(-6)
      const evRows = EVALUATION_ROWS.map(row => {
        const ev = formData.evaluation[row.id] || {}
        return { ...row, status: ev.status || '', notes: ev.notes || '' }
      })

      const statusBadge = (status) => {
        if (status === 'جاهز ومناسب') return '<span style="background:#dcfce7;color:#166534;font-weight:700;padding:2px 10px;border:1px solid #86efac;border-radius:2px;font-size:11px;">جاهز ومناسب</span>'
        if (status === 'يحتاج تعديل') return '<span style="background:#fef9c3;color:#854d0e;font-weight:700;padding:2px 10px;border:1px solid #fde047;border-radius:2px;font-size:11px;">يحتاج تعديل</span>'
        return '<span style="color:#9ca3af;font-size:11px;">—</span>'
      }

      const rowBg = (idx, status) => {
        if (status === 'يحتاج تعديل') return 'background:#fefce8;'
        return ''
      }

      const contentOrEmpty = (val) => val && val.trim() ? val : 'لم تسجل ملاحظات إضافية في هذا البند.'

      const el = pdfTemplateRef.current
      if (!el) throw new Error('Template ref not found')

      el.innerHTML = `
<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:'Cairo','Traditional Arabic',Arial,sans-serif;color:#111827;">
  <style>
    .a4-page { padding: 15mm 18mm; }
    .official-table th, .official-table td { border: 1px solid #d1d5db; }
    @media print { body { background:#fff; } }
  </style>
  <div class="a4-page">
    <header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="text-align:right;">
        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">نظام تقييم الوصول الشامل</h1>
        <p style="font-size:16px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p>
      </div>
      <div style="text-align:left;font-size:12px;font-weight:600;color:#374151;">
        <div style="margin-bottom:4px;">رقم التقرير: <span style="font-family:monospace;">${reportNum}</span></div>
        <div style="margin-bottom:4px;">تاريخ الإصدار: <span dir="ltr">${formData.visit_date || todayIso}</span></div>
      </div>
    </header>

    <!-- Section 1: Visit Data -->
    <section style="margin-bottom:20px;">
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">أولاً: بيانات الزيارة والمرفق</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid #d1d5db;padding:14px;background:#f9fafb;">
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:2px;">اسم المرفق / المركز</span>
          <span style="font-size:14px;font-weight:700;color:#111827;">${formData.facility_name || '—'}</span>
        </div>
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:2px;">المنطقة / المحلة</span>
          <span style="font-size:14px;font-weight:700;color:#111827;">${formData.region || '—'}</span>
        </div>
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:2px;">تاريخ الزيارة الميدانية</span>
          <span style="font-size:14px;font-weight:700;color:#111827;" dir="ltr">${formData.visit_date || '—'}</span>
        </div>
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:2px;">إجمالي الحالات المرصودة</span>
          <span style="font-size:14px;font-weight:700;color:#111827;">${formData.cases_count ?? 0} حالة</span>
        </div>
      </div>
    </section>

    <!-- Section 2: Evaluation -->
    <section style="margin-bottom:20px;">
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">ثانياً: نتائج التقييم الميداني</h2>
      <table style="width:100%;text-align:right;font-size:13px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;color:#1f2937;font-weight:700;">
            <th style="padding:10px;width:50%;border:1px solid #d1d5db;">محور التقييم</th>
            <th style="padding:10px;width:25%;text-align:center;border:1px solid #d1d5db;">الحالة الفنية</th>
            <th style="padding:10px;width:25%;border:1px solid #d1d5db;">ملاحظات فريق الرصد</th>
          </tr>
        </thead>
        <tbody>
          ${evRows.map((row, i) => `
            <tr${row.status === 'يحتاج تعديل' ? ' style="background:#fefce8;"' : ''}>
              <td style="padding:10px;border:1px solid #d1d5db;">
                <span style="font-weight:700;display:block;font-size:14px;">${row.label}</span>
                <span style="font-size:11px;color:#4b5563;">${row.subtitle}</span>
              </td>
              <td style="padding:10px;text-align:center;vertical-align:middle;border:1px solid #d1d5db;">${statusBadge(row.status)}</td>
              <td style="padding:10px;color:#4b5563;border:1px solid #d1d5db;${row.notes ? 'font-weight:600;' : ''}">${row.notes || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <!-- Section 3: Detailed Notes -->
    <section style="margin-bottom:24px;border-top:1px solid #d1d5db;padding-top:16px;">
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 16px;border-right:4px solid #1f2937;padding-right:8px;">ثالثاً: التفاصيل الإضافية والتوصيات</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="border:1px solid #d1d5db;">
          <div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;">الإيجابيات والممارسات الجيدة</div>
          <div style="padding:10px 12px;font-size:13px;color:#4b5563;min-height:40px;">${contentOrEmpty(formData.positives)}</div>
        </div>
        <div style="border:1px solid #d1d5db;">
          <div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;">السلبيات والعوائق المرصودة</div>
          <div style="padding:10px 12px;font-size:13px;color:#4b5563;min-height:40px;">${contentOrEmpty(formData.negatives)}</div>
        </div>
        <div style="border:1px solid #d1d5db;">
          <div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;">التوصيات والاحتياجات الفعلية</div>
          <div style="padding:10px 12px;font-size:13px;color:#4b5563;min-height:40px;">${contentOrEmpty(formData.recommendations)}</div>
        </div>
      </div>
    </section>

    <!-- Classification -->
    ${formData.final_classification ? `
    <section style="margin-bottom:24px;">
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">رابعاً: التصنيف النهائي</h2>
      <div style="display:inline-block;padding:6px 16px;font-size:14px;font-weight:700;border-radius:4px;border:1px solid;background:${formData.final_classification === 'مهيأ بالكامل' ? '#dcfce7' : formData.final_classification === 'يحتاج تعديلات بسيطة' ? '#fef9c3' : '#fee2e2'};color:${formData.final_classification === 'مهيأ بالكامل' ? '#166534' : formData.final_classification === 'يحتاج تعديلات بسيطة' ? '#854d0e' : '#991b1b'};border-color:${formData.final_classification === 'مهيأ بالكامل' ? '#86efac' : formData.final_classification === 'يحتاج تعديلات بسيطة' ? '#fde047' : '#fca5a5'};">${formData.final_classification}</div>
    </section>` : ''}

    <!-- Signatures -->
    <section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
      <div style="width:45%;">
        <p style="font-weight:700;color:#1f2937;margin-bottom:24px;">مُعِد التقرير</p>
        <p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع</p>
      </div>
      <div style="width:45%;">
        <p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الاعتماد والمصادقة</p>
        <p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع والختم</p>
      </div>
    </section>
  </div>
</div>`

      // Wait for Cairo font to load
      await document.fonts.ready
      await new Promise(r => setTimeout(r, 500))

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        windowWidth: 794,
        width: 794,
        height: el.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let heightLeft = imgHeight
      let position = 0
      const pageHeight = 297

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        doc.addPage()
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }

      doc.save(`تقرير_${formData.facility_name.replace(/\s+/g, '_')}.pdf`)
      el.innerHTML = ''
      showToast('تم تصدير التقرير PDF بنجاح', 'success')
    } catch (err) {
      console.error('PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const filteredReports = reports
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE))
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const classificationColor = (value) => {
    const found = FINAL_CLASSIFICATIONS.find(c => c.value === value)
    if (!found) return 'text-gray-400'
    if (value === 'مهيأ بالكامل') return 'text-emerald-400'
    if (value === 'يحتاج تعديلات بسيطة') return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* HEADER: Hero Section */}
        <GlassCard className="mb-8 overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
            <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                      border border-cyan-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 
                      rounded-full px-3 py-1">
                      {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                    نظام تقييم الوصول الشامل<br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 to-cyan-500">
                      وحصر الحالات
                    </span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400/70" />
                      قسم ذوي الإعاقة والاحتياجات الخاصة
                    </span>
                    <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 
                      rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      النظام نشط
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] 
                    flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-cyan-400/60" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] 
                    flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400/60" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] 
                    flex items-center justify-center">
                    <Database className="w-6 h-6 text-emerald-400/60" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* SECTION 1: بيانات الزيارة */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">بيانات الزيارة</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput
                label="تاريخ الزيارة"
                icon={Calendar}
                required
              >
                <input
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => handleChange('visit_date', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 
                    text-gray-300 placeholder-gray-500 outline-none transition-all duration-300
                    focus:border-cyan-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                />
              </GlassInput>

              <GlassInput
                label="اسم المسجد / المركز"
                icon={Building2}
                required
                value={formData.facility_name}
                onChange={(e) => handleChange('facility_name', e.target.value)}
                placeholder="أدخل اسم المرفق"
              />

              <GlassInput
                label="المنطقة / المحلة"
                icon={MapPin}
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                placeholder="أدخل المنطقة"
              />

              <GlassInput label="نوع المرفق" icon={ListChecks}>
                <select
                  value={formData.facility_type}
                  onChange={(e) => handleChange('facility_type', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 
                    text-gray-300 outline-none transition-all duration-300 appearance-none cursor-pointer
                    focus:border-cyan-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                >
                  <option value="" disabled className="bg-[#0B0F19]">اختر النوع</option>
                  {FACILITY_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#0B0F19]">{t}</option>
                  ))}
                </select>
              </GlassInput>

              <GlassInput label="عدد الحالات المرصودة" icon={Users}>
                <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2">
                  <Counter
                    value={formData.cases_count}
                    onMinus={() => handleChange('cases_count', Math.max(0, formData.cases_count - 1))}
                    onPlus={() => handleChange('cases_count', formData.cases_count + 1)}
                  />
                </div>
              </GlassInput>
            </div>
          </div>
        </GlassCard>

        {/* SECTION 2: التقييم الميداني */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">التقييم الميداني</h2>
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-right text-sm text-gray-400 font-medium pb-4 pr-4 w-[30%]">المحور</th>
                    <th className="text-right text-sm text-gray-400 font-medium pb-4 px-4 w-[25%]">الحالة</th>
                    <th className="text-right text-sm text-gray-400 font-medium pb-4 pl-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {EVALUATION_ROWS.map((row) => (
                    <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-4 pr-4">
                        <div>
                          <span className="text-white font-medium text-sm">{row.label}</span>
                          <span className="text-gray-500 text-xs block mt-0.5">{row.subtitle}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {['جاهز ومناسب', 'يحتاج تعديل'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleEvaluationChange(row.id, 'status',
                                formData.evaluation[row.id]?.status === status ? '' : status
                              )}
                              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 border
                                ${formData.evaluation[row.id]?.status === status
                                  ? status === 'جاهز ومناسب'
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
                                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pl-4">
                        <input
                          type="text"
                          value={formData.evaluation[row.id]?.notes || ''}
                          onChange={(e) => handleEvaluationChange(row.id, 'notes', e.target.value)}
                          placeholder="ملاحظة سريعة..."
                          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 
                            text-white text-sm placeholder-gray-500 outline-none transition-all
                            focus:border-cyan-500/30 focus:bg-white/[0.05]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card layout for evaluation */}
            <div className="lg:hidden space-y-4">
              {EVALUATION_ROWS.map((row) => (
                <div key={row.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="text-white font-medium text-sm">{row.label}</span>
                    <span className="text-gray-500 text-xs block mt-0.5">{row.subtitle}</span>
                  </div>
                  <div className="flex gap-2">
                    {['جاهز ومناسب', 'يحتاج تعديل'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleEvaluationChange(row.id, 'status',
                          formData.evaluation[row.id]?.status === status ? '' : status
                        )}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                          ${formData.evaluation[row.id]?.status === status
                            ? status === 'جاهز ومناسب'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/[0.03] border-white/[0.06] text-gray-400'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formData.evaluation[row.id]?.notes || ''}
                    onChange={(e) => handleEvaluationChange(row.id, 'notes', e.target.value)}
                    placeholder="ملاحظة سريعة..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 
                      text-white text-sm placeholder-gray-500 outline-none transition-all
                      focus:border-cyan-500/30 focus:bg-white/[0.05]"
                  />
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* SECTION 3: الملاحظات النوعية */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">الملاحظات النوعية</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassTextarea
                label="الإيجابيات والممارسات الجيدة"
                icon={ThumbsUp}
                value={formData.positives}
                onChange={(e) => handleChange('positives', e.target.value)}
                placeholder="سجل الإيجابيات والملاحظات الجيدة..."
              />
              <GlassTextarea
                label="السلبيات والعوائق"
                icon={ThumbsDown}
                value={formData.negatives}
                onChange={(e) => handleChange('negatives', e.target.value)}
                placeholder="سجل السلبيات والعوائق..."
              />
            </div>
          </div>
        </GlassCard>

        {/* SECTION 4: التوصيات */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">التوصيات</h2>
            </div>
            <GlassTextarea
              label="التوصيات والاحتياجات الفعلية"
              icon={Star}
              value={formData.recommendations}
              onChange={(e) => handleChange('recommendations', e.target.value)}
              placeholder="أكتب التوصيات والاحتياجات..."
            />
          </div>
        </GlassCard>

        {/* SECTION 5: التصنيف النهائي */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">التصنيف النهائي</h2>
            </div>
            <SegmentedControl
              options={FINAL_CLASSIFICATIONS}
              value={formData.final_classification}
              onChange={(v) => handleChange('final_classification', v)}
            />
          </div>
        </GlassCard>

        {/* SAVE ACTIONS */}
        <GlassCard className="mb-6 sticky bottom-4 z-40">
          <div className="px-6 sm:px-10 py-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {editId && (
                  <span className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 
                    rounded-full px-3 py-1">
                    تعديل التقرير #{editId}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] 
                    text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] 
                    transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  تفريغ النموذج
                </button>
                <button
                  type="button"
                  onClick={exportToPDF}
                  disabled={pdfExporting}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] 
                    text-gray-400 font-medium hover:text-amber-400 hover:border-amber-500/30 
                    hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-4 h-4" />
                  {pdfExporting ? 'جاري التصدير...' : 'PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 
                    border border-cyan-500/30 text-cyan-300 font-medium 
                    hover:from-cyan-500/30 hover:to-cyan-600/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]
                    transition-all duration-300 flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'جاري الحفظ...' : editId ? 'تحديث التقرير' : 'حفظ التقرير'}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ARCHIVE SECTION */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 
                border border-cyan-500/30 flex items-center justify-center">
                <Archive className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">أرشيف التقارير</h2>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="البحث باسم المرفق..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pr-11 pl-4 py-3 
                    text-white placeholder-gray-500 outline-none transition-all duration-300
                    focus:border-cyan-500/50 focus:bg-white/[0.06]"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['الكل', ...FACILITY_TYPES].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 border
                      ${filterType === type
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            {archiveLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">جاري تحميل التقارير...</p>
                  </div>
                ) : paginatedReports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">لا توجد تقارير بعد</p>
                    <p className="text-gray-600 text-sm mt-2">قم بإضافة تقرير جديد للبدء</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedReports.map((report) => (
                        <div
                          key={report.id}
                          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 
                            hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-white font-bold text-base truncate">
                                  {report.facility_name || '—'}
                                </h3>
                                <span className={`text-xs font-medium ${classificationColor(report.final_classification)}`}>
                                  {report.final_classification || 'غير مصنف'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(report.visit_date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {report.region || '—'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {report.facility_type || '—'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {report.cases_count ?? 0} حالة
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {report.created_at ? new Date(report.created_at).toLocaleDateString('ar-SA') : '—'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewReport(report)}
                                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                                  flex items-center justify-center text-gray-400 hover:text-cyan-400 
                                  hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(report)}
                                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                                  flex items-center justify-center text-gray-400 hover:text-amber-400 
                                  hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(report.id)}
                                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                                  flex items-center justify-center text-gray-400 hover:text-red-400 
                                  hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                            flex items-center justify-center text-gray-400 disabled:opacity-30 
                            hover:text-white hover:bg-white/[0.06] transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                              ${currentPage === page
                                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                                : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                            flex items-center justify-center text-gray-400 disabled:opacity-30 
                            hover:text-white hover:bg-white/[0.06] transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )
              }
          </div>
        </GlassCard>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmationModal
          message="هل أنت متأكد من حذف هذا التقرير؟"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* View Report Modal */}
      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[85vh] 
            overflow-y-auto shadow-[0_8px_64px_rgba(0,0,0,0.6)]">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">تفاصيل التقرير</h3>
                <button
                  type="button"
                  onClick={() => setViewReport(null)}
                  className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                    flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">اسم المرفق</span>
                    <span className="text-white font-medium">{viewReport.facility_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">تاريخ الزيارة</span>
                    <span className="text-white font-medium">{formatDate(viewReport.visit_date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">المنطقة</span>
                    <span className="text-white font-medium">{viewReport.region || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">النوع</span>
                    <span className="text-white font-medium">{viewReport.facility_type || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">عدد الحالات</span>
                    <span className="text-white font-medium">{viewReport.cases_count ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">التصنيف النهائي</span>
                    <span className={`font-medium ${classificationColor(viewReport.final_classification)}`}>
                      {viewReport.final_classification || 'غير مصنف'}
                    </span>
                  </div>
                </div>

                {viewReport.evaluation_data && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-2">التقييم الميداني</span>
                    <div className="space-y-2">
                      {EVALUATION_ROWS.map((row) => {
                        const ev = viewReport.evaluation_data[row.id]
                        return (
                          <div key={row.id} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                            <span className="text-white text-sm font-medium">{row.label}</span>
                            <div className="flex items-center gap-3 mt-1">
                              {ev?.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border
                                  ${ev.status === 'جاهز ومناسب' 
                                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                                    : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                  }`}>
                                  {ev.status}
                                </span>
                              )}
                              {ev?.notes && (
                                <span className="text-gray-400 text-xs">{ev.notes}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {viewReport.positives && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">الإيجابيات</span>
                    <p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                      {viewReport.positives}
                    </p>
                  </div>
                )}

                {viewReport.negatives && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">السلبيات</span>
                    <p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                      {viewReport.negatives}
                    </p>
                  </div>
                )}

                {viewReport.recommendations && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">التوصيات</span>
                    <p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                      {viewReport.recommendations}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewReport(null)}
                className="w-full mt-6 px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] 
                  text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Template */}
      <div
        ref={pdfTemplateRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: '794px',
          overflow: 'hidden',
          zIndex: -1,
        }}
      />

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  )
}
