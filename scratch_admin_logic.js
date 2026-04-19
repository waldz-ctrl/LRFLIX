// ----- APPEND TO ADMIN.JS ----- //

// --- Upload Form Dynamic Logic ---
const uploadDynamicGroups = [
    'group-type', 'group-curriculum', 'group-school-level', 'group-camp-type', 'group-material-type',
    'group-learning-area', 'group-component', 'group-title', 'group-grade', 'group-module-no',
    'group-authors', 'group-language', 'group-quarter-week', 'group-quarter', 'group-week',
    'group-comp', 'group-code', 'group-content-std', 'group-perf-std', 'group-year', 'group-desc', 'group-file'
];

document.getElementById('res-category')?.addEventListener('change', (e) => {
    const cat = e.target.value;
    const typeSelect = document.getElementById('res-type');
    typeSelect.innerHTML = '<option value="">Select...</option>';
    
    let types = [];
    if(cat === 'MATATAG Curriculum Resources') types = ['Lesson Exemplars (LEs)', 'Learning Activity Sheets (LAS)', 'MATATAG 3 Term Budget of Work (BoW)', 'Curriculum Guide'];
    else if(cat === 'K to 12 Curriculum Resources') types = ['Self-Learning Modules (SLMs)', 'Learning Activity Sheets (LAS)'];
    else if(cat === 'Contextualized Learning Resources (CLRs)') types = ['School Developed Text-based Materials', 'Ivatan Textbooks', 'Digital Learning Resources'];
    else if(cat === 'National Learning Camp (NLC)') types = ['Intervention', 'Enhancement', 'Consolidation'];
    else if(cat === 'National Reading Program (NRP)') types = ['Worksheets', 'Lesson Exemplars'];
    
    types.forEach(t => { typeSelect.innerHTML += `<option value="${t}">${t}</option>`; });
    
    updateFormVisibility();
});

document.getElementById('res-type')?.addEventListener('change', updateFormVisibility);

