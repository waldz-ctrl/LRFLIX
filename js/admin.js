document.addEventListener('DOMContentLoaded', () => {
    // Check Auth initially
    fetch('api/auth.php?action=check')
        .then(res => res.json())
        .then(data => {
            if (!data.logged_in || data.user.role !== 'admin') {
                window.location.href = 'index.html'; // Redirect to normal auth
            } else {
                document.getElementById('admin-view').style.display = 'block';
                loadAdminData();
            }

        });

    // Initialize TomSelect on dropdowns for searchability
    document.querySelectorAll('#upload-form select').forEach(el => {
        new TomSelect(el, { create: false });
    });

    let allResources = [];

    // Tab Navigation
    // Tab IDs in HTML: upload-section, manage-res-section, manage-usr-section, analytics-section
    function switchTab(targetId) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
        });
        const targetBtn = document.querySelector(`[data-target="${targetId}"]`);
        if(targetBtn) {
            targetBtn.classList.remove('btn-secondary');
            targetBtn.classList.add('btn-primary');
        }
        
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
        const targetEl = document.getElementById(targetId);
        if(targetEl) targetEl.style.display = 'block';
        
        // Load feedback when switching to it
        if(targetId === 'analytics-section') loadAnalytics();
        if(targetId === 'feedbacks-section') loadFeedbacks();
    }


    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            // If returning to upload tab naturally, reset it
            if(target === 'upload-section') {
                confirmClearForm(true);
            }
            switchTab(target);
        });
    });

    // Dynamic Fields Helper
    function createDynamicField(className, container, limit, placeholderPrefix, currentCountObj, addBtn, defaultValue = '') {
        if (currentCountObj.count >= limit) return;
        currentCountObj.count++;
        const div = document.createElement('div');
        div.className = 'dynamic-field-wrapper';
        div.style.position = 'relative';
        div.style.marginBottom = '5px';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = className;
        input.placeholder = placeholderPrefix + (currentCountObj.count > 1 ? ` ${currentCountObj.count}` : '');
        input.style.width = '100%';
        input.style.paddingRight = '30px';
        input.value = defaultValue;
        
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.style.position = 'absolute';
        delBtn.style.right = '10px';
        delBtn.style.top = '50%';
        delBtn.style.transform = 'translateY(-50%)';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.color = '#777';
        delBtn.style.fontSize = '1.2rem';
        delBtn.style.cursor = 'pointer';
        delBtn.onclick = () => {
             div.remove();
             currentCountObj.count--;
             addBtn.style.display = 'inline-block';
        };
        
        div.appendChild(input);
        div.appendChild(delBtn);
        container.appendChild(div);
        if(currentCountObj.count === limit) addBtn.style.display = 'none';
    }

    // Dynamic Authors
    const addAuthorBtn = document.getElementById('add-author-btn');
    const authorsGroup = document.getElementById('authors-group');
    let authorCountObj = { count: 1 };
    addAuthorBtn.addEventListener('click', () => {
        createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn);
    });

    // Dynamic Competencies
    const addCompBtn = document.getElementById('add-comp-btn');
    const compGroup = document.getElementById('competencies-group');
    let compCountObj = { count: 1 };
    addCompBtn.addEventListener('click', () => {
        createDynamicField('res-comp', compGroup, 10, 'e.g. math-grade1, basic-addition', compCountObj, addCompBtn);
    });

    // Drag and Drop
    const dropZone = document.getElementById('drop-zone');
    const dropZoneText = document.getElementById('drop-zone-text');
    const resFile = document.getElementById('res-file');

    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#e50914';
                dropZone.style.background = 'rgba(229, 9, 20, 0.05)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#444';
                dropZone.style.background = '#1a1a1a';
            }, false);
        });

        dropZone.addEventListener('drop', e => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                resFile.files = files;
                dropZoneText.innerText = `Selected: ${files[0].name}`;
                document.getElementById('remove-file-btn').classList.remove('hidden');
            }
        });
        
        resFile.addEventListener('change', () => {
            if (resFile.files.length > 0) {
                dropZoneText.innerText = `Selected: ${resFile.files[0].name}`;
                document.getElementById('remove-file-btn').classList.remove('hidden');
            }
        });

        document.getElementById('remove-file-btn').addEventListener('click', () => {
            resFile.value = '';
            dropZoneText.innerText = 'Drag & Drop PDF or Click to Browse';
            document.getElementById('remove-file-btn').classList.add('hidden');
        });
    }

    const uploadForm = document.getElementById('upload-form');
    const actionModal = document.getElementById('action-modal');
    const actionSpinner = document.getElementById('action-spinner');
    const actionCheck = document.getElementById('action-check');
    const actionMessage = document.getElementById('action-message');
    const closeActionModal = document.getElementById('close-action-modal');

    closeActionModal.addEventListener('click', () => {
        actionModal.classList.add('hidden');
        actionModal.classList.remove('active');
    });

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('res-file');
        const resId = document.getElementById('resource_id').value;
        const isEditing = resId !== '';

        if (!isEditing && fileInput.files.length === 0) {
            alert('Please select a PDF file.');
            return;
        }

        const authors = Array.from(document.querySelectorAll('.res-author')).map(i => i.value).filter(v=>v).join(', ');
        const competencies = Array.from(document.querySelectorAll('.res-comp')).map(i => i.value).filter(v=>v).join('; ');
        const formData = new FormData();

        if (isEditing) formData.append('id', resId);
        
        formData.append('category', document.getElementById('res-category').tomselect.getValue());
        formData.append('title', document.getElementById('res-title').value);
        formData.append('authors', authors);
        formData.append('language', document.getElementById('res-language').tomselect.getValue());
        formData.append('grade_level', document.getElementById('res-grade').tomselect.getValue());
        formData.append('quarter', document.getElementById('res-quarter').tomselect.getValue());
        formData.append('week', document.getElementById('res-week').value);
        formData.append('content_standards', document.getElementById('res-content-std').value);
        formData.append('performance_standards', document.getElementById('res-perf-std').value);
        formData.append('competencies', competencies);
        formData.append('description', document.getElementById('res-desc').value);
        formData.append('learning_area', document.getElementById('res-learning-area').tomselect.getValue());
        formData.append('resource_type', document.getElementById('res-type').tomselect.getValue());
        formData.append('year_published', document.getElementById('res-year').tomselect.getValue());
        
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
        }

        // Show Loading Modal
        actionModal.classList.remove('hidden');
        actionModal.classList.add('active');
        actionModal.style.setProperty('display', 'flex', 'important');
        actionModal.style.setProperty('opacity', '1', 'important');
        actionModal.style.setProperty('visibility', 'visible', 'important');
        actionModal.style.setProperty('pointer-events', 'auto', 'important');
        actionModal.style.setProperty('z-index', '999999', 'important');
        
        actionSpinner.classList.remove('hidden');
        actionCheck.classList.add('hidden');
        closeActionModal.classList.add('hidden');
        actionMessage.innerText = isEditing ? 'Updating Resource...' : 'Uploading Resource...';
        actionMessage.style.color = 'white';

        const actionEndpoint = isEditing ? 'edit' : 'upload';

        fetch(`api/resources.php?action=${actionEndpoint}`, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            actionSpinner.classList.add('hidden');
            closeActionModal.classList.remove('hidden');
            
            if (data.success) {
                actionCheck.classList.remove('hidden');
                actionMessage.innerText = isEditing ? 'Resource Updated Successfully!' : 'Upload Successful!';
                actionMessage.style.color = 'lightgreen';
                confirmClearForm(true);
                loadAdminData();
            } else {
                actionMessage.innerText = `Error: ${data.message}`;
                actionMessage.style.color = 'var(--accent-color)';
            }
        });
    });

    function loadAdminData() {
        loadUsers();
        loadResources();
    }

    // Chart instances (to destroy before redraw)
    let chartTime = null;
    let chartCat = null;
    let chartResCat = null;
    let currentPeriod = 'day';

    let customDate = null;

    // Period filter buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            e.currentTarget.classList.remove('btn-secondary');
            e.currentTarget.classList.add('btn-primary');
            currentPeriod = e.currentTarget.dataset.period;
            customDate = null;
            document.getElementById('custom-date-filter').value = '';
            loadAnalytics();
        });
    });

    document.getElementById('custom-date-filter').addEventListener('change', (e) => {
        if (!e.target.value) return;
        document.querySelectorAll('.period-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
        });
        currentPeriod = 'day';
        customDate = e.target.value;
        loadAnalytics();
    });

    // Register ChartDataLabels plugin globally
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }


    function loadAnalytics() {
        let url = `api/analytics.php?period=${currentPeriod}`;
        if (customDate) url += `&date=${customDate}`;
        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!data.success) return;

                // Update summary stats
                document.getElementById('stat-users').textContent = data.totals.users;
                document.getElementById('stat-resources').textContent = data.totals.resources;
                document.getElementById('stat-downloads').textContent = data.totals.downloads;
                document.getElementById('stat-likes').textContent = data.totals.likes;

                // Chart: Downloads over time
                const timeLabels = data.time_data.map(d => d.period_label);
                const timeValues = data.time_data.map(d => parseInt(d.total));

                if (chartTime) chartTime.destroy();
                const ctxTime = document.getElementById('chart-downloads-time').getContext('2d');
                
                // Create a gradient for the line chart
                const gradient = ctxTime.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(229, 9, 20, 0.4)');
                gradient.addColorStop(1, 'rgba(229, 9, 20, 0)');

                chartTime = new Chart(ctxTime, {
                    type: 'line',
                    data: {
                        labels: timeLabels,
                        datasets: [{
                            label: 'Downloads',
                            data: timeValues,
                            backgroundColor: gradient,
                            borderColor: '#e50914',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4, // smooth curve
                            pointBackgroundColor: '#e50914',
                            pointBorderColor: '#fff',
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: { 
                                backgroundColor: '#1a1a1a',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#333',
                                borderWidth: 1
                            }
                        },
                        scales: {
                            x: { 
                                ticks: { color: '#aaa', font: { size: 11 } }, 
                                grid: { color: 'rgba(255,255,255,0.05)' } 
                            },
                            y: { 
                                ticks: { color: '#aaa', stepSize: 1, font: { size: 11 } }, 
                                grid: { color: 'rgba(255,255,255,0.05)' }, 
                                beginAtZero: true 
                            }
                        }
                    }
                });

                // Chart: Downloads by category (donut)
                const catLabels = data.category_data.map(d => d.category || 'Uncategorized');
                const catValues = data.category_data.map(d => parseInt(d.total));
                const palette = ['#e50914','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e74c3c','#34495e','#16a085'];

                if (chartCat) chartCat.destroy();
                const ctxCat = document.getElementById('chart-downloads-category').getContext('2d');
                chartCat = new Chart(ctxCat, {
                    type: 'bar', // vertical bar chart
                    data: {
                        labels: catLabels,
                        datasets: [{
                            label: 'Downloads per Category',
                            data: catValues,
                            backgroundColor: palette.slice(0, catLabels.length),
                            borderRadius: 6,
                            borderWidth: 0,
                            barThickness: 40
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            datalabels: {
                                anchor: 'end',
                                align: 'top',
                                color: '#fff',
                                font: { weight: 'bold', size: 12 },
                                formatter: (val) => val > 0 ? val : ''
                            }
                        },
                        scales: {
                            x: { 
                                ticks: { color: '#aaa', font: { size: 11 } },
                                grid: { display: false }
                            },
                            y: { 
                                ticks: { color: '#aaa', stepSize: 1 },
                                grid: { color: 'rgba(255,255,255,0.05)' },
                                beginAtZero: true,
                                // Add extra space at top for labels
                                grace: '10%'
                            }
                        }
                    }
                });
                // Chart: Resources by Category
                const resCatLabels = data.resources_per_category.map(d => d.category || 'Uncategorized');
                const resCatValues = data.resources_per_category.map(d => parseInt(d.total));

                if (chartResCat) chartResCat.destroy();
                const ctxResCat = document.getElementById('chart-resources-category').getContext('2d');
                chartResCat = new Chart(ctxResCat, {
                    type: 'bar',
                    data: {
                        labels: resCatLabels,
                        datasets: [{
                            label: 'Resources',
                            data: resCatValues,
                            backgroundColor: palette.slice(0, resCatLabels.length),
                            borderRadius: 6,
                            borderWidth: 0,
                            barThickness: 40
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            datalabels: {
                                anchor: 'end',
                                align: 'top',
                                color: '#fff',
                                font: { weight: 'bold', size: 12 },
                                formatter: (val) => val > 0 ? val : ''
                            }
                        },
                        scales: {
                            x: { 
                                ticks: { color: '#aaa', font: { size: 11 } },
                                grid: { display: false }
                            },
                            y: { 
                                ticks: { color: '#aaa', stepSize: 1 },
                                grid: { color: 'rgba(255,255,255,0.05)' },
                                beginAtZero: true,
                                grace: '10%'
                            }
                        }
                    }
                });

                // Top resources table
                const tbody = document.querySelector('#top-resources-table tbody');
                tbody.innerHTML = '';
                data.top_resources.forEach((r, i) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${i+1}. ${r.title}</td>
                        <td><span style="background:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${r.category || '–'}</span></td>
                        <td><strong style="color:#2ecc71;">${r.downloads_count}</strong></td>
                        <td><strong style="color:#e50914;">${r.likes_count}</strong></td>
                    `;
                    tbody.appendChild(tr);
                });

                if (data.top_resources.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="color:#aaa; text-align:center;">No data yet.</td></tr>';
                }
            })
            .catch(err => console.error('Analytics load error:', err));
    }


    let allUsers = [];

    function loadUsers() {
        fetch('api/users.php?action=list')
            .then(res => res.json())
            .then(data => {
                const tbody = document.querySelector('#users-table tbody');
                tbody.innerHTML = '';
                if(data.success && data.users) {
                    allUsers = data.users;
                    data.users.forEach(u => {
                        const tr = document.createElement('tr');
                        
                        let name = "-";
                        if(u.last_name || u.first_name) {
                            name = `${u.last_name || ''}, ${u.first_name || ''} ${u.middle_name ? (u.middle_name.charAt(0)+'.') : ''}`;
                        }

                        tr.innerHTML = `
                            <td>${u.username}</td>
                            <td>${name}</td>
                            <td>${u.school || '-'}</td>
                            <td>${u.position || '-'}</td>
                            <td><span style="color:#2ecc71; font-weight:bold;">${u.downloads_count || 0}</span></td>
                            <td style="font-size:0.85rem; color:#aaa;">${u.last_login || 'Never'}</td>
                            <td>
                                ${u.role !== 'admin' ? 
                                `<button class="btn btn-secondary" onclick="event.stopPropagation(); deleteUser(${u.id})" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>` 
                                : ''}
                            </td>
                        `;
                        tr.style.cursor = 'pointer';
                        tr.onclick = (e) => {
                            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
                                showUserInfo(u.id);
                            }
                        };
                        tbody.appendChild(tr);
                    });
                }
            });
    }

    function loadResources() {
        fetch('api/resources.php?action=list')
            .then(res => res.json())
            .then(data => {
                const tbody = document.querySelector('#resources-table tbody');
                tbody.innerHTML = '';
                if(data.success && data.resources) {
                    allResources = data.resources; // Store globally for editing
                    data.resources.forEach(r => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${r.title}</td>
                            <td>${r.competencies || 'N/A'}</td>
                            <td>${r.downloads_count}</td>
                            <td>${r.likes_count}</td>
                            <td>
                                <button class="btn btn-primary" onclick="editResource(${r.id})" style="margin-right: 5px; padding: 5px 10px;"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn btn-secondary" onclick="deleteResource(${r.id})" style="padding: 5px 10px;"><i class="fas fa-trash"></i></button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            });
    }

    window.editResource = (id) => {
        const res = allResources.find(r => r.id == id);
        if(!res) {
            console.error('Resource not found for id:', id);
            alert('Could not find resource. Please refresh and try again.');
            return;
        }

        // Switch to upload tab (correct HTML ID)
        switchTab('upload-section');
        document.getElementById('upload-tab-title').innerText = 'Edit Learning Resource';
        document.getElementById('upload-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
        
        document.getElementById('resource_id').value = res.id;
        document.getElementById('res-category').tomselect.setValue(res.category || '');
        document.getElementById('res-title').value = res.title || '';
        document.getElementById('res-language').tomselect.setValue(res.language || '');
        document.getElementById('res-grade').tomselect.setValue(res.grade_level || '');
        document.getElementById('res-quarter').tomselect.setValue(res.quarter || '');
        document.getElementById('res-week').value = res.week || '';
        document.getElementById('res-content-std').value = res.content_standards || '';
        document.getElementById('res-perf-std').value = res.performance_standards || '';
        document.getElementById('res-desc').value = res.description || '';
        document.getElementById('res-learning-area').tomselect.setValue(res.learning_area || '');
        document.getElementById('res-type').tomselect.setValue(res.resource_type || '');
        document.getElementById('res-year').tomselect.setValue(res.year_published || '');
        document.getElementById('cancel-edit-btn').classList.remove('hidden');

        // Reset and populate authors
        authorsGroup.innerHTML = '';
        authorCountObj.count = 0;
        addAuthorBtn.style.display = 'inline-block';
        if(res.authors) {
            const authorList = res.authors.split(',').map(a => a.trim());
            authorList.forEach(a => {
                createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn, a);
            });
        }
        if(authorCountObj.count === 0) {
            // Add default empty
            createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn);
        }

        // Reset and populate competencies
        compGroup.innerHTML = '';
        compCountObj.count = 0;
        addCompBtn.style.display = 'inline-block';
        if(res.competencies) {
            const compList = res.competencies.split(';').map(c => c.trim());
            compList.forEach(c => {
                createDynamicField('res-comp', compGroup, 10, 'e.g. math-grade1, basic-addition', compCountObj, addCompBtn, c);
            });
        }
        if(compCountObj.count === 0) {
            createDynamicField('res-comp', compGroup, 10, 'e.g. math-grade1, basic-addition', compCountObj, addCompBtn);
        }
    };

    window.cancelEdit = () => {
        document.getElementById('cancel-edit-btn').classList.add('hidden');
        confirmClearForm(true); // pass true to skip prompt and force clear
    };

    window.showUserInfo = (id) => {
        const u = allUsers.find(user => user.id == id);
        if(!u) return;
        const infoBody = document.getElementById('user-info-body');
        infoBody.innerHTML = `
            <div><strong style="color:#aaa;">Username:</strong> <span style="color:white; float:right;">${u.username}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">First Name:</strong> <span style="color:white; float:right;">${u.first_name || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Middle Name:</strong> <span style="color:white; float:right;">${u.middle_name || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Last Name:</strong> <span style="color:white; float:right;">${u.last_name || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Role:</strong> <span style="color:white; float:right; text-transform:capitalize;">${u.role}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">School/Office:</strong> <span style="color:white; float:right;">${u.school || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Position:</strong> <span style="color:white; float:right;">${u.position || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Age Range:</strong> <span style="color:white; float:right;">${u.age || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Subject Taught:</strong> <span style="color:white; float:right;">${u.subject || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Grade Level:</strong> <span style="color:white; float:right;">${u.grade_level || '-'}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Downloads:</strong> <span style="color:#2ecc71; font-weight:bold; float:right;">${u.downloads_count || 0}</span></div>
        `;
        document.getElementById('user-info-modal').classList.remove('hidden');
        document.getElementById('user-info-modal').classList.add('active');
    };

    // Assign globally to be called from inline onclick
    window.deleteUser = (id) => {
        if(confirm("Are you sure you want to delete this user?")) {
            fetch('api/users.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({id}),
                headers: {'Content-Type': 'application/json'}
            }).then(() => loadUsers());
        }
    };

    window.deleteResource = (id) => {
        if(confirm("Are you sure you want to delete this resource?")) {
            fetch('api/resources.php?action=delete', {
                method: 'POST',
                body: JSON.stringify({id}),
                headers: {'Content-Type': 'application/json'}
            }).then(() => loadResources());
        }
    };

    // Report Generation
    window.openReportModal = () => {
        document.getElementById('report-modal').classList.remove('hidden');
        document.getElementById('report-modal').classList.add('active');
    };
    window.closeReportModal = () => {
        document.getElementById('report-modal').classList.remove('active');
        document.getElementById('report-modal').classList.add('hidden');
    };

    window.generateReport = () => {
        const year = document.getElementById('report-year').value;
        const month = document.getElementById('report-month').value;
        const type = document.querySelector('input[name="report-type"]:checked').value;

        fetch(`api/resources.php?action=list`)
            .then(res => res.json())
            .then(data => {
                if(!data.success) return;
                
                let resources = data.resources;
                if (year) resources = resources.filter(r => (r.year_published == year || (r.created_at && r.created_at.startsWith(year))));
                if (month) {
                    const monthStr = month.padStart(2, '0');
                    resources = resources.filter(r => r.created_at && r.created_at.split('-')[1] === monthStr);
                }

                if (type === 'pdf') generatePDFReport(resources, year, month);
                else generateExcelReport(resources, year, month);
                closeReportModal();
            });
    };

    function generatePDFReport(resources, year, month) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'a4');
        
        const logoUrl = 'https://cid-batanes.com/lrflix/src/depedlogo.png?v=' + Date.now();
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = logoUrl;
        
        img.onload = () => {
            doc.addImage(img, 'PNG', doc.internal.pageSize.getWidth()/2 - 25, 15, 50, 50); 
            
            // Grab high-contrast captures
            let dlChartBase64 = getChartForReport(chartCat);
            let resChartBase64 = getChartForReport(chartResCat);

            finalizePDF(doc, resources, year, month, dlChartBase64, resChartBase64);
        };
        img.onerror = () => {
            finalizePDF(doc, resources, year, month, null, null);
        };
        setTimeout(() => { if(!doc.pdfDone) finalizePDF(doc, resources, year, month, null, null); }, 2500);
    }

    function getChartForReport(chartInstance) {
        if (!chartInstance) return null;
        
        // Save current dark-mode theme options
        const originalOptions = JSON.parse(JSON.stringify(chartInstance.options));
        
        // Temporarily Apply High-Contrast Report Theme
        chartInstance.options.scales.x.ticks.color = '#000000';
        chartInstance.options.scales.x.grid = { display: true, color: '#eeeeee' };
        chartInstance.options.scales.y.ticks.color = '#000000';
        chartInstance.options.scales.y.grid = { display: true, color: '#eeeeee' };
        if(chartInstance.options.plugins.datalabels) {
            chartInstance.options.plugins.datalabels.color = '#000000';
        }
        chartInstance.update('none'); // Update without animation

        const canvas = chartInstance.canvas;
        const scale = 3;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        const ctx = tempCanvas.getContext('2d');
        ctx.scale(scale, scale);
        
        // Fill pure white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the chart (now in high contrast)
        ctx.drawImage(canvas, 0, 0);
        
        // Restore previous dark theme 
        chartInstance.options = originalOptions;
        chartInstance.update('none');

        return tempCanvas.toDataURL('image/png', 1.0);
    }

    function finalizePDF(doc, resources, year, month, dlChart, resChart) {
        if(doc.pdfDone) return;
        doc.pdfDone = true;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Vector Header - CENTER ALIGNED
        doc.setTextColor(0, 0, 0); // Black for report

        // For "Old English", we'll use a very thick Serif with Gothic style spacing.
        // If they want true custom TTF, they need to doc.addFont(BASE64, 'OldEnglish', 'normal')
        // Using 'times' bold since it's the standard high-quality serif available
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text('Republic of the Philippines', pageWidth / 2, 50, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text('Department of Education', pageWidth / 2, 70, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('REGION II - CAGAYAN VALLEY', pageWidth / 2, 85, { align: 'center' });
        doc.text('SCHOOLS DIVISION OF BATANES', pageWidth / 2, 98, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        let titleLine = 'LEARNING RESOURCE INVENTORY REPORT';
        if (month || year) titleLine += ` - ${month ? getMonthName(month) : ''} ${year || ''}`;
        doc.text(titleLine, pageWidth / 2, 120, { align: 'center', charSpace: 1 });

        const body = resources.map(r => [
            r.title, 
            r.category || '–', 
            r.resource_type || '–', 
            r.authors || '–', 
            r.learning_area || '–', 
            r.grade_level || '–', 
            r.year_published || (r.created_at ? r.created_at.split(' ')[0] : '–')
        ]);

        let startY = 140;

        if (dlChart && resChart) {
            // Draw charts with High Contrast Vector Quality
            const chartW = pageWidth - 100;
            const chartH = 180;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Downloads by Category', pageWidth / 2, 150, { align: 'center' });
            // Add image (PNG at 3x DPI behaves like vector in PDF)
            doc.addImage(dlChart, 'PNG', 50, 160, chartW, chartH, undefined, 'FAST');

            doc.text('Resources by Category', pageWidth / 2, 360, { align: 'center' });
            doc.addImage(resChart, 'PNG', 50, 370, chartW, chartH, undefined, 'FAST');
            
            startY = 570; 
        }

        doc.autoTable({
            startY: startY,
            head: [['Title', 'Category', 'Type', 'Authors', 'Subject', 'Grade', 'Published']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [229, 9, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 5 }
        });

        doc.save(`LRFLIX_Inventory_${year||'All'}.pdf`);
    }

    function generateExcelReport(resources, year, month) {
        const wsData = resources.map(r => ({
            'Title': r.title,
            'Category': r.category || '–',
            'Type': r.resource_type || '–',
            'Authors': r.authors || '–',
            'Subject': r.learning_area || '–',
            'Grade Level': r.grade_level || '–',
            'Published Date': r.year_published || r.created_at
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `LRFLIX_Inventory_${year||'All'}.xlsx`);
    }

    function getMonthName(m) {
        const names = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return names[parseInt(m)];
    }

    function loadFeedbacks() {
        const table = document.getElementById('feedback-table').querySelector('tbody');
        table.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading feedbacks...</td></tr>';
        
        fetch('api/resources.php?action=list_feedback')
            .then(res => res.json())
            .then(data => {
                table.innerHTML = '';
                if (data.success && data.feedbacks.length > 0) {
                    data.feedbacks.forEach(f => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${f.first_name} ${f.last_name}</td>
                            <td>${f.school || '–'}</td>
                            <td>${new Date(f.created_at).toLocaleDateString()}</td>
                            <td style="max-width:300px; white-space:normal;">${f.suggestion}</td>
                        `;
                        table.appendChild(tr);
                    });
                } else {
                    table.innerHTML = '<tr><td colspan="4" style="text-align:center;">No feedbacks yet.</td></tr>';
                }
            }).catch(() => {
                table.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading feedbacks.</td></tr>';
            });
            
        const cTable = document.getElementById('lr-comments-table').querySelector('tbody');
        cTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading comments...</td></tr>';
        fetch('api/resources.php?action=list_comments')
            .then(res => res.json())
            .then(data => {
                cTable.innerHTML = '';
                if (data.success && data.comments.length > 0) {
                    data.comments.forEach(c => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${c.first_name} ${c.last_name}</td>
                            <td>${c.school || '–'}</td>
                            <td style="max-width:200px; white-space:normal; font-weight:bold;">${c.resource_title}</td>
                            <td>${new Date(c.created_at).toLocaleDateString()}</td>
                            <td style="max-width:300px; white-space:normal;">${c.comment}</td>
                        `;
                        cTable.appendChild(tr);
                    });
                } else {
                    cTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No LR comments yet.</td></tr>';
                }
            }).catch(() => {
                cTable.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading comments.</td></tr>';
            });
    }

    // Form Clearing Logic
    window.confirmClearForm = (force = false) => {
        if(force === true) {
            clearAction();
        } else {
            const modal = document.getElementById('clear-modal');
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
    };
    
    document.getElementById('confirm-clear-btn').addEventListener('click', () => { clearAction(true); });

    function clearAction(showAlert = false) {
        const fields = [
            'res-title', 'res-category', 'res-language', 'res-grade', 'res-quarter', 
            'res-week', 'res-learning-area', 'res-type', 'res-year',
            'res-content-std', 'res-perf-std', 'res-desc'
        ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(el.tagName === 'SELECT' && el.tomselect) el.tomselect.setValue('');
                else el.value = '';
            }
        });
        
        // Reset dynamic authors
        authorsGroup.innerHTML = '';
        authorCountObj.count = 0;
        addAuthorBtn.style.display = 'inline-block';
        createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn);

        // Reset dynamic competencies
        compGroup.innerHTML = '';
        compCountObj.count = 0;
        addCompBtn.style.display = 'inline-block';
        createDynamicField('res-comp', compGroup, 10, 'e.g. math-grade1, basic-addition', compCountObj, addCompBtn);
        
        document.getElementById('resource_id').value = '';
        document.getElementById('upload-tab-title').innerText = 'Upload Learning Resource';
        document.getElementById('upload-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Submit Resource';

        // Clear file input
        const resFile = document.getElementById('res-file');
        if(resFile) resFile.value = '';
        const dt = document.getElementById('drop-zone-text');
        if(dt) dt.innerText = 'Drag & Drop PDF or Click to Browse';
        const rf = document.getElementById('remove-file-btn');
        if(rf) rf.classList.add('hidden');

        const modal = document.getElementById('clear-modal');
        modal.classList.add('hidden');
        modal.classList.remove('active');
        
        if(showAlert) {
            const actionModal = document.getElementById('action-modal');
            const actionSpinner = document.getElementById('action-spinner');
            const actionCheck = document.getElementById('action-check');
            const actionMessage = document.getElementById('action-message');
            const closeActionModal = document.getElementById('close-action-modal');

            if(actionModal) {
                actionModal.classList.remove('hidden');
                actionModal.classList.add('active');
                actionModal.style.setProperty('display', 'flex', 'important');
                actionModal.style.setProperty('opacity', '1', 'important');
                actionModal.style.setProperty('visibility', 'visible', 'important');
                actionSpinner.classList.add('hidden');
                actionCheck.classList.remove('hidden');
                actionMessage.innerText = "Form cleared successfully!";
                actionMessage.style.color = "lightgreen";
                closeActionModal.classList.remove('hidden');
                setTimeout(() => {
                    actionModal.classList.add('hidden');
                    actionModal.classList.remove('active');
                }, 1500);
            }
        }
        
        document.getElementById('cancel-edit-btn').classList.add('hidden');
    }
});

