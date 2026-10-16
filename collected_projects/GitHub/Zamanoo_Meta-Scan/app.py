# ------------------------------------------------------------------
# META SCAN Application
# Copyright (c) 2026 Sakhr AlHubaish. All Rights Reserved.
# Proprietary and Confidential - Developed for Meta Compliance Scanning
# ------------------------------------------------------------------

import streamlit as st
import os
import re
from groq import Groq
import google.generativeai as genai
from PIL import Image
from local_filter import SUSPICIOUS_KEYWORDS

st.set_page_config(page_title="META SCAN", page_icon="🛡️", layout="centered", initial_sidebar_state="collapsed")

# CSS موحد للثيم الداكن، إخفاء جميع أشرطة وأدوات Streamlit بما فيها شريط إدارة التطبيق
st.markdown("""
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0068c4">
<link rel="apple-touch-icon" href="icon.png">

<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

html, body, [class*='css'] {
    font-family: 'Cairo', sans-serif;
    direction: rtl !important;
    text-align: right !important;
}

.block-container {
    padding-top: 1rem !important;
    padding-bottom: 0.5rem !important;
    padding-left: 0.8rem !important;
    padding-right: 0.8rem !important;
}

.stTextInput, .stTextArea, .stSelectbox, .stMarkdown, h1, h2, h3, h4, h5, h6, p, div {
    direction: rtl !important;
    text-align: right !important;
}

/* ضبط الفراغات الرأسية للعناصر بالقيمة -0.2rem */
.stElementContainer {
    margin-bottom: -0.2rem !important;
}

/* إخفاء القائمة الجانبية، الشريط العلوي، أدوات Streamlit وشريط "إدارة التطبيق" المضمن بكل الطرق الفعالة */
[data-testid="stSidebar"],
[data-testid="stStatusWidget"],
[data-testid="stDecoration"],
[data-testid="stHeader"],
[data-testid="stToolbar"],
#MainMenu,
header,
footer,
.stDeployButton,
div[class*="StatusWidget"],
div[class*="viewerBadge"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
}

.main-header {
    background: linear-gradient(135deg, #0068c4 0%, #002b5c 100%);
    padding: 12px 10px;
    border-radius: 10px;
    color: #ffffff !important;
    text-align: center !important;
    margin-bottom: 10px;
}
.main-header h1 {
    font-size: 1.4rem;
    margin-bottom: 4px;
    text-align: center !important;
    color: #ffffff !important;
}
.main-header p {
    font-size: 0.98rem !important;
    font-weight: 600 !important;
    margin: 0;
    text-align: center !important;
    color: #f8fafc !important;
}

.section-box {
    background-color: #1e293b !important;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    margin-bottom: 10px;
    direction: rtl !important;
    text-align: right !important;
}

.section-title {
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    margin-bottom: 8px;
    direction: rtl !important;
    text-align: right !important;
}

.disclaimer-box {
    background-color: #1e293b !important;
    border-right: 4px solid #f59e0b !important;
    padding: 8px 12px;
    border-radius: 6px;
    margin-top: 2px;
    margin-bottom: 6px;
    font-size: 0.82rem;
    color: #cbd5e1 !important;
    direction: rtl !important;
    text-align: right !important;
    line-height: 1.4;
}
.disclaimer-title {
    font-weight: bold;
    color: #fbbf24 !important;
    margin-bottom: 2px;
    font-size: 0.85rem;
}

/* توحيد حجم وسُمك الخط في جميع أزرار Streamlit ليصبح Bold بارز (700) وبحجم 0.92rem */
.stButton>button {
    width: 100% !important;
    background-color: #0068c4 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    border-radius: 8px !important;
    padding: 10px !important;
    border: none !important;
    font-size: 0.92rem !important;
    margin-top: 0px !important;
    font-family: 'Cairo', sans-serif !important;
    box-sizing: border-box !important;
    text-align: center !important;
}
.stButton>button:hover {
    background-color: #004d99 !important;
    color: #ffffff !important;
}

/* إزالة الفراغات الزائدة بين أعمدة الأزرار لتلتصق بالحواف تماماً */
[data-testid="stHorizontalBlock"] {
    display: flex !important;
    flex-direction: row !important;
    gap: 8px !important;
    direction: rtl !important;
}
[data-testid="stHorizontalBlock"] > div {
    flex: 1 !important;
    min-width: 0 !important;
}

.local-warning {
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    padding: 8px 12px;
    border-radius: 8px;
    color: #856404;
    margin-top: 8px;
    font-size: 0.85rem;
    direction: rtl !important;
    text-align: right !important;
}

/* بطاقات مؤشرات النتيجة التفاعلية */
.status-card {
    padding: 12px 16px;
    border-radius: 10px;
    font-weight: bold;
    font-size: 1.1rem;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    direction: rtl !important;
}

.status-safe {
    background-color: rgba(16, 185, 129, 0.15);
    border: 2px solid #10b981;
    color: #34d399 !important;
}

.status-warning {
    background-color: rgba(245, 158, 11, 0.15);
    border: 2px solid #f59e0b;
    color: #fbbf24 !important;
}

.status-danger {
    background-color: rgba(239, 68, 68, 0.15);
    border: 2px solid #ef4444;
    color: #f87171 !important;
}

/* حاوية التقارير وتنسيق العناوين البارزة الزرقاء */
.report-container {
    direction: rtl !important;
    text-align: right !important;
    color: #f8fafc;
    line-height: 1.7;
    font-size: 0.95rem;
}
.report-title-custom {
    color: #60a5fa !important;
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    margin-top: 16px !important;
    margin-bottom: 6px !important;
    direction: rtl !important;
    text-align: right !important;
    display: block !important;
}

/* إصلاح لقوائم الترقيم والنقاط للبدء من اليمين تماماً */
.rtl-menu-content {
    direction: rtl !important;
    text-align: right !important;
}
.rtl-menu-content ol, .rtl-menu-content ul {
    direction: rtl !important;
    text-align: right !important;
    padding-right: 1.5rem !important;
    padding-left: 0rem !important;
    margin-right: 0rem !important;
}
.rtl-menu-content li {
    direction: rtl !important;
    text-align: right !important;
    margin-bottom: 6px !important;
}
</style>

<script>
    // سكربت إخفاء شريط إدارة التطبيق فور تحميل الصفحة
    const hideStatusWidget = () => {
        const widgets = window.parent.document.querySelectorAll('[data-testid="stStatusWidget"], div[class*="StatusWidget"], div[class*="viewerBadge"]');
        widgets.forEach(w => w.style.display = 'none');
    };
    setInterval(hideStatusWidget, 500);
</script>
""", unsafe_allow_html=True)

