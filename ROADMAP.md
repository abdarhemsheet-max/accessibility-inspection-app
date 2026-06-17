# 🗺️ خارطة الطريق — نظام تقييم

---

## 1. 📋 نظرة عامة

نظام ويب متكامل من صفحة واحدة (SPA) لإدارة تقييم ملاءمة المساجد لذوي الإعاقة وتقييم حالات ذوي الإعاقة، تابع لـ **قسم ذوي الإعاقة والاحتياجات الخاصة**. يوفر نموذجين مستقلين مع أرشيف لكل منهما، تصدير PDF، وتخزين ثنائي (Supabase + localStorage).

### الجمهور المستهدف
- مفتشي قسم الإعاقة
- فرق التقييم الميداني
- إدارة المتابعة والتخطيط

---

## 2. 🧱 رصة التقنيات

| التقنية | الغرض |
|---------|-------|
| **React 19** | إطار الواجهة |
| **Vite 8** | أداة البناء |
| **Tailwind CSS v4** | التصميم والتنسيق |
| **Lucide React** | الأيقونات |
| **Supabase JS Client + Supabase CLI** | قاعدة البيانات السحابية (اختياري) |
| **localStorage** | التخزين المحلي (احتياطي) |
| **jsPDF + html2canvas** | تصدير تقارير PDF |
| **Noto Sans Arabic** | الخط العربي |
| **GitHub Actions + gh-pages** | CI/CD والنشر التلقائي |

---

## 3. 🏗️ هيكلة المشروع

```
accessibility-inspection-app/
├── index.html                     # نقطة الدخول (RTL - خط عربي)
├── package.json                   # الاعتماديات والأوامر
├── vite.config.js                 # إعداد Vite + Tailwind
├── .env.example                   # نموذج متغيرات Supabase
├── eslint.config.js               # إعدادات ESLint
├── ROADMAP.md                     # هذا الملف
├── README.md                      # شعار فقط
├── supabase-schema.sql            # (قديم) SQL لإنشاء الجدول
├── start.bat / start.sh           # ملفات التشغيل
├── ادفع_للمستودع.bat              # سكريبت رفع سريع
├── تمبلت.html                     # قالب مستقل
│
├── src/
│   ├── main.jsx                   # إدخال React
│   ├── index.css                  # Tailwind + أنماط (glass, scrollbar)
│   ├── assets/                    # صور وموارد ثابتة
│   └── App.jsx                    # ⭐ المكون الرئيسي (1435 سطر)
│
├── supabase/                      # ⭐ إعدادات Supabase CLI
│   ├── config.toml                # إعداد المشروع المحلي
│   ├── migrations/                # ملفات الترحيل
│   │   ├── 20260616220623_create_field_inspections_table.sql
│   │   └── 20260616220758_fix_column_casing.sql
│   └── .gitignore
│
├── sql/
│   └── migrate.sql                # SQL احتياطي لإنشاء الجدول يدوياً
│
├── .github/workflows/
│   └── deploy.yml                 # CI/CD → GitHub Pages تلقائي
│
└── dist/                          # مخرجات البناء (جاهز للنشر)
    ├── index.html
    └── assets/
```

---

## 4. 🧩 هيكلة المكونات (App.jsx)

