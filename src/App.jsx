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
  BarChart3,
} from 'lucide-react'

// SUPABASE CONFIGURATION
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gffszrqotpzdztpltivr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WrJUBB1n_Zdb0m6h6exTHQ_nfL59WS2'

const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

// LOCAL STORAGE LAYER
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
      data = data.filter(r =>
        (r.mosque_name || r.facility_name || r.full_name || '').toLowerCase().includes(s)
      )
    }
    if (type && type !== 'الكل') {
      data = data.filter(r => r.recordType === type)
    }
    return data
  },
}

const FACILITY_NAMES = [
  'دورات المياه وأماكن الوضوء', 'مدخل المسجد',
  'المنحدرات وممرات ذوي الإعاقة', 'نظام الصوت',
  'مسارات الحركة', 'أماكن مخصصة للكراسي المتحركة',
  'اللوحات والوسائل الإرشادية', 'الوسائل المساعدة',
  'التجهيزات الأخرى',
]

const FACILITY_DESCRIPTIONS = {
  'دورات المياه وأماكن الوضوء': 'مدى ملاءمة دورات المياه وأماكن الوضوء لاستخدام الأشخاص ذوي الإعاقة',
  'مدخل المسجد': 'سهولة الوصول إلى المسجد وخلو المدخل من العوائق',
  'المنحدرات وممرات ذوي الإعاقة': 'توفر المنحدرات والممرات وسهولة استخدامها',
  'نظام الصوت': 'وضوح الصوت داخل المسجد بما يخدم جميع المصلين',
  'مسارات الحركة': 'توفر مسارات حركة مناسبة لذوي الإعاقة',
  'أماكن مخصصة للكراسي المتحركة': 'وجود أماكن مخصصة للكراسي المتحركة',
  'اللوحات والوسائل الإرشادية': 'توفر لوحات ووسائل إرشادية مناسبة',
  'الوسائل المساعدة': 'توفر وسائل مساعدة عند الحاجة',
  'التجهيزات الأخرى': 'أي تجهيزات أخرى تخدم الأشخاص ذوي الإعاقة',
}

const FACILITY_STATUSES = ['مناسب', 'يحتاج تحسين', 'غير متوفر', 'لا ينطبق']

const FACILITY_STATUS_COLORS = {
  'مناسب': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  'يحتاج تحسين': 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  'غير متوفر': 'bg-red-500/20 border-red-500/40 text-red-300',
  'لا ينطبق': 'bg-gray-500/20 border-gray-500/40 text-gray-300',
}