function updateFormVisibility() {
    const cat = document.getElementById('res-category').value;
    const type = document.getElementById('res-type').value;
    
    let toShow = ['group-file']; // File is always needed
    
    if(cat && type) {
        if(cat === 'MATATAG Curriculum Resources') {
            if(type === 'Lesson Exemplars (LEs)' || (type === 'Learning Activity Sheets (LAS)' && cat==='MATATAG Curriculum Resources')) {
                toShow.push('group-type', 'group-curriculum', 'group-school-level', 'group-learning-area', 'group-title', 'group-grade', 'group-quarter-week', 'group-quarter', 'group-week', 'group-comp', 'group-content-std', 'group-perf-std', 'group-code');
                document.getElementById('res-curriculum').value = 'MATATAG';
            } else if (type === 'MATATAG 3 Term Budget of Work (BoW)') {
                toShow.push('group-type', 'group-curriculum', 'group-school-level', 'group-grade', 'group-learning-area', 'group-component');
                document.getElementById('res-curriculum').value = 'MATATAG';
            } else if (type === 'Curriculum Guide') {
                toShow.push('group-type', 'group-curriculum', 'group-school-level', 'group-grade', 'group-learning-area');
                document.getElementById('res-curriculum').value = 'MATATAG';
            }
        } 
        else if(cat === 'K to 12 Curriculum Resources') {
            toShow.push('group-type', 'group-curriculum', 'group-school-level', 'group-learning-area', 'group-title', 'group-grade', 'group-module-no', 'group-quarter-week', 'group-quarter', 'group-week', 'group-comp', 'group-content-std', 'group-perf-std', 'group-code');
            document.getElementById('res-curriculum').value = 'K to 12';
        }
        else if(cat === 'Contextualized Learning Resources (CLRs)') {
            if(type === 'School Developed Text-based Materials') {
                toShow.push('group-type', 'group-curriculum', 'group-school-level', 'group-learning-area', 'group-title', 'group-authors', 'group-language', 'group-grade', 'group-quarter-week', 'group-quarter', 'group-week', 'group-comp', 'group-content-std', 'group-perf-std', 'group-code', 'group-desc', 'group-year');
                document.getElementById('res-curriculum').value = '';
            } else if (type === 'Ivatan Textbooks') {
                toShow.push('group-type', 'group-title', 'group-school-level', 'group-grade', 'group-learning-area', 'group-comp', 'group-content-std', 'group-perf-std', 'group-code');
            } else if (type === 'Digital Learning Resources') {
                toShow.push('group-type', 'group-title', 'group-desc', 'group-material-type', 'group-school-level', 'group-learning-area', 'group-grade', 'group-comp', 'group-content-std', 'group-perf-std', 'group-code');
                
                // Repurpose material-type for resource type options
                const mtSelect = document.getElementById('res-material-type');
                mtSelect.innerHTML = '<option value="">Select...</option><option value="Audio">Audio</option><option value="Video">Video</option><option value="Presentation (PPT)">Presentation (PPT)</option><option value="Image/Graphics">Image/Graphics</option>';
            }
        }
        else if(cat === 'National Learning Camp (NLC)') {
            toShow.push('group-camp-type', 'group-material-type', 'group-school-level', 'group-title', 'group-quarter-week', 'group-week', 'group-learning-area', 'group-grade');
            const mtSelect = document.getElementById('res-material-type');
            mtSelect.innerHTML = '<option value="">Select...</option><option value="LP">LP</option><option value="NT">NT</option><option value="WB">WB</option><option value="RB">RB</option><option value="Assessment">Assessment</option>';
        }
        else if(cat === 'National Reading Program (NRP)') {
            toShow.push('group-type', 'group-material-type', 'group-school-level', 'group-title', 'group-quarter-week', 'group-quarter', 'group-week', 'group-learning-area', 'group-grade');
            const mtSelect = document.getElementById('res-material-type');
            mtSelect.innerHTML = '<option value="">Select...</option><option value="Lesson Script">Lesson Script</option><option value="Intervention">Intervention</option><option value="Enhancement">Enhancement</option><option value="Consolidated">Consolidated</option>';
            // Pre-select reading
            const laSelect = document.getElementById('res-learning-area');
            if(!Array.from(laSelect.options).find(o=>o.value==='Reading')) laSelect.innerHTML += '<option value="Reading">Reading</option>';
            laSelect.value = 'Reading';
        }
    }
    
    uploadDynamicGroups.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if(toShow.includes(id)) {
                // Keep flex for quarter/week inner groups
                if(id==='group-quarter' || id==='group-week') el.style.display = 'block'; 
                else if(id==='group-quarter-week') el.style.display = 'flex';
                else el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        }
    });
}