```javascript
App.jsx (1435 سطر — مكون واحد كامل)
│
├── 🔧 ثوابت وإعدادات
│   ├── Supabase Config (lazy init)
│   ├── localDb Layer (CRUD محلي)
│   ├── FACILITY_NAMES (9 عناصر تقييم)
│   ├── FACILITY_DESCRIPTIONS
│   ├── FACILITY_STATUSES (4 مستويات)
│   ├── DISABILITY_TYPES, MARITAL_STATUSES, EDUCATION_LEVELS
│   ├── NEED_OPTIONS (10 احتياجات)
│   └── ITEMS_PER_PAGE = 5
│
├── 🧩 مكونات JSX داخلية
│   ├── Toast                    → إشعار منبثق (نجاح/خطأ/تحذير)
│   ├── GlassCard                → بطاقة زجاجية
│   ├── GlassInput               → حقل إدخال زجاجي
│   ├── GlassTextarea            → منطقة نصية زجاجية
│   ├── Counter                  → عداد (+/-)
│   └── SegmentedControl         → اختيار متعدد الأزرار
│
├── 🧠 State & Logic
│   ├── mosqueForm (useState)    → بيانات نموذج المسجد
│   ├── disabilityForm (useState)→ بيانات نموذج الإعاقة
│   ├── reports (useState)       → قائمة التقارير للأرشيف
│   ├── UI states → submitting, pdfExporting, archiveLoading
│   └── Functions → handleSubmit, handleEdit, handleDelete,
│                   exportMosquePDF, exportDisabilityPDF,
│                   exportFromArchive, fetchReports, renderArchive
│
└── 🎨 الواجهة المرئية (قسمين رئيسيين)
    ├── HEADER: Hero Section
    ├── TAB NAVIGATION (تبويبين)
    ├── TAB 1: تقييم مرافق المساجد
    │   ├── أولاً: بيانات المسجد
    │   ├── ثانياً: تقييم المرافق (9 بطاقات تقييم)
    │   ├── ثالثاً: التقييم النهائي
    │   ├── أزرار الإجراءات (تفريغ + PDF + حفظ)
    │   └── أرشيف المساجد (بحث + ترقيم)
    ├── TAB 2: تقييم حالات ذوي الإعاقة
    │   ├── أولاً: البيانات الشخصية
    │   ├── ثانياً: بيانات الإعاقة
    │   ├── ثالثاً: الحالة التعليمية
    │   ├── رابعاً: الاحتياجات
    │   ├── خامساً: الملاحظات العامة
    │   ├── أزرار الإجراءات
    │   └── أرشيف الحالات (بحث + ترقيم)
    ├── Toast (مثبت في الأسفل)
    ├── Confirm Delete Modal
    └── View Report Modal
```

---

## 5. 🔄 تدفق البيانات

```
[ ملء النموذج ]
  کاربر → يملأ الحقول → mosqueForm / disabilityForm
  ↓
[ حفظ ]
  handleSubmit()
  ├── validateForm()
  ├── Supabase (إن توفر)
  │   ├── ✅ نجاح → saved = true
  │   └── ❌ فشل → console.warn + fallback
  ├── localStorage ← localDb.insert(payload)
  ├── showToast(تم الحفظ)
  ├── resetForm()
  └── setReports( localDb.getAll() ) ← تحديث الأرشيف
  ↓
[ تصدير PDF ]
  exportMosquePDF() / exportDisabilityPDF()
  ├── html2canvas(el) ← يصور DOM
  ├── jsPDF ← ينشئ مستند
  └── doc.save() ← تحميل
  ↓
[ أرشيف ]
  renderArchive(type)
  ├── reports.filter(r.recordType === type)
  ├── search + pagination
  └── عرض بطاقات (عرض/تعديل/حذف/PDF)
  ↓
[ تعديل ]
  handleEdit(report)
  ├── تعبئة mosqueForm / disabilityForm من التقرير
  ├── setActiveTab + scrollTo(0)
  └── setEditId(id) ← يظهر "تعديل التقرير #ID"
```

---

## 6. 🗃️ هيكل قاعدة البيانات

### جدول `field_inspections` (Supabase + localStorage)

#### أعمدة المسجد
| الحقل | النوع | وصف |
|-------|-------|-----|
| `recordType` | `TEXT` | `'mosque'` أو `'disability'` |
| `mosque_name` | `TEXT` | اسم المسجد |
| `region` | `TEXT` | المنطقة |
| `visit_date` | `TEXT` | تاريخ الزيارة |
| `facility_evaluations` | `JSONB` | تقييم 9 مرافق (status + notes) |
| `general_notes` | `TEXT` | ملاحظات عامة |
| `recommendations` | `TEXT` | توصيات |

#### أعمدة الإعاقة
| الحقل | النوع | وصف |
|-------|-------|-----|
| `full_name` | `TEXT` | الاسم الرباعي |
| `gender` | `TEXT` | ذكر / أنثى |
| `age` | `TEXT` | العمر |
| `marital_status` | `TEXT` | الحالة الاجتماعية |
| `phone` | `TEXT` | رقم الهاتف |
| `residence_area` | `TEXT` | منطقة السكن |
| `disability_type` | `TEXT` | نوع الإعاقة |
| `disability_degree` | `TEXT` | درجة الإعاقة |
| `disability_cause` | `TEXT` | سبب الإعاقة |
| `is_permanent` | `TEXT` | دائمة؟ نعم/لا |
| `uses_wheelchair` | `TEXT` | يستخدم كرسي متحرك؟ |
| `education_level` | `TEXT` | المستوى التعليمي |
| `is_studying` | `TEXT` | يدرس حالياً؟ |
| `last_qualification` | `TEXT` | آخر مؤهل دراسي |
| `needs` | `JSONB` | مصفوفة الاحتياجات |
| `other_needs` | `TEXT` | احتياجات أخرى |

