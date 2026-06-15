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
  'دورات المياه', 'أماكن الوضوء', 'مدخل المسجد', 'مواقف السيارات',
  'منحدرات ذوي الإعاقة', 'مصلى النساء', 'نظام الصوت', 'الإنارة',
  'التهوية', 'التكييف', 'السجاد', 'مخارج الطوارئ',
  'اللوحات الإرشادية', 'النظافة العامة', 'المصاحف', 'المكتبة',
  'كاميرات المراقبة', 'طفايات الحريق', 'سكن الإمام (إن وجد)', 'سكن المؤذن (إن وجد)',
]

const FACILITY_STATUSES = ['نعم', 'لا', 'يحتاج صيانة', 'غير موجود']

const MOSQUE_LEVELS = [
  { value: 'ممتاز', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300' },
  { value: 'جيد جداً', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/40 text-cyan-300' },
  { value: 'جيد', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-300' },
  { value: 'يحتاج تطوير', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300' },
  { value: 'غير صالح', color: 'from-red-500/20 to-red-600/10 border-red-500/40 text-red-300' },
]

const DISABILITY_TYPES = ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'متعددة', 'أخرى']
const MARITAL_STATUSES = ['أعزب', 'متزوج', 'مطلق', 'أرمل']
const HOUSING_TYPES = ['ملك', 'إيجار']
const MOBILITY_OPTIONS = ['مستقلة', 'بمساعدة', 'لا يستطيع']
const COMMUNICATION_OPTIONS = ['جيدة', 'متوسطة', 'صعبة']
const SELF_RELIANCE_OPTIONS = ['كاملة', 'جزئية', 'لا يستطيع']
const EDUCATION_LEVELS = ['غير متعلم', 'ابتدائي', 'متوسط', 'ثانوي', 'جامعي', 'دراسات عليا']
const EMPLOYMENT_STATUSES = ['يعمل', 'لا يعمل']
const NEED_LEVELS = [
  { value: 'منخفض', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300' },
  { value: 'متوسط', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300' },
  { value: 'مرتفع', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/40 text-orange-300' },
  { value: 'شديد', color: 'from-red-500/20 to-red-600/10 border-red-500/40 text-red-300' },
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
  const [formData, setFormData] = useState({
    recordType: 'mosque',
    mosque_name: '', mosque_number: '', region: '', municipality: '', district: '',
    visit_date: '', evaluator_name: '', visit_start_time: '', visit_end_time: '',
    facility_evaluations: makeEmptyFacilityEvals(),
    total_percentage: 0, overall_level: '', general_notes: '', recommendations: '', images: [],
    full_name: '', id_number: '', file_number: '', gender: '', age: '', birth_date: '',
    marital_status: '', nationality: '', phone: '', guardian_name: '', guardian_phone: '',
    city: '', detailed_address: '', housing_type: '', family_members: '', map_link: '',
    disability_type: '', disability_degree: '', disability_cause: '', injury_date: '',
    is_permanent: false, uses_wheelchair: false, uses_assistive_devices: false, needs_attendant: false,
    chronic_diseases: '', medications: '', mental_health: '', mobility: '', communication: '', self_reliance: '',
    education_level: '', is_studying: false, last_qualification: '', needs_educational_support: false,
    employment_status: '', employer: '', occupation: '', monthly_income: '',
    family_income: '', income_source: '', has_debts: false, debt_amount: '', receives_benefits: false, benefit_type: '',
    needs: [], other_needs: '', need_level: '', case_description: '', researcher_notes: '', proposed_services: '',
  })

  const [activeTab, setActiveTab] = useState('tab1')
  const pdfTemplateRef = useRef(null)
  const [reports, setReports] = useState([])
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
        let q = sb.from('field_inspections').select('*').order('created_at', { ascending: false })
        if (filterType !== 'الكل') q = q.eq('recordType', filterType)
        if (searchTerm.trim()) {
          const s = searchTerm.trim()
          q = q.or(`mosque_name.ilike.%${s}%,full_name.ilike.%${s}%`)
        }
        const { data, error } = await q
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

  const handleFacilityEvalChange = (facilityName, field, value) => {
    setFormData(prev => ({
      ...prev,
      facility_evaluations: {
        ...prev.facility_evaluations,
        [facilityName]: { ...prev.facility_evaluations[facilityName], [field]: value },
      },
    }))
  }

  const handleNeedToggle = (need) => {
    setFormData(prev => {
      const needs = prev.needs.includes(need)
        ? prev.needs.filter(n => n !== need)
        : [...prev.needs, need]
      return { ...prev, needs }
    })
  }

  const calcPercentage = useCallback(() => {
    const evals = formData.facility_evaluations
    const items = Object.values(evals)
    const total = items.length
    const positive = items.filter(e => e.status === 'نعم').length
    return total > 0 ? Math.round((positive / total) * 100) : 0
  }, [formData.facility_evaluations])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    resetForm()
  }

  const resetForm = () => {
    setFormData(prev => {
      const base = { ...prev }
      if (activeTab === 'tab1') {
        return {
          ...base, recordType: 'mosque',
          mosque_name: '', mosque_number: '', region: '', municipality: '', district: '',
          visit_date: '', evaluator_name: '', visit_start_time: '', visit_end_time: '',
          facility_evaluations: makeEmptyFacilityEvals(),
          total_percentage: 0, overall_level: '', general_notes: '', recommendations: '', images: [],
        }
      }
      return {
        ...base, recordType: 'disability',
        full_name: '', id_number: '', file_number: '', gender: '', age: '', birth_date: '',
        marital_status: '', nationality: '', phone: '', guardian_name: '', guardian_phone: '',
        city: '', municipality: '', region: '', district: '', detailed_address: '', housing_type: '',
        family_members: '', map_link: '', disability_type: '', disability_degree: '', disability_cause: '',
        injury_date: '', is_permanent: false, uses_wheelchair: false, uses_assistive_devices: false,
        needs_attendant: false, chronic_diseases: '', medications: '', mental_health: '', mobility: '',
        communication: '', self_reliance: '', education_level: '', is_studying: false,
        last_qualification: '', needs_educational_support: false, employment_status: '', employer: '',
        occupation: '', monthly_income: '', family_income: '', income_source: '', has_debts: false,
        debt_amount: '', receives_benefits: false, benefit_type: '', needs: [], other_needs: '',
        need_level: '', case_description: '', researcher_notes: '', proposed_services: '',
      }
    })
    setEditId(null)
  }

  const validateForm = () => {
    if (formData.recordType === 'mosque') {
      if (!formData.visit_date) return 'تاريخ الزيارة مطلوب'
      if (!formData.mosque_name.trim()) return 'اسم المسجد مطلوب'
    } else {
      if (!formData.full_name.trim()) return 'الاسم الرباعي مطلوب'
    }
    return null
  }

  const handleSubmit = async () => {
    const error = validateForm()
    if (error) { showToast(error, 'error'); return }
    setSubmitting(true)
    try {
      const payload = { ...formData }
      if (formData.recordType === 'mosque') payload.total_percentage = calcPercentage()
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
        if (editId) localDb.update(editId, payload)
        else localDb.insert(payload)
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
    const isMosque = report.recordType === 'mosque'
    setFormData({
      recordType: report.recordType || 'mosque',
      mosque_name: report.mosque_name || '', mosque_number: report.mosque_number || '',
      region: report.region || '', municipality: report.municipality || '', district: report.district || '',
      visit_date: report.visit_date || '', evaluator_name: report.evaluator_name || '',
      visit_start_time: report.visit_start_time || '', visit_end_time: report.visit_end_time || '',
      facility_evaluations: report.facility_evaluations || makeEmptyFacilityEvals(),
      total_percentage: report.total_percentage || 0, overall_level: report.overall_level || '',
      general_notes: report.general_notes || '', recommendations: report.recommendations || '',
      images: report.images || [],
      full_name: report.full_name || '', id_number: report.id_number || '', file_number: report.file_number || '',
      gender: report.gender || '', age: report.age || '', birth_date: report.birth_date || '',
      marital_status: report.marital_status || '', nationality: report.nationality || '', phone: report.phone || '',
      guardian_name: report.guardian_name || '', guardian_phone: report.guardian_phone || '',
      city: report.city || '', detailed_address: report.detailed_address || '',
      housing_type: report.housing_type || '', family_members: report.family_members || '', map_link: report.map_link || '',
      disability_type: report.disability_type || '', disability_degree: report.disability_degree || '',
      disability_cause: report.disability_cause || '', injury_date: report.injury_date || '',
      is_permanent: report.is_permanent || false, uses_wheelchair: report.uses_wheelchair || false,
      uses_assistive_devices: report.uses_assistive_devices || false, needs_attendant: report.needs_attendant || false,
      chronic_diseases: report.chronic_diseases || '', medications: report.medications || '',
      mental_health: report.mental_health || '', mobility: report.mobility || '',
      communication: report.communication || '', self_reliance: report.self_reliance || '',
      education_level: report.education_level || '', is_studying: report.is_studying || false,
      last_qualification: report.last_qualification || '', needs_educational_support: report.needs_educational_support || false,
      employment_status: report.employment_status || '', employer: report.employer || '',
      occupation: report.occupation || '', monthly_income: report.monthly_income || '',
      family_income: report.family_income || '', income_source: report.income_source || '',
      has_debts: report.has_debts || false, debt_amount: report.debt_amount || '',
      receives_benefits: report.receives_benefits || false, benefit_type: report.benefit_type || '',
      needs: report.needs || [], other_needs: report.other_needs || '',
      need_level: report.need_level || '', case_description: report.case_description || '',
      researcher_notes: report.researcher_notes || '', proposed_services: report.proposed_services || '',
    })
    setActiveTab(isMosque ? 'tab1' : 'tab2')
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

  const exportMosquePDF = async () => {
    if (!formData.mosque_name.trim()) { showToast('يرجى إدخال اسم المسجد أولاً', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = Date.now().toString().slice(-6)
      const facilities = FACILITY_NAMES.map(name => {
        const ev = formData.facility_evaluations[name] || {}
        return { name, status: ev.status || '', notes: ev.notes || '' }
      })
      const statusBadge = (status) => {
        if (status === 'نعم') return '<span style="background:#dcfce7;color:#166534;font-weight:700;padding:2px 10px;border:1px solid #86efac;border-radius:2px;font-size:11px;">نعم</span>'
        if (status === 'لا') return '<span style="background:#fee2e2;color:#991b1b;font-weight:700;padding:2px 10px;border:1px solid #fca5a5;border-radius:2px;font-size:11px;">لا</span>'
        if (status === 'يحتاج صيانة') return '<span style="background:#fef9c3;color:#854d0e;font-weight:700;padding:2px 10px;border:1px solid #fde047;border-radius:2px;font-size:11px;">يحتاج صيانة</span>'
        if (status === 'غير موجود') return '<span style="background:#f3f4f6;color:#6b7280;font-weight:700;padding:2px 10px;border:1px solid #d1d5db;border-radius:2px;font-size:11px;">غير موجود</span>'
        return '<span style="color:#9ca3af;font-size:11px;">\u2014</span>'
      }
      const contentOrEmpty = (val) => val && val.trim() ? val : 'لم تسجل ملاحظات إضافية.'
      const el = pdfTemplateRef.current
      if (!el) throw new Error('Template ref not found')

      el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>.a4-page{padding:15mm 18mm}@media print{body{background:#fff}}</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
<div style="text-align:right;"><h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">تقييم مرافق المساجد</h1><p style="font-size:16px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div>
<div style="text-align:left;font-size:12px;font-weight:600;color:#374151;"><div>رقم التقرير: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ: <span dir="ltr">${formData.visit_date || todayIso}</span></div></div>
</header>

<section style="margin-bottom:20px;">
<h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">بيانات المسجد</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid #d1d5db;padding:14px;background:#f9fafb;">
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">اسم المسجد</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.mosque_name || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">رقم المسجد</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.mosque_number || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">المنطقة</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.region || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">البلدية</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.municipality || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">الحي</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.district || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">تاريخ الزيارة</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.visit_date || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">اسم المقيم</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.evaluator_name || '\u2014'}</span></div>
<div><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">وقت الزيارة</span><span style="font-size:14px;font-weight:700;color:#111827;">${formData.visit_start_time || ''} - ${formData.visit_end_time || ''}</span></div>
</div>
</section>

<section style="margin-bottom:20px;">
<h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">تقييم المرافق</h2>
<table style="width:100%;text-align:right;font-size:12px;border-collapse:collapse;">
<thead><tr style="background:#f3f4f6;color:#1f2937;font-weight:700;"><th style="padding:8px;border:1px solid #d1d5db;width:32px;">م</th><th style="padding:8px;border:1px solid #d1d5db;">المرفق</th><th style="padding:8px;border:1px solid #d1d5db;text-align:center;width:100px;">الحالة</th><th style="padding:8px;border:1px solid #d1d5db;">ملاحظات</th></tr></thead>
<tbody>${facilities.map((f, i) => `<tr><td style="padding:8px;border:1px solid #d1d5db;text-align:center;color:#6b7280;">${i + 1}</td><td style="padding:8px;border:1px solid #d1d5db;font-weight:600;">${f.name}</td><td style="padding:8px;text-align:center;border:1px solid #d1d5db;">${statusBadge(f.status)}</td><td style="padding:8px;border:1px solid #d1d5db;color:#4b5563;">${f.notes || '\u2014'}</td></tr>`).join('')}</tbody>
</table>
</section>

<section style="margin-bottom:20px;">
<h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">التقييم النهائي</h2>
<div style="display:flex;gap:16px;margin-bottom:12px;">
<div style="border:1px solid #d1d5db;padding:12px;background:#f9fafb;flex:1;text-align:center;"><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">النسبة المئوية</span><span style="font-size:24px;font-weight:800;color:#111827;">${calcPercentage()}%</span></div>
<div style="border:1px solid #d1d5db;padding:12px;background:#f9fafb;flex:1;text-align:center;"><span style="font-size:11px;color:#6b7280;font-weight:700;display:block;">المستوى</span><span style="font-size:18px;font-weight:700;color:#111827;">${formData.overall_level || '\u2014'}</span></div>
</div>
<div style="border:1px solid #d1d5db;margin-bottom:8px;"><div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;">ملاحظات عامة</div><div style="padding:10px 12px;font-size:13px;color:#4b5563;">${contentOrEmpty(formData.general_notes)}</div></div>
<div style="border:1px solid #d1d5db;"><div style="background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #d1d5db;font-weight:700;color:#1f2937;">التوصيات</div><div style="padding:10px 12px;font-size:13px;color:#4b5563;">${contentOrEmpty(formData.recommendations)}</div></div>
</section>

<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">مُعِد التقرير</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع والختم</p></div>
</section>
</div></div>`

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
      doc.save(`تقييم_مسجد_${formData.mosque_name.replace(/\s+/g, '_')}.pdf`)
      el.innerHTML = ''
      showToast('تم تصدير PDF بنجاح', 'success')
    } catch (err) {
      console.error('PDF export error:', err)
      showToast('فشل في تصدير PDF - ' + err.message, 'error')
    } finally {
      setPdfExporting(false)
    }
  }

  const exportDisabilityPDF = async () => {
    if (!formData.full_name.trim()) { showToast('يرجى إدخال الاسم الرباعي أولاً', 'warning'); return }
    setPdfExporting(true)
    try {
      const todayIso = new Date().toISOString().split('T')[0]
      const reportNum = Date.now().toString().slice(-6)
      const c = (val) => val && val.trim() ? val : '\u2014'
      const chk = (val) => val ? 'نعم' : '\u2014'
      const el = pdfTemplateRef.current
      if (!el) throw new Error('Template ref not found')

      el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>.a4-page{padding:15mm 18mm}@media print{body{background:#fff}}</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
<div style="text-align:right;"><h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">تقييم حالات ذوي الإعاقة</h1><p style="font-size:16px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div>
<div style="text-align:left;font-size:12px;font-weight:600;color:#374151;"><div>رقم الملف: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ: <span dir="ltr">${todayIso}</span></div></div>
</header>

<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">البيانات الشخصية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">الاسم الرباعي</span>${formData.full_name}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم الهوية</span>${formData.id_number || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم الملف</span>${formData.file_number || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الجنس</span>${formData.gender || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">العمر</span>${formData.age || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">تاريخ الميلاد</span>${formData.birth_date || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحالة الاجتماعية</span>${formData.marital_status || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الجنسية</span>${formData.nationality || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم الهاتف</span>${formData.phone || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">ولي الأمر</span>${formData.guardian_name || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم ولي الأمر</span>${formData.guardian_phone || '\u2014'}</div>
</div>
</section>

<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">بيانات السكن</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">المدينة</span>${formData.city || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">البلدية</span>${formData.municipality || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">المنطقة</span>${formData.region || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحي</span>${formData.district || '\u2014'}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">العنوان</span>${formData.detailed_address || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">نوع السكن</span>${formData.housing_type || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">عدد أفراد الأسرة</span>${formData.family_members || '\u2014'}</div>
</div>
</section>

<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">بيانات الإعاقة</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">نوع الإعاقة</span>${formData.disability_type || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">درجة الإعاقة</span>${formData.disability_degree || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">سبب الإعاقة</span>${formData.disability_cause || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">تاريخ الإصابة</span>${formData.injury_date || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">إعاقة دائمة</span>${chk(formData.is_permanent)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">كرسي متحرك</span>${chk(formData.uses_wheelchair)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">أجهزة مساعدة</span>${chk(formData.uses_assistive_devices)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">يحتاج مرافق</span>${chk(formData.needs_attendant)}</div>
</div>
</section>

<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">الحالة الصحية والتعليمية والوظيفية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">الأمراض المزمنة</span>${c(formData.chronic_diseases)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الأدوية</span>${c(formData.medications)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحالة النفسية</span>${c(formData.mental_health)}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحركة</span>${formData.mobility || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">التواصل</span>${formData.communication || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الاعتماد على النفس</span>${formData.self_reliance || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">المستوى الدراسي</span>${formData.education_level || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">آخر مؤهل</span>${formData.last_qualification || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحالة الوظيفية</span>${formData.employment_status || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">جهة العمل</span>${formData.employer || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">المهنة</span>${formData.occupation || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الدخل الشهري</span>${formData.monthly_income || '\u2014'}</div>
</div>
</section>

<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">التقييم الاجتماعي</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">مستوى الحاجة</span>${formData.need_level || '\u2014'}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">وصف الحالة</span>${c(formData.case_description)}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">ملاحظات الباحث</span>${c(formData.researcher_notes)}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">التوصيات</span>${c(formData.recommendations)}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">الخدمات المقترحة</span>${c(formData.proposed_services)}</div>
</div>
</section>

<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الباحث</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الاعتماد</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع والختم</p></div>
</section>
</div></div>`

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
      doc.save(`تقييم_حالة_${formData.full_name.replace(/\s+/g, '_')}.pdf`)
      el.innerHTML = ''
      showToast('تم تصدير PDF بنجاح', 'success')
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
        const statusBadge = (s) => {
          if (s === 'نعم') return '<span style="background:#dcfce7;color:#166534;padding:2px 10px;border:1px solid #86efac;border-radius:2px;font-size:11px;font-weight:700;">نعم</span>'
          if (s === 'لا') return '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border:1px solid #fca5a5;border-radius:2px;font-size:11px;font-weight:700;">لا</span>'
          if (s === 'يحتاج صيانة') return '<span style="background:#fef9c3;color:#854d0e;padding:2px 10px;border:1px solid #fde047;border-radius:2px;font-size:11px;font-weight:700;">يحتاج صيانة</span>'
          if (s === 'غير موجود') return '<span style="background:#f3f4f6;color:#6b7280;padding:2px 10px;border:1px solid #d1d5db;border-radius:2px;font-size:11px;font-weight:700;">غير موجود</span>'
          return '<span style="color:#9ca3af;font-size:11px;">\u2014</span>'
        }
        el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>.a4-page{padding:15mm 18mm}@media print{body{background:#fff}}</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
<div style="text-align:right;"><h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">تقييم مرافق المساجد</h1><p style="font-size:16px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div>
<div style="text-align:left;font-size:12px;font-weight:600;color:#374151;"><div>رقم: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ: <span dir="ltr">${report.visit_date || todayIso}</span></div></div>
</header>
<section style="margin-bottom:20px;">
<h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">بيانات المسجد</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid #d1d5db;padding:14px;background:#f9fafb;">
<div><span style="font-weight:700;color:#6b7280;display:block;">اسم المسجد</span>${report.mosque_name || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">المنطقة</span>${report.region || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">تاريخ الزيارة</span>${report.visit_date || '\u2014'}</div>
</div>
</section>
<section style="margin-bottom:20px;">
<h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;border-right:4px solid #1f2937;padding-right:8px;">تقييم المرافق</h2>
<table style="width:100%;text-align:right;font-size:12px;border-collapse:collapse;">
<thead><tr style="background:#f3f4f6;color:#1f2937;font-weight:700;"><th style="padding:8px;border:1px solid #d1d5db;">م</th><th style="padding:8px;border:1px solid #d1d5db;">المرفق</th><th style="padding:8px;border:1px solid #d1d5db;text-align:center;">الحالة</th><th style="padding:8px;border:1px solid #d1d5db;">ملاحظات</th></tr></thead>
<tbody>${facilities.map((f, i) => `<tr><td style="padding:8px;border:1px solid #d1d5db;text-align:center;color:#6b7280;">${i + 1}</td><td style="padding:8px;border:1px solid #d1d5db;font-weight:600;">${f.name}</td><td style="padding:8px;text-align:center;border:1px solid #d1d5db;">${statusBadge(f.status)}</td><td style="padding:8px;border:1px solid #d1d5db;color:#4b5563;">${f.notes || '\u2014'}</td></tr>`).join('')}</tbody>
</table>
</section>
<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">مُعِد التقرير</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الاعتماد والمصادقة</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع والختم</p></div>
</section>
</div></div>`
      } else {
        el.innerHTML = `<div dir="rtl" style="width:794px;min-height:1123px;background:#fff;padding:0;font-family:Cairo,Traditonal Arabic,Arial,sans-serif;color:#111827;">
<style>.a4-page{padding:15mm 18mm}@media print{body{background:#fff}}</style>
<div class="a4-page">
<header style="border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
<div style="text-align:right;"><h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 4px;">تقييم حالات ذوي الإعاقة</h1><p style="font-size:16px;font-weight:600;color:#374151;margin:0;">قسم ذوي الإعاقة والاحتياجات الخاصة</p></div>
<div style="text-align:left;font-size:12px;font-weight:600;color:#374151;"><div>رقم: <span style="font-family:monospace;">${reportNum}</span></div><div>تاريخ: <span dir="ltr">${todayIso}</span></div></div>
</header>
<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">البيانات الشخصية</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">الاسم الرباعي</span>${report.full_name || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم الهوية</span>${report.id_number || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">رقم الملف</span>${report.file_number || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الجنس</span>${report.gender || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">العمر</span>${report.age || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الحالة الاجتماعية</span>${report.marital_status || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الجنسية</span>${report.nationality || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">الهاتف</span>${report.phone || '\u2014'}</div>
</div>
</section>
<section style="margin-bottom:16px;">
<h2 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 10px;border-right:4px solid #1f2937;padding-right:8px;">بيانات الإعاقة والتقييم</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:12px;background:#f9fafb;font-size:12px;">
<div><span style="font-weight:700;color:#6b7280;display:block;">نوع الإعاقة</span>${report.disability_type || '\u2014'}</div>
<div><span style="font-weight:700;color:#6b7280;display:block;">مستوى الحاجة</span>${report.need_level || '\u2014'}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">ملاحظات الباحث</span>${c(report.researcher_notes)}</div>
<div style="grid-column:span 2;"><span style="font-weight:700;color:#6b7280;display:block;">التوصيات</span>${c(report.recommendations)}</div>
</div>
</section>
<section style="margin-top:40px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الباحث</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع</p></div>
<div style="width:45%;"><p style="font-weight:700;color:#1f2937;margin-bottom:24px;">الاعتماد</p><p style="border-top:1px solid #9ca3af;padding-top:6px;font-size:13px;color:#4b5563;">التوقيع والختم</p></div>
</section>
</div></div>`
      }

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
      const pdfName = isMosque
        ? `تقييم_مسجد_${(report.mosque_name || 'report').replace(/\s+/g, '_')}`
        : `تقييم_حالة_${(report.full_name || 'report').replace(/\s+/g, '_')}`
      doc.save(`${pdfName}.pdf`)
      el.innerHTML = ''
      showToast('تم تصدير PDF بنجاح', 'success')
    } catch (err) {
      console.error('Archive PDF export error:', err)
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

  const filteredReports = reports
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE))
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getReportName = (report) => report.mosque_name || report.facility_name || report.full_name || '\u2014'
  const getReportTypeBadge = (report) => {
    if (report.recordType === 'mosque') return { label: 'مسجد', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    if (report.recordType === 'disability') return { label: 'حالة إعاقة', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' }
    return { label: report.facility_type || 'تقرير', color: 'text-gray-400 bg-white/[0.04] border-white/[0.06]' }
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
                    نظام تقييم الوصول الشامل<br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 to-cyan-500">وحصر الحالات</span>
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
        </div>

        {/* ============ TAB 1: MOSQUE ============ */}
        {activeTab === 'tab1' && (<>
        {/* Mosque Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Building2 className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">بيانات المسجد</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="اسم المسجد" icon={Building2} required value={formData.mosque_name} onChange={(e) => handleChange('mosque_name', e.target.value)} placeholder="أدخل اسم المسجد" />
              <GlassInput label="رقم المسجد" icon={ListChecks} value={formData.mosque_number} onChange={(e) => handleChange('mosque_number', e.target.value)} placeholder="رقم المسجد" />
              <GlassInput label="المنطقة" icon={MapPin} value={formData.region} onChange={(e) => handleChange('region', e.target.value)} placeholder="المنطقة" />
              <GlassInput label="البلدية" icon={MapPin} value={formData.municipality} onChange={(e) => handleChange('municipality', e.target.value)} placeholder="البلدية" />
              <GlassInput label="الحي" icon={MapPin} value={formData.district} onChange={(e) => handleChange('district', e.target.value)} placeholder="الحي" />
              <GlassInput label="تاريخ الزيارة" icon={Calendar} required>
                <input type="date" value={formData.visit_date} onChange={(e) => handleChange('visit_date', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
              <GlassInput label="اسم المقيم" icon={Users} value={formData.evaluator_name} onChange={(e) => handleChange('evaluator_name', e.target.value)} placeholder="اسم المقيم" />
              <GlassInput label="وقت بداية الزيارة" icon={Clock}>
                <input type="time" value={formData.visit_start_time} onChange={(e) => handleChange('visit_start_time', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
              <GlassInput label="وقت انتهاء الزيارة" icon={Clock}>
                <input type="time" value={formData.visit_end_time} onChange={(e) => handleChange('visit_end_time', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
            </div>
          </div>
        </GlassCard>

        {/* Facility Evaluation Cards */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><ListChecks className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">تقييم المرافق</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FACILITY_NAMES.map((name) => {
                const evalItem = formData.facility_evaluations[name] || { status: '', notes: '' }
                return (
                  <GlassCard key={name}>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-sm mb-3">{name}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {FACILITY_STATUSES.map((status) => (
                          <button key={status} type="button"
                            onClick={() => handleFacilityEvalChange(name, 'status', evalItem.status === status ? '' : status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                              ${evalItem.status === status
                                ? status === 'نعم' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                  : status === 'لا' ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : status === 'يحتاج صيانة' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                      : 'bg-gray-500/20 border-gray-500/40 text-gray-300'
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><FileCheck className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">التقييم النهائي</h2>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <span className="text-sm text-gray-400 block mb-1">النسبة المئوية</span>
                  <span className="text-4xl font-bold text-white">{calcPercentage()}%</span>
                  <div className="w-full bg-white/[0.06] h-2 rounded-full mt-2 overflow-hidden max-w-[200px]">
                    <div className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-emerald-400 transition-all duration-500" style={{ width: `${calcPercentage()}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 font-medium mb-3">المستوى العام</label>
              <SegmentedControl options={MOSQUE_LEVELS} value={formData.overall_level} onChange={(v) => handleChange('overall_level', v)} />
            </div>

            <div className="space-y-4">
              <GlassTextarea label="ملاحظات عامة" icon={FileText} value={formData.general_notes} onChange={(e) => handleChange('general_notes', e.target.value)} placeholder="أكتب ملاحظات عامة..." />
              <GlassTextarea label="التوصيات" icon={Lightbulb} value={formData.recommendations} onChange={(e) => handleChange('recommendations', e.target.value)} placeholder="أكتب التوصيات..." />
            </div>

            <div className="mt-6">
              <label className="block text-sm text-gray-400 font-medium mb-2">رفع صور</label>
              <input type="file" multiple accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files).map(f => f.name)
                  handleChange('images', [...formData.images, ...files])
                }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 transition-all cursor-pointer" />
              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.images.map((img, i) => (
                    <span key={i} className="text-xs text-gray-400 bg-white/[0.04] px-2 py-1 rounded-lg">{img}</span>
                  ))}
                </div>
              )}
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
        </>)}

        {/* ============ TAB 2: DISABILITY ============ */}
        {activeTab === 'tab2' && (<>
        {/* Personal Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Users className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">البيانات الشخصية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="الاسم الرباعي" icon={Users} required value={formData.full_name} onChange={(e) => handleChange('full_name', e.target.value)} placeholder="الاسم الرباعي" />
              <GlassInput label="رقم الهوية" icon={ListChecks} value={formData.id_number} onChange={(e) => handleChange('id_number', e.target.value)} placeholder="رقم الهوية" />
              <GlassInput label="رقم الملف" icon={FileText} value={formData.file_number} onChange={(e) => handleChange('file_number', e.target.value)} placeholder="رقم الملف" />
              <GlassInput label="الجنس" icon={Users}>
                <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  <option value="ذكر" className="bg-[#0B0F19]">ذكر</option>
                  <option value="أنثى" className="bg-[#0B0F19]">أنثى</option>
                </select>
              </GlassInput>
              <GlassInput label="العمر" icon={Clock} type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} placeholder="العمر" />
              <GlassInput label="تاريخ الميلاد" icon={Calendar}>
                <input type="date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
              <GlassInput label="الحالة الاجتماعية" icon={Users}>
                <select value={formData.marital_status} onChange={(e) => handleChange('marital_status', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s} className="bg-[#0B0F19]">{s}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="الجنسية" icon={MapPin} value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} placeholder="الجنسية" />
              <GlassInput label="رقم الهاتف" icon={ListChecks} type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="رقم الهاتف" />
              <GlassInput label="اسم ولي الأمر" icon={Users} value={formData.guardian_name} onChange={(e) => handleChange('guardian_name', e.target.value)} placeholder="اسم ولي الأمر" />
              <GlassInput label="رقم ولي الأمر" icon={ListChecks} type="tel" value={formData.guardian_phone} onChange={(e) => handleChange('guardian_phone', e.target.value)} placeholder="رقم ولي الأمر" />
            </div>
          </div>
        </GlassCard>

        {/* Residence */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><MapPin className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">بيانات السكن</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="المدينة" icon={MapPin} value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="المدينة" />
              <GlassInput label="البلدية" icon={MapPin} value={formData.municipality} onChange={(e) => handleChange('municipality', e.target.value)} placeholder="البلدية" />
              <GlassInput label="المنطقة" icon={MapPin} value={formData.region} onChange={(e) => handleChange('region', e.target.value)} placeholder="المنطقة" />
              <GlassInput label="الحي" icon={MapPin} value={formData.district} onChange={(e) => handleChange('district', e.target.value)} placeholder="الحي" />
              <div className="sm:col-span-2 lg:col-span-2">
                <GlassTextarea label="العنوان بالتفصيل" icon={MapPin} value={formData.detailed_address} onChange={(e) => handleChange('detailed_address', e.target.value)} placeholder="العنوان بالتفصيل" />
              </div>
              <GlassInput label="نوع السكن" icon={Building2}>
                <select value={formData.housing_type} onChange={(e) => handleChange('housing_type', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {HOUSING_TYPES.map(t => <option key={t} value={t} className="bg-[#0B0F19]">{t}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="عدد أفراد الأسرة" icon={Users} type="number" value={formData.family_members} onChange={(e) => handleChange('family_members', e.target.value)} placeholder="عدد أفراد الأسرة" />
              <GlassInput label="الموقع على الخريطة" icon={MapPin} value={formData.map_link} onChange={(e) => handleChange('map_link', e.target.value)} placeholder="رابط خرائط Google" />
            </div>
          </div>
        </GlassCard>

        {/* Disability Data */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><ClipboardCheck className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">بيانات الإعاقة</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="نوع الإعاقة" icon={Users}>
                <select value={formData.disability_type} onChange={(e) => handleChange('disability_type', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {DISABILITY_TYPES.map(t => <option key={t} value={t} className="bg-[#0B0F19]">{t}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="درجة الإعاقة" icon={ListChecks} value={formData.disability_degree} onChange={(e) => handleChange('disability_degree', e.target.value)} placeholder="درجة الإعاقة" />
              <GlassInput label="سبب الإعاقة" icon={FileText} value={formData.disability_cause} onChange={(e) => handleChange('disability_cause', e.target.value)} placeholder="سبب الإعاقة" />
              <GlassInput label="تاريخ الإصابة" icon={Calendar}>
                <input type="date" value={formData.injury_date} onChange={(e) => handleChange('injury_date', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.7]" />
              </GlassInput>
              <div className="space-y-3">
                {['is_permanent', 'uses_wheelchair', 'uses_assistive_devices', 'needs_attendant'].map((field) => (
                  <label key={field} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={formData[field]} onChange={(e) => handleChange(field, e.target.checked)}
                      className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08] checked:bg-cyan-500/30 checked:border-cyan-500/50 accent-cyan-400" />
                    {field === 'is_permanent' ? 'هل الإعاقة دائمة؟' : field === 'uses_wheelchair' ? 'هل يستخدم كرسياً متحركاً؟' : field === 'uses_assistive_devices' ? 'هل يستخدم أجهزة مساعدة؟' : 'هل يحتاج مرافق؟'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Health Status */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Shield className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الحالة الصحية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <GlassTextarea label="الأمراض المزمنة" icon={FileText} value={formData.chronic_diseases} onChange={(e) => handleChange('chronic_diseases', e.target.value)} placeholder="الأمراض المزمنة" />
              <GlassTextarea label="الأدوية المستخدمة" icon={FileText} value={formData.medications} onChange={(e) => handleChange('medications', e.target.value)} placeholder="الأدوية المستخدمة" />
              <GlassTextarea label="الحالة النفسية" icon={FileText} value={formData.mental_health} onChange={(e) => handleChange('mental_health', e.target.value)} placeholder="الحالة النفسية" />
              <div className="space-y-4">
                <GlassInput label="القدرة على الحركة" icon={Users}>
                  <select value={formData.mobility} onChange={(e) => handleChange('mobility', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                    <option value="" className="bg-[#0B0F19]">اختر</option>
                    {MOBILITY_OPTIONS.map(o => <option key={o} value={o} className="bg-[#0B0F19]">{o}</option>)}
                  </select>
                </GlassInput>
                <GlassInput label="القدرة على التواصل" icon={Users}>
                  <select value={formData.communication} onChange={(e) => handleChange('communication', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                    <option value="" className="bg-[#0B0F19]">اختر</option>
                    {COMMUNICATION_OPTIONS.map(o => <option key={o} value={o} className="bg-[#0B0F19]">{o}</option>)}
                  </select>
                </GlassInput>
                <GlassInput label="الاعتماد على النفس" icon={Users}>
                  <select value={formData.self_reliance} onChange={(e) => handleChange('self_reliance', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                    <option value="" className="bg-[#0B0F19]">اختر</option>
                    {SELF_RELIANCE_OPTIONS.map(o => <option key={o} value={o} className="bg-[#0B0F19]">{o}</option>)}
                  </select>
                </GlassInput>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Education */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Star className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الحالة التعليمية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="المستوى الدراسي" icon={Star}>
                <select value={formData.education_level} onChange={(e) => handleChange('education_level', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {EDUCATION_LEVELS.map(l => <option key={l} value={l} className="bg-[#0B0F19]">{l}</option>)}
                </select>
              </GlassInput>
              <GlassInput label="آخر مؤهل" icon={FileText} value={formData.last_qualification} onChange={(e) => handleChange('last_qualification', e.target.value)} placeholder="آخر مؤهل" />
              <div className="space-y-3 pt-6">
                <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formData.is_studying} onChange={(e) => handleChange('is_studying', e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08] checked:bg-cyan-500/30 checked:border-cyan-500/50 accent-cyan-400" />
                  هل يدرس حالياً؟
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formData.needs_educational_support} onChange={(e) => handleChange('needs_educational_support', e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08] checked:bg-cyan-500/30 checked:border-cyan-500/50 accent-cyan-400" />
                  يحتاج دعماً تعليمياً؟
                </label>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Employment */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Building2 className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الحالة الوظيفية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="الحالة الوظيفية" icon={Users}>
                <select value={formData.employment_status} onChange={(e) => handleChange('employment_status', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 outline-none transition-all appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.06]">
                  <option value="" className="bg-[#0B0F19]">اختر</option>
                  {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s} className="bg-[#0B0F19]">{s}</option>)}
                </select>
              </GlassInput>
              {formData.employment_status === 'يعمل' && (<>
                <GlassInput label="جهة العمل" icon={Building2} value={formData.employer} onChange={(e) => handleChange('employer', e.target.value)} placeholder="جهة العمل" />
                <GlassInput label="المهنة" icon={ListChecks} value={formData.occupation} onChange={(e) => handleChange('occupation', e.target.value)} placeholder="المهنة" />
                <GlassInput label="الدخل الشهري" icon={ListChecks} value={formData.monthly_income} onChange={(e) => handleChange('monthly_income', e.target.value)} placeholder="الدخل الشهري" />
              </>)}
            </div>
          </div>
        </GlassCard>

        {/* Economic Status */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Database className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الحالة الاقتصادية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <GlassInput label="دخل الأسرة" icon={ListChecks} value={formData.family_income} onChange={(e) => handleChange('family_income', e.target.value)} placeholder="دخل الأسرة" />
              <GlassInput label="مصدر الدخل" icon={ListChecks} value={formData.income_source} onChange={(e) => handleChange('income_source', e.target.value)} placeholder="مصدر الدخل" />
              <div className="space-y-3 pt-6">
                <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formData.has_debts} onChange={(e) => handleChange('has_debts', e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08] checked:bg-cyan-500/30 checked:border-cyan-500/50 accent-cyan-400" /> يوجد ديون؟
                </label>
                {formData.has_debts && (
                  <GlassInput label="المبلغ" icon={ListChecks} value={formData.debt_amount} onChange={(e) => handleChange('debt_amount', e.target.value)} placeholder="المبلغ" />
                )}
              </div>
              <div className="space-y-3 pt-6">
                <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formData.receives_benefits} onChange={(e) => handleChange('receives_benefits', e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/[0.04] border border-white/[0.08] checked:bg-cyan-500/30 checked:border-cyan-500/50 accent-cyan-400" /> يستفيد من إعانات؟
                </label>
                {formData.receives_benefits && (
                  <GlassInput label="نوع الإعانة" icon={ListChecks} value={formData.benefit_type} onChange={(e) => handleChange('benefit_type', e.target.value)} placeholder="نوع الإعانة" />
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Needs */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><ListChecks className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">الاحتياجات</h2>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {NEED_OPTIONS.map((need) => (
                <button key={need} type="button" onClick={() => handleNeedToggle(need)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${formData.needs.includes(need)
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                    }`}>{need}</button>
              ))}
            </div>
            <GlassTextarea label="احتياجات أخرى" icon={FileText} value={formData.other_needs} onChange={(e) => handleChange('other_needs', e.target.value)} placeholder="احتياجات أخرى..." />
          </div>
        </GlassCard>

        {/* Social Evaluation */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><ClipboardCheck className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">التقييم الاجتماعي</h2>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 font-medium mb-3">مستوى الحاجة</label>
              <SegmentedControl options={NEED_LEVELS} value={formData.need_level} onChange={(v) => handleChange('need_level', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <GlassTextarea label="وصف الحالة" icon={FileText} value={formData.case_description} onChange={(e) => handleChange('case_description', e.target.value)} placeholder="وصف الحالة" />
              <GlassTextarea label="ملاحظات الباحث" icon={FileText} value={formData.researcher_notes} onChange={(e) => handleChange('researcher_notes', e.target.value)} placeholder="ملاحظات الباحث" />
              <GlassTextarea label="التوصيات" icon={Lightbulb} value={formData.recommendations} onChange={(e) => handleChange('recommendations', e.target.value)} placeholder="التوصيات" />
              <GlassTextarea label="الخدمات المقترحة" icon={Star} value={formData.proposed_services} onChange={(e) => handleChange('proposed_services', e.target.value)} placeholder="الخدمات المقترحة" />
            </div>
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
        </>)}

        {/* ============ ARCHIVE SECTION ============ */}
        <GlassCard className="mb-6">
          <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center"><Archive className="w-4 h-4 text-cyan-400" /></div>
              <h2 className="text-xl font-bold text-white">أرشيف التقارير</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="البحث باسم المسجد أو اسم الحالة..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pr-11 pl-4 py-3 text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-cyan-500/50 focus:bg-white/[0.06]" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['الكل', 'mosque', 'disability'].map((type) => (
                  <button key={type} type="button" onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 border
                      ${filterType === type
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`}>
                    {type === 'الكل' ? 'الكل' : type === 'mosque' ? 'مسجد' : 'حالة إعاقة'}
                  </button>
                ))}
              </div>
            </div>

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
                  {paginatedReports.map((report) => {
                    const badge = getReportTypeBadge(report)
                    return (
                      <div key={report.id}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-bold text-base truncate">{getReportName(report)}</h3>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(report.visit_date || report.created_at)}</span>
                              {report.region && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{report.region}</span>)}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{report.created_at ? new Date(report.created_at).toLocaleDateString('ar-SA') : '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button type="button" onClick={() => setViewReport(report)}
                              className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleEdit(report)}
                              className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => exportFromArchive(report)} disabled={pdfExporting} title="تصدير PDF"
                              className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all disabled:opacity-30">
                              <FileDown className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(report.id)}
                              className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-white hover:bg-white/[0.06] transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} type="button" onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                          ${currentPage === page ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white'
                        }`}>{page}</button>
                    ))}
                    <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-white hover:bg-white/[0.06] transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Toast */}
      {toast && (<Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />)}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmationModal message="هل أنت متأكد من حذف هذا التقرير؟"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)} />
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
                    <div><span className="text-xs text-gray-500 block">تاريخ الزيارة</span><span className="text-white font-medium">{formatDate(viewReport.visit_date)}</span></div>
                    <div><span className="text-xs text-gray-500 block">المنطقة</span><span className="text-white font-medium">{viewReport.region || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">البلدية</span><span className="text-white font-medium">{viewReport.municipality || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">النسبة المئوية</span><span className="text-white font-medium">{viewReport.total_percentage ?? 0}%</span></div>
                    <div><span className="text-xs text-gray-500 block">المستوى</span><span className="text-white font-medium">{viewReport.overall_level || '—'}</span></div>
                  </div>
                  {viewReport.facility_evaluations && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-2">تقييم المرافق</span>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {Object.entries(viewReport.facility_evaluations).map(([name, ev]) => (
                          <div key={name} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                            <span className="text-white text-sm font-medium">{name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              {ev?.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border
                                  ${ev.status === 'نعم' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                    : ev.status === 'لا' ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                      : ev.status === 'يحتاج صيانة' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
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
                    <div><span className="text-xs text-gray-500 block">رقم الهوية</span><span className="text-white font-medium">{viewReport.id_number || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">الجنس</span><span className="text-white font-medium">{viewReport.gender || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">العمر</span><span className="text-white font-medium">{viewReport.age || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">نوع الإعاقة</span><span className="text-white font-medium">{viewReport.disability_type || '—'}</span></div>
                    <div><span className="text-xs text-gray-500 block">مستوى الحاجة</span><span className="text-white font-medium">{viewReport.need_level || '—'}</span></div>
                    <div className="col-span-2"><span className="text-xs text-gray-500 block">نوع السكن</span><span className="text-white font-medium">{viewReport.housing_type || '—'}</span></div>
                  </div>
                  {viewReport.case_description && (
                    <div><span className="text-xs text-gray-500 block mb-1">وصف الحالة</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.case_description}</p></div>
                  )}
                  {viewReport.researcher_notes && (
                    <div><span className="text-xs text-gray-500 block mb-1">ملاحظات الباحث</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.researcher_notes}</p></div>
                  )}
                  {viewReport.recommendations && (
                    <div><span className="text-xs text-gray-500 block mb-1">التوصيات</span><p className="text-white/80 text-sm bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">{viewReport.recommendations}</p></div>
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