# تهيئة إدارة الحالة (Session State)
if "text_result" not in st.session_state:
    st.session_state.text_result = None
if "image_result" not in st.session_state:
    st.session_state.image_result = None
if "text_counter" not in st.session_state:
    st.session_state.text_counter = 0

# 1. تهيئة Groq لفحص النصوص
try:
    groq_key = st.secrets["GROQ_API_KEY"]
    groq_client = Groq(api_key=groq_key)
except Exception as e:
    st.error("⚠️ تنبيه أمني: لم يتم العثور على المفتاح السري GROQ_API_KEY في إعدادات المنصة (Secrets).")
    st.stop()

# 2. التقاط جميع مفاتيح Gemini تلقائياً
gemini_keys = []
for k in st.secrets.keys():
    if "GEMINI" in k.upper():
        val = st.secrets[k]
        if isinstance(val, str) and val.strip():
            gemini_keys.append(val.strip())

if not gemini_keys:
    st.error("⚠️ تنبيه أمني: لم يتم العثور على أي مفتاح GEMINI في إعدادات المنصة (Secrets).")
    st.stop()

def analyze_image_with_gemini_rotation(image, prompt):
    global gemini_keys
    last_error = None

    for api_key in gemini_keys:
        try:
            genai.configure(api_key=api_key)
            candidate_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision', 'gemini-pro']
            response = None
            for model_name in candidate_models:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content([image, prompt])
                    if response and response.text:
                        break
                except Exception:
                    continue
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = str(e)
            if "429" in str(e) or "ResourceExhausted" in str(e):
                continue
            else:
                continue

    raise Exception(f"تعذر معالجة الصورة عبر جميع المفاتيح والموديلات المتاحة: {last_error}")