#### أعمدة مشتركة
| الحقل | النوع | وصف |
|-------|-------|-----|
| `id` | `BIGINT` (PK) | معرف فريد |
| `created_at` | `TIMESTAMPTZ` | تاريخ الإنشاء |

### RLS Policy
```sql
CREATE POLICY "anon_all" ON public.field_inspections
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

### localStorage Key
```
field_inspections_local
```

---

## 7. 🔌 API الداخلي (localDb Layer)

```javascript
localDb.insert(record)     // ➕ إضافة → يرجع الكائن مع id + created_at
localDb.update(id, data)   // ✏️ تحديث → يرجع الكائن المحدث
localDb.remove(id)         // 🗑️ حذف
localDb.getAll()           // 📋 كل التقارير ← مصفوفة
localDb.saveAll(data)      // 💾 حفظ مصفوفة كاملة
```

نمط التخزين الثنائي:
- **Supabase** → يحاول أولاً (إن توفر)
- **localStorage** → احتياطي دائم (يُستخدم فور فشل Supabase)

---

## 8. 📄 تصدير PDF

### دالتين رئيسيتين + دالة للأرشيف

#### `exportMosquePDF()`
- تقييم المسجد الحالي
- 4 أقسام: بيانات المسجد ← جدول التقييم (4 أعمدة: م، عنصر تقييم+وصف مدمج، تقييم، ملاحظات) ← تقييم نهائي ← توقيعات

#### `exportDisabilityPDF()`
- تقييم الحالة الحالية
- 5 أقسام: بيانات شخصية ← بيانات إعاقة ← تعليم ← احتياجات ← ملاحظات ← توقيعات

#### `exportFromArchive(report)`
- تصدير أي تقرير من الأرشيف (مسجد أو إعاقة)
- يستخدم `pdfTemplateRef` (div مخفي) ثم `html2canvas` + `jsPDF`

---

## 9. 🚀 CI/CD — GitHub Pages

```
[push → master]
  ↓
GitHub Actions (deploy.yml)
  ├── actions/checkout@v4
  ├── actions/setup-node@v4
  ├── npm ci
  ├── npm run build
  │   ├── VITE_SUPABASE_URL (من secrets)
  │   └── VITE_SUPABASE_ANON_KEY (من secrets)
  ├── actions/configure-pages@v4
  ├── actions/upload-pages-artifact@v3
  └── actions/deploy-pages@v4
  ↓
[مباشر على https://abdarhemsheet-max.github.io/accessibility-inspection-app/]
```

---

## 10. ⚙️ أوامر سريعة

```bash
npm run dev              # تشغيل خادم التطوير
npm run build            # بناء للإنتاج
npm run preview          # معاينة البناء محلياً
npm run lint             # فحص الكود

npx serve dist           # تشغيل البناء محلياً

supabase link --project-ref gffszrqotpzdztpltivr
supabase db push         # دفع الترحيلات إلى Supabase
supabase migration new <name>  # إنشاء ترحيل جديد
```

---

## 11. ✅ حالة المهام

### ✅ مكتمل
- [x] نموذج تقييم المسجد (3 حقول + 9 بطاقات تقييم + تقييم نهائي)
- [x] نموذج تقييم حالات الإعاقة (5 أقسام)
- [x] تخزين محلي (localStorage)
- [x] ربط Supabase مع CRUD كامل
- [x] أرشيف منفصل لكل تبويب مع بحث وترقيم
- [x] إضافة/تعديل/حذف/عرض التقارير
- [x] تصدير PDF (نموذجين + من الأرشيف)
- [x] دمج عمودي "عنصر التقييم" و"الوصف" في PDF
- [x] تصميم Liquid Glass داكن
- [x] دعم RTL كامل مع خط Noto Sans Arabic
- [x] CI/CD → GitHub Pages تلقائي
- [x] Supabase fallback إلى localStorage عند الفشل
- [x] ترحيل Supabase CLI (جدول `field_inspections`)

### 🔜 قيد التطوير
- [ ] تصدير Excel
- [ ] طباعة مباشرة
- [ ] رفع صور
- [ ] توقيع إلكتروني
- [ ] لوحة إحصائيات (Dashboard)
- [ ] دعم Multi-User

---

> **آخر تحديث:** 17 يونيو 2026  
> **طور بواسطة:** قسم ذوي الإعاقة والاحتياجات الخاصة  
> **التقنية:** React 19 + Vite 8 + Tailwind CSS v4 + Supabase  
> **مباشر:** https://abdarhemsheet-max.github.io/accessibility-inspection-app/
