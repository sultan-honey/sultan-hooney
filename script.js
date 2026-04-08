import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// إعدادات قاعدة بياناتك (لا تغيرها)
const firebaseConfig = {
    apiKey: "AIzaSyBlE0IMGJgSJyxc4BjA_aMQy_mZhHqv3eU",
    authDomain: "sultan-al-asal.firebaseapp.com",
    projectId: "sultan-al-asal",
    storageBucket: "sultan-al-asal.firebasestorage.app",
    messagingSenderId: "601644000359",
    appId: "1:601644000359:web:dc3d825f1ae3502020a0c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// أكواد صفحة تسجيل الدخول (index.html)
// ==========================================
if (document.getElementById('loginBtn')) {
    
    // إذا كان المستخدم مسجل دخول مسبقاً، حوله فوراً للوحة
    onAuthStateChanged(auth, (user) => {
        if (user) window.location.href = "dashboard.html";
    });

    document.getElementById('loginBtn').addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if(!email || !password) return alert("الرجاء إدخال البريد الإلكتروني وكلمة المرور!");
        
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { window.location.href = "dashboard.html"; })
            .catch(() => { alert("البيانات غير صحيحة ❌ تأكد من الإيميل وكلمة السر."); });
    });
}

// ==========================================
// أكواد صفحة لوحة التحكم (dashboard.html)
// ==========================================
if (document.getElementById('logoutBtn')) {
    let allCustomers = [];

    // حماية الصفحة: طرد أي شخص غير مسجل دخول
    onAuthStateChanged(auth, (user) => { 
        if (!user) window.location.href = "index.html"; 
    });

    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', () => { 
        signOut(auth); 
    });

    // إضافة عميل جديد
    document.getElementById('addBtn').addEventListener('click', async () => {
        const name = document.getElementById('custName').value;
        const phone = document.getElementById('custPhone').value;
        const address = document.getElementById('custAddress').value;
        const order = document.getElementById('custOrder').value;

        if(!name || !phone) return alert("الاسم ورقم الجوال مطلوبان لإضافة العميل!");

        try {
            await addDoc(collection(db, "customers"), {
                name, phone, address, order, createdAt: serverTimestamp()
            });
            // تفريغ الخانات بعد الحفظ
            document.querySelectorAll('.add-customer-box input, .add-customer-box textarea').forEach(i => i.value = "");
            alert("تم حفظ العميل بنجاح! 🐝");
        } catch (e) { alert("حدث خطأ! تأكد من اتصالك بالإنترنت."); console.error(e); }
    });

    // جلب البيانات من القاعدة مباشرة ورسم الجدول
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        document.getElementById('totalCustomersCount').innerText = snapshot.size;
        allCustomers = [];
        snapshot.forEach((doc) => { allCustomers.push({ id: doc.id, ...doc.data() }); });
        renderTable(document.getElementById('searchInput').value);
    });

    // وظيفة رسم الجدول (تدعم البحث)
    window.renderTable = (searchTerm = "") => {
        const tableBody = document.getElementById('customersTableBody');
        tableBody.innerHTML = "";
        
        allCustomers.forEach((c) => {
            if (searchTerm && !c.name.includes(searchTerm) && !c.phone.includes(searchTerm)) return; 
            
            // تجهيز رقم الواتساب
            const wa = c.phone.startsWith('0') ? '966' + c.phone.substring(1) : c.phone;
            
            const row = `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td dir="ltr" style="text-align: right;">${c.phone}</td>
                    <td>
                        <a href="https://wa.me/${wa}" target="_blank" class="whatsapp-btn">💬 واتساب</a>
                        <button class="details-btn" onclick="showDetails('${c.id}')">👁️ التفاصيل</button>
                        <button class="edit-btn" onclick="openEditModal('${c.id}')">✏️ تعديل</button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    };

    // تشغيل البحث عند الكتابة
    document.getElementById('searchInput').addEventListener('input', (e) => renderTable(e.target.value));

    // تصدير الإكسيل
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        if(allCustomers.length === 0) return alert("لا يوجد عملاء في القاعدة لتصديرهم!");
        const excelData = allCustomers.map(c => ({
            "اسم العميل": c.name, 
            "الجوال": c.phone, 
            "العنوان": c.address || "", 
            "تفاصيل الطلب": c.order || "",
            "تاريخ الإضافة": c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString('ar-SA') : ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "عملاء سلطان العسل");
        XLSX.writeFile(workbook, "Sultan_Al_Asal_Customers.xlsx");
    });

    // عرض التفاصيل
    window.showDetails = (id) => {
        const c = allCustomers.find(cust => cust.id === id);
        if(!c) return;
        document.getElementById('modalData').innerHTML = `
            <p style="margin-bottom:15px; font-size:18px;"><strong>👤 العميل:</strong> ${c.name}</p>
            <p style="margin-bottom:15px; font-size:18px;"><strong>📞 الجوال:</strong> ${c.phone}</p>
            <p style="margin-bottom:15px; font-size:18px;"><strong>📍 العنوان:</strong> ${c.address || 'لا يوجد'}</p>
            <div style="background:#fdfaf0; padding:15px; border-radius:10px; border-right:4px solid #e6b31e; line-height:1.8;">
                <strong style="font-size:18px;">🛒 الطلبات:</strong><br>${(c.order || 'لا يوجد').replace(/\n/g, "<br>")}
            </div>
        `;
        document.getElementById('detailsModal').style.display = "block";
    }
    window.closeModal = () => { document.getElementById('detailsModal').style.display = "none"; }

    // فتح نافذة التعديل
    window.openEditModal = (id) => {
        const c = allCustomers.find(cust => cust.id === id);
        if(!c) return;
        document.getElementById('editCustId').value = c.id;
        document.getElementById('editCustName').value = c.name;
        document.getElementById('editCustPhone').value = c.phone;
        document.getElementById('editCustAddress').value = c.address || '';
        document.getElementById('editCustOrder').value = c.order || '';
        document.getElementById('editModal').style.display = "block";
    }
    window.closeEditModal = () => { document.getElementById('editModal').style.display = "none"; }

    // حفظ التعديلات في القاعدة
    document.getElementById('saveEditBtn').addEventListener('click', async () => {
        const id = document.getElementById('editCustId').value;
        const newName = document.getElementById('editCustName').value;
        const newPhone = document.getElementById('editCustPhone').value;
        const newAddress = document.getElementById('editCustAddress').value;
        const newOrder = document.getElementById('editCustOrder').value;

        if(!newName || !newPhone) return alert("الاسم والجوال مطلوبان!");

        try {
            const customerRef = doc(db, "customers", id);
            await updateDoc(customerRef, {
                name: newName,
                phone: newPhone,
                address: newAddress,
                order: newOrder
            });
            alert("تم تعديل البيانات بنجاح! ✅");
            closeEditModal();
        } catch (e) { alert("حدث خطأ أثناء التعديل!"); console.error(e); }
    });
}
