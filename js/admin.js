document.addEventListener('DOMContentLoaded', () => {
    let reportAssetsPromise = null;

    // --- Unified Modal System ---
    window.showAppModal = (options = {}) => {
        const modal = document.getElementById('unified-modal');
        const title = document.getElementById('unified-modal-title');
        const text = document.getElementById('unified-modal-text');
        const confirmBtn = document.getElementById('unified-modal-confirm');
        const cancelBtn = document.getElementById('unified-modal-cancel');
        const icon = modal.querySelector('.unified-modal-icon');

        if (!modal) return Promise.resolve(false);

        modal.className = 'unified-modal ' + (options.type || 'warning');
        title.innerText = options.title || 'Confirm Action';
        text.innerText = options.text || 'Are you sure you want to proceed?';
        confirmBtn.innerText = options.confirmText || 'Confirm';
        cancelBtn.innerText = options.cancelText || 'Cancel';
        
        const icons = {
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            success: 'fa-check-circle'
        };
        icon.className = `unified-modal-icon fas ${icons[options.type] || 'fa-exclamation-circle'}`;

        modal.classList.add('active');

        return new Promise((resolve) => {
            confirmBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(true);
            };
            cancelBtn.onclick = () => {
                modal.classList.remove('active');
                resolve(false);
            };
        });
    };

    window.toggleCompDrawer = () => {
        const drawer = document.getElementById('comp-drawer');
        if (!drawer) return;
        if (drawer.style.width === '0px' || drawer.style.width === '') {
            drawer.style.width = '300px';
            drawer.style.padding = '0 15px';
            drawer.style.border = '1px solid rgba(255,255,255,0.1)';
        } else {
            drawer.style.width = '0';
            drawer.style.padding = '0';
            drawer.style.border = 'none';
        }
    };

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function loadReportAssets() {
        if (reportAssetsPromise) return reportAssetsPromise;

        reportAssetsPromise = Promise.all([
            fetch('/lrflix/fonts/old-english-five.ttf', { cache: 'no-store' }).then(async (res) => {
                if (!res.ok) throw new Error('Failed to load Old English font.');
                return arrayBufferToBase64(await res.arrayBuffer());
            }),
            fetch('/lrflix/src/depedlogo.png', { cache: 'no-store' }).then(async (res) => {
                if (!res.ok) throw new Error('Failed to load DepEd logo.');
                return blobToDataUrl(await res.blob());
            })
        ]).then(([fontBase64, logoDataUrl]) => ({ fontBase64, logoDataUrl }));

        return reportAssetsPromise;
    }

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

    // Initialize TomSelect on dropdowns for searchability (excluding competencies which are handled separately)
    document.querySelectorAll('#upload-form select:not(.res-comp-select)').forEach(el => {
        new TomSelect(el, { create: false });
    });

    // Special initialization for the first competency field
    const initialCompSelect = document.getElementById('res-comp-select');
    if(initialCompSelect) {
        new TomSelect(initialCompSelect, {
            create: false,
            onChange: () => {
                refreshCompDropdowns();
                updateStandardsFromAll();
            }
        });
    }

    let allResources = [];

    // Tab Navigation
    window._uploadSuccess = false;

    window.switchTab = function switchTab(targetId) {
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
        
        // Load data when switching to it
        if(targetId === 'analytics-section') loadAnalytics();
        if(targetId === 'feedbacks-section') loadFeedbacks();
        if(targetId === 'comp-section') loadCompetencies();
        if(targetId === 'manage-usr-section') loadUsers();
        if(targetId === 'manage-res-section') {
            loadResources();
            updateResourceFilters();
        }
    };
    const switchTab = window.switchTab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            // If returning to upload tab naturally, reset it
            if(target === 'upload-section') {
                try { window.resetUploadForm && resetUploadForm(); } catch(e) { console.error(e); }
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
    if (addAuthorBtn && authorsGroup) {
        addAuthorBtn.addEventListener('click', () => {
            createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn);
        });
    }

    // Dynamic Competencies TEST
    const addCompBtn = document.getElementById('add-comp-btn');
    const compGroup = document.getElementById('competencies-group');
    let compCountObj = { count: 1 };
    let currentAvailableCompetencies = [];

    function populateIndividualCompDropdown(selectEl, selectedId = '') {
        if (!selectEl.tomselect) return;
        
        const selectedIds = Array.from(document.querySelectorAll('.res-comp-select'))
            .filter(sel => sel !== selectEl)
            .map(sel => sel.value)
            .filter(v => v);

        const currentVal = selectedId || selectEl.value;
        const ts = selectEl.tomselect;
        
        ts.clearOptions();
        ts.addOption({value: '', text: 'Select MELC...'});
        
        currentAvailableCompetencies.forEach(c => {
            if (!selectedIds.includes(c.id.toString()) || c.id.toString() === currentVal.toString()) {
                ts.addOption({
                    value: c.id,
                    text: `${c.melc} (Code: ${c.code || 'N/A'})`,
                    melc: c.melc,
                    content: c.content_std || '',
                    perf: c.performance_std || '',
                    code: c.code || '',
                    week: c.week || ''
                });
            }
        });
        
        if (currentVal) ts.setValue(currentVal, true);
    }

    function refreshCompDropdowns() {
        document.querySelectorAll('.res-comp-select').forEach(select => {
            populateIndividualCompDropdown(select);
        });
    }

    function updateStandardsFromAll() {
        const selects = Array.from(document.querySelectorAll('.res-comp-select'));
        const selectedOpts = selects
            .filter(s => s.value !== '' && s.tomselect && s.tomselect.options[s.value])
            .map(s => s.tomselect.options[s.value]);
            
        if (selectedOpts.length > 0) {
            document.getElementById('res-content-std').value = selectedOpts[0].content || '';
            document.getElementById('res-perf-std').value = selectedOpts[0].perf || '';
            
            const uniqueCodes = [...new Set(selectedOpts.map(opt => opt.code).filter(c => c))];
            document.getElementById('res-code').value = uniqueCodes.join(', ') || '';
            
            const allMelcs = selectedOpts.map(opt => opt.melc).filter(m => m);
            document.getElementById('res-comp').value = allMelcs.join(' | ') || '';

            // Autofill week if we have a valid week from the competency and no week is currently selected
            const weekSelect = document.getElementById('res-week');
            if (weekSelect && weekSelect.tomselect && selectedOpts[0].week) {
                const targetWeek = selectedOpts[0].week.toString();
                const currentWeek = weekSelect.tomselect.getValue();
                if (!currentWeek || currentWeek === '') {
                    isAutoFilling = true;
                    // Ensure the option exists in the dropdown before trying to set it
                    weekSelect.tomselect.addOption({value: targetWeek, text: targetWeek});
                    // Set it silently (true) so it doesn't trigger the 'change' event on the original select
                    weekSelect.tomselect.setValue(targetWeek, true);
                    isAutoFilling = false;
                }
            }

            return;
        }
        document.getElementById('res-content-std').value = '';
        document.getElementById('res-perf-std').value = '';
        document.getElementById('res-code').value = '';
        document.getElementById('res-comp').value = '';
    }

    function createCompSelectField(defaultValue = '') {
        if (compCountObj.count >= 10) return;
        compCountObj.count++;

        const wrapper = document.createElement('div');
        wrapper.className = 'comp-select-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.marginBottom = '10px';

        const select = document.createElement('select');
        select.className = 'res-comp-select';
        select.id = 'res-comp-select-' + Date.now();
        select.style.width = '100%';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.style.cssText = 'position:absolute; right:-30px; top:50%; transform:translateY(-50%); background:none; border:none; color:#e50914; font-size:1.5rem; cursor:pointer;';
        delBtn.onclick = () => {
            if (select.tomselect) select.tomselect.destroy();
            wrapper.remove();
            compCountObj.count--;
            addCompBtn.style.display = 'inline-block';
            refreshCompDropdowns();
            updateStandardsFromAll();
        };

        wrapper.appendChild(select);
        wrapper.appendChild(delBtn);
        compGroup.appendChild(wrapper);

        new TomSelect(select, { 
            create: false,
            onChange: () => {
                refreshCompDropdowns();
                updateStandardsFromAll();
            }
        });

        populateIndividualCompDropdown(select, defaultValue);
        if (compCountObj.count === 10) addCompBtn.style.display = 'none';
    }
    if (addCompBtn && compGroup) {
        addCompBtn.addEventListener('click', () => {
            createCompSelectField();
        });
    }

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

        function updateFileUI(filename) {
            dropZoneText.innerHTML = `<span style="color:#e50914; font-weight:bold;">File Selected:</span> ${filename} <br><span style="font-size:0.8rem; color:#aaa;">(Drag another file here to replace)</span>`;
            document.getElementById('remove-file-btn').classList.remove('hidden');
        }

        dropZone.addEventListener('drop', e => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                resFile.files = files;
                updateFileUI(files[0].name);
            }
        });
        
        resFile.addEventListener('change', () => {
            if (resFile.files.length > 0) {
                updateFileUI(resFile.files[0].name);
            }
        });

        document.getElementById('remove-file-btn').addEventListener('click', () => {
            resFile.value = '';
            dropZoneText.innerHTML = 'Drag & Drop File or Click to Browse';
            document.getElementById('remove-file-btn').classList.add('hidden');
        });
    }

    const uploadForm = document.getElementById('upload-form');
    const actionModal = document.getElementById('action-modal');
    const actionSpinner = document.getElementById('action-spinner');
    const actionCheck = document.getElementById('action-check');
    const actionMessage = document.getElementById('action-message');
    const closeActionModal = document.getElementById('close-action-modal');

    closeActionModal?.addEventListener('click', () => {
        actionModal.classList.add('hidden');
        actionModal.classList.remove('active');
        actionModal.style.setProperty('display', 'none', 'important');
        // After a successful upload/edit, reset form and go back to upload tab
        if(window._uploadSuccess) {
            window._uploadSuccess = false;
            window.resetUploadForm();
            window.switchTab('upload-section');
        }
    });

    // Handle Enter/Space on Success Modal to prevent form resubmission
    document.addEventListener('keydown', (e) => {
        if (!actionModal.classList.contains('hidden') && !closeActionModal.classList.contains('hidden')) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                closeActionModal.click();
            }
        }
    });

    const toggleFieldSpinners = (level, show) => {
        const order = ['category', 'school_level', 'key_stage', 'grade', 'learning_area', 'quarter', 'term', 'week', 'comp'];
        const idx = order.indexOf(level);
        const spinners = {
            'school_level': ['spin-res-key-stage'],
            'key_stage': ['spin-res-grade'],
            'grade': ['spin-res-learning-area'],
            'learning_area': ['spin-res-quarter', 'spin-res-term'],
            'quarter': ['spin-res-week'],
            'term': ['spin-res-week'],
            'week': ['spin-res-comp']
        };

        const toToggle = spinners[level] || [];
        toToggle.forEach(sid => {
            const el = document.getElementById(sid);
            if (el) {
                if (show) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });
    };

    uploadForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('res-file');
        const resId = document.getElementById('resource_id').value;
        const isEditing = resId !== '';

        if (!isEditing && fileInput.files.length === 0) {
            showAppModal({ title: 'Invalid File', text: 'Please select a valid file for this resource.', type: 'warning', confirmText: 'Okay' });
            return;
        }

        const getVal = (id) => {
            const el = document.getElementById(id);
            if (!el) return '';
            return el.tomselect ? el.tomselect.getValue() : el.value;
        };

        const titleVal = getVal('res-title');
        const catVal = getVal('res-category');
        const typeVal = getVal('res-type') || getVal('res-camp-type') || getVal('res-material-type');
        const quarterVal = getVal('res-quarter');
        const weekVal = document.getElementById('res-week-manual').style.display !== 'none' 
            ? document.getElementById('res-week-manual').value 
            : getVal('res-week');

        const doUpload = () => {
            const authors = Array.from(document.querySelectorAll('.res-author')).map(i => i.value).filter(v=>v).join(', ');
            const competenciesArray = [];
            document.querySelectorAll('.res-comp-select').forEach(sel => {
                if(sel.tomselect && sel.tomselect.getValue()) {
                    const opt = sel.tomselect.options[sel.tomselect.getValue()];
                    if(opt && opt.melc) competenciesArray.push(opt.melc);
                }
            });
            const finalComp = competenciesArray.join('; ');
            
            let finalGrade = '';
            const gradeEl = document.getElementById('res-grade');
            if (gradeEl.value === 'Others...') {
                finalGrade = document.getElementById('res-grade-custom').value;
            } else if (gradeEl.tomselect) {
                const gValues = gradeEl.tomselect.getValue();
                finalGrade = Array.isArray(gValues) ? gValues.join(', ') : gValues;
            } else {
                finalGrade = gradeEl.value;
            }

            const formData = new FormData();
            if (isEditing) formData.append('id', resId);
            
            formData.append('category', catVal);
            formData.append('title', titleVal);
            formData.append('authors', authors);
            formData.append('language', getVal('res-language'));
            formData.append('grade_level', finalGrade);
            formData.append('quarter', quarterVal);
            formData.append('week', weekVal);
            formData.append('content_standards', getVal('res-content-std'));
            formData.append('performance_standards', getVal('res-perf-std'));
            formData.append('competencies', finalComp);
            formData.append('description', getVal('res-desc'));
            formData.append('learning_area', getVal('res-learning-area'));
            formData.append('resource_type', typeVal);
            formData.append('year_published', getVal('res-year'));

            // New fields mapped to database
            formData.append('curriculum', getVal('res-curriculum'));
            formData.append('school_level', getVal('res-school-level'));
            formData.append('key_stage', getVal('res-key-stage'));
            formData.append('term', getVal('res-term'));
            formData.append('camp_type', getVal('res-camp-type'));
            formData.append('material_type', getVal('res-material-type'));
            formData.append('component', getVal('res-component'));
            formData.append('module_no', getVal('res-module-no'));
            formData.append('code', getVal('res-code'));
            
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
                    actionMessage.innerText = isEditing ? 'Resource Updated Successfully! Click Okay to continue.' : 'Upload Successful! Click Okay to upload another.';
                    actionMessage.style.color = 'lightgreen';
                    window._uploadSuccess = true;
                    loadAdminData();
                } else {
                    window._uploadSuccess = false;
                    actionMessage.innerText = `Error: ${data.message}`;
                    actionMessage.style.color = 'var(--accent-color)';
                }
            });
        };

        if (!isEditing) {
            const isDuplicate = allResources.some(r => {
                const sameTitle = r.title && r.title.toLowerCase() === titleVal.toLowerCase();
                const sameCat = catVal === r.category;
                const dbType = r.resource_type || r.camp_type || r.material_type || '';
                const sameType = typeVal === dbType;
                const sameQuarter = String(quarterVal) === String(r.quarter || '');
                const sameWeek = String(weekVal) === String(r.week || '');
                return sameTitle && sameCat && sameType && sameQuarter && sameWeek;
            });
            if (isDuplicate) {
                showAppModal({
                    title: 'Possible Duplicate File',
                    text: 'A learning resource with this Title, Category, Type, Quarter, and Week already exists. Do you really want to proceed?',
                    type: 'warning',
                    confirmText: 'Yes, proceed',
                    cancelText: 'Cancel Upload',
                    onConfirm: () => doUpload()
                });
                return;
            }
        }
        
        doUpload();
    });

    function loadAdminData() {
        // Only load resources initially as it's needed for the duplicate check in the upload form
        loadResources();
    }

    // Chart instances (to destroy before redraw)
    let chartVisits = null;
    let chartTime = null;
    let chartCat = null;
    let chartResCat = null;
    const analyticsFilters = {
        visits: { period: 'day', date: '' },
        downloadsTime: { period: 'day', date: '' },
        downloadsCategory: { period: 'day', date: '' }
    };
    const usersState = { page: 1, perPage: 10, search: '', school: '', position: '' };
    const resourcesState = { page: 1, perPage: 10, search: '', sortBy: 'downloads_count', sortOrder: 'desc', category: '', type: '', curriculum: '', level: '', grade: '', subject: '' };
    const feedbackState = { page: 1, perPage: 10 };
    const commentsState = { page: 1, perPage: 10 };
    let allUsers = [];
    let allFeedbacks = [];
    let allComments = [];

    function injectAnalyticsToolbar(title, chartKey, dateId) {
        const heading = Array.from(document.querySelectorAll('#analytics-section h3')).find(el => el.textContent.trim() === title);
        if (!heading || heading.dataset.toolbarReady === 'true') return;
        heading.dataset.toolbarReady = 'true';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:1.2rem;';
        heading.parentNode.insertBefore(wrapper, heading);
        heading.style.margin = '0';
        wrapper.appendChild(heading);

        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center;';
        controls.innerHTML = `
            <button class="btn btn-primary analytics-filter-btn" data-chart="${chartKey}" data-period="day">Today</button>
            <button class="btn btn-secondary analytics-filter-btn" data-chart="${chartKey}" data-period="week">This Week</button>
            <button class="btn btn-secondary analytics-filter-btn" data-chart="${chartKey}" data-period="month">This Month</button>
            <button class="btn btn-secondary analytics-filter-btn" data-chart="${chartKey}" data-period="year">This Year</button>
            <input type="date" id="${dateId}" style="padding:0 0.6rem; border-radius:4px; background:#333; color:white; border:1px solid #444; outline:none; height:42px; cursor:pointer;">
            <button class="btn btn-secondary analytics-filter-btn" data-chart="${chartKey}" data-period="reset" style="background:transparent; border:1px solid #444;"><i class="fas fa-sync-alt"></i> Reset</button>\n`;
        wrapper.appendChild(controls);
    }

    injectAnalyticsToolbar('User Visits Over Time', 'visits', 'visits-date-filter');
    injectAnalyticsToolbar('Downloads Over Time', 'downloadsTime', 'downloads-time-date-filter');
    injectAnalyticsToolbar('Downloads by Category', 'downloadsCategory', 'downloads-category-date-filter');

    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    function buildAnalyticsUrl(filter) {
        let url = `api/analytics.php?period=${filter.period}`;
        if (filter.date) url += `&date=${filter.date}`;
        return url;
    }

    function setActiveChartButtons(chartKey) {
        document.querySelectorAll(`.analytics-filter-btn[data-chart="${chartKey}"]`).forEach(btn => {
            const isActive = btn.dataset.period === analyticsFilters[chartKey].period;
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-secondary', !isActive);
        });
    }

    function renderPagination(containerId, currentPage, totalItems, perPage, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
        if (totalPages <= 1) return;
        const info = document.createElement('span');
        info.style.color = '#aaa';
        info.style.marginRight = '8px';
        info.textContent = `Page ${currentPage} of ${totalPages}`;
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => onPageChange(currentPage - 1);
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => onPageChange(currentPage + 1);
        container.append(info, prevBtn, nextBtn);
    }

    function renderLineChart(setter, canvasId, labels, values, color, label) {
        if (setter.get()) setter.get().destroy();
        const ctx = document.getElementById(canvasId).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        const rgb = color === '#9b59b6' ? '155, 89, 182' : '229, 9, 20';
        gradient.addColorStop(0, `rgba(${rgb}, 0.35)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        setter.set(new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label, data: values, backgroundColor: gradient, borderColor: color, borderWidth: 3, fill: true, tension: 0.35, pointBackgroundColor: color, pointBorderColor: '#fff', pointHoverRadius: 6 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { backgroundColor: '#1a1a1a', titleColor: '#fff', bodyColor: '#fff', borderColor: '#333', borderWidth: 1 },
                    datalabels: { 
                        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
                        align: 'top', 
                        anchor: 'end',
                        color: '#fff',
                        offset: 4,
                        font: { size: 10, weight: 'bold' },
                        formatter: (val) => val
                    }
                },
                scales: {
                    x: { ticks: { color: '#aaa', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, grace: '15%' }
                }
            },
            plugins: [ChartDataLabels]
        }));
    }

    function renderStackedBarChart(setter, canvasId, labels, datasets, palette) {
        if (setter.get()) setter.get().destroy();
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Map palette to datasets
        datasets.forEach((ds, i) => {
            ds.backgroundColor = palette[i % palette.length];
            ds.borderRadius = 0;
            ds.borderWidth = 0;
            ds.barThickness = 45;
        });

        setter.set(new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'bottom',
                        labels: { color: '#aaa', boxWidth: 12, font: { size: 10 } }
                    },
                    tooltip: { mode: 'index', intersect: false },
                    datalabels: {
                        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
                        color: '#fff',
                        font: { weight: 'bold', size: 10 },
                        formatter: (val) => val
                    }
                },
                scales: {
                    x: { stacked: true, ticks: { color: '#aaa', font: { size: 10 } }, grid: { display: false } },
                    y: { stacked: true, ticks: { color: '#aaa', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, grace: '10%' }
                }
            },
            plugins: [
                ChartDataLabels,
                {
                    id: 'topTotals',
                    afterDatasetsDraw: (chart) => {
                        const { ctx, data, scales: { x, y } } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.font = 'bold 12px Inter, sans-serif';
                        ctx.fillStyle = '#fff';

                        data.labels.forEach((label, i) => {
                            let total = 0;
                            data.datasets.forEach((dataset) => {
                                // Only sum if the dataset is visible in the legend
                                if (chart.isDatasetVisible(data.datasets.indexOf(dataset))) {
                                    total += dataset.data[i];
                                }
                            });
                            
                            const xPos = x.getPixelForValue(label);
                            const yPos = y.getPixelForValue(total);
                            
                            if (total > 0) {
                                ctx.fillText(total, xPos, yPos - 8);
                                // Optional: Add "Total" text above the number if preferred, but usually just number is cleaner
                            }
                        });
                        ctx.restore();
                    }
                }
            ]
        }));
    }

    function prepareStackedData(rawData) {
        // rawData: array of {category, resource_type, total}
        const categories = [...new Set(rawData.map(d => d.category || 'Uncategorized'))];
        const lrTypes = [...new Set(rawData.map(d => d.resource_type || 'General'))];
        
        const datasets = lrTypes.map(type => {
            return {
                label: type,
                data: categories.map(cat => {
                    const found = rawData.find(d => (d.category || 'Uncategorized') === cat && (d.resource_type || 'General') === type);
                    return found ? parseInt(found.total) : 0;
                })
            };
        });
        
        return { labels: categories, datasets };
    }

    function loadAnalytics(targetChartKey = null) {
        const palette = ['#e50914','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e74c3c','#34495e','#16a085'];

        if (targetChartKey === 'visits') {
            fetch(buildAnalyticsUrl(analyticsFilters.visits)).then(r => r.json()).then(data => {
                if (data.success) renderLineChart({ get: () => chartVisits, set: (v) => chartVisits = v }, 'chart-visits-time', data.visit_time_data.map(d => d.period_label), data.visit_time_data.map(d => parseInt(d.total)), '#9b59b6', 'Visits');
            });
            return;
        }
        if (targetChartKey === 'downloadsTime') {
            fetch(buildAnalyticsUrl(analyticsFilters.downloadsTime)).then(r => r.json()).then(data => {
                if (data.success) renderLineChart({ get: () => chartTime, set: (v) => chartTime = v }, 'chart-downloads-time', data.time_data.map(d => d.period_label), data.time_data.map(d => parseInt(d.total)), '#e50914', 'Downloads');
            });
            return;
        }
        if (targetChartKey === 'downloadsCategory') {
            fetch(buildAnalyticsUrl(analyticsFilters.downloadsCategory)).then(r => r.json()).then(data => {
                if (data.success) {
                    const stacked = prepareStackedData(data.category_data);
                    renderStackedBarChart({ get: () => chartCat, set: (v) => chartCat = v }, 'chart-downloads-category', stacked.labels, stacked.datasets, palette);
                }
            });
            return;
        }

        // Full load if no key specified
        Promise.all([
            fetch(buildAnalyticsUrl(analyticsFilters.visits)).then(r => r.json()),
            fetch(buildAnalyticsUrl(analyticsFilters.downloadsTime)).then(r => r.json()),
            fetch(buildAnalyticsUrl(analyticsFilters.downloadsCategory)).then(r => r.json()),
            fetch('api/analytics.php?period=day').then(r => r.json())
        ]).then(([visitsData, downloadsTimeData, downloadsCategoryData, summaryData]) => {
            if (!summaryData.success) return;
            document.getElementById('stat-users').textContent = summaryData.totals.users;
            document.getElementById('stat-resources').textContent = summaryData.totals.resources;
            document.getElementById('stat-downloads').textContent = summaryData.totals.downloads;
            document.getElementById('stat-likes').textContent = summaryData.totals.likes;
            document.getElementById('stat-views').textContent = summaryData.totals.views;
            document.getElementById('stat-visits').textContent = summaryData.totals.visits;
            
            renderLineChart({ get: () => chartVisits, set: (v) => chartVisits = v }, 'chart-visits-time', visitsData.visit_time_data.map(d => d.period_label), visitsData.visit_time_data.map(d => parseInt(d.total)), '#9b59b6', 'Visits');
            renderLineChart({ get: () => chartTime, set: (v) => chartTime = v }, 'chart-downloads-time', downloadsTimeData.time_data.map(d => d.period_label), downloadsTimeData.time_data.map(d => parseInt(d.total)), '#e50914', 'Downloads');
            
            const dlStacked = prepareStackedData(downloadsCategoryData.category_data);
            renderStackedBarChart({ get: () => chartCat, set: (v) => chartCat = v }, 'chart-downloads-category', dlStacked.labels, dlStacked.datasets, palette);
            
            const resStacked = prepareStackedData(summaryData.resources_per_category);
            renderStackedBarChart({ get: () => chartResCat, set: (v) => chartResCat = v }, 'chart-resources-category', resStacked.labels, resStacked.datasets, palette);
            
            const tbody = document.querySelector('#top-resources-table tbody');
            tbody.innerHTML = '';
            summaryData.top_resources.forEach((r, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i+1}. ${r.title}</td>
                    <td><span style="background:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${r.category || '–'}</span></td>
                    <td><strong style="color:#2ecc71;">${r.downloads_count}</strong></td>
                    <td><strong style="color:#e50914;">${r.likes_count}</strong></td>
                `;
                tbody.appendChild(tr);
            });
            if (summaryData.top_resources.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="color:#aaa; text-align:center;">No data yet.</td></tr>';
            }
        }).catch(err => console.error('Analytics load error:', err));
    }

    document.querySelectorAll('.analytics-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chartKey = e.currentTarget.dataset.chart;
            const period = e.currentTarget.dataset.period;
            
            if (period === 'reset') {
                analyticsFilters[chartKey].period = 'day';
                analyticsFilters[chartKey].date = '';
            } else {
                analyticsFilters[chartKey].period = period;
                analyticsFilters[chartKey].date = '';
            }
            
            const dateMap = { visits: 'visits-date-filter', downloadsTime: 'downloads-time-date-filter', downloadsCategory: 'downloads-category-date-filter' };
            const dateEl = document.getElementById(dateMap[chartKey]);
            if (dateEl) dateEl.value = '';
            setActiveChartButtons(chartKey);
            loadAnalytics(chartKey);
        });
    });

    [['visits', 'visits-date-filter'], ['downloadsTime', 'downloads-time-date-filter'], ['downloadsCategory', 'downloads-category-date-filter']].forEach(([chartKey, inputId]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        setActiveChartButtons(chartKey);
        input.addEventListener('change', (e) => {
            analyticsFilters[chartKey].period = 'day';
            analyticsFilters[chartKey].date = e.target.value || '';
            setActiveChartButtons(chartKey);
            loadAnalytics(chartKey);
        });
    });

    function populateUserFilters(users) {
        const schoolSelect = document.getElementById('users-filter-school');
        const positionSelect = document.getElementById('users-filter-position');
        if (!schoolSelect || !positionSelect) return;
        const schools = [...new Set(users.map(u => u.school).filter(Boolean))].sort();
        const positions = [...new Set(users.map(u => u.position).filter(Boolean))].sort();
        schoolSelect.innerHTML = '<option value="">All Schools/Offices</option>' + schools.map(v => `<option value="${v}">${v}</option>`).join('');
        positionSelect.innerHTML = '<option value="">All Positions</option>' + positions.map(v => `<option value="${v}">${v}</option>`).join('');
        schoolSelect.value = usersState.school;
        positionSelect.value = usersState.position;
    }

    function renderUsersTable() {
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        const filtered = allUsers.filter(u => {
            const usernameMatch = !usersState.search || (u.username || '').toLowerCase().includes(usersState.search);
            const schoolMatch = !usersState.school || u.school === usersState.school;
            const positionMatch = !usersState.position || u.position === usersState.position;
            return usernameMatch && schoolMatch && positionMatch;
        });
        const start = (usersState.page - 1) * usersState.perPage;
        const pageItems = filtered.slice(start, start + usersState.perPage);
        pageItems.forEach(u => {
            const tr = document.createElement('tr');
            let name = '-';
            if(u.last_name || u.first_name) {
                name = `${u.last_name || ''}, ${u.first_name || ''} ${u.middle_name ? (u.middle_name.charAt(0)+'.') : ''}`;
            }
            tr.innerHTML = `
                <td>${u.username}</td>
                <td>${name}</td>
                <td>${u.school || '-'}</td>
                <td>${u.position || '-'}</td>
                <td><span style="color:#9b59b6; font-weight:bold;">${u.visits_count || 0}</span></td>
                <td><span style="color:#2ecc71; font-weight:bold;">${u.downloads_count || 0}</span></td>
                <td style="font-size:0.85rem; color:#aaa;">${u.last_login || 'Never'}</td>
                <td>${u.role !== 'admin' ? `<button class="btn btn-secondary" onclick="event.stopPropagation(); deleteUser(${u.id})" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>` : ''}</td>
            `;
            tr.style.cursor = 'pointer';
            tr.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') showUserInfo(u.id);
            };
            tbody.appendChild(tr);
        });
        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#aaa;">No users found.</td></tr>';
        }
        renderPagination('users-pagination', usersState.page, filtered.length, usersState.perPage, (page) => {
            usersState.page = page;
            renderUsersTable();
        });
    }

    function loadUsers() {
        const tbody = document.querySelector('#users-table tbody');
        if(tbody && tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading users...</td></tr>';
        }
        fetch('api/users.php?action=list')
            .then(res => res.json())
            .then(data => {
                if(data.success && data.users) {
                    allUsers = data.users;
                    populateUserFilters(allUsers);
                    renderUsersTable();
                }
            });
    }

    document.getElementById('users-search')?.addEventListener('input', (e) => {
        usersState.search = e.target.value.trim().toLowerCase();
        usersState.page = 1;
        renderUsersTable();
    });
    document.getElementById('users-filter-school')?.addEventListener('change', (e) => {
        usersState.school = e.target.value;
        usersState.page = 1;
        renderUsersTable();
    });
    document.getElementById('users-filter-position')?.addEventListener('change', (e) => {
        usersState.position = e.target.value;
        usersState.page = 1;
        renderUsersTable();
    });

    function renderResourcesTable() {
        const tbody = document.querySelector('#resources-table tbody');
        tbody.innerHTML = '';
        const sortBy = resourcesState.sortBy;
        const sortOrder = resourcesState.sortOrder;
        const filtered = allResources.filter(r => {
            const searchMatch = !resourcesState.search || (r.title || '').toLowerCase().includes(resourcesState.search);
            const catMatch = !resourcesState.category || r.category === resourcesState.category;
            const typeMatch = !resourcesState.type || (r.resource_type || r.camp_type || r.material_type) === resourcesState.type;
            const currMatch = !resourcesState.curriculum || r.curriculum === resourcesState.curriculum;
            const levelMatch = !resourcesState.level || r.school_level === resourcesState.level;
            const gradeMatch = !resourcesState.grade || (r.grade_level || '').includes(resourcesState.grade);
            const subjMatch = !resourcesState.subject || (r.learning_area === resourcesState.subject || r.subject === resourcesState.subject);
            return searchMatch && catMatch && typeMatch && currMatch && levelMatch && gradeMatch && subjMatch;
        }).sort((a, b) => {
            let valA = a[sortBy] || '';
            let valB = b[sortBy] || '';
            if (['downloads_count', 'likes_count'].includes(sortBy)) {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            } else if (sortBy === 'grade_subject') {
                valA = (a.grade_level || '') + (a.learning_area || a.subject || '');
                valB = (b.grade_level || '') + (b.learning_area || b.subject || '');
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        const start = (resourcesState.page - 1) * resourcesState.perPage;
        const pageItems = filtered.slice(start, start + resourcesState.perPage);
        pageItems.forEach(r => {
            const tr = document.createElement('tr');
            const catText = r.category || 'N/A';
            const lrTypeText = r.resource_type || r.camp_type || r.material_type || 'N/A';
            const gradeSubj = (r.grade_level ? r.grade_level + ' - ' : '') + ((r.learning_area && r.learning_area!=='Others...') ? r.learning_area : (r.subject || ''));
            tr.innerHTML = `
                <td style="text-align: center;" onclick="event.stopPropagation();"><input type="checkbox" class="res-batch-checkbox" value="${r.id}" onclick="window.toggleResourceBatchCheckbox()"></td>
                <td>${catText}</td>
                <td>${lrTypeText}</td>
                <td><div style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.title || ''}">${r.title || 'N/A'}</div></td>
                <td>${r.curriculum || 'N/A'}</td>
                <td>${r.school_level || 'N/A'}</td>
                <td>${gradeSubj || 'N/A'}</td>
                <td style="font-size:0.9em; white-space:nowrap;">DL: ${r.downloads_count || 0} | L: ${r.likes_count || 0}</td>
            `;
            tr.style.cursor = 'pointer';
            tr.onclick = (e) => {
                editResource(r.id);
            };
            tbody.appendChild(tr);
        });
        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#aaa;">No resources found.</td></tr>';
        }
        
        window.toggleResourceBatchCheckbox(); // reset batch button state
        const selectAllChk = document.getElementById('res-select-all');
        if(selectAllChk) selectAllChk.checked = false;
        renderPagination('resources-pagination', resourcesState.page, filtered.length, resourcesState.perPage, (page) => {
            resourcesState.page = page;
            renderResourcesTable();
        });
    }

    function loadResources() {
        const tbody = document.querySelector('#resources-table tbody');
        if(tbody && (tbody.innerHTML === '' || tbody.innerHTML.includes('No resources found'))) {
             tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading resources...</td></tr>';
        }
        fetch('api/resources.php?action=list')
            .then(res => res.json())
            .then(data => {
                if(data.success && data.resources) {
                    allResources = data.resources;
                    renderResourcesTable();
                }
            });
    }

    document.getElementById('resources-search')?.addEventListener('input', (e) => {
        resourcesState.search = e.target.value.trim().toLowerCase();
        resourcesState.page = 1;
        renderResourcesTable();
    });

    ['res-filter-category', 'res-filter-type', 'res-filter-curriculum', 'res-filter-level', 'res-filter-grade', 'res-filter-subject'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const key = id.replace('res-filter-', '');
            resourcesState[key] = e.target.value;
            resourcesState.page = 1;
            renderResourcesTable();
        });
    });

    document.getElementById('resources-clear-filters-btn')?.addEventListener('click', () => {
        resourcesState.search = '';
        resourcesState.category = '';
        resourcesState.type = '';
        resourcesState.curriculum = '';
        resourcesState.level = '';
        resourcesState.grade = '';
        resourcesState.subject = '';
        resourcesState.page = 1;

        const searchInput = document.getElementById('resources-search');
        if (searchInput) searchInput.value = '';
        
        ['res-filter-category', 'res-filter-type', 'res-filter-curriculum', 'res-filter-level', 'res-filter-grade', 'res-filter-subject'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        renderResourcesTable();
    });
    window.toggleResourceSort = (field) => {
        if (resourcesState.sortBy === field) {
            resourcesState.sortOrder = resourcesState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            resourcesState.sortBy = field;
            resourcesState.sortOrder = 'desc';
        }
        document.querySelectorAll('#resources-table th i.fas').forEach(i => i.className = 'fas fa-sort');
        const icon = document.getElementById('sort-' + field);
        if (icon) {
            icon.className = resourcesState.sortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
        renderResourcesTable();
    };
    
    window.editResource = (id) => {
        const res = allResources.find(r => r.id == id);
        if(!res) {
            console.error('Resource not found for id:', id);
            showAppModal({ title: 'Resource Missing', text: 'Could not find resource. Please refresh and try again.', type: 'danger', confirmText: 'Okay' });
            return;
        }

        switchTab('upload-section');
        document.getElementById('upload-tab-title').innerText = 'Edit Learning Resource';
        document.getElementById('upload-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
        document.getElementById('resource_id').value = res.id;
        
        const ensureOption = (id, val) => {
            const el = document.getElementById(id);
            if (!val || !el || !el.tomselect) return;
            if (!el.tomselect.options[val]) el.tomselect.addOption({value: val, text: val});
            el.tomselect.setValue(val, true); 
        };

        ensureOption('res-category', res.category);
        document.getElementById('res-category').dispatchEvent(new Event('change'));
        ensureOption('res-type', res.resource_type || res.camp_type || res.material_type);
        ensureOption('res-curriculum', res.curriculum);
        ensureOption('res-school-level', res.school_level);
        ensureOption('res-key-stage', res.key_stage);
        ensureOption('res-learning-area', res.learning_area || res.subject);
        ensureOption('res-grade', res.grade_level);
        ensureOption('res-quarter', res.quarter);
        ensureOption('res-term', res.term);
        ensureOption('res-language', res.language);
        ensureOption('res-year', res.year_published);
        ensureOption('res-material-type', res.material_type);
        
        document.getElementById('res-title').value = res.title || '';
        document.getElementById('res-week').value = res.week || '';
        document.getElementById('res-content-std').value = res.content_standards || '';
        document.getElementById('res-perf-std').value = res.performance_standards || '';
        document.getElementById('res-desc').value = res.description || '';
        
        const resCode = document.getElementById('res-code');
        if(resCode) resCode.value = res.code || '';
        const resCompValue = document.getElementById('res-component');
        if(resCompValue) resCompValue.value = res.component || '';
        const resMod = document.getElementById('res-module-no');
        if(resMod) resMod.value = res.module_no || '';

        updateFormVisibility();

        if(authorsGroup) authorsGroup.innerHTML = '';
        authorCountObj.count = 0;
        addAuthorBtn.style.display = 'inline-block';
        if(res.authors) {
            const authorList = res.authors.split(',').map(a => a.trim());
            authorList.forEach(a => {
                createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn, a);
            });
        }
        if(authorCountObj.count === 0) {
            createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn);
        }

        if(compGroup) compGroup.innerHTML = '';
        compCountObj.count = 0;
        addCompBtn.style.display = 'inline-block';
        if(res.competencies) {
            const subject = res.learning_area || res.subject || '';
            const url = `api/competencies.php?action=unique_values&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(res.grade_level || '')}&quarter=${encodeURIComponent(res.quarter || '')}&term=${encodeURIComponent(res.term || '')}&week=${encodeURIComponent(res.week || '')}&school_level=${encodeURIComponent(res.school_level || '')}&curriculum=${encodeURIComponent(res.curriculum || '')}&key_stage=${encodeURIComponent(res.key_stage || '')}`;
            
            fetch(url).then(r => r.json()).then(data => {
                if(data.success && data.data && Array.isArray(data.data.competencies)) {
                    currentAvailableCompetencies = data.data.competencies;
                }
                const compList = res.competencies.split(';').map(c => c.trim());
                compList.forEach(m => {
                    const found = (currentAvailableCompetencies || []).find(c => c.melc === m);
                    createCompSelectField(found ? found.id : '');
                });
                
                if(compCountObj.count === 0) {
                    createCompSelectField();
                }
                updateStandardsFromAll();
            });
        } else {
            if(compCountObj.count === 0) createCompSelectField();
            updateStandardsFromAll();
        }
    };

    window.cancelResourceEdit = () => {
        resetUploadForm();
    };

    window.confirmDeleteResource = () => {
        const resId = document.getElementById('resource_id').value;
        if (resId) {
            deleteResource(resId);
        }
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
            <div><strong style="color:#aaa;">Visits:</strong> <span style="color:#9b59b6; font-weight:bold; float:right;">${u.visits_count || 0}</span></div>
            <hr style="border-color:#333;">
            <div><strong style="color:#aaa;">Downloads:</strong> <span style="color:#2ecc71; font-weight:bold; float:right;">${u.downloads_count || 0}</span></div>
        `;
        document.getElementById('user-info-modal').classList.remove('hidden');
        document.getElementById('user-info-modal').classList.add('active');
    };

    window.deleteUser = async (id) => {
        const confirmed = await showAppModal({ title: 'Delete User', text: 'Are you sure you want to permanently delete this user account?', type: 'danger', confirmText: 'Delete User' });
        if(confirmed) {
            fetch('api/users.php?action=delete', { method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'} }).then(() => loadUsers());
        }
    };

    window.deleteResource = async (id) => {
        const confirmed = await showAppModal({ title: 'Delete Resource', text: 'Are you sure you want to permanently delete this learning resource?', type: 'danger', confirmText: 'Delete' });
        if(confirmed) {
            fetch('api/resources.php?action=delete', { method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'} }).then(() => { loadResources(); switchTab('manage-res-section'); });
        }
    };

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

    async function generatePDFReport(resources, year, month) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'a4');
        try {
            const assets = await loadReportAssets();
            doc.addFileToVFS('old-english-five.ttf', assets.fontBase64);
            doc.addFont('old-english-five.ttf', 'OldEnglishFive', 'normal');
            doc.__lrflixLogo = assets.logoDataUrl;
            doc.__oldEnglishReady = true;
        } catch (err) {
            doc.__oldEnglishReady = false;
            doc.__lrflixLogo = null;
        }
        const dlChartBase64 = getChartForReport(chartCat);
        const resChartBase64 = getChartForReport(chartResCat);
        finalizePDF(doc, resources, year, month, dlChartBase64, resChartBase64);
    }

    function getChartForReport(chartInstance) {
        if (!chartInstance) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 2400; tempCanvas.height = 900;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        const isLine = chartInstance.config.type === 'line';
        const exportConfig = {
            type: chartInstance.config.type,
            data: {
                labels: Array.isArray(chartInstance.data.labels) ? [...chartInstance.data.labels] : [],
                datasets: (chartInstance.data.datasets || []).map(ds => ({
                    label: ds.label, data: Array.isArray(ds.data) ? [...ds.data] : [], backgroundColor: ds.backgroundColor, borderColor: ds.borderColor, borderWidth: isLine ? 6 : 0, borderRadius: isLine ? 0 : 10, barThickness: isLine ? undefined : 72, fill: !!ds.fill, tension: ds.tension ?? 0, pointRadius: isLine ? 5 : 0, pointHoverRadius: isLine ? 5 : 0, pointBackgroundColor: ds.pointBackgroundColor || ds.borderColor, pointBorderColor: ds.pointBorderColor || '#ffffff'
                }))
            },
            options: { responsive: false, animation: false, devicePixelRatio: 4, maintainAspectRatio: false, layout: { padding: { top: 24, right: 24, bottom: 12, left: 24 } }, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: chartInstance.options.plugins?.datalabels ? { color: '#000000', anchor: 'end', align: 'top', offset: 6, font: { weight: 'bold', size: 20 }, formatter: (val) => val > 0 ? val : '' } : false }, scales: { x: { ticks: { color: '#000000', font: { size: 20, weight: '600' } }, grid: { display: false }, border: { color: '#cccccc' } }, y: { beginAtZero: true, ticks: { color: '#000000', stepSize: 1, precision: 0, font: { size: 20, weight: '600' } }, grid: { color: '#e3e3e3', lineWidth: 1.5 }, border: { color: '#cccccc' } } } },
            plugins: [{ id: 'pdfBackground', beforeDraw(chart) { const { ctx, canvas } = chart; ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); } }]
        };
        const exportChart = new Chart(tempCtx, exportConfig);
        exportChart.update('none');
        const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
        exportChart.destroy();
        return dataUrl;
    }

    function finalizePDF(doc, resources, year, month, dlChart, resChart) {
        if(doc.pdfDone) return;
        doc.pdfDone = true;
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const drawCenteredText = (text, y) => { const textWidth = doc.getTextWidth(text); doc.text(text, (pageWidth - textWidth) / 2, y); };
        doc.setTextColor(0, 0, 0); 
        const logoWidth = 40; const logoHeight = 40; const logoX = centerX - (logoWidth / 2); const logoY = 14;
        if (doc.__lrflixLogo) doc.addImage(doc.__lrflixLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
        if (doc.__oldEnglishReady) doc.setFont('OldEnglishFive', 'normal'); else doc.setFont('times', 'bolditalic');
        doc.setFontSize(9); drawCenteredText('Republic of the Philippines', 63);
        if (doc.__oldEnglishReady) doc.setFont('OldEnglishFive', 'normal'); else doc.setFont('times', 'bolditalic');
        doc.setFontSize(11); drawCenteredText('Department of Education', 74);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); drawCenteredText('REGION II - CAGAYAN VALLEY', 85); drawCenteredText('SCHOOLS DIVISION OF BATANES', 95);
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
        let titleLine = 'LEARNING RESOURCE INVENTORY REPORT';
        if (month || year) titleLine += ` - ${month ? getMonthName(month) : ''} ${year || ''}`;
        drawCenteredText(titleLine, 114);
        const body = resources.map(r => [ r.title, r.category || '–', r.resource_type || '–', r.authors || '–', r.learning_area || '–', r.grade_level || '–', r.year_published || (r.created_at ? r.created_at.split(' ')[0] : '–') ]);
        let startY = 135;
        if (dlChart && resChart) {
            const chartW = pageWidth - 100; const chartH = 180;
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); drawCenteredText('Downloads by Category', 145); doc.addImage(dlChart, 'PNG', 50, 155, chartW, chartH, undefined, 'FAST');
            drawCenteredText('Resources by Category', 345); doc.addImage(resChart, 'PNG', 50, 355, chartW, chartH, undefined, 'FAST');
            startY = 560; 
        }
        doc.autoTable({ startY: startY, head: [['Title', 'Category', 'Type', 'Authors', 'Subject', 'Grade', 'Published']], body: body, theme: 'grid', headStyles: { fillColor: [229, 9, 20], textColor: [255, 255, 255], fontStyle: 'bold' }, styles: { fontSize: 8, cellPadding: 5 } });
        doc.save(`LRFLIX_Inventory_${year||'All'}.pdf`);
    }

    function generateExcelReport(resources, year, month) {
        const wsData = resources.map(r => ({ 'Title': r.title, 'Category': r.category || '–', 'Type': r.resource_type || '–', 'Authors': r.authors || '–', 'Subject': r.learning_area || '–', 'Grade Level': r.grade_level || '–', 'Published Date': r.year_published || r.created_at }));
        const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(wsData); XLSX.utils.book_append_sheet(wb, ws, "Inventory"); XLSX.writeFile(wb, `LRFLIX_Inventory_${year||'All'}.xlsx`);
    }

    function getMonthName(m) { const names = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]; return names[parseInt(m)]; }

    function loadFeedbacks() {
        const table = document.getElementById('feedback-table').querySelector('tbody');
        const cTable = document.getElementById('lr-comments-table').querySelector('tbody');
        table.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading feedbacks...</td></tr>';
        cTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading comments...</td></tr>';
        fetch('api/resources.php?action=list_feedback').then(res => res.json()).then(data => { allFeedbacks = data.success ? data.feedbacks : []; renderFeedbackTable(); }).catch(() => { allFeedbacks = []; table.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading feedbacks.</td></tr>'; });
        fetch('api/resources.php?action=list_comments').then(res => res.json()).then(data => { allComments = data.success ? data.comments : []; renderCommentsTable(); }).catch(() => { allComments = []; cTable.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error loading comments.</td></tr>'; });
    }

    function renderFeedbackTable() {
        const tbody = document.getElementById('feedback-table').querySelector('tbody');
        tbody.innerHTML = ''; const start = (feedbackState.page - 1) * feedbackState.perPage; const pageItems = allFeedbacks.slice(start, start + feedbackState.perPage);
        pageItems.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${f.first_name} ${f.last_name}</td><td>${f.school || '–'}</td><td>${new Date(f.created_at).toLocaleDateString()}</td><td style="max-width:300px; white-space:normal;">${f.suggestion}</td><td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="deleteFeedback(${f.id})"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
        if (pageItems.length === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No feedbacks yet.</td></tr>';
        renderPagination('feedback-pagination', feedbackState.page, allFeedbacks.length, feedbackState.perPage, (page) => { feedbackState.page = page; renderFeedbackTable(); });
    }

    function renderCommentsTable() {
        const tbody = document.getElementById('lr-comments-table').querySelector('tbody');
        tbody.innerHTML = ''; const start = (commentsState.page - 1) * commentsState.perPage; const pageItems = allComments.slice(start, start + commentsState.perPage);
        pageItems.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.first_name} ${c.last_name}</td><td>${c.school || '–'}</td><td style="max-width:200px; white-space:normal; font-weight:bold;">${c.resource_title}</td><td>${new Date(c.created_at).toLocaleDateString()}</td><td style="max-width:300px; white-space:normal;">${c.comment}</td><td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="deleteComment(${c.id})"><i class="fas fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
        if (pageItems.length === 0) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No LR comments yet.</td></tr>';
        renderPagination('comments-pagination', commentsState.page, allComments.length, commentsState.perPage, (page) => { commentsState.page = page; renderCommentsTable(); });
    }

    window.deleteFeedback = async (id) => {
        const confirmed = await showAppModal({ title: 'Delete Feedback', text: 'Are you sure you want to permanently delete this user suggestion?', type: 'danger', confirmText: 'Delete' });
        if(confirmed) { fetch('api/resources.php?action=delete_feedback', { method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'} }).then(res => res.json()).then(data => { if(data.success) loadFeedbacks(); else showAppModal({ title: 'Error', text: data.message, type: 'danger' }); }); }
    };

    window.deleteComment = async (id) => {
        const confirmed = await showAppModal({ title: 'Delete Comment', text: 'Are you sure you want to permanently delete this LR comment/error report?', type: 'danger', confirmText: 'Delete' });
        if(confirmed) { fetch('api/resources.php?action=delete_comment', { method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'} }).then(res => res.json()).then(data => { if(data.success) loadFeedbacks(); else showAppModal({ title: 'Error', text: data.message, type: 'danger' }); }); }
    };

    document.querySelectorAll('.feedback-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.feedback-tab-btn').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
            e.currentTarget.classList.remove('btn-secondary'); e.currentTarget.classList.add('btn-primary');
            document.getElementById('feedback-suggestions-panel').style.display = e.currentTarget.dataset.target === 'feedback-suggestions-panel' ? 'block' : 'none';
            document.getElementById('feedback-comments-panel').style.display = e.currentTarget.dataset.target === 'feedback-comments-panel' ? 'block' : 'none';
        });
    });

    window.confirmClearForm = async (force = false) => {
        if(force === true) clearAction();
        else {
            const confirmed = await showAppModal({ title: 'Clear Form', text: 'This will clear all selected values in the form. The form structure will remain visible.', type: 'warning', confirmText: 'Clear All' });
            if(confirmed) clearAction();
        }
    };
    
    document.getElementById('confirm-clear-btn').addEventListener('click', () => { clearAction(true); });

    // clearAction: clears field VALUES only — does NOT reset form visibility/category
    function clearAction(showAlert = false) {
        const fields = [ 'res-title', 'res-language', 'res-key-stage', 'res-grade', 'res-quarter', 'res-term', 'res-week', 'res-learning-area', 'res-type', 'res-year', 'res-content-std', 'res-perf-std', 'res-desc', 'res-code', 'res-module-no', 'res-curriculum', 'res-school-level', 'res-comp-select', 'res-comp' ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if(el) { if(el.tagName === 'SELECT' && el.tomselect) el.tomselect.setValue(''); else el.value = ''; }
        });
        const customGrade = document.getElementById('res-grade-custom'); if(customGrade) { customGrade.value = ''; customGrade.style.display = 'none'; }
        if(authorsGroup && addAuthorBtn) { authorsGroup.innerHTML = ''; authorCountObj.count = 0; addAuthorBtn.style.display = 'inline-block'; createDynamicField('res-author', authorsGroup, 5, 'Author', authorCountObj, addAuthorBtn); }
        if(compGroup && addCompBtn) { compGroup.innerHTML = ''; compCountObj.count = 0; addCompBtn.style.display = 'inline-block'; createCompSelectField(); }
        const resFile = document.getElementById('res-file'); if(resFile) resFile.value = '';
        const dt = document.getElementById('drop-zone-text'); if(dt) dt.innerText = 'Drag & Drop PDF or Click to Browse';
        const rf = document.getElementById('remove-file-btn'); if(rf) rf.classList.add('hidden');
        const modal = document.getElementById('clear-modal'); if(modal) { modal.classList.add('hidden'); modal.classList.remove('active'); }
        if(showAlert) {
            const am = document.getElementById('action-modal'); const as = document.getElementById('action-spinner'); const ac = document.getElementById('action-check'); const amsg = document.getElementById('action-message'); const cam = document.getElementById('close-action-modal');
            if(am) {
                am.classList.remove('hidden'); am.classList.add('active'); am.style.setProperty('display', 'flex', 'important'); am.style.setProperty('opacity', '1', 'important'); am.style.setProperty('visibility', 'visible', 'important');
                as.classList.add('hidden'); ac.classList.remove('hidden'); amsg.innerText = "Form cleared successfully!"; amsg.style.color = "lightgreen"; cam.classList.remove('hidden');
                setTimeout(() => { am.classList.add('hidden'); am.classList.remove('active'); }, 1500);
            }
        }
    }

    // resetUploadForm: full reset — clears values AND resets form back to only showing LR Category
    window.resetUploadForm = async () => {
        clearAction();
        const catEl = document.getElementById('res-category');
        if(catEl && catEl.tomselect) catEl.tomselect.setValue('');
        else if(catEl) catEl.value = '';
        updateFormVisibility();
        document.getElementById('resource_id').value = '';
        document.getElementById('upload-tab-title').innerText = 'Upload Learning Resource';
        document.getElementById('upload-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Submit Resource';
    };

    if (!window.compState) window.compState = { page: 1, limit: 15, search: '', grade: '', subject: '', quarter: '', term: '', week: '', curriculum: '', school_level: '', key_stage: '' };
    window.allCompetencies = [];
    window.loadCompetencies = () => {
        fetch(`api/competencies.php?action=list&page=${window.compState.page}&limit=${window.compState.limit}&search=${encodeURIComponent(window.compState.search)}&grade=${encodeURIComponent(window.compState.grade)}&subject=${encodeURIComponent(window.compState.subject)}&quarter=${encodeURIComponent(window.compState.quarter)}&term=${encodeURIComponent(window.compState.term)}&week=${encodeURIComponent(window.compState.week)}&curriculum=${encodeURIComponent(window.compState.curriculum)}&school_level=${encodeURIComponent(window.compState.school_level)}&key_stage=${encodeURIComponent(window.compState.key_stage)}`).then(res => res.json()).then(data => { if (data.success) { window.allCompetencies = data.competencies; renderCompetenciesTable(data.total); } });
    };

    function renderCompetenciesTable(totalItems) {
        const tbody = document.querySelector('#comp-table tbody'); if (!tbody) return; tbody.innerHTML = '';
        window.allCompetencies.forEach(c => {
            const tr = document.createElement('tr'); tr.style.cursor = 'pointer'; tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') editCompetency(c.id); };
            const ksLabel = c.key_stage ? `KS ${c.key_stage}` : '';
            const grLabel = c.grade_level ? `G${c.grade_level}` : '';
            const ksGrLabel = [ksLabel, grLabel].filter(Boolean).join(' / ') || '-';
            const qCode = c.quarter ? `<span style="color:#3498db;font-weight:bold;">Q${c.quarter}</span>` : '';
            const tCode = c.term ? `<span style="color:#e67e22;font-weight:bold;">T${c.term}</span>` : '';
            const qtLabel = [qCode, tCode].filter(Boolean).join(' / ') || '-';
            tr.innerHTML = `<td>${c.curriculum || '-'}</td><td>${c.code || '-'}</td><td>${c.subject || '-'}</td><td>${c.school_level || '-'}</td><td>${ksGrLabel}</td><td>${qtLabel}</td><td>${c.week || '-'}</td><td><div style="max-height: 50px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${c.melc || ''}">${c.melc || '-'}</div></td>`;
            tbody.appendChild(tr);
        });
        if (allCompetencies.length === 0) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#aaa;">No competencies found.</td></tr>';
        renderPagination('comp-pagination', window.compState.page, totalItems, window.compState.limit, (page) => { window.compState.page = page; loadCompetencies(); });
    }

    document.getElementById('comp-search')?.addEventListener('input', (e) => { window.compState.search = e.target.value.trim(); window.compState.page = 1; loadCompetencies(); });

    window.openCompModal = () => { document.getElementById('comp-id').value = ''; document.getElementById('comp-form').reset(); document.getElementById('comp-modal-title').innerText = 'Add New Competency'; document.getElementById('comp-delete-btn').classList.add('hidden'); document.getElementById('comp-modal').classList.remove('hidden'); document.getElementById('comp-modal').classList.add('active'); };
    window.closeCompModal = () => { document.getElementById('comp-modal').classList.add('hidden'); document.getElementById('comp-modal').classList.remove('active'); };

    window.editCompetency = (id) => {
        const c = window.allCompetencies.find(comp => comp.id == id); if (!c) return;
        document.getElementById('comp-id').value = c.id; document.getElementById('comp-curriculum').value = c.curriculum || ''; document.getElementById('comp-school-level').value = c.school_level || ''; document.getElementById('comp-key-stage').value = c.key_stage || ''; document.getElementById('comp-grade').value = c.grade_level || ''; document.getElementById('comp-subject').value = c.subject || ''; document.getElementById('comp-quarter').value = c.quarter || ''; document.getElementById('comp-term').value = c.term || ''; document.getElementById('comp-week').value = c.week || ''; document.getElementById('comp-code').value = c.code || ''; document.getElementById('comp-melc').value = c.melc || ''; document.getElementById('comp-content-std').value = c.content_std || ''; document.getElementById('comp-perf-std').value = c.performance_std || '';
        document.getElementById('comp-modal-title').innerText = 'Edit Competency'; document.getElementById('comp-delete-btn').classList.remove('hidden'); document.getElementById('comp-modal').classList.remove('hidden'); document.getElementById('comp-modal').classList.add('active');
    };

    window.confirmDeleteCompetency = async () => { const id = document.getElementById('comp-id').value; const confirmed = await showAppModal({ title: 'Delete Competency', text: 'Are you sure you want to permanently delete this competency record?', type: 'danger', confirmText: 'Delete' }); if(confirmed) { closeCompModal(); deleteCompetency(id); } };
    window.deleteCompetency = (id) => { fetch('api/competencies.php?action=delete', { method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'} }).then(() => loadCompetencies()); };

    document.getElementById('comp-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = { id: document.getElementById('comp-id').value, curriculum: document.getElementById('comp-curriculum').value, school_level: document.getElementById('comp-school-level').value, key_stage: document.getElementById('comp-key-stage').value, grade_level: document.getElementById('comp-grade').value, subject: document.getElementById('comp-subject').value, quarter: document.getElementById('comp-quarter').value, term: document.getElementById('comp-term').value, week: document.getElementById('comp-week').value, code: document.getElementById('comp-code').value, melc: document.getElementById('comp-melc').value, content_std: document.getElementById('comp-content-std').value, performance_std: document.getElementById('comp-perf-std').value };
        const action = data.id ? 'edit' : 'add';
        fetch(`api/competencies.php?action=${action}`, { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} }).then(res => res.json()).then(resData => { if (resData.success) { closeCompModal(); loadCompetencies(); } else { showAppModal({ title: 'Request Failed', text: 'Error processing request: ' + resData.message, type: 'danger', confirmText: 'Okay' }); } });
    });

// --- Upload Form Dynamic Logic ---
let isAutoFilling = false;
const uploadDynamicGroups = [ 'group-type', 'group-curriculum', 'group-school-level', 'group-key-stage', 'group-camp-type', 'group-material-type', 'group-learning-area', 'group-component', 'group-title', 'group-grade', 'group-module-no', 'group-authors', 'group-language', 'group-qtw', 'group-quarter-week', 'group-quarter', 'group-term', 'group-week', 'group-comp', 'group-code', 'group-content-std', 'group-perf-std', 'group-year', 'group-desc', 'group-file' ];

// ===== TomSelect Helpers =====
function updateTomSelect(elId, htmlContent, valToSet = '') {
    const el = document.getElementById(elId); if(!el) return;
    if(el.tomselect) el.tomselect.destroy();
    if(htmlContent !== null) el.innerHTML = htmlContent;
    
    const config = { create: false };
    if (elId === 'res-grade') {
        config.plugins = ['remove_button'];
        config.maxItems = null; // Explicitly allow multiple items
    }
    
    new TomSelect(el, config);
    if(valToSet) { 
        if(el.tomselect) {
            if (Array.isArray(valToSet)) el.tomselect.setValue(valToSet);
            else if (valToSet.includes(',')) el.tomselect.setValue(valToSet.split(','));
            else el.tomselect.setValue(valToSet);
        } else { el.value = valToSet; } 
    }
}

function setTSValue(id, value) {
    const el = document.getElementById(id); if(!el || !value) return;
    if(el.tomselect) {
        if(!el.tomselect.options[value]) {
            el.tomselect.addOption({value, text: value});
            el.tomselect.refreshOptions(false);
        }
        el.tomselect.setValue(value, true);
    } else { el.value = value; }
}

function clearTSValue(id) {
    const el = document.getElementById(id); if(!el) return;
    if(el.tomselect) el.tomselect.setValue('', true); else el.value = '';
}

function resetTSOptions(id, defaultText) {
    const el = document.getElementById(id); if(!el) return;
    if(el.tomselect) el.tomselect.destroy();
    el.innerHTML = `<option value="">${defaultText}</option>`;
    
    const config = { create: false };
    if (id === 'res-grade') {
        config.plugins = ['remove_button'];
        config.maxItems = null; // Explicitly allow multiple items
    }
    
    new TomSelect(el, config);
}

// ===== Category → Curriculum auto-set & Type options =====
const CAT_CURRICULUM_MAP = {
    'MATATAG Curriculum Resources': 'MATATAG',
    'K to 12 Curriculum Resources': 'K to 12'
};

document.getElementById('res-category')?.addEventListener('change', function() {
    const cat = this.value;
    const curriculumVal = CAT_CURRICULUM_MAP[cat] || '';
    setTSValue('res-curriculum', curriculumVal);

    let types = [];
    if(cat === 'MATATAG Curriculum Resources')                  types = ['Lesson Exemplars (LEs)', 'Learning Activity Sheets (LAS)', 'MATATAG 3 Term Budget of Work (BoW)', 'Curriculum Guide'];
    else if(cat === 'K to 12 Curriculum Resources')             types = ['Self-Learning Modules (SLMs)', 'Learning Activity Sheets (LAS)'];
    else if(cat === 'Contextualized Learning Resources (CLRs)') types = ['School Developed Text-based Materials', 'Ivatan Textbooks', 'Digital Learning Resources'];
    else if(cat === 'National Learning Camp (NLC)')              types = ['Intervention', 'Enhancement', 'Consolidation'];
    else if(cat === 'National Reading Program (NRP)')            types = ['Worksheets', 'Lesson Exemplars'];

    let html = '<option value="">Select Type...</option>';
    types.forEach(t => { html += `<option value="${t}">${t}</option>`; });
    updateTomSelect('res-type', html);
    
    // Set material type options based on category if independent of type
    let matHtml = '<option value="">Select...</option>';
    if (cat === 'National Reading Program (NRP)') {
        ['Lesson Script', 'Intervention', 'Enhancement', 'Consolidated'].forEach(t => { matHtml += `<option value="${t}">${t}</option>`; });
    }
    updateTomSelect('res-material-type', matHtml);

    cascadeClear('category');
    updateFormVisibility();
});

document.getElementById('res-type')?.addEventListener('change', function() {
    const cat = document.getElementById('res-category')?.value || '';
    const type = this.value;
    
    if (cat === 'Contextualized Learning Resources (CLRs)') {
        let matTypes = [];
        if (type === 'School Developed Text-based Materials') {
            matTypes = ['SLM', 'SIM', 'Storybook', 'Worksheet', 'Activity Sheet', 'Module', 'LAS (Learning Activity Sheets)'];
        } else if (type === 'Ivatan Textbooks') {
            matTypes = ['Textbook', 'Teachers Guide', 'Primer'];
        } else if (type === 'Digital Learning Resources') {
            matTypes = ['Audio', 'Video', 'Presentation (PPT)', 'Image/Graphics'];
        }
        
        let matHtml = '<option value="">Select...</option>';
        matTypes.forEach(t => { matHtml += `<option value="${t}">${t}</option>`; });
        updateTomSelect('res-material-type', matHtml);
    }
    
    updateFormVisibility();
});
document.getElementById('res-material-type')?.addEventListener('change', updateFormVisibility);

document.getElementById('res-grade')?.addEventListener('change', function() {
    const custom = document.getElementById('res-grade-custom');
    if(!custom) return;
    if(this.value === 'Others...') {
        custom.style.display = 'block';
        custom.required = true;
    } else {
        custom.style.display = 'none';
        custom.required = false;
    }
});

// ===== Form Visibility =====
function updateFormVisibility() {
    const cat  = document.getElementById('res-category')?.value || '';
    const type = document.getElementById('res-type')?.value    || '';
    const matType = document.getElementById('res-material-type')?.value || '';
    
    let toShow = ['group-file'];
    if(cat) {
        toShow.push('group-type', 'group-title', 'group-curriculum', 'group-school-level', 'group-learning-area', 'group-grade', 'group-language');
        
        // Quarter/Term/Week visibility
        if (cat === 'National Learning Camp (NLC)' || cat === 'National Reading Program (NRP)') {
            toShow.push('group-quarter', 'group-week'); // NRP/NLC usually use week-based
            // Show manual week input if needed (logic from previous turns)
            const weekManual = document.getElementById('res-week-manual');
            if (weekManual) weekManual.style.display = 'block';
            const weekSelect = document.getElementById('group-week')?.querySelector('.ts-wrapper');
            if (weekSelect) weekSelect.style.display = 'none';
        } else {
            toShow.push('group-qtw', 'group-quarter', 'group-term', 'group-week');
            const weekManual = document.getElementById('res-week-manual');
            if (weekManual) weekManual.style.display = 'none';
            const weekSelect = document.getElementById('group-week')?.querySelector('.ts-wrapper');
            if (weekSelect) weekSelect.style.display = 'block';
        }
    }

    if(cat && type) {
        if(cat === 'MATATAG Curriculum Resources') {
            toShow.push('group-key-stage');
            if(type.includes('LEs') || type.includes('LAS')) {
                toShow.push('group-comp', 'group-content-std', 'group-perf-std', 'group-code');
            }
        } else if(cat === 'K to 12 Curriculum Resources') {
            toShow.push('group-key-stage');
            if(type.includes('SLMs')) toShow.push('group-module-no', 'group-component');
            toShow.push('group-comp', 'group-content-std', 'group-perf-std', 'group-code');
        } else if(cat === 'Contextualized Learning Resources (CLRs)') {
            toShow.push('group-material-type', 'group-authors', 'group-desc', 'group-year');
            toShow.push('group-comp', 'group-content-std', 'group-perf-std', 'group-code');
        } else if(cat === 'National Learning Camp (NLC)') {
            toShow.push('group-camp-type', 'group-desc');
        } else if(cat === 'National Reading Program (NRP)') {
            toShow.push('group-material-type', 'group-desc');
        }
    }

    // If LR type is BoW, remove quarter, term, week
    if (type && type.includes('BoW')) {
        toShow = toShow.filter(id => !['group-qtw', 'group-quarter', 'group-term', 'group-week'].includes(id));
    }

    uploadDynamicGroups.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = toShow.includes(id) ? 'block' : 'none';
    });
}

// ===== Cascade Clear (clears all fields downstream of changed level) =====
function cascadeClear(level) {
    const order = ['category', 'school_level', 'key_stage', 'grade', 'learning_area', 'quarter', 'term', 'week', 'comp'];
    const idx = order.indexOf(level);
    if(idx < 0) return;
    if(idx <= order.indexOf('school_level'))  { clearTSValue('res-school-level'); }
    if(idx <= order.indexOf('key_stage'))     { clearTSValue('res-key-stage'); resetTSOptions('res-key-stage', 'Select Key Stage...'); }
    if(idx <= order.indexOf('grade'))         { clearTSValue('res-grade'); resetTSOptions('res-grade', 'Select Grade...'); }
    if(idx <= order.indexOf('learning_area')) { clearTSValue('res-learning-area'); resetTSOptions('res-learning-area', 'Select Area...'); }
    if(idx <= order.indexOf('quarter'))       { clearTSValue('res-quarter'); resetTSOptions('res-quarter', 'Select Quarter...'); }
    if(idx <= order.indexOf('term'))          { clearTSValue('res-term'); resetTSOptions('res-term', 'Select Term...'); }
    if(idx <= order.indexOf('week'))          { clearTSValue('res-week'); resetTSOptions('res-week', 'Select Week...'); currentAvailableCompetencies = []; refreshCompDropdowns(); }
    if(idx <= order.indexOf('comp'))          {
        document.getElementById('res-content-std').value = '';
        document.getElementById('res-perf-std').value = '';
        document.getElementById('res-code').value = '';
        document.getElementById('res-comp').value = '';
    }
}

// ===== Build API URL with current form state =====
function buildUploadUrl() {
    const subject    = document.getElementById('res-learning-area')?.value || '';
    
    const gradeSelect = document.getElementById('res-grade');
    let grade = '';
    if (gradeSelect && gradeSelect.tomselect) {
        const vals = gradeSelect.tomselect.getValue();
        grade = Array.isArray(vals) ? (vals[0] || '') : vals;
    } else {
        grade = gradeSelect?.value || '';
    }

    const quarter    = document.getElementById('res-quarter')?.value       || '';
    const term       = document.getElementById('res-term')?.value          || '';
    const week       = document.getElementById('res-week')?.value          || '';
    const schoolLevel= document.getElementById('res-school-level')?.value  || '';
    const curriculum = document.getElementById('res-curriculum')?.value    || '';
    const keyStage   = document.getElementById('res-key-stage')?.value     || '';
    return `api/competencies.php?action=unique_values&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}&quarter=${encodeURIComponent(quarter)}&term=${encodeURIComponent(term)}&week=${encodeURIComponent(week)}&school_level=${encodeURIComponent(schoolLevel)}&curriculum=${encodeURIComponent(curriculum)}&key_stage=${encodeURIComponent(keyStage)}`;
}

// ===== Fetch options and populate multiple downstream select fields =====
function fetchAndPopulateDownstream(level) {
    const url = buildUploadUrl();
    toggleFieldSpinners(level, true);
    return fetch(url).then(r => r.json()).then(data => {
        toggleFieldSpinners(level, false);
        if(!data.success || !data.data) return;
        
        const setOpts = (id, options, defaultText) => {
            const el = document.getElementById(id);
            if (!el || !options) return;
            
            // Keep track of previously selected value to maintain selection if applicable
            const prevVal = el.tomselect ? el.tomselect.getValue() : el.value;
            
            let html = `<option value="">${defaultText}</option>`;
            const realOpts = options.filter(opt => opt && opt.trim() !== '' && opt !== '#N/A' && opt !== 'N/A');
            realOpts.forEach(opt => { html += `<option value="${opt}">${opt}</option>`; });
            
            // For Grade Level, add "Others..." option
            if (id === 'res-grade') {
                html += '<option value="Others...">Others...</option>';
            }

            updateTomSelect(id, html);
            
            // Autofill logic requested by user:
            if (realOpts.length === 1) {
                if (el.tomselect) el.tomselect.setValue(realOpts[0], true);
                else el.value = realOpts[0];
            } else if (prevVal && realOpts.includes(prevVal)) {
                // Restore previous selection if it's still valid
                if (el.tomselect) el.tomselect.setValue(prevVal, true);
                else el.value = prevVal;
            }
        };

        const order = ['category', 'school_level', 'key_stage', 'grade', 'learning_area', 'quarter', 'term', 'week', 'comp'];
        const idx = order.indexOf(level);
        
        // Populate downwards:
        if(idx <= order.indexOf('school_level'))  setOpts('res-key-stage', data.data.key_stages, 'Select Key Stage...');
        if(idx <= order.indexOf('key_stage'))     setOpts('res-grade', data.data.grades, 'Select Grade...');
        if(idx <= order.indexOf('grade'))         setOpts('res-learning-area', data.data.subjects, 'Select Area...');
        if(idx <= order.indexOf('learning_area')) setOpts('res-quarter', data.data.quarters, 'Select Quarter...');
        if(idx <= order.indexOf('learning_area')) setOpts('res-term', data.data.terms, 'Select Term...');
        if(idx <= order.indexOf('quarter') || idx <= order.indexOf('term')) setOpts('res-week', data.data.weeks, 'Select Week...');
        
        // Autofill logic (Populates laterally/upwards if unambiguous):
        if(idx >= order.indexOf('grade') && level !== 'key_stage') setOpts('res-key-stage', data.data.key_stages, 'Select Key Stage...');
        if((idx >= order.indexOf('quarter') || idx >= order.indexOf('term')) && level !== 'quarter' && level !== 'term') {
            setOpts('res-quarter', data.data.quarters, 'Select Quarter...');
            setOpts('res-term', data.data.terms, 'Select Term...');
        }

        // Always refresh competencies based on latest filters
        if(Array.isArray(data.data.competencies)) {
            currentAvailableCompetencies = data.data.competencies;
            refreshCompDropdowns();
        }
    });
}

// ===== Cascade Event Listeners =====
// Hierarchy: School Level > Key Stage > Grade Level > Learning Area > Quarter > Term > Week > MELC
document.getElementById('res-school-level')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('key_stage');
    fetchAndPopulateDownstream('school_level');
});

document.getElementById('res-key-stage')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('grade');
    fetchAndPopulateDownstream('key_stage');
});

document.getElementById('res-grade')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('learning_area');
    fetchAndPopulateDownstream('grade');
});

document.getElementById('res-learning-area')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('quarter');
    fetchAndPopulateDownstream('learning_area');
});

document.getElementById('res-quarter')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('week');
    fetchAndPopulateDownstream('quarter');
});

document.getElementById('res-term')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('week');
    fetchAndPopulateDownstream('term');
});

document.getElementById('res-week')?.addEventListener('change', function() {
    if(isAutoFilling) return;
    cascadeClear('comp');
    fetchAndPopulateDownstream('week');
});



// ===== Code Field: Auto-fill =====
document.getElementById('res-code')?.addEventListener('change', function() {
    const code = this.value.trim(); if(!code) return;
    const codeSpin = document.getElementById('spin-res-code');
    if(codeSpin) codeSpin.classList.remove('hidden');
    fetch(`api/competencies.php?action=get_by_code&code=${encodeURIComponent(code)}`)
        .then(r => r.json())
        .then(data => {
            if(codeSpin) codeSpin.classList.add('hidden');
            if(!data.success) return;
            if(data.multiple) {
                showCodePickerModal(data.data, (chosen) => applyCompetencyToForm(chosen));
            } else {
                applyCompetencyToForm(data.data);
            }
        });
});

function applyCompetencyToForm(c) {
    isAutoFilling = true;
    setTSValue('res-curriculum',    c.curriculum);
    setTSValue('res-school-level',  c.school_level);
    setTSValue('res-key-stage',     c.key_stage);
    setTSValue('res-learning-area', c.subject);
    setTSValue('res-grade',         c.grade_level);
    setTSValue('res-quarter',       c.quarter);
    setTSValue('res-term',          c.term);
    setTSValue('res-week',          c.week);
    document.getElementById('res-comp').value         = c.melc || '';
    document.getElementById('res-content-std').value  = c.content_std || '';
    document.getElementById('res-perf-std').value     = c.performance_std || '';
    document.getElementById('res-code').value         = c.code || '';

    const url = `api/competencies.php?action=unique_values&subject=${encodeURIComponent(c.subject||'')}&grade=${encodeURIComponent(c.grade_level||'')}&quarter=${encodeURIComponent(c.quarter||'')}&term=${encodeURIComponent(c.term||'')}&week=${encodeURIComponent(c.week||'')}&school_level=${encodeURIComponent(c.school_level||'')}&curriculum=${encodeURIComponent(c.curriculum||'')}&key_stage=${encodeURIComponent(c.key_stage||'')}`;
    fetch(url).then(r => r.json()).then(data => {
        if(data.success && data.data.competencies) {
            currentAvailableCompetencies = data.data.competencies;
            refreshCompDropdowns();
            const found = currentAvailableCompetencies.find(x => x.code === c.code);
            if(found) {
                const firstSelect = document.querySelector('.res-comp-select');
                if(firstSelect && firstSelect.tomselect) {
                    populateIndividualCompDropdown(firstSelect);
                    firstSelect.tomselect.setValue(found.id.toString(), true);
                    updateStandardsFromAll();
                }
            }
        }
        isAutoFilling = false;
    }).catch(() => { isAutoFilling = false; });
}

// ===== Duplicate Code Picker Modal =====
function showCodePickerModal(rows, onChoose) {
    const existing = document.getElementById('code-picker-modal');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'code-picker-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#1e1e1e;border:1px solid #444;border-radius:12px;padding:24px;max-width:620px;width:92%;max-height:80vh;overflow-y:auto;';

    let html = `<h3 style="color:#fff;margin:0 0 6px;"><i class="fas fa-clone" style="color:#e50914;margin-right:8px;"></i>Multiple Matches Found</h3>
                <p style="color:#aaa;margin:0 0 16px;font-size:0.9rem;">This code exists in multiple entries. Please select the correct one:</p>`;
    rows.forEach((r, i) => {
        html += `<div data-pick-idx="${i}" style="cursor:pointer;border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:10px;transition:border-color 0.2s,background 0.2s;">
            <div style="color:#fff;font-weight:bold;margin-bottom:4px;line-height:1.4;">${r.melc || 'N/A'}</div>
            <div style="color:#aaa;font-size:0.82rem;">📚 ${r.curriculum||'-'} &nbsp;|&nbsp; Key Stage: ${r.key_stage||'-'} &nbsp;|&nbsp; 🏫 ${r.school_level||'-'} &nbsp;|&nbsp; 📗 Grade ${r.grade_level||'-'} &nbsp;|&nbsp; ${r.subject||'-'}</div>
            <div style="color:#aaa;font-size:0.82rem;margin-top:2px;">📅 Q${r.quarter||'-'} T${r.term||'-'} Week ${r.week||'-'} &nbsp;|&nbsp; Code: <strong style="color:#e50914;">${r.code||'-'}</strong></div>
        </div>`;
    });
    html += `<button id="code-picker-cancel" style="margin-top:6px;background:#2a2a2a;border:1px solid #444;color:#aaa;padding:8px 20px;border-radius:6px;cursor:pointer;">Cancel</button>`;
    box.innerHTML = html;

    box.querySelectorAll('[data-pick-idx]').forEach(el => {
        el.addEventListener('mouseover', () => { el.style.borderColor = '#e50914'; el.style.background = 'rgba(229,9,20,0.05)'; });
        el.addEventListener('mouseout',  () => { el.style.borderColor = '#333'; el.style.background = ''; });
        el.addEventListener('click', () => { overlay.remove(); onChoose(rows[parseInt(el.dataset.pickIdx)]); });
    });
    box.querySelector('#code-picker-cancel').addEventListener('click', () => overlay.remove());

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// ===== MELC change listener =====
document.addEventListener('change', (e) => {
    if(e.target.classList.contains('res-comp-select')) { refreshCompDropdowns(); updateStandardsFromAll(); }
});

// ===== Initial School Level load on page ready =====
fetch('api/competencies.php?action=unique_values')
    .then(r => r.json())
    .then(data => {
        if(!data.success || !data.data) return;
        const el = document.getElementById('res-school-level'); if(!el) return;
        const current = el.tomselect ? el.tomselect.getValue() : el.value;
        let html = '<option value="">Select School Level...</option>';
        data.data.school_levels.forEach(s => { if(s) html += `<option value="${s}">${s}</option>`; });
        updateTomSelect('res-school-level', html, current);
    });

// ===== CSV Import =====
window.importCompCSV = (input) => {
    if (!input.files || !input.files[0]) return;
    const fd = new FormData(); fd.append('file', input.files[0]);
    fetch('api/competencies.php?action=import', { method: 'POST', body: fd }).then(r => r.json()).then(data => { if(data.success) { loadCompetencies(); setTimeout(() => location.reload(), 2000); } });
};

// ============================================================
// Manage Competencies Tab - Filters (FINAL FIX)
// ============================================================
if(!window.compState) window.compState = { page: 1, limit: 15, search: '', grade: '', subject: '', quarter: '', term: '', week: '', curriculum: '', school_level: '', key_stage: '' };

const filterElementsMap = {
    'comp-filter-curriculum':   'curriculum',
    'comp-filter-school-level': 'school_level',
    'comp-filter-key-stage':    'key_stage',
    'comp-filter-grade':        'grade',
    'comp-filter-subject':      'subject',
    'comp-filter-quarter':      'quarter',
    'comp-filter-term':         'term',
    'comp-filter-week':         'week'
};

Object.entries(filterElementsMap).forEach(([id, stateKey]) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', () => {
        window.compState[stateKey] = el.value;
        window.compState.page = 1;
        loadCompetencies();
        updateCompFilterDropdowns();
    });
});

window.updateCompFilterDropdowns = () => {
    const s = window.compState;
    const url = `api/competencies.php?action=unique_values&grade=${encodeURIComponent(s.grade)}&subject=${encodeURIComponent(s.subject)}&quarter=${encodeURIComponent(s.quarter)}&term=${encodeURIComponent(s.term)}&week=${encodeURIComponent(s.week)}&curriculum=${encodeURIComponent(s.curriculum)}&school_level=${encodeURIComponent(s.school_level)}&key_stage=${encodeURIComponent(s.key_stage)}`;
    fetch(url).then(r => r.json()).then(data => {
        if(!data.success || !data.data) return;
        const setOpts = (id, options, defaultLabel) => {
            const el = document.getElementById(id); if(!el) return;
            const prev = el.value;
            let html = `<option value="">${defaultLabel}</option>`;
            options.filter(Boolean).forEach(o => { html += `<option value="${o}">${o}</option>`; });
            el.innerHTML = html;
            el.value = prev;
        };
        setOpts('comp-filter-curriculum',   data.data.curriculums,   'All Curriculums');
        setOpts('comp-filter-school-level', data.data.school_levels, 'All School Levels');
        setOpts('comp-filter-key-stage',    data.data.key_stages,    'All Key Stages');
        setOpts('comp-filter-grade',        data.data.grades,        'All Grades');
        setOpts('comp-filter-subject',      data.data.subjects,      'All Subjects');
        setOpts('comp-filter-quarter',      data.data.quarters,      'All Quarters');
        setOpts('comp-filter-term',         data.data.terms,         'All Terms');
        setOpts('comp-filter-week',         data.data.weeks,         'All Weeks');
    });
};

// Populate filters on load
updateCompFilterDropdowns();

window.confirmClearAllCompetencies = () => {
    showAppModal({
        title: 'Clear All Competencies',
        text: 'Are you sure you want to delete all learning competencies? This action cannot be undone.',
        type: 'danger',
        confirmText: 'Clear All'
    }).then(confirmed => {
        if(confirmed) {
            const pin = prompt("Please enter the administrator PIN to clear all data:");
            if (pin !== "137946") {
                if (pin !== null) alert("Incorrect PIN. Access denied.");
                return;
            }
            fetch('api/competencies.php?action=truncate', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if(data.success) {
                        loadCompetencies();
                    }
                });
        }
    });
};

window.confirmImportCSV = () => {
    const pin = prompt("Please enter the administrator PIN to import data:");
    if (pin !== "137946") {
        if (pin !== null) alert("Incorrect PIN. Access denied.");
        return;
    }
    document.getElementById('comp-csv-upload').click();
};

// ============================================================
// Manage Resources - Filter Dropdowns
// ============================================================
function updateResourceFilters() {
    fetch('api/resources.php?action=unique_values')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                const setDrop = (id, options, defaultText) => {
                    const el = document.getElementById(id); if (!el) return;
                    const prev = el.value;
                    let html = `<option value="">${defaultText}</option>`;
                    options.filter(Boolean).sort().forEach(opt => { html += `<option value="${opt}">${opt}</option>`; });
                    el.innerHTML = html;
                    el.value = prev;
                };
                setDrop('res-filter-category',   data.data.categories,    'All Categories');
                setDrop('res-filter-type',       data.data.resource_types, 'All LR Types');
                setDrop('res-filter-curriculum',  data.data.curriculums,   'All Curriculums');
                setDrop('res-filter-level',       data.data.school_levels, 'All School Levels');
                setDrop('res-filter-grade',       data.data.grades,        'All Grade Levels');
                setDrop('res-filter-subject',     data.data.subjects,      'All Subjects');
            }
        });
}
updateResourceFilters();

// ============================================================
// Batch Delete Functionality for Resources
// ============================================================
window.toggleSelectAllResources = (el) => {
    const isChecked = el.checked;
    document.querySelectorAll('.res-batch-checkbox').forEach(chk => {
        chk.checked = isChecked;
    });
    window.toggleResourceBatchCheckbox();
};

window.toggleResourceBatchCheckbox = () => {
    const checkedCount = document.querySelectorAll('.res-batch-checkbox:checked').length;
    const btn = document.getElementById('resources-batch-delete-btn');
    if (btn) {
        if (checkedCount > 0) {
            btn.classList.remove('hidden');
            btn.innerHTML = `<i class="fas fa-trash-alt"></i> Delete Selected (${checkedCount})`;
        } else {
            btn.classList.add('hidden');
        }
    }
    
    const selectAllChk = document.getElementById('res-select-all');
    if (selectAllChk) {
        const totalCount = document.querySelectorAll('.res-batch-checkbox').length;
        selectAllChk.checked = (totalCount > 0 && checkedCount === totalCount);
    }
};

window.confirmBatchDeleteResources = async () => {
    const checked = document.querySelectorAll('.res-batch-checkbox:checked');
    if (checked.length === 0) return;
    const ids = Array.from(checked).map(chk => chk.value);
    
    const confirmed = await showAppModal({ 
        title: 'Batch Delete Resources', 
        text: `Are you sure you want to permanently delete these ${ids.length} resources? This cannot be undone.`, 
        type: 'danger', 
        confirmText: 'Delete All' 
    });
    
    if (confirmed) {
        fetch('api/resources.php?action=batch_delete', { 
            method: 'POST', 
            body: JSON.stringify({ ids }), 
            headers: {'Content-Type': 'application/json'} 
        }).then(res => res.json()).then(data => {
            if(data.success) {
                loadResources();
            } else {
                showAppModal({ title: 'Error', text: data.message || 'Failed to delete resources', type: 'danger', confirmText: 'Okay' });
            }
        });
    }
};

});

