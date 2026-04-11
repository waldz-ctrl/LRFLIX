document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let isRegistering = false;
    let currentResource = null;

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
                formData.append('deped_email', val('deped_email'));
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

        const firstName = currentUser.first_name || currentUser.username;
        document.getElementById('welcome-user').innerText = `Welcome, ${firstName}`;

        // Dynamic Profile Circle (Red background, white text)
        const profileCircle = document.getElementById('nav-profile-circle');
        if (profileCircle) {
            profileCircle.innerText = (currentUser.first_name || currentUser.username).charAt(0).toUpperCase();
            profileCircle.style.display = 'flex';
            profileCircle.onclick = showProfile;
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
        }

        // Profile toggle
        const profBtn = document.getElementById('profile-btn');
        if (profBtn) {
            profBtn.addEventListener('click', showProfile);
        }
        document.getElementById('welcome-user').addEventListener('click', showProfile);
    }

    function filterSearch(term) {
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('dynamic-categories-container').style.display = 'none';

        const fullView = document.getElementById('category-full-view');
        fullView.classList.remove('hidden');
        fullView.style.paddingTop = '100px';
        document.getElementById('category-full-title').innerText = `Search results for: "${term}"`;

        const grid = document.getElementById('category-full-grid');
        grid.innerHTML = '';

        const filtered = globalResources.filter(r =>
            (r.title && r.title.toLowerCase().includes(term)) ||
            (r.authors && r.authors.toLowerCase().includes(term))
        );

        if (filtered.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; padding: 20px;">No matches found for your search.</p>';
            return;
        }

        renderGridItems(filtered, grid);
    }

    function renderGridItems(items, grid) {
        items.forEach(res => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            card.style.cssText = 'width:200px; cursor:pointer; position:relative; border-radius:6px; overflow:hidden; background:#222; transition:transform 0.3s;';
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
            card.addEventListener('click', () => openModal(res));

            const canvas = document.createElement('canvas');
            canvas.className = 'poster';
            canvas.style.cssText = 'width:100%; height:280px; background:#222; display:block; margin:0;';
            canvas.title = res.title;

            const label = document.createElement('div');
            label.style.cssText = 'padding:8px; font-size:0.8rem; color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            label.textContent = res.title;

            card.appendChild(canvas);
            card.appendChild(label);
            grid.appendChild(card);
            renderPdfThumbnail(res.file_path, canvas);
        });
    }

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
                        const latest = globalResources[0];
                        document.getElementById('hero-title').innerText = latest.title;
                        document.getElementById('hero-desc').innerText = latest.description || 'No description provided.';
                        const heroViewBtn = document.getElementById('hero-view-btn');
                        const newHeroBtn = heroViewBtn.cloneNode(true);
                        heroViewBtn.parentNode.replaceChild(newHeroBtn, heroViewBtn);
                        newHeroBtn.addEventListener('click', () => openModal(latest));
                    } else {
                        document.getElementById('hero-section').style.display = 'none';
                    }

                    renderCategories(globalResources);
                }
            });
    }

    window.filterCategory = function (cat) {
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('dynamic-categories-container').style.display = 'none';

        const fullView = document.getElementById('category-full-view');
        fullView.classList.remove('hidden');
        // Push content below the fixed navbar (~80px tall)
        fullView.style.paddingTop = '100px';
        document.getElementById('category-full-title').innerText = cat;

        const grid = document.getElementById('category-full-grid');
        grid.innerHTML = '';

        const items = globalResources.filter(r => r.category === cat);

        if (items.length === 0) {
            grid.innerHTML = '<p style="color:#aaa; padding: 20px;">No resources found in this category yet.</p>';
            return;
        }

        items.forEach(res => {
            const card = document.createElement('div');
            card.style.cssText = 'width:200px; cursor:pointer; position:relative; border-radius:6px; overflow:hidden; background:#222; transition:transform 0.3s;';
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
            card.addEventListener('click', () => openModal(res));

            const canvas = document.createElement('canvas');
            canvas.className = 'poster';
            canvas.style.cssText = 'width:100%; height:280px; background:#222; display:block; margin:0;';
            canvas.title = res.title;

            const label = document.createElement('div');
            label.style.cssText = 'padding:8px; font-size:0.8rem; color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            label.textContent = res.title;

            card.appendChild(canvas);
            card.appendChild(label);
            grid.appendChild(card);
            renderPdfThumbnail(res.file_path, canvas);
        });
    };

    async function renderPdfThumbnail(url, canvas) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.8 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        } catch (e) { console.error("PDF thumbnail error:", e); }
    }

    function renderCategories(resources) {
        const container = document.getElementById('dynamic-categories-container');
        container.innerHTML = '';

        const grouped = {};
        resources.forEach(r => {
            const cat = r.category || 'Other / Uncategorized';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(r);
        });

        for (const [cat, items] of Object.entries(grouped)) {
            const displayItems = items.slice(0, 15);

            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowDiv.id = `cat-header-${cat}`;
            rowDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <h2>${cat}</h2>
                    <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="filterCategory('${cat}')">See All</button>
                </div>
                <div style="position:relative; display:flex; align-items:center;">
                    <button class="scroll-left" style="position:absolute; left:0; z-index:10; background:rgba(0,0,0,0.5); border:none; color:white; font-size:2rem; cursor:pointer; height:100%;"><i class="fas fa-chevron-left"></i></button>
                    <div class="row-posters" style="display:flex; overflow-x:hidden; scroll-behavior:smooth; width:100%;"></div>
                    <button class="scroll-right" style="position:absolute; right:0; z-index:10; background:rgba(0,0,0,0.5); border:none; color:white; font-size:2rem; cursor:pointer; height:100%;"><i class="fas fa-chevron-right"></i></button>
                </div>
            `;
            container.appendChild(rowDiv);

            const postersDiv = rowDiv.querySelector('.row-posters');
            displayItems.forEach(res => {
                const canvas = document.createElement('canvas');
                canvas.className = 'poster';
                canvas.style.backgroundColor = '#222';
                canvas.title = res.title;
                canvas.addEventListener('click', () => openModal(res));
                postersDiv.appendChild(canvas);
                // Async generate thumbnail
                renderPdfThumbnail(res.file_path, canvas);
            });

            // Scroll Logic
            const leftBtn = rowDiv.querySelector('.scroll-left');
            const rightBtn = rowDiv.querySelector('.scroll-right');
            leftBtn.addEventListener('click', () => postersDiv.scrollBy({ left: -300, behavior: 'smooth' }));
            rightBtn.addEventListener('click', () => postersDiv.scrollBy({ left: 300, behavior: 'smooth' }));
        }
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

    function openModal(res) {
        console.log('openModal called with:', res);
        try {
            currentResource = res;

            if (!modal) {
                console.error('Resource modal element not found globally!');
                return;
            }

            document.getElementById('modal-title').innerText = res.title || 'Untitled';
            document.getElementById('modal-description').innerText = res.description || 'No description provided.';
            document.getElementById('modal-likes').innerText = res.likes_count || '0';
            document.getElementById('modal-downloads').innerText = res.downloads_count || '0';
            document.getElementById('modal-competencies').innerText = res.competencies || 'General competencies apply.';
            document.getElementById('modal-authors').innerText = res.authors ? `By: ${res.authors}` : 'Author: Unknown';

            document.getElementById('modal-grade').innerText = res.grade_level || 'General';
            document.getElementById('modal-subject').innerText = res.learning_area || (res.category || 'General');

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
                btnLike.innerHTML = res.user_liked > 0 ? `<i class="fas fa-heart"></i> Liked` : `<i class="far fa-heart"></i> Like`;
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
            alert('Error showing resource details: ' + err.message);
        }
    }

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        currentResource = null;
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
            if (rightPageNumber <= customPdfDoc.numPages) {
                const rightPage = await customPdfDoc.getPage(rightPageNumber);
                const rightViewport = rightPage.getViewport({ scale: customPdfScale });
                pdfRenderCanvasRight.height = rightViewport.height;
                pdfRenderCanvasRight.width = rightViewport.width;
                pdfRenderCanvasRight.style.display = 'block';
                await rightPage.render({ canvasContext: pdfCtxRight, viewport: rightViewport }).promise;
            } else {
                pdfCtxRight.clearRect(0, 0, pdfRenderCanvasRight.width, pdfRenderCanvasRight.height);
                pdfRenderCanvasRight.width = leftViewport.width;
                pdfRenderCanvasRight.height = leftViewport.height;
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

        const rightPageNumber = Math.min(num + 1, customPdfDoc.numPages);
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
    const zoomFitBtn = document.getElementById('pdf-zoom-fit');

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
                customPdfScale = (containerWidth - 20) / (viewport.width * 2);
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




    document.getElementById('pdf-prev-page').addEventListener('click', (e) => {
        e.stopPropagation();
        if (customPdfPageNum <= 1) return;
        customPdfPageNum = Math.max(1, customPdfPageNum - 2);
        queueRenderPdfPage(customPdfPageNum);
    });


    document.getElementById('pdf-next-page').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!customPdfDoc || customPdfPageNum + 1 >= customPdfDoc.numPages) return;
        customPdfPageNum += 2;
        queueRenderPdfPage(customPdfPageNum);
    });

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
                        canvas.className = 'poster';
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
                    relatedRow.innerHTML = '<span style="color:#aaa;">No related resources based on competencies.</span>';
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
});
