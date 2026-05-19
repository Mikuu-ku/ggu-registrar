window.onload = load;

let isEditMode = false;

async function load() {
    const res = await fetch('/students');
    const data = await res.json();
    const list = document.getElementById('studentList');

    list.innerHTML = data.length === 0 
        ? '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">No students found.</div>'
        : data.map((s, i) => `
            <div class="student-card" style="animation-delay: ${i * 0.08}s">
                <div class="card-actions">
                    <button class="action-btn edit-btn" onclick="startEdit('${s.name}', '${s.course}', ${s.year})">✎</button>
                    <button class="action-btn del-btn" onclick="deleteStudent('${s.name}')">✕</button>
                </div>
                <h4 style="margin: 0 0 5px 0;">${s.name}</h4>
                <p style="margin: 0; color: #64748b; font-size: 14px;">${s.course}</p>
                <div class="badge">YEAR LEVEL ${s.year}</div>
            </div>
        `).join('');
}

async function handleSubmit() {
    const name = document.getElementById('name').value;
    const course = document.getElementById('course').value;
    const year = parseInt(document.getElementById('year').vlue);
    const oldName = document.getElementById('oldName').value;

    if (!name) return alert("Please enter a name.");

    const url = isEditMode ? `/students/${encodeURIComponent(oldName)}` : '/students';
    const method = isEditMode ? 'PUT' : 'POST';

    await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, course, year })
    });

    exitEditMode();
    load();
}

function startEdit(name, course, year) {
    isEditMode = true;
    document.getElementById('editLabel').style.display = 'block';
    const btn = document.getElementById('submitBtn');
    btn.innerText = "SAVE CHANGES";
    btn.classList.add('edit-mode');

    document.getElementById('name').value = name;
    document.getElementById('course').value = course;
    document.getElementById('year').value = year;
    document.getElementById('oldName').value = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitEditMode() {
    isEditMode = false;
    document.getElementById('editLabel').style.display = 'none';
    const btn = document.getElementById('submitBtn');
    btn.innerText = "ENROLL";
    btn.classList.remove('edit-mode');
    document.getElementById('name').value = '';
    document.getElementById('oldName').value = '';
}

async function deleteStudent(name) {
    if (confirm(`Remove ${name} from registrar?`)) {
        await fetch(`/students/${encodeURIComponent(name)}`, { method: 'DELETE' });
        load();
    }
}