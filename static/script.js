let isLogin = true;

function showAdmin() { document.getElementById('authModal').style.display = 'flex'; }
function closeModal() { document.getElementById('authModal').style.display = 'none'; }
function toggleAuth() { 
    isLogin = !isLogin; 
    document.getElementById('authTitle').innerText = isLogin ? "LOG IN" : "SIGN UP"; 
}

async function handleAuth() {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;
    const path = isLogin ? '/login' : '/signup';
    
    const res = await fetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, password: pass})
    });

    if (res.ok) {
        if (isLogin) {
            localStorage.setItem('ua_session', 'true');
            location.reload();
        } else {
            alert("ADMIN CREATED");
            toggleAuth();
        }
    } else { alert("ACCESS DENIED"); }
}

async function fetchStudents() {
    const res = await fetch('/students');
    const data = await res.json();
    const isAdmin = localStorage.getItem('ua_session');
    
    const grid = document.getElementById('studentGrid');
    if (data.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center;'>No student records found.</p>";
        return;
    }

    grid.innerHTML = data.map(s => `
        <div class="product-card">
            <div style="background: #f2f2f2; height: 150px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🎓</div>
            <h3>${s.name}</h3>
            <p>${s.course} - Year ${s.year}</p>
            <p><strong>GPA: ${s.gpa.toFixed(2)}</strong></p>
            ${isAdmin ? `<button onclick="deleteStudent('${s.name}')" class="delete-btn">REMOVE RECORD</button>` : ''}
        </div>
    `).join('');
}

async function deleteStudent(name) {
    if(confirm(`Remove record for ${name}?`)) {
        await fetch(`/students/${encodeURIComponent(name)}`, { method: 'DELETE' });
        fetchStudents();
    }
}

async function saveStudent() {
    const s = {
        name: document.getElementById('sName').value,
        course: document.getElementById('sCourse').value,
        year: parseInt(document.getElementById('sYear').value),
        gpa: parseFloat(document.getElementById('sGPA').value)
    };
    
    const res = await fetch('/students', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(s)
    });

    if (res.ok) {
        // Clear fields
        document.getElementById('sName').value = "";
        document.getElementById('sCourse').value = "";
        document.getElementById('sYear').value = "";
        document.getElementById('sGPA').value = "";
        fetchStudents();
    }
}

function logout() { localStorage.removeItem('ua_session'); location.reload(); }

if (localStorage.getItem('ua_session')) document.getElementById('adminPanel').style.display = 'block';
fetchStudents();