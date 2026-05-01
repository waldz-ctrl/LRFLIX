document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let isRegistering = false;
    let currentResource = null;

    // ── Package Download State ─────────────
    window.pkgSelectMode = false;
    window.selectedLRIds = new Set();
    window.currentDisplayedItems = [];

    fetch('api/analytics.php?action=track_visit', {
        method: 'POST'
    }).catch(() => {});

    // Elements
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const authForm = document.getElementById('auth-form');
    const toggleAuth = document.getElementById('toggle-auth');
    const authTitle = document.getElementById('auth-title');
    const authMsg = document.getElementById('auth-message');
    const adminBtn = document.getElementById('admin-btn');
    const resourceRow = document.getElementById('main-resources-row');
    const relatedRow = document.getElementById('related-resources-row');

    // Modal Elements
    const modal = document.getElementById('resource-modal');
    const closeModal = document.getElementById('close-modal');

    // Navbar Scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Registration Success Modal
    const regSuccessModal = document.getElementById('reg-success-modal');
    document.getElementById('close-reg-success').addEventListener('click', () => {
        regSuccessModal.classList.add('hidden');
        regSuccessModal.classList.remove('active');
        isRegistering = false;
        updateAuthUI();
    });

    // Forgot Password Flow
    window.openForgotPassword = () => {
        document.getElementById('forgot-password-modal').classList.remove('hidden');
        document.getElementById('forgot-password-modal').classList.add('active');
        document.getElementById('fp-step-1').classList.remove('hidden');
        document.getElementById('fp-step-2').classList.add('hidden');
        document.getElementById('fp-username').value = '';
        document.getElementById('fp-message').innerText = '';
    };

    window.closeForgotPassword = () => {
        document.getElementById('forgot-password-modal').classList.add('hidden');
        document.getElementById('forgot-password-modal').classList.remove('active');
    };

    window.verifyUsername = () => {
        const username = document.getElementById('fp-username').value.trim();
        if(!username) return;
        fetch('api/auth.php?action=get_secret_question', {
            method: 'POST',
            body: JSON.stringify({username}),
            headers: {'Content-Type': 'application/json'}
        }).then(res=>res.json()).then(data => {
            if(data.success) {
                document.getElementById('fp-question').innerText = data.question;
                document.getElementById('fp-step-1').classList.add('hidden');
                document.getElementById('fp-step-2').classList.remove('hidden');
                document.getElementById('fp-answer').value = '';
                document.getElementById('fp-new-password').value = '';
                document.getElementById('fp-message').innerText = '';
                document.getElementById('forgot-password-modal').dataset.username = username;
            } else {
                document.getElementById('fp-message').innerText = data.message;
            }
        });
    };

    window.resetPassword = () => {
        const username = document.getElementById('forgot-password-modal').dataset.username;
        const answer = document.getElementById('fp-answer').value.trim();
        const newPassword = document.getElementById('fp-new-password').value;
        if(!answer || !newPassword) {
            document.getElementById('fp-message').innerText = 'Please provide an answer and a new password.';
            return;
        }
        fetch('api/auth.php?action=reset_password', {
            method: 'POST',
            body: JSON.stringify({username, answer, new_password: newPassword}),
            headers: {'Content-Type': 'application/json'}
        }).then(res=>res.json()).then(data => {
            if(data.success) {
                alert('Password reset successful! You may now login.');
                closeForgotPassword();
            } else {
                document.getElementById('fp-message').innerText = data.message;
            }
        });
    };

    // Check Auth
    fetch('api/auth.php?action=check')
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                currentUser = data.user;
                showApp();
            } else {

                showAuth();
            }
        });

    // Auth Form Submit
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const action = isRegistering ? 'register' : 'login';

        if (isRegistering) {
            const repeatPassword = document.getElementById('repeat_password').value;
            if (password !== repeatPassword) {
                authMsg.innerText = "Passwords do not match.";
                authMsg.style.color = "var(--accent-color)";
                return;
            }
            const role = document.getElementById('user_role').value;
            if (!role) {
                authMsg.innerText = "Please select a role to continue.";
                authMsg.style.color = "var(--accent-color)";
                return;
            }
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        if (isRegistering) {
            const role = document.getElementById('user_role').value;
            if (!role) {
                authMsg.innerText = "Please select a role to continue.";
                authMsg.style.color = "var(--accent-color)";
                return;
            }

            const getChecked = (id) => Array.from(document.querySelectorAll(`#${id} input:checked`)).map(c => c.value);
            const val = (id) => document.getElementById(id).value.trim();

            if (!val('secret_question') || !val('secret_answer')) {
                authMsg.innerText = "Please provide a secret question and answer for account recovery.";
                authMsg.style.color = "var(--accent-color)";
                return;
            }
            formData.append('secret_question', val('secret_question'));
            formData.append('secret_answer', val('secret_answer'));

            if (role === 'teacher') {
                const subjects = getChecked('subjects_taught');
                const grades = getChecked('grade_level');
                const isTeachingStaff = !document.getElementById('teaching-assignment-section').classList.contains('hidden');

                // Manual Validation
                if (!val('first_name') || !val('last_name') || !val('position') || !val('school') || !val('deped_email') || !val('age_range') || !val('years_in_service')) {
                    authMsg.innerText = "Please fill in all mandatory teacher fields (*).";
                    authMsg.style.color = "var(--accent-color)";
                    return;
                }

                if (isTeachingStaff) {
                    if (subjects.length === 0 || grades.length === 0) {
                        authMsg.innerText = "Please select at least one subject and grade level taught.";
                        authMsg.style.color = "var(--accent-color)";
                        return;
                    }
                }

                formData.append('user_role_type', 'teacher');
                formData.append('first_name', val('first_name'));
                formData.append('middle_name', val('middle_name'));
                formData.append('last_name', val('last_name'));
                formData.append('position', val('position'));
                formData.append('school', val('school'));
                formData.append('major', val('major'));
                formData.append('years_in_service', val('years_in_service'));
                formData.append('age_range', val('age_range'));
                formData.append('subjects_taught', isTeachingStaff ? subjects.join(', ') : '');
                formData.append('grade_level', isTeachingStaff ? grades.join(', ') : '');
                formData.append('deped_email', val('deped_email') + '@deped.gov.ph');
            } else if (role === 'student') {

                // Manual Validation
                if (!val('s_first_name') || !val('s_last_name') || !val('s_grade_level') || !val('s_school') || !val('s_age_range')) {
                    authMsg.innerText = "Please fill in all mandatory student fields (*).";
                    authMsg.style.color = "var(--accent-color)";
                    return;
                }

                formData.append('user_role_type', 'student');
                formData.append('first_name', val('s_first_name'));
                formData.append('middle_name', val('s_middle_name'));
                formData.append('last_name', val('s_last_name'));
                formData.append('grade_level', val('s_grade_level'));
                formData.append('school', val('s_school'));
                formData.append('age_range', val('s_age_range'));
                formData.append('email', val('s_email'));
                formData.append('position', 'Student');
            }
        }


        fetch(`api/auth.php?action=${action}`, {
            method: 'POST',
            body: formData
        })
            .then(res => res.text()) // Get text first to debug potential PHP errors
            .then(text => {
                try {
                    const data = JSON.parse(text.trim());
                    if (data.success) {

                        if (isRegistering) {
                            authForm.reset();
                            // Reset view back to login internally but show the success modal
                            isRegistering = false;
                            updateAuthUI();
                            regSuccessModal.classList.remove('hidden');
                            regSuccessModal.classList.add('active');
                        } else {
                            // Login successful
                            currentUser = data.user;
                            showApp();
                        }

                    } else {
                        authMsg.innerText = data.message;
                        authMsg.style.color = "var(--accent-color)";
                    }
                } catch (e) {
                    console.error("JSON Parse Error. Raw response:", text);
                    authMsg.innerText = "Server response error. Please try again.";
                }
            }).catch(err => {
                console.error("Fetch Error:", err);
                authMsg.innerText = "Network error. Please check your connection.";
            });
    });

    const checkBtnState = () => {
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        const btn = document.getElementById('auth-submit-btn');
        let duplicateErrorActive = document.getElementById('username-error').style.display === 'block';

        if(isRegistering) {
            btn.disabled = (!u || !p || duplicateErrorActive);
        } else {
            btn.disabled = (!u || !p);
        }
    };

    let debounceTimer;
    function debounceCheckDuplicate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const u = document.getElementById('username').value.trim();
            if(!u) return;
            fetch('api/auth.php?action=check_username', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: u})
            }).then(r=>r.json()).then(data => {
                const errSpan = document.getElementById('username-error');
                if(data.exists) {
                    errSpan.innerText = 'Username already exists';
                    errSpan.style.display = 'block';
                } else {
                    errSpan.style.display = 'none';
                }
                checkBtnState();
            });
        }, 800);
    }

    document.getElementById('username').addEventListener('input', () => {
        if (isRegistering) {
            debounceCheckDuplicate();
        } else {
            document.getElementById('username-error').style.display = 'none';
        }
        checkBtnState();
    });

    // Toggle Teaching Assignment Section based on Position
    const positionSelect = document.getElementById('position');
    if (positionSelect) {
        positionSelect.addEventListener('change', function() {
            const teachingSec = document.getElementById('teaching-assignment-section');
            if (!teachingSec) return;
            
            const selectedOpt = this.options[this.selectedIndex];
            const group = selectedOpt.parentElement;
            
            // Show only if the selected position is under the "Teaching Staff" group
            if (group && group.label === "Teaching Staff") {
                teachingSec.classList.remove('hidden');
            } else {
                teachingSec.classList.add('hidden');
            }
        });
    }

    document.getElementById('password').addEventListener('input', checkBtnState);


    // Toggle Registration / Login
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        updateAuthUI();
    });

    function updateAuthUI() {
        authMsg.innerText = '';
        const isReg = isRegistering;
        authTitle.innerText = isReg ? 'Sign Up' : 'Sign In';
        toggleAuth.innerText = isReg ? 'Sign in now.' : 'Sign up now.';
        document.getElementById('auth-submit-btn').innerText = isReg ? 'Sign Up' : "Let's Learn";
        document.getElementById('username-hint').classList.toggle('hidden', !isReg);
        document.getElementById('username-error').style.display = 'none';
        checkBtnState();

        // Show/hide role selector and repeat password
        document.getElementById('role-selector-group').classList.toggle('hidden', !isReg);
        document.getElementById('repeat-password-group').classList.toggle('hidden', !isReg);
        document.getElementById('secret-question-group').classList.toggle('hidden', !isReg);
        document.getElementById('secret-answer-group').classList.toggle('hidden', !isReg);
        document.getElementById('forgot-password-container').classList.toggle('hidden', isReg);

        const teacherFields = document.getElementById('teacher-fields');
        const studentFields = document.getElementById('student-fields');

        teacherFields.classList.add('hidden');
        studentFields.classList.add('hidden');

        const repeatPass = document.getElementById('repeat_password');
        if (repeatPass) {
            if (isReg) repeatPass.setAttribute('required', '');
            else repeatPass.removeAttribute('required');
        }

        // Show tooltip on username only during registration
        const usernameTooltip = document.getElementById('username-tooltip');
        if (usernameTooltip) {
            usernameTooltip.style.display = isReg ? '' : 'none';
        }

        if (!isReg) {
            // Reset role selector
            document.getElementById('user_role').value = '';
        } else {
            // If registering, show the currently selected role's fields
            const role = document.getElementById('user_role').value;
            if (role === 'teacher') {
                teacherFields.classList.remove('hidden');
            } else if (role === 'student') {
                studentFields.classList.remove('hidden');
            }
        }

        document.getElementById('auth-toggle-text').innerHTML = isReg
            ? `Already have an account? <a href="#" id="toggle-auth-inner">Sign in now.</a>`
            : `New to LRFlix? <a href="#" id="toggle-auth-inner">Sign up now.</a>`;
        document.getElementById('toggle-auth-inner').addEventListener('click', (e) => {
            e.preventDefault();
            isRegistering = !isRegistering;
            updateAuthUI();
        });
    }

    // Role selector handler
    document.getElementById('user_role').addEventListener('change', (e) => {
        const role = e.target.value;
        document.getElementById('teacher-fields').classList.toggle('hidden', role !== 'teacher');
        document.getElementById('student-fields').classList.toggle('hidden', role !== 'student');
    });

    // Teacher Position handler for conditional sections
    document.getElementById('position').addEventListener('change', (e) => {
        const pos = e.target.value;
        const assignmentSection = document.getElementById('teaching-assignment-section');

        // Define Teaching Staff list based on index.html optgroup
        const teachingPositions = [
            'Teacher I', 'Teacher II', 'Teacher III', 'Teacher IV', 'Teacher V', 'Teacher VI', 'Teacher VII',
            'Master Teacher I', 'Master Teacher II', 'Master Teacher III', 'Master Teacher IV'
        ];

        if (teachingPositions.includes(pos)) {
            assignmentSection.classList.remove('hidden');
        } else {
            assignmentSection.classList.add('hidden');
        }
    });





    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        fetch('api/auth.php?action=logout').then(() => window.location.reload());
    });

    function showAuth() {
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
    }

    function showApp() {
        authView.classList.add('hidden');
        appView.classList.remove('hidden');

        // Dynamic Profile Circle (Red background, white text)
        const profileCircle = document.getElementById('nav-profile-circle');
        if (profileCircle) {
            profileCircle.innerText = (currentUser.first_name || currentUser.username).charAt(0).toUpperCase();
            profileCircle.style.display = 'flex';
            profileCircle.onclick = showProfile;
            profileCircle.dataset.title = "Profile: " + (currentUser.first_name || currentUser.username);
        }

        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
        }
        loadResources();


        // Setup Search
        const searchInput = document.getElementById('main-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                if (term.length > 0) {
                    filterSearch(term);
                } else {
                    document.getElementById('hero-section').style.display = '';
                    document.getElementById('dynamic-categories-container').style.display = '';
                    const fullView = document.getElementById('category-full-view');
                    if (fullView) fullView.classList.add('hidden');
                }
            });
            
            // Focus input when clicking search icon
            const searchIcon = document.querySelector('.search-icon');
            if (searchIcon) {
                searchIcon.addEventListener('click', () => searchInput.focus());
            }
        }

        // Profile toggle
        const profBtn = document.getElementById('profile-btn');
        if (profBtn) {
            profBtn.addEventListener('click', showProfile);
        }
        const welcomeUser = document.getElementById('welcome-user');
        if (welcomeUser) {
            welcomeUser.addEventListener('click', showProfile);
        }
    }

    function filterSearch(term) {
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('dynamic-categories-container').style.display = 'none';
        // Hide pkg toolbar during global search
        const pkgToolbar = document.getElementById('pkg-download-toolbar');
        if (pkgToolbar) pkgToolbar.style.display = 'none';

        const fullView = document.getElementById('category-full-view');
        fullView.classList.remove('hidden');
        fullView.style.paddingTop = '100px';
        document.getElementById('category-full-title').innerText = `Search results for: "${term}"`;

        // Hide category filters during search
        const catFilters = document.getElementById('category-filters');
        if (catFilters) catFilters.style.display = 'none';

        const grid = document.getElementById('category-full-grid');
        grid.innerHTML = '';
        grid.className = 'search-results-grid'; // Apply the new grid class

        const filtered = globalResources.filter(r =>
            (r.title && r.title.toLowerCase().includes(term)) ||
            (r.authors && r.authors.toLowerCase().includes(term))
        );

        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; padding: 20px;">No matches found for your search.</p>';
            return;
        }

        // Use the optimized renderCategoryGrid logic for search results too
        renderCategoryGrid(filtered);
    }

    // (Removed redundant renderGridItems as it's merged into renderCategoryGrid)

    // Profile Logic
    function showProfile() {
        if (!currentUser) return;

        // Hide Hero and category sections
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('dynamic-categories-container').style.display = 'none';
        document.getElementById('category-full-view').classList.add('hidden');

        // Hide categories menu AND search while in profile
        const catMenu = document.querySelector('.cat-menu');
        if (catMenu) catMenu.style.setProperty('display', 'none', 'important');
        const searchBox = document.querySelector('.search-container');
        if (searchBox) searchBox.style.setProperty('display', 'none', 'important');

        // Hide Feedback Tab for Admins
        const feedbackTabBtn = Array.from(document.querySelectorAll('.prof-tab')).find(b => b.innerText.toLowerCase().includes('feedback'));
        if (feedbackTabBtn) feedbackTabBtn.classList.toggle('hidden', currentUser.role === 'admin');

        const profSection = document.getElementById('profile-section');
        profSection.classList.remove('hidden');

        // Populate profile card
        const firstName = currentUser.first_name || currentUser.username;
        const initial = firstName.charAt(0).toUpperCase();
        document.getElementById('profile-initials').innerText = initial;
        document.getElementById('profile-fullname').innerText = firstName + (currentUser.last_name ? ' ' + currentUser.last_name : '');
        document.getElementById('profile-school').innerText = currentUser.school || 'Unspecified';
        document.getElementById('profile-position').innerText = currentUser.position || (currentUser.role === 'admin' ? 'Administrator' : 'User Member');

        switchProfileTab('liked');
    }

    window.closeProfile = function () {
        document.getElementById('profile-section').classList.add('hidden');
        document.getElementById('hero-section').style.display = 'block';
        document.getElementById('dynamic-categories-container').style.display = 'block';

        // Restore search and categories
        const catMenu = document.querySelector('.cat-menu');
        if (catMenu) catMenu.style.display = 'flex';
        const searchBox = document.querySelector('.search-container');
        if (searchBox) searchBox.style.display = 'block';
    };

    window.switchProfileTab = function (type) {
        // Highlighting logic: Red (primary) for active, Gray (secondary) for idle
        const tabs = document.querySelectorAll('.prof-tab');
        tabs.forEach(t => {
            const text = t.innerText.toLowerCase();
            const isMatch = (type === 'liked' && text.includes('liked')) ||
                (type === 'downloaded' && text.includes('downloaded')) ||
                (type === 'feedback' && text.includes('feedback'));
            if (isMatch) {
                t.classList.remove('btn-secondary');
                t.classList.add('btn-primary');
            } else {
                t.classList.remove('btn-primary');
                t.classList.add('btn-secondary');
            }
        });

        const content = document.getElementById('profile-tab-content');
        content.innerHTML = '<p style="color:#aaa;">Loading content...</p>';

        if (type === 'feedback') {
            renderFeedbackSection(content);
            return;
        }

        fetch(`api/resources.php?action=user_history&type=${type}`)
            .then(res => res.json())
            .then(data => {
                content.innerHTML = '';
                if (data.success && data.resources.length > 0) {
                    renderSmallGridItems(data.resources, content);
                } else {
                    const word = type === 'liked' ? 'liked' : 'downloaded';
                    content.innerHTML = `<p style="color:#aaa; padding: 20px;">You haven't ${word} any resources yet.</p>`;
                }
            }).catch(e => {
                console.error("History fetch error:", e);
                content.innerHTML = '<p style="color:#e50914; padding: 20px;">Failed to load history content.</p>';
            });
    };

    function renderFeedbackSection(container) {
        container.style.display = 'block'; // Ensure a single column for feedback form
        container.innerHTML = `
            <div style="background:#1a1a1a; padding:1.5rem; border-radius:10px; border:1px solid #333; max-width:600px;">
                <h3 style="margin-bottom:1rem; font-size:1.1rem; color:#fff;">Share your Ideas & Suggestions</h3>
                <p style="font-size:0.85rem; color:#aaa; margin-bottom:1.5rem;">Help us improve LRFLIX! Tell us what features you'd like to see or report any issues you've encountered.</p>
                <textarea id="feedback-text" placeholder="Write your suggestion here..." style="width:100%; height:120px; background:#222; border:1px solid #333; color:white; padding:12px; border-radius:6px; resize:none; margin-bottom:15px; font-family:inherit;"></textarea>
                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="submitFeedback()"><i class="fas fa-paper-plane"></i> Submit Feedback</button>
                </div>
                <p id="feedback-msg" style="margin-top:10px; font-size:0.85rem;"></p>
            </div>
        `;
    }

    window.submitFeedback = function () {
        const text = document.getElementById('feedback-text').value.trim();
        const msg = document.getElementById('feedback-msg');
        if (!text) return;

        fetch('api/resources.php?action=feedback', {
            method: 'POST',
            body: JSON.stringify({ suggestion: text }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(r => {
                if (!r.ok) throw new Error("Server error " + r.status);
                return r.json();
            })
            .then(data => {
                if (data.success) {
                    document.getElementById('feedback-success-modal').classList.remove('hidden');
                    document.getElementById('feedback-text').value = '';
                } else {
                    alert("Submission failed: " + data.message);
                }
            }).catch(err => {
                alert("Error sending feedback. Please check your connection.");
                console.error(err);
            });
    }


    window.openEditProfileModal = function () {
        console.log("Opening edit profile modal...");
        if (!currentUser) {
            alert("Session wait: No user data found yet. Try again in a second.");
            console.error("No current user found!");
            return;
        }
        const u = currentUser;

        try {
            // Populate unified fields
            document.getElementById('edit_first_name').value = u.first_name || '';
            document.getElementById('edit_middle_name').value = u.middle_name || '';
            document.getElementById('edit_last_name').value = u.last_name || '';
            document.getElementById('edit_position').value = u.position || '';
            document.getElementById('edit_age_range').value = u.age_range || '18-24';

            const teachingPositions = [
                'Teacher I', 'Teacher II', 'Teacher III', 'Teacher IV', 'Teacher V', 'Teacher VI', 'Teacher VII',
                'Master Teacher I', 'Master Teacher II', 'Master Teacher III', 'Master Teacher IV'
            ];

            const toggleTeachingSection = (pos) => {
                const section = document.getElementById('edit-teaching-section');
                if (section) {
                    if (teachingPositions.includes(pos)) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                }
            };

            toggleTeachingSection(u.position);

            // Add dynamic listener for position changes in the modal
            document.getElementById('edit_position').onchange = (e) => toggleTeachingSection(e.target.value);
            document.getElementById('edit_position').oninput = (e) => toggleTeachingSection(e.target.value);
            
            // Hide Subjects Taught specifically for Student role if the section is somehow visible
            const subjContainer = document.getElementById('edit_subjects_taught_container');
            if(subjContainer) {
                if(u.role === 'Student / Learner') {
                    subjContainer.style.display = 'none';
                } else {
                    subjContainer.style.display = 'block';
                }
            }

            const setChecks = (id, str) => {
                const el = document.getElementById(id);
                if(!el) return;
                const list = str ? str.split(',').map(s => s.trim()) : [];
                el.querySelectorAll('input').forEach(cb => {
                    cb.checked = list.includes(cb.value);
                });
            };
            setChecks('edit_subjects_taught', u.subjects_taught);
            setChecks('edit_grade_level', u.grade_level);

            document.getElementById('edit_new_password').value = '';
            document.getElementById('edit_repeat_password').value = '';
            const matchMsg = document.getElementById('edit_password_match');
            if(matchMsg) matchMsg.innerText = '';
            
            const modal = document.getElementById('edit-profile-modal');
            modal.classList.remove('hidden');
            modal.classList.add('active');
        } catch(err) {
            console.error("Error populating edit modal:", err);
        }
    };

    // Real-time password mismatch check
    const checkPassMatch = () => {
        const p1 = document.getElementById('edit_new_password').value;
        const p2 = document.getElementById('edit_repeat_password').value;
        const msg = document.getElementById('edit_password_match');
        if (!p1 && !p2) { msg.innerText = ''; return; }
        if (p1 === p2) {
            msg.innerText = "Passwords match ✓";
            msg.style.color = "lightgreen";
        } else {
            msg.innerText = "Passwords do not match ✗";
            msg.style.color = "var(--accent-color)";
        }
    };
    document.getElementById('edit_new_password').addEventListener('input', checkPassMatch);
    document.getElementById('edit_repeat_password').addEventListener('input', checkPassMatch);

    document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newPass = document.getElementById('edit_new_password').value;
        const repeatPass = document.getElementById('edit_repeat_password').value;

        if (newPass && newPass !== repeatPass) {
            alert("Passwords do not match.");
            return;
        }

        const formData = new FormData();
        formData.append('first_name', document.getElementById('edit_first_name').value);
        formData.append('middle_name', document.getElementById('edit_middle_name').value);
        formData.append('last_name', document.getElementById('edit_last_name').value);
        formData.append('position', document.getElementById('edit_position').value);
        formData.append('age_range', document.getElementById('edit_age_range').value);

        const getChecked = (id) => Array.from(document.querySelectorAll(`#${id} input:checked`)).map(c => c.value).join(', ');
        formData.append('subjects_taught', getChecked('edit_subjects_taught'));
        formData.append('grade_level', getChecked('edit_grade_level'));

        if (newPass) formData.append('new_password', newPass);

        fetch('api/auth.php?action=update_profile', {
            method: 'POST',
            body: formData
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert('Profile updated successfully!');
                    window.location.reload();
                } else {
                    alert('Update failed: ' + data.message);
                }
            });
    });


    function renderSmallGridItems(items, grid) {
        items.forEach(res => {
            const card = document.createElement('div');
            card.style.cssText = 'width:150px; cursor:pointer; position:relative; border-radius:6px; overflow:hidden; background:#222; transition:transform 0.2s;';
            card.onclick = () => openModal(res);

            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'width:100%; height:200px; background:#222; display:block;';

            const title = document.createElement('div');
            title.style.cssText = 'padding:6px; font-size:0.7rem; color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center;';
            title.textContent = res.title;

            card.appendChild(canvas);
            card.appendChild(title);
            grid.appendChild(card);
            renderPdfThumbnail(res.file_path, canvas);
        });
    }



    let globalResources = [];

    function loadResources() {
        fetch('api/resources.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    globalResources = data.resources;

                    if (globalResources.length > 0) {
                        const featured = globalResources.slice(0, Math.min(5, globalResources.length));
                        let currentIdx = 0;
                        const heroContent = document.querySelector('.hero-content');

                        const updateDots = () => {
                            const dotsEl = document.getElementById('hero-dots');
                            if (!dotsEl) return;
                            dotsEl.querySelectorAll('.hero-dot').forEach((d, i) => {
                                d.style.background = i === currentIdx ? '#e50914' : 'rgba(255,255,255,0.35)';
                                d.style.width = i === currentIdx ? '22px' : '8px';
                            });
                        };

                        const updateHero = (animate = true) => {
                            const applyContent = () => {
                                const latest = featured[currentIdx];
                                document.getElementById('hero-title').innerText = latest.title || 'Untitled';
                                
                                let displayDesc = latest.description || 'No description provided.';
                                const meta = [];
                                if(latest.category) meta.push(latest.category);
                                if(latest.resource_type) meta.push(latest.resource_type);
                                if(latest.grade_level) meta.push(`Grade: ${latest.grade_level}`);
                                if(latest.learning_area) meta.push(latest.learning_area);
                                
                                const metaText = meta.length > 0 ? meta.join(' • ') + "\n" : "";
                                document.getElementById('hero-desc').innerText = metaText + displayDesc;
                                
                                const heroViewBtn = document.getElementById('hero-view-btn');
                                const newHeroBtn = heroViewBtn.cloneNode(true);
                                heroViewBtn.parentNode.replaceChild(newHeroBtn, heroViewBtn);
                                newHeroBtn.addEventListener('click', () => openModal(latest));
                                updateDots();
                                if (animate) {
                                    heroContent.style.opacity = '1';
                                    heroContent.style.transition = 'opacity 0.4s ease';
                                }
                            };
                            
                            if (animate) {
                                heroContent.style.transition = 'opacity 0.3s ease';
                                heroContent.style.opacity = '0';
                                setTimeout(applyContent, 300);
                            } else {
                                applyContent();
                            }
                        };
                        
                        updateHero(false);

                        // Carousel controls
                        if (!document.getElementById('hero-carousel-controls') && featured.length > 1) {
                            const controls = document.createElement('div');
                            controls.id = 'hero-carousel-controls';
                            controls.style.cssText = 'display:flex; gap:12px; margin-top:22px; align-items:center;';
                            
                            const prevBtn = document.createElement('button');
                            prevBtn.id = 'hero-prev';
                            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                            prevBtn.style.cssText = 'background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; width:38px; height:38px; border-radius:50%; cursor:pointer; transition:background 0.3s; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
                            
                            const dotsContainer = document.createElement('div');
                            dotsContainer.id = 'hero-dots';
                            dotsContainer.style.cssText = 'display:flex; gap:6px; align-items:center;';
                            featured.forEach((_, i) => {
                                const dot = document.createElement('span');
                                dot.className = 'hero-dot';
                                dot.style.cssText = `display:inline-block; height:8px; border-radius:4px; cursor:pointer; transition:width 0.3s ease, background 0.3s ease; background:${i===0?'#e50914':'rgba(255,255,255,0.35)'}; width:${i===0?'22px':'8px'};`;
                                dot.addEventListener('click', () => {
                                    currentIdx = i;
                                    updateHero();
                                    resetTimer();
                                });
                                dotsContainer.appendChild(dot);
                            });

                            const nextBtn = document.createElement('button');
                            nextBtn.id = 'hero-next';
                            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                            nextBtn.style.cssText = 'background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; width:38px; height:38px; border-radius:50%; cursor:pointer; transition:background 0.3s; display:flex; align-items:center; justify-content:center; flex-shrink:0;';

                            controls.appendChild(prevBtn);
                            controls.appendChild(dotsContainer);
                            controls.appendChild(nextBtn);
                            heroContent.appendChild(controls);
                            
                            const resetTimer = () => {
                                clearInterval(window.heroTimer);
                                window.heroTimer = setInterval(() => {
                                    currentIdx = (currentIdx + 1) % featured.length;
                                    updateHero();
                                }, 6000);
                            };

                            prevBtn.addEventListener('mouseover', () => prevBtn.style.background = 'rgba(255,255,255,0.25)');
                            prevBtn.addEventListener('mouseout',  () => prevBtn.style.background = 'rgba(255,255,255,0.1)');
                            nextBtn.addEventListener('mouseover', () => nextBtn.style.background = 'rgba(255,255,255,0.25)');
                            nextBtn.addEventListener('mouseout',  () => nextBtn.style.background = 'rgba(255,255,255,0.1)');

                            prevBtn.addEventListener('click', () => {
                                currentIdx = (currentIdx - 1 + featured.length) % featured.length;
                                updateHero();
                                resetTimer();
                            });
                            nextBtn.addEventListener('click', () => {
                                currentIdx = (currentIdx + 1) % featured.length;
                                updateHero();
                                resetTimer();
                            });

                            resetTimer();
                        }
                    } else {
                        document.getElementById('hero-section').style.display = 'none';
                    }

                    renderCategories(globalResources);
                }
            });
    }

    window.closeCategoryView = () => {
        // Reset pkg select mode
        window.pkgSelectMode = false;
        window.selectedLRIds.clear();
        window.currentDisplayedItems = [];
        const pkgToolbar = document.getElementById('pkg-download-toolbar');
        if (pkgToolbar) pkgToolbar.style.display = 'none';
        const selBtn = document.getElementById('pkg-select-mode-btn');
        if (selBtn) { selBtn.className = 'btn btn-secondary'; selBtn.innerHTML = '<i class="fas fa-check-square"></i> Select Mode'; }
        const selBar = document.getElementById('pkg-selected-bar');
        if (selBar) selBar.style.display = 'none';

        document.getElementById('category-full-view').classList.add('hidden');
        document.getElementById('hero-section').style.display = 'block';
        document.getElementById('dynamic-categories-container').style.display = 'block';
        if(document.getElementById('category-search')) document.getElementById('category-search').value = '';

        // Restore filters and top search
        const catFilters = document.getElementById('category-filters');
        if (catFilters) catFilters.style.display = 'flex';
        const grid = document.getElementById('category-full-grid');
        if (grid) grid.className = '';

        const searchBox = document.querySelector('.search-container');
        if (searchBox) searchBox.style.setProperty('display', 'block', 'important');

        resetCategoryFilters();
    };

    window.resetCategoryFilters = () => {
        ['filter-lr-type', 'filter-school-level', 'filter-grade-level', 'filter-quarter', 'filter-term', 'filter-week', 'filter-learning-area'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.value = '';
                el.disabled = false;
            }
        });
        if(document.getElementById('category-search')) document.getElementById('category-search').value = '';
        if(window.currentCategoryItems) renderCategoryGrid(window.currentCategoryItems);
    };

    function populateCategoryFilters(items) {
        const getUnique = (prop) => [...new Set(items.map(r => r[prop]).filter(Boolean))].sort();
        
        const fill = (id, values, defaultLabel) => {
            const select = document.getElementById(id);
            if(!select) return;
            let html = `<option value="">${defaultLabel}</option>`;
            values.forEach(v => html += `<option value="${v}">${v}</option>`);
            select.innerHTML = html;
        };

        fill('filter-lr-type', getUnique('resource_type'), 'All LR Types');
        fill('filter-school-level', getUnique('school_level'), 'All Levels');
        fill('filter-grade-level', getUnique('grade_level'), 'All Grades');
        fill('filter-learning-area', getUnique('learning_area'), 'All Subject Areas');
        fill('filter-quarter', getUnique('quarter'), 'All Quarters');
        fill('filter-term', getUnique('term'), 'All Terms');
        fill('filter-week', getUnique('week'), 'All Weeks');
    }

    function applyCategoryFilters() {
        if(!window.currentCategoryItems) return;
        
        const termSearch = (document.getElementById('category-search')?.value || '').toLowerCase();
        const lrType = document.getElementById('filter-lr-type').value;
        const schoolLevel = document.getElementById('filter-school-level').value;
        const gradeLevel = document.getElementById('filter-grade-level').value;
        const learningArea = document.getElementById('filter-learning-area').value;
        const quarter = document.getElementById('filter-quarter').value;
        const termVal = document.getElementById('filter-term').value;
        const week = document.getElementById('filter-week').value;

        const filtered = window.currentCategoryItems.filter(r => {
            const matchSearch = !termSearch || 
                (r.title || '').toLowerCase().includes(termSearch) || 
                (r.description || '').toLowerCase().includes(termSearch) ||
                (r.authors || '').toLowerCase().includes(termSearch) ||
                (r.resource_type || '').toLowerCase().includes(termSearch);
            const matchType = !lrType || r.resource_type === lrType;
            const matchSchool = !schoolLevel || r.school_level === schoolLevel;
            const matchGrade = !gradeLevel || r.grade_level === gradeLevel;
            const matchQuarter = !quarter || String(r.quarter) === quarter;
            const matchTerm = !termVal || String(r.term) === termVal;
            const matchWeek = !week || String(r.week) === week;
            const matchArea = !learningArea || r.learning_area === learningArea;
            
            return matchSearch && matchType && matchSchool && matchGrade && matchQuarter && matchTerm && matchWeek && matchArea;
        });
        
        const btn = document.getElementById('pkg-download-all-btn');
        if (btn) {
            if (lrType && schoolLevel && gradeLevel && quarter && learningArea) {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
        
        renderCategoryGrid(filtered);
    }

    // Attach listeners
    ['category-search', 'filter-lr-type', 'filter-school-level', 'filter-grade-level', 'filter-learning-area', 'filter-quarter', 'filter-term', 'filter-week'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyCategoryFilters);
        if (id === 'category-search') document.getElementById(id).addEventListener('input', applyCategoryFilters);
    });

    // Mutual Exclusion for Quarter and Term
    const qFilter = document.getElementById('filter-quarter');
    const tFilter = document.getElementById('filter-term');
    if (qFilter && tFilter) {
        qFilter.addEventListener('change', () => {
            if (qFilter.value !== '') {
                tFilter.value = '';
                tFilter.disabled = true;
            } else {
                tFilter.disabled = false;
            }
        });
        tFilter.addEventListener('change', () => {
            if (tFilter.value !== '') {
                qFilter.value = '';
                qFilter.disabled = true;
            } else {
                qFilter.disabled = false;
            }
        });
    }

    window.filterCategory = function (cat) {
        // Reset pkg select mode on category switch
        window.pkgSelectMode = false;
        window.selectedLRIds.clear();
        window.currentDisplayedItems = [];
        const selBtn = document.getElementById('pkg-select-mode-btn');
        if (selBtn) { selBtn.className = 'btn btn-secondary'; selBtn.innerHTML = '<i class="fas fa-check-square"></i> Select Mode'; }
        const selBar = document.getElementById('pkg-selected-bar');
        if (selBar) selBar.style.display = 'none';
        // Show pkg toolbar
        const pkgToolbar = document.getElementById('pkg-download-toolbar');
        if (pkgToolbar) pkgToolbar.style.display = 'flex';

        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('dynamic-categories-container').style.display = 'none';

        // Hide main navbar search — category view has its own search bar
        const mainSearch = document.querySelector('.search-container');
        if (mainSearch) mainSearch.style.setProperty('display', 'none', 'important');

        const fullView = document.getElementById('category-full-view');
        fullView.classList.remove('hidden');
        fullView.style.paddingTop = '100px';
        document.getElementById('category-full-title').innerText = cat;

        // Ensure filters are visible for category view
        const catFilters = document.getElementById('category-filters');
        if (catFilters) catFilters.style.display = 'flex';
        const grid = document.getElementById('category-full-grid');
        if (grid) grid.className = ''; 
        
        window.currentCategoryItems = globalResources.filter(r => r.category === cat);
        populateCategoryFilters(window.currentCategoryItems);
        renderCategoryGrid(window.currentCategoryItems);
    };

    function checkAnyFilterActive() {
        // Check if we are in search mode (global search)
        const isGlobalSearch = (document.getElementById('main-search')?.value || '').trim() !== '';
        if (isGlobalSearch) return true;

        const filters = ['category-search', 'filter-lr-type', 'filter-school-level', 'filter-grade-level', 'filter-learning-area', 'filter-quarter', 'filter-term', 'filter-week'];
        return filters.some(id => {
            const el = document.getElementById(id);
            return el && el.value !== '';
        });
    }

    function createPosterCard(res) {
        const card = document.createElement('div');
        card.className = 'poster-card';
        card.style.cssText = 'min-width:200px; max-width:200px; cursor:pointer; position:relative; border-radius:6px; overflow:hidden; background:#222; transition:transform 0.3s; height:280px;';
        card.dataset.filePath = res.file_path;
        card.addEventListener('mouseenter', () => { if (!window.pkgSelectMode) card.style.transform = 'scale(1.05)'; });
        card.addEventListener('mouseleave', () => { if (!card.classList.contains('pkg-selected')) card.style.transform = 'scale(1)'; });
        card.addEventListener('click', () => {
            if (window.pkgSelectMode) { pkgToggleCard(res, card); }
            else { openModal(res); }
        });
        
        const pkgOverlay = document.createElement('div');
        pkgOverlay.className = 'pkg-check-overlay';
        pkgOverlay.innerHTML = '<i class="fas fa-check"></i>';
        card.appendChild(pkgOverlay);

        const canvas = document.createElement('canvas');
        canvas.className = 'poster';
        canvas.style.cssText = 'width:100%; height:280px; background:#222; display:block; margin:0;';
        canvas.title = res.title;

        const label = document.createElement('div');
        label.className = 'poster-card-label';
        label.textContent = res.title;

        card.appendChild(canvas);
        card.appendChild(label);
        return card;
    }

    function renderCategoryGrid(items) {
        window.currentDisplayedItems = items;
        const grid = document.getElementById('category-full-grid');
        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; padding: 20px 4%;">No resources found in this category yet.</p>';
            return;
        }

        const isFiltered = checkAnyFilterActive();

        if (isFiltered) {
            // Render as a flat grid for filtered results
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            grid.style.gap = '30px';
            grid.style.padding = '0 4% 50px 4%';
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const canvas = card.querySelector('canvas');
                        if (canvas && !canvas.dataset.loaded) {
                            canvas.dataset.loaded = 'true';
                            renderPdfThumbnail(card.dataset.filePath, canvas);
                        }
                        observer.unobserve(card);
                    }
                });
            }, { threshold: 0.05 });

            items.forEach(res => {
                const card = createPosterCard(res);
                grid.appendChild(card);
                observer.observe(card);
            });
        } else {
            // Default: Grouped Rows
            grid.style.display = 'block';
            grid.style.padding = '0';
            const subGrouped = {};
            items.forEach(r => {
                const sub = r.resource_type || 'Uncategorized';
                if (!subGrouped[sub]) subGrouped[sub] = [];
                subGrouped[sub].push(r);
            });

            for (const [subCat, subItems] of Object.entries(subGrouped)) {
                renderHorizontalRow(grid, subCat, subItems.slice(0, 15));
            }
        }
    }

    // (Removed old category-search listener as it's now handled by applyCategoryFilters via input event array)


    const thumbnailQueue = [];
    let activeThumbnailLoads = 0;
    const MAX_CONCURRENT_THUMBNAILS = 4; // Increased for faster loading
    const thumbnailCache = {}; // Session-based cache

    function processThumbnailQueue() {
        if (activeThumbnailLoads >= MAX_CONCURRENT_THUMBNAILS || thumbnailQueue.length === 0) return;
        
        activeThumbnailLoads++;
        const { url, canvas } = thumbnailQueue.shift();
        
        renderPdfThumbnailInternal(url, canvas).finally(() => {
            activeThumbnailLoads--;
            processThumbnailQueue();
        });
    }

    async function renderPdfThumbnail(url, canvas) {
        thumbnailQueue.push({ url, canvas });
        processThumbnailQueue();
    }

    async function renderPdfThumbnailInternal(url, canvas) {
        // Check session cache first
        const cacheKey = `thumb_${url}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
            };
            img.src = cached;
            return;
        }

        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            // Save to cache (limit size to avoid quota issues)
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (dataUrl.length < 100000) { // Only cache reasonably sized thumbs
                    sessionStorage.setItem(cacheKey, dataUrl);
                }
            } catch(e) {}
        } catch (e) { 
            console.error("PDF thumbnail error:", e); 
        }
    }

    function renderCategories(resources) {
        const container = document.getElementById('dynamic-categories-container');
        container.innerHTML = '';

        // --- SUGGESTED FOR YOU ---
        if (currentUser) {
            const userGrades = currentUser.grade_level ? currentUser.grade_level.split(',').map(s=>s.trim().toLowerCase()) : [];
            const userSubjects = currentUser.subjects_taught ? currentUser.subjects_taught.split(',').map(s=>s.trim().toLowerCase()) : [];
            const isStudent = currentUser.role === 'Student / Learner';

            const suggested = resources.filter(r => {
                const rGrade = (r.grade_level||'').toLowerCase();
                const rSubject = (r.learning_area||'').toLowerCase();
                
                if (isStudent) {
                    // For students, suggest ONLY based on grade level
                    // and prioritize curriculum resources
                    return userGrades.includes(rGrade);
                }
                
                return userGrades.includes(rGrade) || userSubjects.includes(rSubject);
            });

            if (suggested.length > 0) {
                renderHorizontalRow(container, "Suggested for You", suggested.slice(0, 15), null, true);
            }
        }

        const grouped = {};
        resources.forEach(r => {
            const cat = r.category || 'Other / Uncategorized';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(r);
        });

        for (const [cat, items] of Object.entries(grouped)) {
            renderHorizontalRow(container, cat, items.slice(0, 15), `filterCategory('${cat}')`);
        }
    }

    function renderHorizontalRow(container, title, items, seeAllAction = null, isSuggested = false) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.id = `row-${title.replace(/[^a-zA-Z0-9]/g, '-')}`;
        rowDiv.style.cssText = 'width: 100%; margin-bottom: 2.5rem; display: block;';
        
        rowDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem; padding: 0 4%;">
                <h2 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin:0; flex-shrink: 1;">
                    ${isSuggested ? '<i class="fas fa-magic" style="color:var(--accent-color); margin-right:8px;"></i>' : ''}${title}
                </h2>
                ${seeAllAction ? `<button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; flex-shrink:0;" onclick="${seeAllAction}">See All</button>` : ''}
            </div>
            <div style="position:relative; display:flex; align-items:center; width:100%;">
                <button class="scroll-left" style="position:absolute; left:0; z-index:20; background:linear-gradient(to right, rgba(0,0,0,0.8), transparent); border:none; color:white; font-size:2rem; cursor:pointer; height:100%; width:4%; display:flex; align-items:center; justify-content:center; transition:0.3s; opacity:0; outline:none;"><i class="fas fa-chevron-left"></i></button>
                <div class="row-posters" style="display:flex; overflow-x:hidden; scroll-behavior:smooth; width:100%; padding: 0 4%; gap: 12px;"></div>
                <button class="scroll-right" style="position:absolute; right:0; z-index:20; background:linear-gradient(to left, rgba(0,0,0,0.8), transparent); border:none; color:white; font-size:2rem; cursor:pointer; height:100%; width:4%; display:flex; align-items:center; justify-content:center; transition:0.3s; opacity:1; outline:none;"><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
        container.appendChild(rowDiv);
        
        const scrollBtnL = rowDiv.querySelector('.scroll-left');
        const scrollBtnR = rowDiv.querySelector('.scroll-right');
        
        rowDiv.querySelector('div[style*="position:relative"]').addEventListener('mouseenter', () => {
            scrollBtnL.style.opacity = '1';
            scrollBtnR.style.opacity = '1';
        });
        rowDiv.querySelector('div[style*="position:relative"]').addEventListener('mouseleave', () => {
             scrollBtnL.style.opacity = '0';
             scrollBtnR.style.opacity = '1'; // keep right arrow visible or semi-transparent
        });
        const postersDiv = rowDiv.querySelector('.row-posters');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const canvas = card.querySelector('canvas');
                    const filePath = card.dataset.filePath;
                    if (canvas && !canvas.dataset.loaded) {
                        canvas.dataset.loaded = 'true';
                        renderPdfThumbnail(filePath, canvas);
                    }
                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.05 });

        items.forEach(res => {
            const card = createPosterCard(res);
            postersDiv.appendChild(card);
            observer.observe(card);
        });

        const leftBtn = rowDiv.querySelector('.scroll-left');
        const rightBtn = rowDiv.querySelector('.scroll-right');
        leftBtn.addEventListener('click', () => postersDiv.scrollBy({ left: -300, behavior: 'smooth' }));
        rightBtn.addEventListener('click', () => postersDiv.scrollBy({ left: 300, behavior: 'smooth' }));
    }

    function renderResources(resources, container) {
        container.innerHTML = '';
        resources.forEach(res => {
            const canvas = document.createElement('canvas');
            canvas.className = 'poster';
            canvas.style.backgroundColor = '#222';
            canvas.addEventListener('click', () => openModal(res));
            container.appendChild(canvas);
            renderPdfThumbnail(res.file_path, canvas);
        });
    }

    // Modal Logic is combined with button logic below
    const btnLike = document.getElementById('btn-like');
    const btnDownload = document.getElementById('btn-download');
    const btnView = document.getElementById('btn-view');

    function formatGradeLevel(grade) {
        if (!grade) return 'General';
        // Handle comma-separated grades by replacing with " or "
        return grade.split(',').map(g => g.trim()).join(' or ');
    }

    function openModal(res) {
        console.log('openModal called with:', res);
        try {
            currentResource = res;

            if (!modal) {
                console.error('Resource modal element not found globally!');
                return;
            }

            document.getElementById('modal-title').innerText = res.title || 'Untitled';
            
            const descEl = document.getElementById('modal-description');
            if(res.description) {
                descEl.innerText = res.description;
                descEl.previousElementSibling.style.display = 'block'; // Show "DESCRIPTION" header
                descEl.style.display = 'block';
            } else {
                descEl.style.display = 'none';
                descEl.previousElementSibling.style.display = 'none';
            }

            document.getElementById('modal-likes').innerText = res.likes_count || '0';
            document.getElementById('modal-downloads').innerText = res.downloads_count || '0';
            
            const compEl = document.getElementById('modal-competencies');
            if(res.competencies) {
                compEl.innerText = res.competencies;
                compEl.previousElementSibling.style.display = 'block';
                compEl.style.display = 'block';
            } else {
                compEl.style.display = 'none';
                compEl.previousElementSibling.style.display = 'none';
            }

            const authEl = document.getElementById('modal-authors');
            if(res.authors && res.authors.trim() !== '') {
                authEl.innerText = `Author: ${res.authors}`;
                authEl.style.display = 'block';
            } else {
                authEl.style.display = 'none';
            }

            document.getElementById('modal-grade').innerText = formatGradeLevel(res.grade_level);
            document.getElementById('modal-subject').innerText = res.learning_area || (res.category || 'General');

            // Inject Dynamic Meta
            const dynamicMetaContainer = document.getElementById('modal-dynamic-meta');
            dynamicMetaContainer.innerHTML = '';
            
            const addMeta = (label, val) => {
                if(!val || val === 'N/A') return;
                const div = document.createElement('div');
                div.innerHTML = `<h3 style="margin-bottom:4px; color:#e50914; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; font-weight:800;">${label}</h3>
                                 <p style="color:#eee; font-size:0.95rem;">${val}</p>`;
                dynamicMetaContainer.appendChild(div);
            };

            addMeta('Category', res.category);
            addMeta('Resource Type', res.resource_type);
            addMeta('Curriculum', res.curriculum);
            addMeta('School Level', res.school_level);
            addMeta('Grade Level', formatGradeLevel(res.grade_level));
            addMeta('Quarter', res.quarter);
            addMeta('Week', res.week);
            addMeta('Language', res.language);
            addMeta('Year Published', res.year_published);
            addMeta('Module No', res.module_no);
            addMeta('Component', res.component);

            const modalCanvas = document.getElementById('modal-pdf-canvas');
            if (modalCanvas) {
                // Instantly clone the pixels from the background grid
                const origCanvas = Array.from(document.querySelectorAll('.poster')).find(c => c.title === res.title);
                if (origCanvas && origCanvas.width > 0) {
                    modalCanvas.width = origCanvas.width;
                    modalCanvas.height = origCanvas.height;
                    modalCanvas.getContext('2d').drawImage(origCanvas, 0, 0);
                } else {
                    renderPdfThumbnail(res.file_path, modalCanvas);
                }
            }

            if (btnLike) {
                btnLike.innerHTML = res.user_liked > 0 ? `<i class="fas fa-heart animated-like"></i> Liked` : `<i class="far fa-heart animated-like"></i> Like`;
                btnLike.className = res.user_liked > 0 ? "btn btn-primary" : "btn btn-secondary";
            }


            // Absolutely force all display metrics inline
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.setProperty('display', 'flex', 'important');
            modal.style.setProperty('opacity', '1', 'important');
            modal.style.setProperty('visibility', 'visible', 'important');
            modal.style.setProperty('pointer-events', 'auto', 'important');
            modal.style.setProperty('z-index', '999999', 'important');

            document.body.style.setProperty('overflow', 'hidden', 'important');

            // Load related structure pedagogy
            loadRelated(res.id);
        } catch (err) {
            console.error('Error in openModal:', err);
            // alert('Error showing resource details: ' + err.message);
        }
    }

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        currentResource = null;
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => {
            // Check if clicked exactly on the overlay (not its children)
            if (e.target === m) {
                m.classList.add('hidden');
                m.classList.remove('active');
                m.style.setProperty('display', 'none', 'important');
                document.body.style.setProperty('overflow', 'auto', 'important');
                if (m.id === 'resource-modal') currentResource = null;
            }
        });
    });

    window.submitLRComment = () => {
        if(!currentUser) {
            alert('Please log in to submit a comment or report.');
            return; 
        }
        if(!currentResource) return;
        const commentBox = document.getElementById('lr-comment-text');
        const msg = document.getElementById('lr-comment-msg');
        const val = commentBox.value.trim();
        if(!val) return;
        
        msg.style.color = "lightgreen";
        msg.innerText = "Submitting...";

        const fd = new FormData();
        fd.append('resource_id', currentResource.id);
        fd.append('comment', val);
        // Let's create an endpoint in resources.php or users.php later, we'll put it in resources.php
        fetch('api/resources.php?action=comment', {
            method: 'POST',
            body: fd
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                msg.innerText = "Comment submitted successfully!";
                commentBox.value = '';
                setTimeout(() => msg.innerText = '', 3000);
            } else {
                msg.innerText = data.message || "Failed to submit.";
                msg.style.color = "var(--accent-color)";
            }
        }).catch(err => {
            msg.innerText = "Error. Try again.";
            msg.style.color = "var(--accent-color)";
        });
    };

    // Custom PDF Viewer Logic
    let customPdfDoc = null;
    let customPdfPageNum = 1;
    let customPdfRendering = false;
    let customPdfPagePending = null;
    let customPdfScale = 1.5; // default scale
    const PDF_SCALE_MIN = 0.5;
    const PDF_SCALE_MAX = 4.0;
    const PDF_SCALE_STEP = 0.25;
    const pdfRenderCanvasLeft = document.getElementById('pdf-render-canvas-left');
    const pdfRenderCanvasRight = document.getElementById('pdf-render-canvas-right');
    const pdfCtxLeft = pdfRenderCanvasLeft ? pdfRenderCanvasLeft.getContext('2d') : null;
    const pdfCtxRight = pdfRenderCanvasRight ? pdfRenderCanvasRight.getContext('2d') : null;
    let customPdfViewMode = 'double'; // 'single' or 'double'

    document.getElementById('pdf-toggle-view')?.addEventListener('click', (e) => {
        e.stopPropagation();
        customPdfViewMode = customPdfViewMode === 'double' ? 'single' : 'double';
        document.getElementById('pdf-view-mode-text').textContent = customPdfViewMode === 'double' ? 'Two Page' : 'One Page';
        queueRenderPdfPage(customPdfPageNum);
    });

    function updateZoomLabel() {
        const el = document.getElementById('pdf-zoom-level');
        if (el) el.textContent = Math.round(customPdfScale / 1.5 * 100) + '%';
    }

    async function renderPdfPageAsViewer(num) {
        if (!customPdfDoc) return;
        customPdfRendering = true;

        try {
            const leftPage = await customPdfDoc.getPage(num);
            const leftViewport = leftPage.getViewport({ scale: customPdfScale });
            pdfRenderCanvasLeft.height = leftViewport.height;
            pdfRenderCanvasLeft.width = leftViewport.width;
            pdfRenderCanvasLeft.style.display = 'block';
            await leftPage.render({ canvasContext: pdfCtxLeft, viewport: leftViewport }).promise;

            const rightPageNumber = num + 1;
            if (customPdfViewMode === 'double' && rightPageNumber <= customPdfDoc.numPages) {
                const rightPage = await customPdfDoc.getPage(rightPageNumber);
                const rightViewport = rightPage.getViewport({ scale: customPdfScale });
                pdfRenderCanvasRight.height = rightViewport.height;
                pdfRenderCanvasRight.width = rightViewport.width;
                pdfRenderCanvasRight.style.display = 'block';
                await rightPage.render({ canvasContext: pdfCtxRight, viewport: rightViewport }).promise;
            } else {
                if(pdfCtxRight) pdfCtxRight.clearRect(0, 0, pdfRenderCanvasRight.width, pdfRenderCanvasRight.height);
                pdfRenderCanvasRight.style.display = 'none';
            }
        } finally {
            customPdfRendering = false;
            if (customPdfPagePending !== null) {
                const nextPendingPage = customPdfPagePending;
                customPdfPagePending = null;
                renderPdfPageAsViewer(nextPendingPage);
            }
        }

        const rightPageNumber = (customPdfViewMode === 'double') ? Math.min(num + 1, customPdfDoc.numPages) : num;
        document.getElementById('pdf-current-page').textContent = num === rightPageNumber ? `${num}` : `${num}-${rightPageNumber}`;
        updateZoomLabel();
    }

    function queueRenderPdfPage(num) {
        if (customPdfRendering) {
            customPdfPagePending = num;
        } else {
            renderPdfPageAsViewer(num);
        }
    }

    // Zoom controls
    const zoomInBtn = document.getElementById('pdf-zoom-in');
    const zoomOutBtn = document.getElementById('pdf-zoom-out');

    if (zoomInBtn) zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (customPdfScale < PDF_SCALE_MAX) {
            customPdfScale = Math.min(PDF_SCALE_MAX, customPdfScale + PDF_SCALE_STEP);
            queueRenderPdfPage(customPdfPageNum);
        }
    });

    if (zoomOutBtn) zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (customPdfScale > PDF_SCALE_MIN) {
            customPdfScale = Math.max(PDF_SCALE_MIN, customPdfScale - PDF_SCALE_STEP);
            queueRenderPdfPage(customPdfPageNum);
        }
    });

    if (document.getElementById('pdf-zoom-fit-width')) {
        document.getElementById('pdf-zoom-fit-width').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!customPdfDoc) return;
            customPdfDoc.getPage(customPdfPageNum).then(page => {
                const containerWidth = document.getElementById('pdf-viewer-container').clientWidth - 60;
                const viewport = page.getViewport({ scale: 1 });
                customPdfScale = (containerWidth - 20) / (viewport.width * (customPdfViewMode === 'double' ? 2 : 1));
                queueRenderPdfPage(customPdfPageNum);
            });
        });
    }

    if (document.getElementById('pdf-zoom-fit-height')) {
        document.getElementById('pdf-zoom-fit-height').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!customPdfDoc) return;
            customPdfDoc.getPage(customPdfPageNum).then(page => {
                const containerHeight = document.getElementById('pdf-viewer-container').clientHeight - 60;
                const viewport = page.getViewport({ scale: 1 });
                customPdfScale = containerHeight / viewport.height;
                queueRenderPdfPage(customPdfPageNum);
            });
        });
    }

    function goPdfPrev(e) {
        if(e) e.stopPropagation();
        if (customPdfPageNum <= 1) return;
        customPdfPageNum = Math.max(1, customPdfPageNum - (customPdfViewMode === 'double' ? 2 : 1));
        queueRenderPdfPage(customPdfPageNum);
    }

    function goPdfNext(e) {
        if(e) e.stopPropagation();
        if (!customPdfDoc) return;
        const step = (customPdfViewMode === 'double' ? 2 : 1);
        if (customPdfPageNum + (customPdfViewMode === 'double' ? 1 : 0) >= customPdfDoc.numPages) return;
        customPdfPageNum += step;
        queueRenderPdfPage(customPdfPageNum);
    }

    document.getElementById('pdf-prev-page').addEventListener('click', goPdfPrev);
    document.getElementById('pdf-side-prev').addEventListener('click', goPdfPrev);

    document.getElementById('pdf-next-page').addEventListener('click', goPdfNext);
    document.getElementById('pdf-side-next').addEventListener('click', goPdfNext);

    // Swipe navigation
    let touchStartX = 0;
    let touchEndX = 0;
    
    const pdfContainer = document.getElementById('pdf-viewer-container');
    pdfContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    pdfContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swipe Left -> Next Page
            goPdfNext();
        }
        if (touchEndX > touchStartX + 50) {
            // Swipe Right -> Prev Page
            goPdfPrev();
        }
    }

    document.getElementById('close-pdf-viewer').addEventListener('click', (e) => {
        e.stopPropagation();
        const viewer = document.getElementById('pdf-viewer-modal');
        viewer.classList.add('hidden');
        viewer.classList.remove('active');
        viewer.style.setProperty('opacity', '0', 'important');
        viewer.style.setProperty('pointer-events', 'none', 'important');

        document.body.style.overflow = '';
        if (modal && currentResource) {
            modal.style.setProperty('display', 'flex', 'important');
        }
    });


    document.getElementById('pdf-viewer-download').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentResource) return;

        // Build absolute URL directly from file_path — avoids session dependency
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
        const fileUrl = baseUrl + currentResource.file_path.replace(/^\/+/, '');

        // Open the file download in a new tab (bypasses login redirect)
        const a = document.createElement('a');
        a.href = fileUrl;
        a.target = '_blank';
        a.download = (currentResource.title || 'resource') + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Increment download counter separately (fire-and-forget)
        fetch('api/resources.php?action=download', {
            method: 'POST',
            body: JSON.stringify({ id: currentResource.id }),
            headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json()).then(data => {
            if (data.success) {
                currentResource.downloads_count = parseInt(currentResource.downloads_count || 0) + 1;
                const dlEl = document.getElementById('modal-downloads');
                if (dlEl) dlEl.textContent = currentResource.downloads_count;
            }
        }).catch(() => { });
    });

    btnView.addEventListener('click', () => {
        if (!currentResource) return;
        
        // Log view action
        fetch(`api/resources.php?action=view&id=${currentResource.id}`).catch(() => {});
        
        const viewer = document.getElementById('pdf-viewer-modal');

        // Hide the resource modal, open the PDF viewer
        modal.style.setProperty('display', 'none', 'important');

        // Show viewer – it's position:fixed so it fully covers everything
        viewer.classList.remove('hidden');
        viewer.classList.add('active');
        viewer.style.setProperty('opacity', '1', 'important');
        viewer.style.setProperty('pointer-events', 'auto', 'important');
        document.body.style.overflow = 'hidden';

        // Loading indicator
        document.getElementById('pdf-total-pages').textContent = '...';
        document.getElementById('pdf-current-page').textContent = '...';
        customPdfDoc = null;
        customPdfPageNum = 1;

        // Build absolute URL for PDF.js (avoids ERR_HTTP2 on relative paths)
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
        const pdfUrl = baseUrl + currentResource.file_path.replace(/^\/+/, '');

        pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
            customPdfDoc = pdf;
            document.getElementById('pdf-total-pages').textContent = pdf.numPages;
            customPdfPageNum = 1;
            renderPdfPageAsViewer(1);
        }).catch(err => {
            alert('Error loading PDF: ' + err.message);
            console.error(err);
        });

        // Increment view counter (fire-and-forget)
        fetch(`api/resources.php?action=view&id=${currentResource.id}`).catch(() => { });
    });


    function loadRelated(resourceId) {
        const relatedRow = document.getElementById('related-resources-container');
        if (!relatedRow) return;

        fetch(`api/resources.php?action=related&id=${resourceId}`)
            .then(res => res.json())
            .then(data => {
                relatedRow.innerHTML = '';
                if (data.success && data.related && data.related.length > 0) {
                    data.related.forEach(res => {
                        const canvas = document.createElement('canvas');
                        canvas.className = 'poster poster-sm';
                        canvas.style.backgroundColor = '#222';
                        canvas.title = res.title;
                        canvas.addEventListener('click', () => {
                            modal.classList.add('hidden');
                            setTimeout(() => openModal(res), 300);
                        });
                        relatedRow.appendChild(canvas);
                        renderPdfThumbnail(res.file_path, canvas);
                    });
                } else {
                    relatedRow.innerHTML = '<span style="color:#aaa;">No related resources found.</span>';
                }
            });
    }

    // Actions
    btnLike.addEventListener('click', () => {
        if (!currentResource) return;
        fetch('api/resources.php?action=like', {
            method: 'POST',
            body: JSON.stringify({ id: currentResource.id }),
            headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json()).then(data => {
            if (data.success) {
                currentResource.likes_count = data.liked ? parseInt(currentResource.likes_count) + 1 : parseInt(currentResource.likes_count) - 1;
                currentResource.user_liked = data.liked ? 1 : 0;
                document.getElementById('modal-likes').innerText = currentResource.likes_count;
                btnLike.innerHTML = currentResource.user_liked > 0 ? `<i class="fas fa-thumbs-up"></i> Liked` : `<i class="far fa-thumbs-up"></i> Like`;
                btnLike.className = currentResource.user_liked > 0 ? "btn btn-primary" : "btn btn-secondary";
                loadResources(); // Refresh main view in bg
            }
        });
    });

    btnDownload.addEventListener('click', () => {
        if (!currentResource) return;
        fetch('api/resources.php?action=download', {
            method: 'POST',
            body: JSON.stringify({ id: currentResource.id }),
            headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json()).then(data => {
            if (data.success) {
                currentResource.downloads_count = parseInt(currentResource.downloads_count) + 1;
                document.getElementById('modal-downloads').innerText = currentResource.downloads_count;
                // Trigger download
                const a = document.createElement('a');
                a.href = data.file;
                a.download = currentResource.title + ".pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                loadResources(); // Refresh bg
            }
        });
    });

    // ── Package Download Functions ─────────────────────────────

    window.togglePkgSelectMode = function () {
        window.pkgSelectMode = !window.pkgSelectMode;
        window.selectedLRIds.clear();
        // Reset visual selection on all cards
        document.querySelectorAll('.pkg-selected').forEach(c => c.classList.remove('pkg-selected'));
        const btn = document.getElementById('pkg-select-mode-btn');
        if (window.pkgSelectMode) {
            btn.className = 'btn btn-primary';
            btn.innerHTML = '<i class="fas fa-times"></i> Exit Select';
        } else {
            btn.className = 'btn btn-secondary';
            btn.innerHTML = '<i class="fas fa-check-square"></i> Select Mode';
        }
        pkgUpdateBar();
        // Re-render so hover effects respect select mode
        if (window.currentCategoryItems) applyCategoryFilters();
    };

    function pkgToggleCard(res, card) {
        const id = res.id;
        if (window.selectedLRIds.has(id)) {
            window.selectedLRIds.delete(id);
            card.classList.remove('pkg-selected');
            card.style.transform = 'scale(1)';
        } else {
            if (window.selectedLRIds.size >= 30) {
                pkgShowToast('Maximum 30 LRs can be selected at once.', 'warning');
                return;
            }
            window.selectedLRIds.add(id);
            card.classList.add('pkg-selected');
        }
        pkgUpdateBar();
    }

    function pkgUpdateBar() {
        const bar   = document.getElementById('pkg-selected-bar');
        const count = window.selectedLRIds.size;
        if (bar) {
            bar.style.display = (count > 0 && window.pkgSelectMode) ? 'flex' : 'none';
            const lbl = document.getElementById('pkg-selected-count');
            if (lbl) lbl.textContent = `${count} LR${count !== 1 ? 's' : ''} selected`;
        }
    }

    window.pkgClearSelection = function () {
        window.selectedLRIds.clear();
        document.querySelectorAll('.pkg-selected').forEach(c => {
            c.classList.remove('pkg-selected');
            c.style.transform = 'scale(1)';
        });
        pkgUpdateBar();
    };

    window.pkgDownloadAll = async function () {
        const lrType = document.getElementById('filter-lr-type')?.value;
        const schoolLevel = document.getElementById('filter-school-level')?.value;
        const gradeLevel = document.getElementById('filter-grade-level')?.value;
        const quarter = document.getElementById('filter-quarter')?.value;
        const learningArea = document.getElementById('filter-learning-area')?.value;

        if (!lrType || !schoolLevel || !gradeLevel || !quarter || !learningArea) {
            pkgShowToast('Please filter by LR Type, Level, Grade, Quarter, and Subject Area first.', 'warning');
            return;
        }

        const items = window.currentDisplayedItems || [];
        if (items.length === 0) { pkgShowToast('No LRs to download in the current view.', 'warning'); return; }
        const ids   = items.slice(0, 30).map(r => r.id);
        
        // Confirmation Modal
        const confirmed = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '9999999';
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.maxWidth = '500px';
            content.style.textAlign = 'left';
            content.style.padding = '1.5rem';
            
            const category = document.getElementById('category-full-title')?.innerText || 'N/A';
            const previewItems = items.slice(0, 30);
            const titlesHtml = previewItems.map((r, i) =>
                `<div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid #2a2a2a;">
                    <span style="color:#3498db; font-weight:700; min-width:22px; font-size:0.8rem;">${i + 1}.</span>
                    <span style="color:#ddd; font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.title || 'Untitled'}</span>
                </div>`
            ).join('');

            const row = (label, val) => `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #2a2a2a;">
                <span style="color:#888; font-size:0.82rem;">${label}</span>
                <span style="color:#eee; font-size:0.82rem; font-weight:600;">${val || '—'}</span>
            </div>`;

            content.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:1.2rem; text-align:left;">
                    <div style="width:48px; height:48px; background:rgba(52,152,219,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#3498db; font-size:1.4rem; flex-shrink:0;">
                        <i class="fas fa-box-open"></i>
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:1.1rem;">Confirm Batch Download</h2>
                        <p style="margin:2px 0 0; color:#888; font-size:0.8rem;">Review what will be packaged and downloaded</p>
                    </div>
                </div>

                <div style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:8px; padding:12px; margin-bottom:1rem; text-align:left;">
                    <div style="color:#3498db; font-size:0.75rem; font-weight:700; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase;">Filter Summary</div>
                    ${row('Category', category)}
                    ${row('LR Type', lrType)}
                    ${row('School Level', schoolLevel)}
                    ${row('Grade Level', gradeLevel)}
                    ${row('Quarter', 'Q' + quarter)}
                    ${row('Subject Area', learningArea)}
                </div>

                <div style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:8px; padding:12px; margin-bottom:1.2rem; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="color:#3498db; font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase;">Resources to Download</span>
                        <span style="background:#3498db; color:#fff; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:10px;">${previewItems.length} LR${previewItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style="max-height:160px; overflow-y:auto; padding-right:4px;">${titlesHtml}</div>
                    ${items.length > 30 ? `<p style="color:#e67e22; font-size:0.78rem; margin:8px 0 0; text-align:center;"><i class="fas fa-exclamation-triangle"></i> Only the first 30 of ${items.length} results will be packaged.</p>` : ''}
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" id="pkg-confirm-cancel" style="padding:8px 20px;">Cancel</button>
                    <button class="btn btn-primary" id="pkg-confirm-ok" style="padding:8px 20px;"><i class="fas fa-download"></i> Yes, Download</button>
                </div>
            `;

            
            overlay.appendChild(content);
            document.body.appendChild(overlay);
            
            document.getElementById('pkg-confirm-cancel').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(false);
            });
            document.getElementById('pkg-confirm-ok').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(true);
            });
        });

        if (!confirmed) return;

        const hints = pkgGetHints();
        pkgTriggerDownload(ids, hints);
    };

    window.pkgDownloadSelected = function () {
        if (window.selectedLRIds.size === 0) { pkgShowToast('No LRs selected.', 'warning'); return; }
        const ids   = Array.from(window.selectedLRIds);
        const hints = pkgGetHints();
        pkgTriggerDownload(ids, hints);
    };

    function pkgGetHints() {
        return {
            category:      document.getElementById('category-full-title')?.innerText || '',
            grade_level:   document.getElementById('filter-grade-level')?.value    || '',
            learning_area: document.getElementById('filter-learning-area')?.value  || '',
            resource_type: document.getElementById('filter-lr-type')?.value        || '',
            quarter:       document.getElementById('filter-quarter')?.value        || ''
        };
    }

    function pkgTriggerDownload(ids, hints) {
        if (!ids || ids.length === 0) return;
        const bundlingModal = document.getElementById('pkg-bundling-modal');
        const bundlingMsg   = document.getElementById('pkg-bundling-msg');
        bundlingModal.classList.remove('hidden');
        bundlingModal.classList.add('active');
        bundlingMsg.textContent = `Bundling ${ids.length} LR${ids.length !== 1 ? 's' : ''} into a ZIP\u2026 Please wait.`;

        fetch('api/resources.php?action=package_download', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ ids, filename_hints: hints })
        })
        .then(response => {
            if (!response.ok) {
                // Try to read error JSON
                return response.json().then(err => { throw new Error(err.message || 'Server error'); });
            }
            const disposition = response.headers.get('Content-Disposition') || '';
            let filename = 'LRFLIX_Package.zip';
            const match = disposition.match(/filename="([^"]+)"/);
            if (match) filename = match[1];
            return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            bundlingModal.classList.add('hidden');
            bundlingModal.classList.remove('active');
            pkgShowToast(`\u2705 Package ready! ${ids.length} LR${ids.length !== 1 ? 's' : ''} downloaded.`, 'success');
            loadResources(); // refresh download counts in background
        })
        .catch(err => {
            bundlingModal.classList.add('hidden');
            bundlingModal.classList.remove('active');
            console.error('Package download error:', err);
            pkgShowToast('\u274C Failed to create package: ' + (err.message || 'Unknown error'), 'error');
        });
    }

    function pkgShowToast(message, type) {
        const colors = { success: '#2ecc71', error: '#e50914', warning: '#f39c12' };
        const toast  = document.createElement('div');
        toast.style.cssText = [
            'position:fixed', 'bottom:30px', 'left:50%', 'transform:translateX(-50%)',
            `background:${colors[type] || colors.success}`, 'color:white',
            'padding:13px 26px', 'border-radius:9px', 'font-weight:700',
            'font-size:0.95rem', 'z-index:9999999',
            'box-shadow:0 8px 30px rgba(0,0,0,0.5)',
            'animation:pkgToastIn 0.3s ease', 'max-width:90vw', 'text-align:center'
        ].join(';');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'pkgToastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 320);
        }, 4000);
    }
    // ── End Package Download ───────────────────────────────────

});