def render_status_badge(text_content):
    """دالة قراءة حالة التقييم ورسم المؤشر البصري الخاص بها"""
    if "STATUS: SAFE" in text_content or "حالة المحتوى: آمن" in text_content or "غير مخالف" in text_content and "STATUS: DANGER" not in text_content and "STATUS: WARNING" not in text_content:
        st.markdown('''
        <div class="status-card status-safe">
            <span>🟢 النتيجة: محتوى غير مخالف (آمن للنشر)</span>
            <span>✅</span>
        </div>
        ''', unsafe_allow_html=True)
    elif "STATUS: DANGER" in text_content or "حالة المحتوى: مخالف" in text_content or "نص مخالف" in text_content or "صورة مخالفة" in text_content:
        st.markdown('''
        <div class="status-card status-danger">
            <span>🔴 النتيجة: محتوى مخالف لسياسات Meta</span>
            <span>❌</span>
        </div>
        ''', unsafe_allow_html=True)
    else:
        st.markdown('''
        <div class="status-card status-warning">
            <span>🟡 النتيجة: محتوى مشبوه (يتطلب تعديلات)</span>
            <span>⚠️</span>
        </div>
        ''', unsafe_allow_html=True)

def display_formatted_report(raw_text):
    """دالة معالجة نص التقرير وعرضه بعناوين HTML بارزة ومفصولة تماماً"""
    clean_text = re.sub(r'STATUS:\s*(SAFE|WARNING|DANGER)', '', raw_text).strip()
    
    parts = re.split(r'(خلاصة الفحص والتقييم العام|التقرير التفصيلي والكلمات الحساسة|البديل الموصى به والمتوافق|فحص الشخصيات والعناصر المرئية|التوصيات والتعديلات المطلوبة)', clean_text)
    
    html_output = '<div class="report-container">'
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        content = parts[i+1].strip() if (i+1) < len(parts) else ""
        
        emoji = "📋"
        if "التفصيلي" in title or "الشخصيات" in title:
            emoji = "🔍" if "التفصيلي" in title else "👤"
        elif "البديل" in title or "التوصيات" in title:
            emoji = "💡"
            
        html_output += f'<div class="report-title-custom">{emoji} {title}</div>'
        html_output += f'<div style="margin-bottom: 12px;">{content}</div>'
        
    html_output += '</div>'
    st.markdown(html_output, unsafe_allow_html=True)

menu_option = st.selectbox(
    "اختر القسم:",
    [
        "الرئيسية", 
        "دليل معايير مجتمع Meta", 
        "سياسة الخصوصية", 
        "سياسة المستخدم", 
        "عن التطبيق", 
        "راسل التطبيق"
    ],
    label_visibility="collapsed"
)