const DISABILITY_TYPES = ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'متعددة', 'أخرى']
const MARITAL_STATUSES = ['أعزب', 'متزوج', 'مطلق', 'أرمل']
const EDUCATION_LEVELS = ['غير متعلم', 'ابتدائي', 'متوسط', 'ثانوي', 'جامعي', 'دراسات عليا']
const EMPLOYMENT_STATUSES = ['يعمل', 'لا يعمل']
const YES_NO_OPTIONS = [
  { value: 'نعم', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300' },
  { value: 'لا', color: 'from-red-500/20 to-red-600/10 border-red-500/40 text-red-300' },
]
const NEED_OPTIONS = ['كرسي متحرك', 'علاج', 'أجهزة طبية', 'دعم مالي', 'ترميم منزل', 'تدريب مهني', 'نقل', 'علاج طبيعي', 'دعم نفسي', 'كفالة شهرية']

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
      style={{ animation: 'slideUp 0.3s ease-out' }}
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
          ${type === 'date' || type === 'time' ? 'text-gray-300 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]' : ''}`}
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

let FACILITY_EVALUATIONS_TEMP = {}
const makeEmptyFacilityEvals = () => {
  const obj = {}
  FACILITY_NAMES.forEach(n => { obj[n] = { status: '', notes: '' } })
  return obj
}

export default function App() {
  const [mosqueForm, setMosqueForm] = useState(() => ({
    recordType: 'mosque',
    mosque_name: '', region: '', visit_date: '',
    facility_evaluations: makeEmptyFacilityEvals(),
    general_notes: '', recommendations: '',
  }))

  const [disabilityForm, setDisabilityForm] = useState({
    recordType: 'disability',
    full_name: '', gender: '', age: '', marital_status: '', phone: '', residence_area: '',
    disability_type: '', disability_degree: '', disability_cause: '',
    is_permanent: '', uses_wheelchair: '',
    education_level: '', is_studying: '', last_qualification: '',
    needs: [], other_needs: '', general_notes: '',
  })

  const [activeTab, setActiveTab] = useState('tab1')

  const currentForm = activeTab === 'tab1' ? mosqueForm : disabilityForm
  const pdfTemplateRef = useRef(null)
  const mosquePdfRef = useRef(null)
  const disabilityPdfRef = useRef(null)
  const dashboardPdfRef = useRef(null)
  const [reports, setReports] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewReport, setViewReport] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [mosquePage, setMosquePage] = useState(1)
  const [disabilityPage, setDisabilityPage] = useState(1)
  const [mosqueSearch, setMosqueSearch] = useState('')
  const [disabilitySearch, setDisabilitySearch] = useState('')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [dashboardStats, setDashboardStats] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const fetchReports = useCallback(async () => {
    setArchiveLoading(true)
    try {
      const sb = getSupabase()
      let data = null
      if (sb) {
        try {
          const q = sb.from('field_inspections').select('*').order('created_at', { ascending: false })
          const res = await q
          if (res.error) throw res.error
          data = res.data
        } catch (e) {
          console.warn('Supabase fetch failed, reading from localStorage:', e)
        }
      }
      setReports(data || localDb.getAll().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error('Error fetching reports:', err)
      showToast('فشل في تحميل التقارير', 'error')
    } finally {
      setArchiveLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleChange = (field, value) => {
    const setter = activeTab === 'tab1' ? setMosqueForm : setDisabilityForm
    setter(prev => ({ ...prev, [field]: value }))
  }

  const handleFacilityEvalChange = (facilityName, field, value) => {
    setMosqueForm(prev => ({
      ...prev,
      facility_evaluations: {
        ...prev.facility_evaluations,
        [facilityName]: { ...prev.facility_evaluations[facilityName], [field]: value },
      },
    }))
  }

  const handleNeedToggle = (need) => {
    setDisabilityForm(prev => {
      const needs = prev.needs.includes(need)
        ? prev.needs.filter(n => n !== need)
        : [...prev.needs, need]
      return { ...prev, needs }
    })
  }

  // eslint-disable-next-line no-unused-vars
  const calcPercentage = useCallback(() => {
    return 0
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  const resetForm = () => {
    if (activeTab === 'tab1') {
      setMosqueForm({
        recordType: 'mosque',
        mosque_name: '', region: '', visit_date: '',
        facility_evaluations: makeEmptyFacilityEvals(),
        general_notes: '', recommendations: '',
      })
    } else {
      setDisabilityForm({
        recordType: 'disability',
    full_name: '', gender: '', age: '', marital_status: '', phone: '', residence_area: '',
        disability_type: '', disability_degree: '', disability_cause: '',
        is_permanent: '', uses_wheelchair: '',
        education_level: '', is_studying: '', last_qualification: '',
        needs: [], other_needs: '', general_notes: '',
      })
    }
    setEditId(null)
  }

  const validateForm = () => {
    if (currentForm.recordType === 'mosque') {
      if (!currentForm.visit_date) return 'تاريخ الزيارة مطلوب'
      if (!currentForm.mosque_name.trim()) return 'اسم المسجد مطلوب'
    } else {
      if (!currentForm.full_name.trim()) return 'الاسم الرباعي مطلوب'
    }
    return null
  }

  const handleSubmit = async () => {
    const error = validateForm()
    if (error) { showToast(error, 'error'); return }
    setSubmitting(true)
    try {
      const f = activeTab === 'tab1' ? mosqueForm : disabilityForm
      const payload = { ...f }
      const sb = getSupabase()
      let saved = false
      if (sb) {
        try {
          if (editId) {
            const { error: updateError } = await sb.from('field_inspections').update(payload).eq('id', editId)
            if (updateError) throw updateError
          } else {
            const { error: insertError } = await sb.from('field_inspections').insert([payload])
            if (insertError) throw insertError
          }
          saved = true
        } catch (e) {
          console.warn('Supabase failed, falling back to localStorage:', e)
        }
      }
      if (!saved) {
        if (editId) localDb.update(editId, payload)
        else localDb.insert(payload)
      }
      showToast(editId ? 'تم تحديث التقرير بنجاح' : 'تم حفظ التقرير بنجاح', 'success')
      resetForm()
      setReports(localDb.getAll().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error('Error saving report:', err)
      showToast('فشل في حفظ التقرير', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (report) => {
    const isMosque = report.recordType === 'mosque'
    if (isMosque) {
      setMosqueForm({
        recordType: 'mosque',
        mosque_name: report.mosque_name || '',
        region: report.region || '', visit_date: report.visit_date || '',
        facility_evaluations: report.facility_evaluations || makeEmptyFacilityEvals(),
        general_notes: report.general_notes || '', recommendations: report.recommendations || '',
      })
    } else {
      setDisabilityForm({
        recordType: 'disability',
        full_name: report.full_name || '', gender: report.gender || '', age: report.age || '',
        marital_status: report.marital_status || '', phone: report.phone || '',
        residence_area: report.residence_area || '',
        disability_type: report.disability_type || '', disability_degree: report.disability_degree || '',
        disability_cause: report.disability_cause || '',
        is_permanent: report.is_permanent || '', uses_wheelchair: report.uses_wheelchair || '',
        education_level: report.education_level || '', is_studying: report.is_studying || '',
        last_qualification: report.last_qualification || '',
        needs: report.needs || [], other_needs: report.other_needs || '',
        general_notes: report.general_notes || '',
      })
    }
    setActiveTab(isMosque ? 'tab1' : 'tab2')
    setEditId(report.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showToast('جاري تعديل التقرير', 'warning')
  }

  const handleDelete = async (id) => {
    try {
      const sb = getSupabase()
      let deleted = false
      if (sb) {
        try {
          const { error } = await sb.from('field_inspections').delete().eq('id', id)
          if (error) throw error
          deleted = true
        } catch (e) {
          console.warn('Supabase delete failed, falling back to localStorage:', e)
        }
      }
      if (!deleted) localDb.remove(id)
      showToast('تم حذف التقرير بنجاح', 'success')
      setReports(localDb.getAll().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error('Error deleting report:', err)
      showToast('فشل في حذف التقرير', 'error')
    }
    setConfirmDelete(null)
  }

  const capturePdfFromRef = async (ref, filename) => {
    const el = ref.current
    if (!el) throw new Error('Template ref not found')
    await document.fonts.ready
    await new Promise(r => setTimeout(r, 500))
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 794, width: 794, height: el.scrollHeight })
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
    doc.save(filename)
    el.innerHTML = ''
    showToast('تم تصدير PDF بنجاح', 'success')
  }

  const getStatusBadge = (status) => {
    const colors = {
      'مناسب': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      'يحتاج تحسين': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
      'غير متوفر': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
      'لا ينطبق': { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
    }
    const c = colors[status] || { bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb' }
    return `<span style="background:${c.bg};color:${c.text};border:1px solid ${c.border};font-weight:700;padding:2px 10px;border-radius:2px;font-size:11px;">${status || '\u2014'}</span>`
  }

  const exportMosquePDF = async () => {
    const f = mosqueForm
    if (!f.mosque_name.trim()) { showToast('يرجى إدخال اسم المسجد أولاً', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = Date.now().toString().slice(-6)
      const facilities = FACILITY_NAMES.map(name => {
        const ev = f.facility_evaluations[name] || {}
        return { name, status: ev.status || '', notes: ev.notes || '' }
      })
      const desc = (name) => FACILITY_DESCRIPTIONS[name] || ''
      const contentOrEmpty = (val) => val && val.trim() ? val : 'لم تسجل ملاحظات إضافية.'
      const c = (val) => val && val.trim() ? val : '\u2014'
      const el = mosquePdfRef.current
      if (!el) throw new Error('Template ref not found')

      el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>
.a4-page{padding:15mm 18mm;position:relative}
.page-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px;}
@media print{body{background:#fff}}
</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:12px;"><div style="width:55px;height:55px;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#6b7280;font-weight:700;border:2px solid #d1d5db;">شعار<br/>الجهة</div>
<div style="text-align:right;"><h1 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 2px;">نظام تقييم الوصول الشامل</h1><p style="font-size:13px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div></div>
<div style="text-align:left;font-size:11px;font-weight:600;color:#374151;"><div>رقم التقرير: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ الإصدار: <span dir="ltr">${f.visit_date || todayIso}</span></div></div>
</header>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">أولاً: بيانات الزيارة والمرفق</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">اسم المرفق / المركز</span><span style="font-size:14px;font-weight:700;color:#111827;">${f.mosque_name || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">المنطقة / المحلة</span><span style="font-size:14px;font-weight:700;">${f.region || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">تاريخ الزيارة الميدانية</span><span style="font-size:14px;font-weight:700;">${f.visit_date || '\u2014'}</span></div>
</div>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثانياً: نتائج التقييم الميداني</h2>
<table style="width:100%;text-align:right;font-size:11px;border-collapse:collapse;">
<thead><tr style="background:#f3f4f6;color:#1f2937;font-weight:700;"><th style="padding:7px;border:1px solid #d1d5db;width:50%;">محور التقييم</th><th style="padding:7px;border:1px solid #d1d5db;text-align:center;width:25%;">الحالة الفنية</th><th style="padding:7px;border:1px solid #d1d5db;">ملاحظات فريق الرصد</th></tr></thead>
<tbody>${facilities.map((f, i) => `<tr><td style="padding:6px;border:1px solid #d1d5db;"><div style="font-weight:700;font-size:11px;color:#111827;">${f.name}</div><div style="font-weight:400;color:#6b7280;font-size:10px;margin-top:2px;">${desc(f.name)}</div></td><td style="padding:6px;border:1px solid #d1d5db;text-align:center;">${getStatusBadge(f.status)}</td><td style="padding:6px;border:1px solid #d1d5db;color:#4b5563;">${c(f.notes)}</td></tr>`).join('')}</tbody>
</table>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثالثاً: التفاصيل الإضافية والتوصيات</h2>
<div style="border:1px solid #d1d5db;margin-bottom:8px;">
<div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;font-size:12px;">الإيجابيات والممارسات الجيدة</div>
<div style="padding:10px 12px;font-size:12px;color:#4b5563;min-height:30px;">${contentOrEmpty(f.general_notes)}</div>
</div>
<div style="border:1px solid #d1d5db;">
<div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;font-size:12px;">التوصيات والاحتياجات الفعلية</div>
<div style="padding:10px 12px;font-size:12px;color:#4b5563;min-height:30px;">${contentOrEmpty(f.recommendations)}</div>
</div>
</section>

<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">مُعِد التقرير</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________ الختم: _______________</p></div>
</section>

<div class="page-footer"><span>قسم ذوي الإعاقة والاحتياجات الخاصة</span><span>صفحة 1 من 1</span></div>
</div></div>`

      await capturePdfFromRef(mosquePdfRef, `تقييم_مسجد_${f.mosque_name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const exportDisabilityPDF = async () => {
    const f = disabilityForm
    if (!f.full_name.trim()) { showToast('يرجى إدخال الاسم الرباعي أولاً', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = Date.now().toString().slice(-6)
      const c = (val) => val && val.trim() ? val : '\u2014'
      const yn = (v) => v === 'نعم' ? 'نعم' : 'لا'
      const needsList = f.needs?.length > 0 ? f.needs.join(' - ') : '\u2014'
      const el = disabilityPdfRef.current
      if (!el) throw new Error('Template ref not found')

      el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>
.a4-page{padding:15mm 18mm;position:relative}
.page-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px;}
.logo-placeholder{width:55px;height:55px;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#6b7280;font-weight:700;border:2px solid #d1d5db;}
@media print{body{background:#fff}}
</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:12px;">
<div class="logo-placeholder">شعار<br/>الجهة</div>
<div style="text-align:right;"><h1 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 2px;">استمارة تقييم حالة ذوي الإعاقة</h1><p style="font-size:13px;font-weight:600;color:#374151;margin:0;">قسم الرصد والتقييم الميداني</p></div>
</div>
<div style="text-align:left;font-size:11px;font-weight:600;color:#374151;"><div>رقم الاستمارة: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ الرصد: <span dir="ltr">${todayIso}</span></div></div>
</header>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">أولاً: البيانات الأساسية والشخصية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">مكان رصد الحالة</span><span style="font-size:14px;font-weight:700;color:#111827;">${f.residence_area || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">الاسم الرباعي</span><span style="font-size:14px;font-weight:700;color:#111827;">${f.full_name}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">رقم الهاتف (إن وجد)</span><span style="font-size:14px;font-weight:700;">${f.phone || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">الجنس</span><span style="font-size:14px;font-weight:700;">${f.gender || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">العمر</span><span style="font-size:14px;font-weight:700;">${f.age || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">منطقة السكن</span><span style="font-size:14px;font-weight:700;">${f.residence_area || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">الحالة الاجتماعية</span><span style="font-size:14px;font-weight:700;">${f.marital_status || '\u2014'}</span></div>
</div>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثانياً: بيانات الإعاقة</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">نوع الإعاقة</span><span style="font-size:14px;font-weight:700;color:#111827;">${f.disability_type || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">درجة الإعاقة</span><span style="font-size:14px;font-weight:700;">${f.disability_degree || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">سبب الإعاقة</span><span style="font-size:14px;font-weight:700;">${c(f.disability_cause)}</span></div>
</div>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثالثاً: الحالة التعليمية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">المستوى التعليمي</span><span style="font-size:14px;font-weight:700;color:#111827;">${f.education_level || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">هل يدرس حالياً؟</span><span style="font-size:14px;font-weight:700;">${yn(f.is_studying)}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">آخر مؤهل دراسي</span><span style="font-size:14px;font-weight:700;">${c(f.last_qualification)}</span></div>
</div>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">رابعاً: الاحتياجات والمتطلبات</h2>
<div style="border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div style="margin-bottom:8px;"><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;margin-bottom:6px;">الاحتياجات الأساسية:</span><div style="display:flex;flex-wrap:wrap;gap:4px;">${needsList}</div></div>
<div style="border-top:1px solid #d1d5db;padding-top:8px;margin-top:8px;"><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">احتياجات أخرى (اذكرها)</span><span style="font-size:14px;font-weight:700;">${c(f.other_needs)}</span></div>
</div>
</section>

<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">خامساً: الملاحظات العامة</h2>
<div style="border:1px solid #d1d5db;padding:12px;background:#f9fafb;min-height:40px;">
<div style="font-size:12px;color:#4b5563;line-height:1.6;">${c(f.general_notes)}</div>
</div>
</section>

<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">مُعِد الاستمارة / الباحث</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________ الختم: _______________</p></div>
</section>

<div class="page-footer"><span>قسم ذوي الإعاقة والاحتياجات الخاصة</span><span>صفحة 1 من 1</span></div>
</div></div>`

      await capturePdfFromRef(disabilityPdfRef, `تقييم_حالة_${f.full_name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const exportFromArchive = async (report) => {
    const isMosque = report.recordType === 'mosque'
    if (isMosque && !report.mosque_name) { showToast('بيانات التقرير غير مكتملة', 'warning'); return }
    if (!isMosque && !report.full_name) { showToast('بيانات التقرير غير مكتملة', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = String(report.id).slice(-6)
      const c = (val) => val && val.trim() ? val : '\u2014'
      const el = pdfTemplateRef.current
      if (!el) throw new Error('Template ref not found')

      if (isMosque) {
        const facilities = FACILITY_NAMES.map(name => {
          const ev = (report.facility_evaluations || {})[name] || {}
          return { name, status: ev.status || '', notes: ev.notes || '' }
        })
        const desc = (name) => FACILITY_DESCRIPTIONS[name] || ''
        const c2 = (val) => val && val.trim() ? val : '\u2014'
        el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>
.a4-page{padding:15mm 18mm;position:relative}
.page-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px;}
@media print{body{background:#fff}}
</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:12px;"><div style="width:55px;height:55px;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#6b7280;font-weight:700;border:2px solid #d1d5db;">شعار<br/>الجهة</div>
<div style="text-align:right;"><h1 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 2px;">نظام تقييم الوصول الشامل</h1><p style="font-size:13px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div></div>
<div style="text-align:left;font-size:11px;font-weight:600;color:#374151;"><div>رقم التقرير: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ الإصدار: <span dir="ltr">${report.visit_date || todayIso}</span></div></div>
</header>
<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">أولاً: بيانات الزيارة والمرفق</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">اسم المرفق / المركز</span><span style="font-size:14px;font-weight:700;color:#111827;">${report.mosque_name || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">المنطقة / المحلة</span><span style="font-size:14px;font-weight:700;">${report.region || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:11px;">تاريخ الزيارة الميدانية</span><span style="font-size:14px;font-weight:700;">${report.visit_date || '\u2014'}</span></div>
</div>
</section>
<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثانياً: نتائج التقييم الميداني</h2>
<table style="width:100%;text-align:right;font-size:11px;border-collapse:collapse;">
<thead><tr style="background:#f3f4f6;color:#1f2937;font-weight:700;"><th style="padding:7px;border:1px solid #d1d5db;width:50%;">محور التقييم</th><th style="padding:7px;border:1px solid #d1d5db;text-align:center;width:25%;">الحالة الفنية</th><th style="padding:7px;border:1px solid #d1d5db;">ملاحظات فريق الرصد</th></tr></thead>
<tbody>${facilities.map((f, i) => `<tr><td style="padding:6px;border:1px solid #d1d5db;"><div style="font-weight:700;font-size:11px;color:#111827;">${f.name}</div><div style="font-weight:400;color:#6b7280;font-size:10px;margin-top:2px;">${desc(f.name)}</div></td><td style="padding:6px;border:1px solid #d1d5db;text-align:center;">${getStatusBadge(f.status)}</td><td style="padding:6px;border:1px solid #d1d5db;color:#4b5563;">${c2(f.notes)}</td></tr>`).join('')}</tbody>
</table>
</section>
<section style="margin-bottom:18px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">ثالثاً: التفاصيل الإضافية والتوصيات</h2>
<div style="border:1px solid #d1d5db;margin-bottom:8px;">
<div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;font-size:12px;">الإيجابيات والممارسات الجيدة</div>
<div style="padding:10px 12px;font-size:12px;color:#4b5563;min-height:30px;">${c2(report.general_notes)}</div>
</div>
<div style="border:1px solid #d1d5db;">
<div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;font-size:12px;">التوصيات والاحتياجات الفعلية</div>
<div style="padding:10px 12px;font-size:12px;color:#4b5563;min-height:30px;">${c2(report.recommendations)}</div>
</div>
</section>
<section style="margin-top:30px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">مُعِد التقرير</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:18px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________ الختم: _______________</p></div>
</section>
<div class="page-footer"><span>قسم ذوي الإعاقة والاحتياجات الخاصة</span><span>صفحة 1 من 1</span></div>
</div></div>`
      } else {
        const needsList = report.needs?.length > 0 ? report.needs.join(' - ') : '\u2014'
        const c2 = (val) => val && val.trim() ? val : '\u2014'
        el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>
.a4-page{padding:15mm 18mm;position:relative}
.page-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px;}
@media print{body{background:#fff}}
</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:12px;">
<div style="width:60px;height:60px;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#6b7280;font-weight:700;border:2px solid #d1d5db;">شعار<br/>الجهة</div>
<div style="text-align:right;"><h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">استمارة تقييم حالة ذوي الإعاقة</h1><p style="font-size:14px;font-weight:600;color:#374151;margin:0;">قسم الرصد والتقييم الميداني</p></div>
</div>
<div style="text-align:left;font-size:11px;font-weight:600;color:#374151;"><div>رقم الاستمارة: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ الرصد: <span dir="ltr">${todayIso}</span></div></div>
</header>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">أولاً: البيانات الأساسية والشخصية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;">
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">مكان رصد الحالة</span><span style="font-size:13px;font-weight:700;">${report.residence_area || '\u2014'}</span></div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الاسم الرباعي</span><span style="font-size:13px;font-weight:700;">${report.full_name || '\u2014'}</span></div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الجنس</span>${report.gender || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">العمر</span>${report.age || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">رقم الهاتف</span>${report.phone || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الحالة الاجتماعية</span>${report.marital_status || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">منطقة السكن</span>${report.residence_area || '\u2014'}</div>
</div>
</section>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">ثانياً: بيانات الإعاقة</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">نوع الإعاقة</span>${c2(report.disability_type)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">درجة الإعاقة</span>${c2(report.disability_degree)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">سبب الإعاقة</span>${c2(report.disability_cause)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">إعاقة دائمة؟</span>${report.is_permanent === 'نعم' ? 'نعم' : 'لا'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">يستخدم كرسي متحرك؟</span>${report.uses_wheelchair === 'نعم' ? 'نعم' : 'لا'}</div>
</div>
</section>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">ثالثاً: المعلومات الطبية والصحية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الأمراض المزمنة</span>${c2(report.chronic_diseases)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الأدوية المستخدمة</span>${c2(report.medications)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">القدرة على الحركة</span>${c2(report.mobility)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">ملاحظات صحية</span>${c2(report.health_notes)}</div>
</div>
</section>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">رابعاً: المستوى التعليمي والمهني</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;">
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">المستوى التعليمي</span>${c2(report.education_level)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">يدرس حالياً؟</span>${report.is_studying === 'نعم' ? 'نعم' : 'لا'}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">آخر مؤهل دراسي</span>${c2(report.last_qualification)}</div>
</div>
</section>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">خامساً: الاحتياجات والخدمات المطلوبة</h2>
<div style="border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;">
<div style="margin-bottom:6px;"><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">الاحتياجات</span>${needsList}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;font-size:10px;">احتياجات أخرى</span>${c2(report.other_needs)}</div>
</div>
</section>

<section style="margin-bottom:14px;">
<h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0 0 8px;border-right:4px solid #1f2937;padding-right:8px;">سادساً: التوصيات والملاحظات</h2>
<div style="border:1px solid #d1d5db;padding:10px;background:#f9fafb;font-size:11px;min-height:40px;">
${c2(report.general_notes)}
</div>
</section>

<section style="margin-top:30px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:20px;">المُقيم / الباحث</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:20px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:11px;color:#4b5563;">الاسم: _______________ التوقيع: _______________</p><p style="font-size:10px;color:#9ca3af;margin-top:4px;">التاريخ: _______________ الختم: _______________</p></div>
</section>

<div class="page-footer"><span>قسم ذوي الإعاقة والاحتياجات الخاصة</span><span>صفحة 1 من 1</span></div>
</div></div>`
      }

      const pdfName = isMosque
        ? `تقييم_مسجد_${(report.mosque_name || 'report').replace(/\s+/g, '_')}`
        : `تقييم_حالة_${(report.full_name || 'report').replace(/\s+/g, '_')}`
      await capturePdfFromRef(pdfTemplateRef, `${pdfName}.pdf`)
    } catch (err) {
      console.error('Archive PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const generateDashboardReport = () => {
    if (!reportStartDate || !reportEndDate) {
      showToast('يرجى تحديد تاريخ البداية والنهاية', 'error')
      return
    }
    const start = new Date(reportStartDate)
    const end = new Date(reportEndDate)
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    if (diffDays < 5) { showToast('مدة التقرير يجب ألا تقل عن 5 أيام', 'error'); return }
    if (diffDays > 30) { showToast('مدة التقرير يجب ألا تزيد عن 30 يوماً', 'error'); return }

    const filtered = reports.filter(r => {
      const dateStr = r.visit_date || r.created_at
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d >= start && d <= end
    })

    const mosques = filtered.filter(r => r.recordType === 'mosque')
    const disabilities = filtered.filter(r => r.recordType === 'disability')

    const statusCounts = { 'مناسب': 0, 'يحتاج تحسين': 0, 'غير متوفر': 0, 'لا ينطبق': 0 }
    mosques.forEach(m => {
      if (m.facility_evaluations) {
        Object.values(m.facility_evaluations).forEach(ev => {
          if (ev.status && statusCounts[ev.status] !== undefined) statusCounts[ev.status]++
        })
      }
    })

    const typeCounts = {}
    disabilities.forEach(d => {
      if (d.disability_type) typeCounts[d.disability_type] = (typeCounts[d.disability_type] || 0) + 1
    })
    const topDisabilityTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

    const needCounts = {}
    disabilities.forEach(d => {
      if (d.needs) d.needs.forEach(need => { needCounts[need] = (needCounts[need] || 0) + 1 })
    })
    const topNeeds = Object.entries(needCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

    setDashboardStats({
      totalMosques: mosques.length,
      totalDisabilities: disabilities.length,
      totalFieldVisits: filtered.length,
      readyCount: statusCounts['مناسب'],
      needsImprovement: statusCounts['يحتاج تحسين'],
      notAvailable: statusCounts['غير متوفر'],
      notApplicable: statusCounts['لا ينطبق'],
      topDisabilityTypes,
      topNeeds,
      startDate: reportStartDate,
      endDate: reportEndDate,
      diffDays,
    })
    showToast('تم توليد التقرير بنجاح', 'success')
  }

  const exportDashboardPDF = async () => {
    if (!dashboardStats) { showToast('يرجى توليد التقرير أولاً', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportRef = `REP-${dashboardStats.startDate.slice(0, 7).replace('-', '')}-M`
      const fmt = (s) => s ? new Date(s).toLocaleDateString('ar-EG') : '—'
      const c = (v) => v ?? 0
      const el = dashboardPdfRef.current
      if (!el) throw new Error('Dashboard template ref not found')

      const topTypesHtml = dashboardStats.topDisabilityTypes.map(([t, n]) =>
        `<div style="display:table-row;" class="list-item"><div style="display:table-cell;font-weight:700;color:#4b5563;padding:2px 0;">${t}</div><div style="display:table-cell;text-align:center;font-weight:700;width:30%;">${n} حالة</div></div>`
      ).join('') || '<div style="padding:4px;color:#9ca3af;">لا توجد بيانات</div>'

      const topNeedsHtml = dashboardStats.topNeeds.map(([t, n]) =>
        `<div style="display:table-row;" class="list-item"><div style="display:table-cell;font-weight:700;color:#4b5563;padding:2px 0;">${t}</div><div style="display:table-cell;text-align:center;font-weight:700;width:30%;">${n} طلباً</div></div>`
      ).join('') || '<div style="padding:4px;color:#9ca3af;">لا توجد بيانات</div>'

      el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>
.a4-page{padding:15mm 18mm;position:relative}
.page-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:4px;}
.stat-card{border:1px solid #d1d5db;background:#f9fafb;text-align:center;padding:8px;border-radius:4px;}
.stat-num{font-size:18pt;font-weight:700;color:#111827;display:block;}
.stat-label{font-size:8.5pt;color:#4b5563;font-weight:700;display:block;}
.data-table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9pt;}
.data-table th,.data-table td{border:1px solid #d1d5db;padding:5px 7px;text-align:right;}
.data-table th{background:#f3f4f6;color:#111827;font-weight:700;}
.status-ready{color:#166534;font-weight:700;background:#dcfce7;padding:1px 6px;border-radius:2px;border:1px solid #bbf7d0;font-size:10px;}
.status-mod{color:#9a3412;font-weight:700;background:#ffedd5;padding:1px 6px;border-radius:2px;border:1px solid #fed7aa;font-size:10px;}
.status-unready{color:#991b1b;font-weight:700;background:#fee2e2;padding:1px 6px;border-radius:2px;border:1px solid #fecaca;font-size:10px;}
.sub-card{border:1px solid #d1d5db;border-radius:4px;}
.sub-card-header{background:#f3f4f6;padding:5px 8px;font-weight:700;font-size:9pt;border-bottom:1px solid #d1d5db;color:#1f2937;}
.sub-card-body{padding:6px 8px;}
.list-item{border-bottom:1px dashed #e5e7eb;padding:3px 0;}
.list-item:last-child{border-bottom:none;}
@media print{body{background:#fff}}
</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1e3a8a;padding-bottom:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
<div style="text-align:right;">
<h1 style="font-size:15pt;font-weight:700;color:#1e3a8a;margin:0 0 2px;">التقرير الدوري الشامل للتقييم الميداني</h1>
<p style="font-size:10.5pt;font-weight:600;color:#4b5563;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p>
</div>
<div style="text-align:left;font-size:8.5pt;background:#f3f4f6;border:1px solid #e5e7eb;padding:4px 8px;border-radius:4px;">
<div style="font-weight:700;color:#374151;">نوع التقرير: <span style="color:#000;">شهري موجز</span></div>
<div style="font-weight:700;color:#374151;">الفترة: <span style="color:#000;" dir="ltr">${fmt(dashboardStats.startDate)} - ${fmt(dashboardStats.endDate)}</span></div>
<div style="font-weight:700;color:#374151;">رقم المرجع: <span style="color:#000;">${reportRef}</span></div>
</div>
</header>

<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:8.5pt;font-weight:700;padding:4px 8px;margin-bottom:10px;border-radius:3px;">
✔ مسار التقرير الفوري: تم الاعتماد النهائي والتوجيه المباشر للمنظومة والأرشيف الرقمي.
</div>

<section>
<h2 style="font-size:11pt;font-weight:700;color:#1e3a8a;margin:8px 0 5px;border-right:3px solid #1e3a8a;padding-right:6px;">أولاً: الملخص الإحصائي العام</h2>
<div style="display:flex;gap:4px;margin-bottom:6px;">
<div style="flex:1;" class="stat-card"><span class="stat-num">${dashboardStats.totalMosques}</span><span class="stat-label">مرافق ومساجد جرى تقييمها</span></div>
<div style="flex:1;" class="stat-card"><span class="stat-num">${dashboardStats.totalDisabilities}</span><span class="stat-label">حالات تم رصدها وتوثيقها</span></div>
<div style="flex:1;" class="stat-card"><span class="stat-num">${dashboardStats.totalFieldVisits}</span><span class="stat-label">جولات ميدانية مكثفة مُنفذة</span></div>
</div>
</section>

<section>
<h2 style="font-size:11pt;font-weight:700;color:#1e3a8a;margin:8px 0 5px;border-right:3px solid #1e3a8a;padding-right:6px;">ثانياً: موجز تقييم الوصول الشامل للمرافق (المساجد)</h2>
<table class="data-table">
<thead><tr><th style="width:30%;">مستوى الجاهزية الفنية</th><th style="width:15%;text-align:center;">عدد المرافق</th><th style="width:55%;">أبرز العوائق والملاحظات المرصودة من المفتشين</th></tr></thead>
<tbody>
<tr><td><span class="status-ready">جاهز ومناسب بالكامل</span></td><td style="text-align:center;font-weight:700;">${dashboardStats.readyCount}</td><td rowspan="3" style="font-size:8.5pt;color:#374151;line-height:1.4;">—</td></tr>
<tr><td><span class="status-mod">يحتاج لتعديلات تحسينية</span></td><td style="text-align:center;font-weight:700;">${dashboardStats.needsImprovement}</td></tr>
<tr><td><span class="status-unready">غير مهيأ للوصول الشامل</span></td><td style="text-align:center;font-weight:700;">${dashboardStats.notAvailable}</td></tr>
</tbody>
</table>
</section>

<section>
<h2 style="font-size:11pt;font-weight:700;color:#1e3a8a;margin:8px 0 5px;border-right:3px solid #1e3a8a;padding-right:6px;">ثالثاً: موجز تقييم حالات ذوي الإعاقة والاحتياجات</h2>
<div style="display:flex;gap:5px;">
<div style="flex:1;">
<div class="sub-card"><div class="sub-card-header">أعلى تصنيفات الإعاقة تسجيلاً</div><div class="sub-card-body"><div style="display:table;width:100%;">${topTypesHtml}</div></div></div>
</div>
<div style="flex:1;">
<div class="sub-card"><div class="sub-card-header">أكثر المتطلبات والاحتياجات طلباً</div><div class="sub-card-body"><div style="display:table;width:100%;">${topNeedsHtml}</div></div></div>
</div>
</div>
</section>

<section>
<h2 style="font-size:11pt;font-weight:700;color:#1e3a8a;margin:8px 0 5px;border-right:3px solid #1e3a8a;padding-right:6px;">رابعاً: التوصيات والقرارات التشغيلية المقترحة</h2>
<div style="border:1px solid #d1d5db;background:#fff;padding:6px 10px;font-size:9pt;color:#374151;border-radius:4px;line-height:1.4;">
<strong>1. كشوفات الدعم الطبي:</strong> إحالة قوائم الاحتياجات الطبية العاجلة (الكراسي والمعدات) مباشرة للجهات المختصة للتوفير الفوري.<br>
<strong>2. كود البناء الهندسي:</strong> إلزام إدارة المشروعات والمقاولين بتطبيق كود الوصول الشامل بالمساجد المصنفة كـ "غير مهيأة".<br>
<strong>3. جولات الأطراف:</strong> إعادة توجيه مسار المفتشين في الفترة القادمة للتركيز على مناطق الأطراف والفروع التي تفتقر للتغطية الشاملة.
</div>
</section>

<section style="margin-top:15px;">
<div style="display:flex;justify-content:space-between;text-align:center;">
<div style="flex:1;padding:0 15mm;"><p style="font-size:10pt;font-weight:700;color:#111827;margin-bottom:35px;">رئيس القسم</p><p style="border-top:1px solid #9ca3af;padding-top:4px;font-size:8.5pt;color:#4b5563;font-weight:700;">الاسم والتوقيع</p></div>
<div style="flex:1;padding:0 15mm;"><p style="font-size:10pt;font-weight:700;color:#111827;margin-bottom:35px;">مدير المكتب</p><p style="border-top:1px solid #9ca3af;padding-top:4px;font-size:8.5pt;color:#4b5563;font-weight:700;">الختم والاعتماد النهائي</p></div>
</div>
</section>

<div class="page-footer"><span>قسم ذوي الإعاقة والاحتياجات الخاصة</span><span>صفحة 1 من 1</span></div>
</div></div>`

      await capturePdfFromRef(dashboardPdfRef, `تقرير_دوري_${dashboardStats.startDate}_${dashboardStats.endDate}.pdf`)
    } catch (err) {
      console.error('Dashboard PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return dateStr }
  }

  const getReportName = (report) => report.mosque_name || report.facility_name || report.full_name || '\u2014'

  const renderArchive = (type) => {
    const isMosque = type === 'mosque'
    const title = isMosque ? 'أرشيف تقييم المساجد' : 'أرشيف حالات ذوي الإعاقة'
    const search = isMosque ? mosqueSearch : disabilitySearch
    const setSearch = isMosque ? setMosqueSearch : setDisabilitySearch
    const page = isMosque ? mosquePage : disabilityPage
    const setPage = isMosque ? setMosquePage : setDisabilityPage

    const filtered = reports.filter(r => {
      if (r.recordType !== type) return false
      if (!search.trim()) return true
      const s = search.trim().toLowerCase()
      const name = (r.mosque_name || r.full_name || '').toLowerCase()
      return name.includes(s)
    })
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    return (
      <GlassCard className="mb-6">
        <div className="px-6 sm:px-10 py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Archive className="w-4 h-4 text-cyan-400" /></div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>

          <div className="relative mb-4">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={isMosque ? 'البحث باسم المسجد...' : 'البحث باسم الحالة...'}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pr-11 pl-4 py-3 text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06]" />
          </div>

          {archiveLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">جاري تحميل التقارير...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">لا توجد تقارير بعد</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginated.map((report) => (
                  <div key={report.id}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm truncate">{getReportName(report)}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(report.visit_date || report.created_at)}</span>
                          {report.region && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{report.region}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => setViewReport(report)}
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleEdit(report)}
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => exportFromArchive(report)} disabled={pdfExporting} title="تصدير PDF"
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all disabled:opacity-30">
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(report.id)}
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-white hover:bg-white/[0.06] transition-all">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} type="button" onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                        ${page === p ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white'
                      }`}>{p}</button>
                  ))}
                  <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-white hover:bg-white/[0.06] transition-all">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans relative overflow-x-hidden">
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
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                      {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
نظام تقييم
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400/70" />
                      قسم ذوي الإعاقة والاحتياجات الخاصة
                    </span>
                    <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      النظام نشط
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"><Calendar className="w-6 h-6 text-cyan-400/60" /></div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"><Shield className="w-6 h-6 text-purple-400/60" /></div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"><Database className="w-6 h-6 text-emerald-400/60" /></div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* TAB NAVIGATION */}
        <div className="flex gap-1 mb-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1">
          <button type="button" onClick={() => handleTabChange('tab1')}
            className={`flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === 'tab1'
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}>
            <span className="flex items-center justify-center gap-2"><Building2 className="w-4 h-4" /> تقييم مرافق المساجد</span>
          </button>
          <button type="button" onClick={() => handleTabChange('tab2')}
            className={`flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === 'tab2'
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}>
            <span className="flex items-center justify-center gap-2"><Users className="w-4 h-4" /> تقييم حالات ذوي الإعاقة</span>
          </button>
          <button type="button" onClick={() => handleTabChange('tab3')}
            className={`flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === 'tab3'
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}>
            <span className="flex items-center justify-center gap-2"><BarChart3 className="w-4 h-4" /> الرصد الدوري الموجز</span>
          </button>
        </div>

        {/* ============ TAB 1: MOSQUE ============ */}
        {activeTab === 'tab1' && (<>
        {/* Mosque Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><Building2 className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">أولاً: بيانات المسجد</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="اسم المسجد" icon={Building2} required value={currentForm.mosque_name} onChange={(e) => handleChange('mosque_name', e.target.value)} placeholder="أدخل اسم المسجد" />
              <GlassInput label="المنطقة" icon={MapPin} value={currentForm.region} onChange={(e) => handleChange('region', e.target.value)} placeholder="المنطقة" />
              <GlassInput label="تاريخ الزيارة" icon={Calendar} required>
                <input type="date" value={currentForm.visit_date} onChange={(e) => handleChange('visit_date', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
            </div>
          </div>
        </GlassCard>

        {/* Facility Evaluation Cards */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><ListChecks className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">ثانياً: تقييم مرافق المسجد لذوي الإعاقة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FACILITY_NAMES.map((name) => {
                const evalItem = currentForm.facility_evaluations[name] || { status: '', notes: '' }
                return (
                  <GlassCard key={name}>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-sm mb-1">{name}</h3>
                      <p className="text-gray-500 text-xs mb-3 leading-relaxed">{FACILITY_DESCRIPTIONS[name]}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {FACILITY_STATUSES.map((status) => (
                          <button key={status} type="button"
                            onClick={() => handleFacilityEvalChange(name, 'status', evalItem.status === status ? '' : status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                              ${evalItem.status === status
                                ? FACILITY_STATUS_COLORS[status]
                                : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                              }`}>
                            {status}
                          </button>
                        ))}
                      </div>
                      <textarea value={evalItem.notes} onChange={(e) => handleFacilityEvalChange(name, 'notes', e.target.value)}
                        placeholder="ملاحظات..." rows={2}
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none transition-all resize-none focus:border-cyan-500/30 focus:bg-white/[0.05]" />
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        </GlassCard>

        {/* Final Evaluation */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><FileCheck className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">ثالثاً: التقييم النهائي</h2>
            </div>
            <div className="space-y-4">
              <GlassTextarea label="ملاحظات عامة" icon={FileText} value={currentForm.general_notes} onChange={(e) => handleChange('general_notes', e.target.value)} placeholder="أكتب ملاحظات عامة..." />
              <GlassTextarea label="التوصيات" icon={Lightbulb} value={currentForm.recommendations} onChange={(e) => handleChange('recommendations', e.target.value)} placeholder="أكتب التوصيات..." />
            </div>
          </div>
        </GlassCard>

        {/* SAVE ACTIONS TAB 1 */}
        <GlassCard className="mb-6 sticky bottom-4 z-40">
          <div className="px-6 sm:px-10 py-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {editId && (<span className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">تعديل التقرير #{editId}</span>)}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={resetForm}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> تفريغ النموذج
                </button>
                <button type="button" onClick={exportMosquePDF} disabled={pdfExporting}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <FileDown className="w-4 h-4" /> {pdfExporting ? 'جاري التصدير...' : 'PDF'}
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 text-cyan-300 font-medium hover:from-cyan-500/30 hover:to-cyan-600/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save className="w-4 h-4" /> {submitting ? 'جاري الحفظ...' : editId ? 'تحديث التقرير' : 'حفظ التقرير'}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
        {renderArchive('mosque')}
        </>)}

        {/* ============ TAB 2: DISABILITY ============ */}
        {activeTab === 'tab2' && (<>

        {/* 1. Personal Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><Users className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">أولاً: البيانات الشخصية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="الاسم الرباعي" icon={Users} required value={currentForm.full_name} onChange={(e) => handleChange('full_name', e.target.value)} placeholder="الاسم الرباعي" />
              <GlassInput label="الجنس" icon={Users}>
                <select value={currentForm.gender} onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  <option value="ذكر" className="bg-[#0B0F19]">ذكر</option>
                  <option value="أنثى" className="bg-[#0B0F19]">أنثى</option>
                </select>
              </GlassInput>
              <GlassInput label="العمر" icon={Clock} type="number" value={currentForm.age} onChange={(e) => handleChange('age', e.target.value)} placeholder="العمر" />
              <GlassInput label="رقم الهاتف (إن وجد)" icon={ListChecks} type="tel" value={currentForm.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="رقم الهاتف" />
              <GlassInput label="الحالة الاجتماعية" icon={Users}>
                <select value={currentForm.marital_status} onChange={(e) => handleChange('marital_status', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s} className="bg-[#0B0F19]">{s}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="منطقة السكن" icon={MapPin} value={currentForm.residence_area} onChange={(e) => handleChange('residence_area', e.target.value)} placeholder="منطقة السكن" />
            </div>
          </div>
        </GlassCard>

        {/* 2. Disability Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><ClipboardCheck className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">ثانياً: بيانات الإعاقة</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="نوع الإعاقة" icon={Users}>
                <select value={currentForm.disability_type} onChange={(e) => handleChange('disability_type', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {DISABILITY_TYPES.map(t => <option key={t} value={t} className="bg-[#0B0F19]">{t}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="درجة الإعاقة" icon={ListChecks} value={currentForm.disability_degree} onChange={(e) => handleChange('disability_degree', e.target.value)} placeholder="درجة الإعاقة" />
              <GlassInput label="سبب الإعاقة" icon={FileText} value={currentForm.disability_cause} onChange={(e) => handleChange('disability_cause', e.target.value)} placeholder="سبب الإعاقة" />
              <div>
                <label className="block text-sm text-gray-400 font-medium mb-2">هل الإعاقة دائمة؟</label>
                <SegmentedControl options={YES_NO_OPTIONS} value={currentForm.is_permanent} onChange={(v) => handleChange('is_permanent', v)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 font-medium mb-2">يستخدم كرسياً متحركاً؟</label>
                <SegmentedControl options={YES_NO_OPTIONS} value={currentForm.uses_wheelchair} onChange={(v) => handleChange('uses_wheelchair', v)} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 3. Education */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><Star className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">ثالثاً: الحالة التعليمية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="المستوى التعليمي" icon={Star}>
                <select value={currentForm.education_level} onChange={(e) => handleChange('education_level', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {EDUCATION_LEVELS.map(l => <option key={l} value={l} className="bg-[#0B0F19]">{l}</option>)}
                </select>
              </GlassInput>
              <div>
                <label className="block text-sm text-gray-400 font-medium mb-2">هل يدرس حالياً؟</label>
                <SegmentedControl options={YES_NO_OPTIONS} value={currentForm.is_studying} onChange={(v) => handleChange('is_studying', v)} />
              </div>
              <GlassInput label="آخر مؤهل دراسي" icon={FileText} value={currentForm.last_qualification} onChange={(e) => handleChange('last_qualification', e.target.value)} placeholder="آخر مؤهل دراسي" />
            </div>
          </div>
        </GlassCard>



        {/* 5. Needs */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><ListChecks className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">رابعاً: الاحتياجات</h2>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {NEED_OPTIONS.map((need) => (
                <button key={need} type="button" onClick={() => handleNeedToggle(need)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${currentForm.needs.includes(need)
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                    }`}>{need}</button>
              ))}
            </div>
            <GlassTextarea label="احتياجات أخرى" icon={FileText} value={currentForm.other_needs} onChange={(e) => handleChange('other_needs', e.target.value)} placeholder="احتياجات أخرى..." />
          </div>
        </GlassCard>

        {/* 6. General Notes */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><FileText className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">خامساً: الملاحظات العامة</h2>
            </div>
            <GlassTextarea label="الملاحظات العامة" icon={FileText} value={currentForm.general_notes} onChange={(e) => handleChange('general_notes', e.target.value)} placeholder="أكتب الملاحظات العامة هنا..." />
          </div>
        </GlassCard>

        {/* SAVE ACTIONS TAB 2 */}
        <GlassCard className="mb-6 sticky bottom-4 z-40">
          <div className="px-6 sm:px-10 py-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {editId && (<span className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">تعديل التقرير #{editId}</span>)}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={resetForm}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> تفريغ النموذج
                </button>
                <button type="button" onClick={exportDisabilityPDF} disabled={pdfExporting}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <FileDown className="w-4 h-4" /> {pdfExporting ? 'جاري التصدير...' : 'PDF'}
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 text-cyan-300 font-medium hover:from-cyan-500/30 hover:to-cyan-600/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save className="w-4 h-4" /> {submitting ? 'جاري الحفظ...' : editId ? 'تحديث التقرير' : 'حفظ التقرير'}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
        {renderArchive('disability')}
        </>)}

        {/* ============ TAB 3: DASHBOARD ============ */}
        {activeTab === 'tab3' && (
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"><BarChart3 className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الرصد الدوري الموجز</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <GlassInput label="تاريخ البداية" icon={Calendar} required>
                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
              <GlassInput label="تاريخ النهاية" icon={Calendar} required>
                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button type="button" onClick={generateDashboardReport}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 text-cyan-300 font-medium hover:from-cyan-500/30 hover:to-cyan-600/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" /> توليد التقرير
              </button>
              {dashboardStats && (
                <button type="button" onClick={exportDashboardPDF} disabled={pdfExporting}
                  className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <FileDown className="w-4 h-4" /> {pdfExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                </button>
              )}
            </div>

            {dashboardStats && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <GlassCard>
                    <div className="p-5 text-center">
                      <Building2 className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                      <span className="text-3xl font-bold text-white block">{dashboardStats.totalMosques}</span>
                      <span className="text-sm text-gray-400">مرافق ومساجد جرى تقييمها</span>
                    </div>
                  </GlassCard>
                  <GlassCard>
                    <div className="p-5 text-center">
                      <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <span className="text-3xl font-bold text-white block">{dashboardStats.totalDisabilities}</span>
                      <span className="text-sm text-gray-400">حالات تم رصدها وتوثيقها</span>
                    </div>
                  </GlassCard>
                  <GlassCard>
                    <div className="p-5 text-center">
                      <ClipboardCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <span className="text-3xl font-bold text-white block">{dashboardStats.totalFieldVisits}</span>
                      <span className="text-sm text-gray-400">جولات ميدانية مُنفذة</span>
                    </div>
                  </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <GlassCard>
                    <div className="p-5">
                      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-400" /> جاهزية المرافق</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">جاهز ومناسب بالكامل</span>
                          <span className="text-emerald-400 font-bold">{dashboardStats.readyCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">يحتاج تعديلات تحسينية</span>
                          <span className="text-amber-400 font-bold">{dashboardStats.needsImprovement}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">غير مهيأ للوصول الشامل</span>
                          <span className="text-red-400 font-bold">{dashboardStats.notAvailable}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <div className="p-5">
                      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> أكثر الاحتياجات طلباً</h3>
                      <div className="space-y-3">
                        {dashboardStats.topNeeds.length > 0 ? dashboardStats.topNeeds.map(([need, count], i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">{need}</span>
                            <span className="text-cyan-400 font-bold">{count}</span>
                          </div>
                        )) : <span className="text-sm text-gray-500">لا توجد بيانات</span>}
                      </div>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard>
                  <div className="p-5">
                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> تصنيفات الإعاقة الأكثر تسجيلاً</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {dashboardStats.topDisabilityTypes.length > 0 ? dashboardStats.topDisabilityTypes.map(([type, count], i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                          <span className="text-2xl font-bold text-white block">{count}</span>
                          <span className="text-sm text-gray-400">{type}</span>
                        </div>
                      )) : <span className="text-sm text-gray-500 col-span-3 text-center py-4">لا توجد بيانات</span>}
                    </div>
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </GlassCard>
        )}

      </div>

      {/* Toast */}
      {toast && (<Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />)}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/[0.08] rounded-3xl max-w-sm w-full p-6 shadow-[0_8px_64px_rgba(0,0,0,0.6)]">
            <p className="text-white text-center mb-6">هل أنت متأكد من حذف هذا التقرير؟</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all">إلغاء</button>
              <button type="button" onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 font-medium hover:bg-red-500/30 transition-all">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-[0_8px_64px_rgba(0,0,0,0.6)]">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {viewReport.recordType === 'mosque' ? 'تفاصيل تقييم المسجد' : 'تفاصيل تقييم الحالة'}
                </h3>
                <button type="button" onClick={() => setViewReport(null)}
                  className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {viewReport.recordType === 'mosque' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-gray-500 block">اسم المسجد</span><span className="text-white font-medium">{viewReport.mosque_name || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">المنطقة</span><span className="text-white font-medium">{viewReport.region || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">تاريخ الزيارة</span><span className="text-white font-medium">{formatDate(viewReport.visit_date)}</span></div>
                  </div>
                  {viewReport.facility_evaluations && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-2">تقييم مرافق المسجد لذوي الإعاقة</span>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {Object.entries(viewReport.facility_evaluations).map(([name, ev]) => (
                          <div key={name} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                            <span className="text-white text-sm font-medium">{name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              {ev?.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border
                                  ${ev.status === 'مناسب' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                    : ev.status === 'يحتاج تحسين' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                      : ev.status === 'غير متوفر' ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                        : 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                                  }`}>{ev.status}</span>
                              )}
                              {ev?.notes && <span className="text-gray-400 text-xs">{ev.notes}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewReport.general_notes && (
                    <div><span className="text-xs text-gray-500 block mb-1">ملاحظات عامة</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.general_notes}</p></div>
                  )}
                  {viewReport.recommendations && (
                    <div><span className="text-xs text-gray-500 block mb-1">التوصيات</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.recommendations}</p></div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-gray-500 block">الاسم الرباعي</span><span className="text-white font-medium">{viewReport.full_name || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">الجنس</span><span className="text-white font-medium">{viewReport.gender || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">العمر</span><span className="text-white font-medium">{viewReport.age || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">رقم الهاتف</span><span className="text-white font-medium">{viewReport.phone || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">الحالة الاجتماعية</span><span className="text-white font-medium">{viewReport.marital_status || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">منطقة السكن</span><span className="text-white font-medium">{viewReport.residence_area || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">نوع الإعاقة</span><span className="text-white font-medium">{viewReport.disability_type || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">درجة الإعاقة</span><span className="text-white font-medium">{viewReport.disability_degree || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">المستوى التعليمي</span><span className="text-white font-medium">{viewReport.education_level || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">إعاقة دائمة؟</span><span className="text-white font-medium">{viewReport.is_permanent === 'نعم' ? 'نعم' : 'لا'}</span></div>
                    <div><span className="text-xs text-gray-500 block">كرسي متحرك؟</span><span className="text-white font-medium">{viewReport.uses_wheelchair === 'نعم' ? 'نعم' : 'لا'}</span></div>
                  </div>
                  {viewReport.general_notes && (
                    <div><span className="text-xs text-gray-500 block mb-1">الملاحظات العامة</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.general_notes}</p></div>
                  )}
                  {viewReport.needs?.length > 0 && (
                    <div><span className="text-xs text-gray-500 block mb-1">الاحتياجات</span><div className="flex flex-wrap gap-2">{viewReport.needs.map((n, i) => <span key={i} className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">{n}</span>)}</div></div>
                  )}
                </div>
              )}

              <button type="button" onClick={() => setViewReport(null)}
                className="w-full mt-6 px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 font-medium hover:text-white hover:bg-white/[0.08] transition-all">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Template */}
      <div ref={pdfTemplateRef}
        style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', overflow: 'hidden', zIndex: -1 }} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}