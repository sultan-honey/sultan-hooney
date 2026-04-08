import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

if (document.getElementById('loginBtn')) {
    document.getElementById('loginBtn').addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { window.location.href = "dashboard.html"; })
            .catch(() => { alert("البيانات غير صحيحة ❌"); });
    });
}

if (document.getElementById('logoutBtn')) {
    let allCustomers = [];

    onAuthStateChanged(auth, (user) => { if (!user) window.location.href = "index.html"; });
    document.getElementById('logoutBtn').addEventListener('click', () => { signOut(auth); });

    document.getElementById('addBtn').addEventListener('click', async () => {
        const name = document.getElementById('custName').value;
        const phone = document.getElementById('custPhone').value;
        const address = document.getElementById('custAddress').value;
        const order = document.getElementById('custOrder').value;

        if(!name || !phone) return alert("الاسم والجوال مطلوبان!");

        try {
            await addDoc(collection(db, "customers"), {
                name, phone, address, order, createdAt: serverTimestamp()
            });
            document.querySelectorAll('input, textarea').forEach(i => i.value = "");
            alert("تم الحفظ بنجاح! 🐝");
        } catch (e) { alert("خطأ في الاتصال بالقاعدة!"); }
    });

    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        document.getElementById('totalCustomersCount').innerText = snapshot.size;
        allCustomers = [];
        snapshot.forEach((doc) => { allCustomers.push({ id: doc.id, ...doc.data() }); });
        renderTable(document.getElementById('searchInput').value);
    });

    // وظيفة تصدير الإكسيل
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        if(allCustomers.length === 0) return alert("لا يوجد عملاء لتصديرهم!");
        
        // تجهيز البيانات للإكسيل بشكل مرتب
        const excelData = allCustomers.map(c => ({
            "اسم العميل": c.name,
            "الجوال": c.phone,
            "العنوان": c.address,
            "تفاصيل الطلب": c.order,
            "تاريخ الإضافة": c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString('ar-SA') : ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "قائمة العملاء");
        XLSX.writeFile(workbook, "Sultan_Al_Asal_Customers.xlsx");
    });

    window.renderTable = (searchTerm = "") => {
        const tableBody = document.getElementById('customersTableBody');
        tableBody.innerHTML = "";
        allCustomers.forEach((c) => {
            if (searchTerm && !c.name.includes(searchTerm) && !c.phone.includes(searchTerm)) return; 
            const wa = c.phone.startsWith('0') ? '966' + c.phone.substring(1) : c.phone;
            const row = `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone}</td>
                    <td>
                        <a href="https://wa.me/${wa}" target="_blank" class="whatsapp-btn">واتساب</a>
                        <button class="details-btn" onclick="showDetails('${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${(c.address || "غير مسجل").replace(/'/g, "\\'")}', '${(c.order || "لا يوجد").replace(/\n/g, "<br>").replace(/'/g, "\\'")}')">التفاصيل</button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    };

    document.getElementById('searchInput').addEventListener('input', (e) => renderTable(e.target.value));

    window.showDetails = (name, phone, address, order) => {
        document.getElementById('modalData').innerHTML = `
            <p style="margin-bottom:10px;"><strong>👤 العميل:</strong> ${name}</p>
            <p style="margin-bottom:10px;"><strong>📞 الجوال:</strong> ${phone}</p>
            <p style="margin-bottom:10px;"><strong>📍 العنوان:</strong> ${address}</p>
            <div style="background:#fdfaf0; padding:15px; border-radius:10px; border-right:4px solid #e6b31e;">
                <strong>🛒 الطلبات:</strong><br>${order}
            </div>
        `;
        document.getElementById('detailsModal').style.display = "block";
    }
    window.closeModal = () => { document.getElementById('detailsModal').style.display = "none"; }
}