if menu_option == "الرئيسية":
    st.markdown('<div class="main-header"><h1>🛡️ META SCAN</h1><p>تطبيق ذكي لفحص النصوص والصور لتجنب قيود ميتا</p></div>', unsafe_allow_html=True)

    # 1. قسم فحص نصوص المنشور
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">✍️ فحص نصوص المنشور</div>', unsafe_allow_html=True)

    dynamic_text_key = f"text_input_area_{st.session_state.text_counter}"
    post_content = st.text_area("نص المنشور:", height=80, placeholder="اكتب نص المنشور هنا ...", key=dynamic_text_key, label_visibility="collapsed")

    # توزيع الأعمدة: اليمين لزر الفحص، اليسار لزر نسخ بـ HTML مع سُمك بارز 700 وحجم 0.92rem
    col_right, col_left = st.columns(2)
    
    with col_right:
        btn_text = st.button("🔍 افحص نص المنشور", key="btn_text_scan")
        
    with col_left:
        st.components.v1.html("""
        <button onclick="
            const textarea = window.parent.document.querySelector('textarea');
            if (textarea && textarea.value.trim() !== '') {
                navigator.clipboard.writeText(textarea.value).then(() => {
                    alert('✅ تم نسخ النص إلى الحافظة بنجاح!');
                }).catch(err => {
                    alert('❌ تعذر النسخ، يرجى السماح للمتصفح بالوصول للحافظة');
                });
            } else {
                alert('⚠️ صندوق الإدخال فارغ، لا يوجد نص لنسخه!');
            }
        " style="
            width: 100%;
            background-color: #0068c4;
            color: white;
            font-weight: 700;
            border-radius: 8px;
            padding: 10px;
            border: none;
            font-size: 0.92rem;
            cursor: pointer;
            margin-top: -10px;
            text-align: center;
            font-family: 'Cairo', sans-serif;
        " onmouseover="this.style.backgroundColor='#004d99'" onmouseout="this.style.backgroundColor='#0068c4'">
            📋 نسخ النص
        </button>
        """, height=44, scrolling=False)

    if btn_text:
        if not post_content.strip():
            st.warning("⚠️ الرجاء كتابة نص المنشور أولاً.")
        else:
            found_local_words = [w for words in SUSPICIOUS_KEYWORDS.values() for w in words if w in post_content]
            with st.spinner("جاري تحليل النص وإعداد التقرير..."):
                try:
                    system_prompt = (
                        "أنت خبير محترف في سياسات وإعلانات منصات Meta.\n"
                        "قم بتحليل النص المدخل بدقة، ويجب أن تتضمن إجابتك التنسيق المباشر التالي في البداية تماماً:\n"
                        "إذا كان النص كاملاً آمن اكتب في السطر الأول: STATUS: SAFE\n"
                        "إذا كان يحتوي مخاطر وحظر مباشر اكتب في السطر الأول: STATUS: DANGER\n"
                        "إذا كان يحتوي كلمات محتملة للشك اكتب في السطر الأول: STATUS: WARNING\n\n"
                        "ثم اكتب التقرير بالهيكلية التالية:\n"
                        "خلاصة الفحص والتقييم العام:\n"
                        "(ملخص شامل وسريع عن حالة النص للقبول الإعلاني)\n\n"
                        "التقرير التفصيلي والكلمات الحساسة:\n"
                        "(فحص الكلمات الحساسة، السياق، والمخاطر المباشرة أو الخفية)\n\n"
                        "البديل الموصى به والمتوافق:\n"
                        "(صياغة بديلة آمنة ومضمونة 100% لتجنب أي رفض إعلاني)"
                    )

                    completion = groq_client.chat.completions.create(
                        model="openai/gpt-oss-20b", 
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": post_content}], 
                        temperature=0.3, 
                        max_tokens=1024
                    )

                    st.session_state.text_result = completion.choices[0].message.content
                    st.success("✅ تم فحص النص بنجاح!")
                except Exception as e:
                    st.error(f"❌ حدث خطأ أثناء الاتصال بنظام الفحص: {e}")

    # عرض النتائج المعالجة برمجياً
    if st.session_state.text_result:
        raw_result = st.session_state.text_result
        render_status_badge(raw_result)

        found_local_words = [w for words in SUSPICIOUS_KEYWORDS.values() for w in words if w in post_content]
        if found_local_words:
            st.markdown(f'<div class="local-warning"><b>⚠️ تنبيه من المساعد المحلي:</b> تم رصد مصطلحات دقيقة محلياً: <code>{", ".join(found_local_words)}</code></div>', unsafe_allow_html=True)

        display_formatted_report(raw_result)

        if st.button("🔄 فحص نص جديد", key="reset_text_btn"):
            st.session_state.text_result = None
            st.session_state.text_counter += 1
            st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

    # 2. قسم فحص صور المنشور
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">🖼️ فحص صور المنشور</div>', unsafe_allow_html=True)

    uploaded_image = st.file_uploader("اختر ملف الصورة (PNG, JPG, JPEG):", type=["png", "jpg", "jpeg"], key="image_upload_area", label_visibility="collapsed")

    if uploaded_image:
        image = Image.open(uploaded_image)
        st.image(image, caption="الصورة المرفوعة للفحص", use_column_width=True)

        btn_image = st.button("🔍 افحص صورة المنشور", key="btn_image_scan")

        if btn_image:
            with st.spinner("جاري فحص الصورة والتعرف على العناصر..."):
                try:
                    image_prompt = (
                        "أنت خبير فحص سياسات إعلانات ومعايير مجتمع Meta.\n"
                        "قم بتحليل الصورة، ويجب وضع حالة النتيجة في السطر الأول تماماً كالتالي:\n"
                        "إذا كانت الصورة آمنة تماماً: STATUS: SAFE\n"
                        "إذا كانت الصورة تحتوي شخصية محظورة أو أسلحة أو رموز مخالفة: STATUS: DANGER\n"
                        "إذا كانت الصورة تحتوي تلميحات أو عناصر مشبوهة: STATUS: WARNING\n\n"
                        "ثم اكتب التقرير بوضوح:\n"
                        "خلاصة الفحص والتقييم العام:\n"
                        "(ملخص شامل وسريع عن حالة الصورة للقبول الإعلاني)\n\n"
                        "فحص الشخصيات والعناصر المرئية:\n"
                        "(فحص الوجوه، الشخصيات العامة أو السياسية، الأسلحة، الرموز والشعارات)\n\n"
                        "التوصيات والتعديلات المطلوبة:\n"
                        "(إرشادات عمل لتعديل الصورة أو استبدالها لضمان الأمان)"
                    )

                    st.session_state.image_result = analyze_image_with_gemini_rotation(image, image_prompt)
                    st.success("✅ تم الفحص البصري بنجاح!")
                except Exception as e:
                    st.error(f"❌ حدث خطأ أثناء فحص الصورة: {e}")
    else:
        st.button("🔍 افحص صورة المنشور", key="btn_image_scan_disabled", disabled=True)

    # عرض نتائج فحص الصورة المعالجة برمجياً
    if st.session_state.image_result:
        res_text = st.session_state.image_result
        render_status_badge(res_text)

        display_formatted_report(res_text)

        if st.button("🔄 فحص صورة جديدة", key="reset_img_btn"):
            st.session_state.image_result = None
            st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

    # عبارة إخلاء المسؤولية وحقوق النشر تظهر حصرياً في الشاشة الرئيسية وعند نتائج الفحص
    st.markdown("""
    <div class="disclaimer-box">
        <div class="disclaimer-title">تنويه إخلاء مسؤولية ⚠️</div>
        "هذه النتائج تقديرية مبنية على معايير المجتمع من شركة Meta وليس قرارًا رسميًا من Meta".
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<p style='text-align: center; color: gray; font-size: 0.8rem; margin-top: 4px;'>تم تطوير النظام بواسطة Sakhr AlHubaish © 2026 | جميع الحقوق محفوظة</p>", unsafe_allow_html=True)

elif menu_option == "دليل معايير مجتمع Meta":
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">📖 دليل معايير مجتمع Meta</div>', unsafe_allow_html=True)
    st.markdown('''
    <div class="rtl-menu-content">
        <p>يعتمد فاحص <b>META SCAN</b> على تحليل المحتوى وفقاً لأبرز بنود السياسة والمعايير المعتمدة التالية من Meta:</p>
        <ol>
            <li><b>العنف والتحريض:</b> منع الترويج للأعمال العنفية، التهديدات، أو الأسلحة.</li>
            <li><b>خطاب الكراهية:</b> محاربة الهجوم على الأفراد أو المجموعات بناءً على العرق، الدين، الجنس.</li>
            <li><b>المحتوى الجنسي والعري:</b> منع الترويج للصور أو العبارات الفاضحة.</li>
            <li><b>الخطاب المضلل:</b> تجنب الأخبار المزيفة المؤثرة على السلامة العامة والانتخابات.</li>
            <li><b>الملكية الفكرية:</b> حماية حقوق الملكية والقرصنة والعلامات التجارية.</li>
            <li><b>المنتجات والخدمات المقيدة:</b> كالسلع المقيدة والعمليات المالية غير المرخصة.</li>
            <li><b>الأمان والخصوصية:</b> منع مشاركة المعلومات الشخصية للآخرين (Doxxing).</li>
            <li><b>التنمر والتحرش:</b> منع الإساءة المباشرة والمضايقات الرقمية.</li>
            <li><b>الاحتيال والخداع:</b> منع الترويج للأنشطة المالية المشبوهة أو الوهمية.</li>
            <li><b>السلع الخاضعة للرقابة:</b> الأدوية غير المرخصة والمواد المخدرة.</li>
            <li><b>الانتحار أو إيذاء النفس:</b> منع تشجيع أو وصف وسائل إيذاء النفس.</li>
            <li><b>التطرف والإرهاب:</b> حظر المنظمات الإرهابية والترويج لأفكارها.</li>
            <li><b>التلاعب بالنظام (Spam):</b> نشر الروابط الوهمية والتفاعل الزائف.</li>
            <li><b>الأخبار الصحية الزائفة:</b> تضليل الجمهور بشأن القضايا الصحية.</li>
            <li><b>الاحتيال التجاري:</b> ضمان مصداقية العروض التجارية والإعلانات الممولة.</li>
        </ol>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

elif menu_option == "سياسة الخصوصية":
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">🔒 سياسة الخصوصية</div>', unsafe_allow_html=True)
    st.markdown('''
    <div class="rtl-menu-content">
        <p>نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية في تطبيق <b>META SCAN</b>:</p>
        <ol>
            <li>التطبيق لا يطلب أي معلومات شخصية ولا يتطلب إنشاء حساب ولا يقوم بتخزين أي نصوص أو صور.</li>
            <li>تتم معالجة النصوص والصور عبر واجهات برمجية آمنة وموثوقة.</li>
            <li>نقل البيانات يتم عبر بروتوكول مشفر (HTTPS).</li>
        </ol>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

elif menu_option == "سياسة المستخدم":
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">⚖️ سياسة المستخدم</div>', unsafe_allow_html=True)
    st.markdown('''
    <div class="rtl-menu-content">
        <p>يرجى قراءة بنود وسياسة استخدام التطبيق بعناية:</p>
        <ol>
            <li>النتائج يتم توليدها عبر الذكاء الاصطناعي والتطبيق غير مسؤول عن أي قرارات تتخذها بناءً عليها.</li>
            <li>قد تحصل اخطأ أحياناً عند فحص النصوص والصور في حال كان هناك ضغط على نماذج فحص الذكاء الاصطناعي.</li>
            <li>النتائج تقريبية ومبنية على معايير Meta.</li>
            <li>يمنع استخدام التطبيق لفحص مواد تخالف القانون أو الآداب العامة.</li>
        </ol>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

elif menu_option == "عن التطبيق":
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">ℹ️ عن التطبيق</div>', unsafe_allow_html=True)
    st.markdown('''
    <div class="rtl-menu-content">
        <p>تم برمجة وتطوير هذا التطبيق بواسطة <b>Sakhr AlHubaish</b> لمساعدة المستخدمين في فحص المنشورات والإعلانات لتجنب قيود Meta.</p>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

elif menu_option == "راسل التطبيق":
    st.markdown('<div class="section-box">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">📬 راسل التطبيق</div>', unsafe_allow_html=True)
    st.markdown('''
    <div class="rtl-menu-content">
        <p>يسعدنا تلقي استفساراتكم وملاحظاتكم عبر البريد الإلكتروني:</p>
        <p>📧 <b>sakhrs545@gmail.com</b></p>
    </div>
    ''', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