// --- Dynamic Competency DB Lookup Logic ---
function updateDynamicOptions(endpoint, elementId, defaultOptionText, skipValCheck=false) {
    if(!skipValCheck) document.getElementById(elementId).innerHTML = `<option value="">${defaultOptionText}</option>`;
    fetch(endpoint).then(r=>r.json()).then(data => {
        if(data.success && data.data) {
            let options = [];
            if(elementId === 'res-learning-area') options = data.data.subjects;
            else if(elementId === 'res-grade') options = data.data.grades;
            else if(elementId === 'res-quarter') options = data.data.quarters;
            else if(elementId === 'res-week') options = data.data.weeks;
            
            const select = document.getElementById(elementId);
            const currentVal = select.value;
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            options.forEach(opt => {
                if(opt) select.innerHTML += `<option value="${opt}">${opt}</option>`;
            });
            if(elementId === 'res-grade') select.innerHTML += `<option value="Others...">Others... (Type below)</option>`;
            
            if(currentVal) select.value = currentVal;

            if(data.data.competencies && data.data.competencies.length > 0) {
                const compSelect = document.getElementById('res-comp-select');
                compSelect.innerHTML = '<option value="">Select MELC...</option>';
                data.data.competencies.forEach(c => {
                    compSelect.innerHTML += `<option value="${c.id}" data-melc="${c.melc}" data-content="${c.content_std}" data-perf="${c.performance_std}" data-code="${c.code}">${c.melc} (Code: ${c.code||'N/A'})</option>`;
                });
                
                // Auto-fill if exactly 1
                if(data.data.competencies.length === 1) {
                    compSelect.selectedIndex = 1;
                    compSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    });
}

function triggerDynamicUpdate() {
    const subject = document.getElementById('res-learning-area').value;
    const grade = document.getElementById('res-grade').value;
    const quarter = document.getElementById('res-quarter').value;
    const week = document.getElementById('res-week').value;
    
    let url = `api/competencies.php?action=unique_values&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}&quarter=${encodeURIComponent(quarter)}&week=${encodeURIComponent(week)}`;
    
    updateDynamicOptions(url, 'res-grade', 'Select Grade...');
    updateDynamicOptions(url, 'res-quarter', 'Select Quarter...');
    updateDynamicOptions(url, 'res-week', 'Select Week...');
}

document.getElementById('res-learning-area')?.addEventListener('change', triggerDynamicUpdate);
document.getElementById('res-grade')?.addEventListener('change', (e) => {
    document.getElementById('res-grade-custom').style.display = e.target.value === 'Others...' ? 'block' : 'none';
    triggerDynamicUpdate();
});
document.getElementById('res-quarter')?.addEventListener('change', triggerDynamicUpdate);
document.getElementById('res-week')?.addEventListener('change', triggerDynamicUpdate);

document.getElementById('res-comp-select')?.addEventListener('change', (e) => {
    const sel = e.target.options[e.target.selectedIndex];
    if(sel && sel.value !== "") {
        document.getElementById('res-content-std').value = sel.getAttribute('data-content') || '';
        document.getElementById('res-perf-std').value = sel.getAttribute('data-perf') || '';
        document.getElementById('res-code').value = sel.getAttribute('data-code') || '';
        document.getElementById('res-comp').value = sel.getAttribute('data-melc') || '';
    } else {
        document.getElementById('res-content-std').value = '';
        document.getElementById('res-perf-std').value = '';
        document.getElementById('res-code').value = '';
        document.getElementById('res-comp').value = '';
    }
});

// Run once to initialize generic lists
updateDynamicOptions('api/competencies.php?action=unique_values', 'res-learning-area', 'Select Area...', true);


// --- Update Comp Filters ---
window.clearCompFilters = () => {
    document.getElementById('comp-filter-grade').value = '';
    document.getElementById('comp-filter-subject').value = '';
    document.getElementById('comp-filter-quarter').value = '';
    document.getElementById('comp-filter-week').value = '';
    document.getElementById('comp-search').value = '';
    compState.search = '';
    compState.grade = '';
    compState.subject = '';
    compState.quarter = '';
    compState.week = '';
    compState.page = 1;
    loadCompetencies();
};

const filterElements = ['comp-filter-grade', 'comp-filter-subject', 'comp-filter-quarter', 'comp-filter-week'];
filterElements.forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
        compState[id.split('-').pop()] = e.target.value;
        compState.page = 1;
        loadCompetencies();
    });
});

fetch('api/competencies.php?action=unique_values').then(r=>r.json()).then(data => {
    if(data.success && data.data) {
        data.data.grades.forEach(g => document.getElementById('comp-filter-grade').innerHTML += `<option value="${g}">${g}</option>`);
        data.data.subjects.forEach(s => document.getElementById('comp-filter-subject').innerHTML += `<option value="${s}">${s}</option>`);
        data.data.quarters.forEach(q => document.getElementById('comp-filter-quarter').innerHTML += `<option value="${q}">${q}</option>`);
        data.data.weeks.forEach(w => document.getElementById('comp-filter-week').innerHTML += `<option value="${w}">${w}</option>`);
    }
});
