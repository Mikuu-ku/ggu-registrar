let isLoginMode = true;
let currentFilter = 'ALL STUDENTS';

window.onload = function() {
    // Check if user is already logged in
    if (localStorage.getItem('ua_session')) {
        showUI();
        setupFilters(); 
        fetchStudents();
    }
};

// --- AUTHENTICATION LOGIC ---
function toggleAuth() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const link = document.getElementById('toggleLink');

    title.innerText = isLoginMode ? "ADMINISTRATOR LOGIN" : "ADMIN REGISTRATION";
    btn.innerText = isLoginMode ? "SIGN IN" : "CREATE ACCOUNT";
    link.innerText = isLoginMode ? "NEED AN ADMIN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? LOG IN";
}

async function handleAuth() {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;
    const path = isLoginMode ? '/login' : '/signup';

    if (!user || !pass) { alert("Please fill in all fields."); return; }

    const res = await fetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, password: pass})
    });

    if (res.ok) {
        if (isLoginMode) {
            localStorage.setItem('ua_session', 'true');
            location.reload(); 
        } else {
            alert("ADMIN REGISTERED! Please sign in.");
            toggleAuth();
        }
    } else { 
        alert("ACCESS DENIED: Invalid credentials."); 
    }
}

function showUI() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainHeader').style.display = 'flex';
    document.getElementById('subNav').style.display = 'block';
    document.getElementById('catBar').style.display = 'flex';
    document.getElementById('studentGrid').style.display = 'grid';
    document.getElementById('adminPanel').style.display = 'block';
}

// --- STUDENT DATA & FILTER LOGIC ---
function setupFilters() {
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.innerText.trim().toUpperCase();
            fetchStudents();
        };
    });
}

async function fetchStudents() {
    try {
        const res = await fetch('/students');
        let data = await res.json();
        
        console.log("Data from server:", data); // Check F12 Console to see if data exists

        if (!data || data.length === 0) {
            document.getElementById('studentGrid').innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: #999; padding: 60px;">
                    DATABASE IS EMPTY. ENROLL A STUDENT BELOW.
                </p>`;
            return;
        }

        // --- IMPROVED FILTERING ---
        // We trim and uppercase both sides to ensure "BSIT" matches "bsit"
        let filteredData = data;
        if (currentFilter !== 'ALL STUDENTS') {
            filteredData = data.filter(s => 
                s.course && s.course.trim().toUpperCase() === currentFilter.trim().toUpperCase()
            );
        }

        const grid = document.getElementById('studentGrid');
        
        if (filteredData.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 60px;">
                NO RECORDS FOUND FOR ${currentFilter}
            </p>`;
        } else {
            grid.innerHTML = filteredData.map(s => `
                <div class="product-card">
                    <div class="avatar-box">🎓</div>
                    <h3>${s.name}</h3>
                    <p>${s.course} • Year ${s.year}</p>
                    <div class="gpa-badge">GPA: ${s.gpa ? s.gpa.toFixed(2) : "0.00"}</div>
                    <button onclick="deleteStudent('${s.name}')" class="delete-btn">REMOVE RECORD</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

async function saveStudent() {
    const nameInput = document.getElementById('sName');
    const courseInput = document.getElementById('sCourse');
    const yearInput = document.getElementById('sYear'); // New Dropdown
    const gpaInput = document.getElementById('sGPA');

    if (!nameInput.value || !courseInput.value || !yearInput.value) {
        alert("PLEASE FILL IN ALL FIELDS.");
        return;
    }

    const s = {
        name: nameInput.value,
        course: courseInput.value,
        year: parseInt(yearInput.value),
        gpa: parseFloat(gpaInput.value) || 0.0
    };

    try {
        const res = await fetch('/students', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(s)
        });

        if (res.ok) {
            alert("STUDENT ENROLLED SUCCESSFULLY!");
            
            // RESET FIELDS
            nameInput.value = "";
            courseInput.selectedIndex = 0;
            yearInput.selectedIndex = 0; // Reset Year Dropdown
            gpaInput.value = "";
            
            currentFilter = 'ALL STUDENTS';
            fetchStudents();
        }
    } catch (err) {
        console.error("Save failed:", err);
    }
}

async function deleteStudent(name) {
    if(confirm(`Permanently delete ${name}?`)) {
        await fetch(`/students/${encodeURIComponent(name)}`, { method: 'DELETE' });
        fetchStudents();
    }
}

function logout() {
    localStorage.removeItem('ua_session');
    location.reload();
}