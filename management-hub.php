<?php
require_once 'api/db.php';

if (preg_match('#/management-hub\.php$#', $_SERVER['REQUEST_URI'] ?? '')) {
    header('Location: /lrflix/admin/');
    exit;
}

if (!isAdmin()) {
    header('Location: /lrflix/');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/lrflix/">
    <title>Admin - LRFlix</title>
    <link rel="icon" type="image/x-icon" href="src/favicon.ico">
    <!-- Modern Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" referrerpolicy="no-referrer">
    <link href="https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/css/tom-select.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/js/tom-select.complete.min.js"></script>

    <link rel="stylesheet" href="css/style.css">
    <style>
        .ts-control { background: #333 !important; color: white !important; border: none !important; border-radius: 4px; padding: 0.9rem !important; min-height: 42px; box-shadow: none !important; }
        .ts-control input { color: white !important; }
        .ts-dropdown { background: #333 !important; color: white !important; border: 1px solid #444 !important; margin-top: 4px; border-radius: 4px; }
        .ts-dropdown .option:hover, .ts-dropdown .active { background: #e50914 !important; color: white !important; }
        .ts-wrapper.single .ts-control::after { border-color: #aaa transparent transparent transparent !important; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0"></script>
</head>
<body>
    <!-- Upload/Edit Action Modal -->
    <div id="action-modal" class="modal-overlay hidden" style="z-index: 9999; display: flex; align-items:center; justify-content:center;">
        <div class="modal-content" style="max-width: 300px; padding: 2rem; transform: none; text-align: center; background:#181818;">
            <i id="action-spinner" class="fas fa-spinner fa-spin" style="font-size: 3rem; color: white; margin-bottom: 1rem;"></i>
            <i id="action-check" class="fas fa-check-circle hidden" style="font-size: 3rem; color: lightgreen; margin-bottom: 1rem;"></i>
            <h3 id="action-message">Processing...</h3>
            <button class="btn btn-primary hidden" id="close-action-modal" style="margin-top: 1.5rem;">Okay</button>
        </div>
    </div>

    <nav id="navbar" class="scrolled">
        <div class="brand">LRFLIX ADMIN</div>
        <div class="nav-links">
            <button class="btn btn-secondary" onclick="window.location.href='/lrflix/'"><i class="fas fa-arrow-left"></i> Back to Portal</button>
        </div>
    </nav>
    <div class="admin-tabs" style="display:flex; justify-content:center; gap: 1rem; padding-top: 100px; background:#141414; flex-wrap:wrap;">
        <button class="btn btn-primary tab-btn" data-target="upload-section">Upload Resource</button>
        <button class="btn btn-secondary tab-btn" data-target="manage-res-section">Manage Resources</button>
        <button class="btn btn-secondary tab-btn" data-target="manage-usr-section">Manage Users</button>
        <button class="btn btn-secondary tab-btn" data-target="comp-section">Manage Competencies</button>
        <button class="btn btn-secondary tab-btn" data-target="analytics-section"><i class="fas fa-chart-line"></i> Analytics Dashboard</button>
        <button class="btn btn-secondary tab-btn" data-target="feedbacks-section"><i class="fas fa-comments"></i> Feedbacks</button>
    </div>


    <div class="admin-container" id="admin-view" style="display:none; padding-top: 20px;">
        <!-- Upload Tab -->
        <div id="upload-section" class="admin-card fade-in tab-content">
            <h2 id="upload-tab-title">Upload Learning Resource</h2>
            <form id="upload-form" class="auth-box" style="max-width: 100%; border:none; background: transparent; padding:0; display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px 25px;">
                <input type="hidden" id="resource_id" value="">
                
                <div class="input-group dynamic-field-group" id="group-category" style="padding: 0 10px !important;">
                    <label>LR Category</label>
                    <select id="res-category" required style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select Category...</option>
                        <option value="MATATAG Curriculum Resources">MATATAG Curriculum Resources</option>
                        <option value="K to 12 Curriculum Resources">K to 12 Curriculum Resources</option>
                        <option value="Contextualized Learning Resources (CLRs)">Contextualized Learning Resources (CLRs)</option>
                        <option value="National Learning Camp (NLC)">National Learning Camp (NLC)</option>
                        <option value="National Reading Program (NRP)">National Reading Program (NRP)</option>
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-type" style="padding: 0 10px !important; display:none;">
                    <label id="label-type">LR Type</label>
                    <select id="res-type" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-curriculum" style="padding: 0 10px !important; display:none;">
                    <label>Curriculum</label>
                    <select id="res-curriculum" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select Curriculum...</option>
                        <option value="MATATAG">MATATAG</option>
                        <option value="K to 12">K to 12</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-school-level" style="padding: 0 10px !important; display:none;">
                    <label>School Level</label>
                    <select id="res-school-level" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                        <option value="Elementary">Elementary</option>
                        <option value="Secondary">Secondary</option>
                    </select>
                </div>
                
                <div class="input-group dynamic-field-group" id="group-camp-type" style="padding: 0 10px !important; display:none;">
                    <label>Camp Type</label>
                    <select id="res-camp-type" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                        <option value="Intervention">Intervention</option>
                        <option value="Enhancement">Enhancement</option>
                        <option value="Consolidation">Consolidation</option>
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-material-type" style="padding: 0 10px !important; display:none;">
                    <label id="label-material-type">Material Type</label>
                    <select id="res-material-type" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                        <!-- Options dynamically loaded -->
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-learning-area" style="padding: 0 10px !important; display:none;">
                    <label id="label-learning-area">Learning Area (Subject) <i class="fas fa-spinner fa-spin hidden" id="spin-res-learning-area"></i></label>
                    <select id="res-learning-area" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select Area...</option>
                    </select>
                </div>
                
                <div class="input-group dynamic-field-group" id="group-component" style="padding: 0 10px !important; display:none;">
                    <label>Component</label>
                    <input type="text" id="res-component" style="padding:12px 15px;" placeholder="For TechPro, TLE, EPP">
                </div>

                <div class="input-group dynamic-field-group" id="group-title" style="padding: 0 10px !important; display:none;">
                    <label>Title</label>
                    <input type="text" id="res-title" style="padding:12px 15px;">
                </div>

                <div class="input-group dynamic-field-group" id="group-grade" style="padding: 0 10px !important; display:none;">
                    <label>Grade Level <i class="fas fa-spinner fa-spin hidden" id="spin-res-grade"></i></label>
                    <select id="res-grade" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select Grade...</option>
                    </select>
                    <input type="text" id="res-grade-custom" style="padding:12px 15px; margin-top:5px; display:none;" placeholder="Enter custom grade level">
                </div>
                
                <div class="input-group dynamic-field-group" id="group-module-no" style="padding: 0 10px !important; display:none;">
                    <label>Module No.</label>
                    <input type="text" id="res-module-no" style="padding:12px 15px;">
                </div>

                <div class="input-group dynamic-field-group" id="group-authors" style="padding: 0 10px !important; display:none;">
                    <label>Author(s) <button type="button" id="add-author-btn" style="background:transparent; color: var(--accent-color); border:none; cursor:pointer;">+ Add Another</button></label>
                    <div id="authors-group">
                        <input type="text" class="res-author" placeholder="Author 1" style="margin-bottom: 5px; width:100%;">
                    </div>
                </div>

                <div class="input-group dynamic-field-group" id="group-language" style="padding: 0 10px !important; display:none;">
                    <label>Language</label>
                    <select id="res-language" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                        <option value="English">English</option>
                        <option value="Ivatan">Ivatan</option>
                        <option value="Filipino">Filipino</option>
                    </select>
                </div>
                
                <div style="display:none; gap:10px; padding: 0 10px !important;grid-column: span 1;" class="dynamic-field-group" id="group-quarter-week">
                    <div class="input-group" style="flex:1; display:none;" id="group-quarter">
                        <label>Quarter <i class="fas fa-spinner fa-spin hidden" id="spin-res-quarter"></i></label>
                        <select id="res-quarter" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                            <option value="">Select Quarter...</option>
                        </select>
                    </div>
                    <div class="input-group" style="flex:1; display:none;" id="group-week">
                        <label>Week <i class="fas fa-spinner fa-spin hidden" id="spin-res-week"></i></label>
                        <select id="res-week" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                            <option value="">Select Week...</option>
                        </select>
                    </div>
                </div>

                <div class="input-group dynamic-field-group" id="group-comp" style="grid-column: 1 / -1; padding: 0 10px !important; display:none;">
                    <label>Learning Competency (MELC)</label>
                    <select id="res-comp-select" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select MELC...</option>
                    </select>
                    <input type="hidden" id="res-comp" value="">
                </div>
                
                <div class="input-group dynamic-field-group" id="group-code" style="padding: 0 10px !important; display:none;">
                    <label>Code</label>
                    <input type="text" id="res-code" style="padding:12px 15px;" readonly>
                </div>
                
                <div class="input-group dynamic-field-group" id="group-content-std" style="grid-column: 1 / -1; padding: 0 10px !important; display:none;">
                    <label>Content Standards</label>
                    <textarea id="res-content-std" rows="2" readonly style="background:#222;"></textarea>
                </div>
                <div class="input-group dynamic-field-group" id="group-perf-std" style="grid-column: 1 / -1; padding: 0 10px !important; display:none;">
                    <label>Performance Standards</label>
                    <textarea id="res-perf-std" rows="2" readonly style="background:#222;"></textarea>
                </div>

                <div class="input-group dynamic-field-group" id="group-year" style="padding: 0 10px !important; display:none;">
                    <label>Year Published</label>
                    <select id="res-year" style="width: 100%; padding: 0.9rem; border-radius: 4px; background: #333; color: white;">
                        <option value="">Select...</option>
                        <?php for($y=date('Y'); $y>=2010; $y--) echo "<option value='$y'>$y</option>"; ?>
                    </select>
                </div>

                <div class="input-group dynamic-field-group" id="group-desc" style="grid-column: 1 / -1; padding: 0 10px !important; display:none;">
                    <label>Description</label>
                    <textarea id="res-desc" rows="2"></textarea>
                </div>
                
                <div class="input-group" style="grid-column: 1 / -1; padding: 15px 10px !important;" id="group-file">
                    <div id="drop-zone" style="border: 2px dashed #444; border-radius: 8px; padding: 20px 10px; text-align: center; background: #1a1a1a; cursor: pointer; transition: 0.3s; position: relative; margin-bottom: 15px;">
                        <label style="cursor: pointer; display: block; width: 100%;"><i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; margin-bottom: 10px; color: #aaa;"></i><br>
                            <span id="drop-zone-text" style="color: #888; font-size: 0.95rem;">Drag & Drop File or Click to Browse</span>
                            <input type="file" id="res-file" accept="application/pdf,image/*,video/*,audio/*,.ppt,.pptx" style="display: none;">
                        </label>
                        <button id="remove-file-btn" type="button" class="hidden" style="position:absolute; bottom:15px; right:15px; background:rgba(229, 9, 20, 0.4); border:1px solid #e50914; border-radius:50%; width:32px; height:32px; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;"><i class="fas fa-times"></i></button>
                    </div>
                    
                    <div style="display:flex; flex-direction:row; gap:15px; margin-top:15px; align-items:center;">
                        <button type="button" id="cancel-edit-btn" class="btn btn-secondary hidden" onclick="cancelEdit()" style="flex:1; height:40px; font-size:0.9rem; margin:0;"><i class="fas fa-times"></i> Cancel Edit</button>
                        <button type="button" id="clear-form-btn" class="btn btn-secondary" onclick="confirmClearForm()" style="flex:1; height:40px; font-size:0.9rem; margin:0;"><i class="fas fa-eraser"></i> Clear</button>
                        <button type="submit" class="btn btn-primary" id="upload-submit-btn" style="flex:1; height:40px; font-size:0.9rem; margin:0;"><i class="fas fa-plus"></i> Submit Resource</button>
                    </div>
                </div>
                
                <div id="upload-msg" style="grid-column: 1 / -1; margin-top: 5px;"></div>
            </form>

        </div>

        <div id="manage-res-section" class="admin-card fade-in tab-content" style="display:none;">
            <h2>Manage Resources</h2>
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:1rem;">
                <input type="text" id="resources-search" placeholder="Search by title..."
                    style="flex:1; min-width:260px; padding:0.8rem 0.9rem; border-radius:6px; border:1px solid #333; background:#222; color:white;">
                <button class="btn btn-secondary" id="resources-sort-downloads" type="button">Sort Downloads: High to Low</button>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table" id="resources-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Competencies</th>
                            <th>Downloads</th>
                            <th>Likes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dynamic rows -->
                    </tbody>
                </table>
            </div>
            <div id="resources-pagination" style="display:flex; justify-content:flex-end; gap:8px; margin-top:1rem; align-items:center;"></div>
        </div> <!-- End Manage Res Tab -->

        <!-- Manage Competencies Tab -->
        <div id="comp-section" class="admin-card fade-in tab-content" style="display:none;">
            <h2>Manage Competencies</h2>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:1rem; gap:12px;">
                <input type="text" id="comp-search" placeholder="Search by MELC, Code, Subject..."
                    style="flex:1; min-width:200px; padding:0.8rem 0.9rem; border-radius:6px; border:1px solid #333; background:#222; color:white;">
                <select id="comp-filter-grade" style="padding:0.8rem 0.9rem; border-radius:6px; background:#222; border:1px solid #333; color:white;">
                    <option value="">All Grades</option>
                </select>
                <select id="comp-filter-subject" style="padding:0.8rem 0.9rem; border-radius:6px; background:#222; border:1px solid #333; color:white;">
                    <option value="">All Subjects</option>
                </select>
                <select id="comp-filter-quarter" style="padding:0.8rem 0.9rem; border-radius:6px; background:#222; border:1px solid #333; color:white;">
                    <option value="">All Quarters</option>
                </select>
                <select id="comp-filter-week" style="padding:0.8rem 0.9rem; border-radius:6px; background:#222; border:1px solid #333; color:white;">
                    <option value="">All Weeks</option>
                </select>
                <button class="btn btn-secondary" onclick="clearCompFilters()"><i class="fas fa-eraser"></i> Clear Filters</button>
                <button class="btn btn-danger" onclick="clearAllCompetencies()"><i class="fas fa-trash-alt"></i> Clear All Data</button>
                <button class="btn btn-secondary" onclick="document.getElementById('comp-csv-upload').click();"><i class="fas fa-file-csv"></i> Import CSV</button>
                <input type="file" id="comp-csv-upload" accept=".csv" style="display:none;" onchange="importCompCSV(this)">
                <button class="btn btn-primary" onclick="openCompModal();"><i class="fas fa-plus"></i> Add</button>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table" id="comp-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Subject</th>
                            <th>School Level</th>
                            <th>Grade Level</th>
                            <th>Quarter</th>
                            <th>MELC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dynamic rows -->
                    </tbody>
                </table>
            </div>
            <div id="comp-pagination" style="display:flex; justify-content:flex-end; gap:8px; margin-top:1rem; align-items:center;"></div>
        </div>

        <!-- Manage Users Tab -->
        <div id="manage-usr-section" class="admin-card fade-in tab-content" style="display:none;">
            <h2>Manage Users</h2>
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:1rem;">
                <input type="text" id="users-search" placeholder="Search by username..."
                    style="flex:1; min-width:220px; padding:0.8rem 0.9rem; border-radius:6px; border:1px solid #333; background:#222; color:white;">
                <select id="users-filter-school"
                    style="min-width:220px; padding:0.8rem 0.9rem; border-radius:6px; border:1px solid #333; background:#222; color:white;">
                    <option value="">All Schools/Offices</option>
                </select>
                <select id="users-filter-position"
                    style="min-width:220px; padding:0.8rem 0.9rem; border-radius:6px; border:1px solid #333; background:#222; color:white;">
                    <option value="">All Positions</option>
                </select>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table" id="users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Name</th>
                            <th>School/Office</th>
                            <th>Position</th>
                            <th>Visits</th>
                            <th>Downloads</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dynamic rows -->
                    </tbody>
                </table>
            </div>
            <div id="users-pagination" style="display:flex; justify-content:flex-end; gap:8px; margin-top:1rem; align-items:center;"></div>
        </div>

        <!-- Analytics Tab -->
        <div id="analytics-section" class="admin-card fade-in tab-content" style="display:none;">
            <h2 style="margin-bottom: 1.5rem;"><i class="fas fa-chart-line"></i> Analytics Dashboard</h2>

            <!-- Summary Cards -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background:#1a1a2e; border-radius:8px; padding:1.2rem; text-align:center; border:1px solid #333;">
                    <div style="font-size:2rem; font-weight:800; color:#e50914;" id="stat-users">–</div>
                    <div style="color:#aaa; font-size:0.9rem;">Registered Users</div>
                </div>
                <div style="background:#1a1a2e; border-radius:8px; padding:1.2rem; text-align:center; border:1px solid #333;">
                    <div style="font-size:2rem; font-weight:800; color:#3498db;" id="stat-resources">–</div>
                    <div style="color:#aaa; font-size:0.9rem;">Total Resources</div>
                </div>
                <div style="background:#1a1a2e; border-radius:8px; padding:1.2rem; text-align:center; border:1px solid #333;">
                    <div style="font-size:2rem; font-weight:800; color:#2ecc71;" id="stat-downloads">–</div>
                    <div style="color:#aaa; font-size:0.9rem;">Total Downloads</div>
                </div>
                <div style="background:#1a1a2e; border-radius:8px; padding:1.2rem; text-align:center; border:1px solid #333;">
                    <div style="font-size:2rem; font-weight:800; color:#f39c12;" id="stat-likes">–</div>
                    <div style="color:#aaa; font-size:0.9rem;">Total Likes</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-top:-1rem; margin-bottom: 2rem;">
                <div style="background:#1a1a2e; border-radius:8px; padding:1.2rem; text-align:center; border:1px solid #333;">
                    <div style="font-size:2rem; font-weight:800; color:#9b59b6;" id="stat-visits">â€“</div>
                    <div style="color:#aaa; font-size:0.9rem;">Total Site Visits</div>
                </div>
            </div>

            <!-- Period Toggle -->
            <div style="margin-bottom: 1.5rem; display:flex; gap: 10px; flex-wrap:wrap; align-items:center;">
                <span style="color:#aaa; margin-right:5px;">Filter by:</span>
                <button class="btn btn-primary period-btn" data-period="day">Today</button>
                <button class="btn btn-secondary period-btn" data-period="week">This Week</button>
                <button class="btn btn-secondary period-btn" data-period="month">This Month</button>
                <button class="btn btn-secondary period-btn" data-period="year">This Year</button>
                <input type="date" id="custom-date-filter" style="padding:0; padding-left:0.6rem; padding-right:0.6rem; border-radius:4px; background:#333; color:white; border:1px solid #444; outline:none; height:42px; cursor:pointer;" title="Select a specific date">
                
                <div style="margin-left: auto;">
                    <button class="btn btn-primary" onclick="openReportModal()" style="height:42px;"><i class="fas fa-file-export"></i> Generate Report</button>
                </div>
            </div>

            <!-- Charts: stacked full width -->
            <div style="display:flex; flex-direction:column; gap:2rem;">
                 <div style="background:#1a1a1a; border-radius:10px; padding:1.5rem; border:1px solid #333;">
                    <h3 style="margin-bottom:1.2rem; color:#ddd;">User Visits Over Time</h3>
                    <div style="height:400px; position:relative;">
                        <canvas id="chart-visits-time"></canvas>
                    </div>
                </div>
                 <div style="background:#1a1a1a; border-radius:10px; padding:1.5rem; border:1px solid #333;">
                    <h3 style="margin-bottom:1.2rem; color:#ddd;">Downloads Over Time</h3>
                    <div style="height:400px; position:relative;">
                        <canvas id="chart-downloads-time"></canvas>
                    </div>
                </div>
                <div style="background:#1a1a1a; border-radius:10px; padding:1.5rem; border:1px solid #333;">
                    <h3 style="margin-bottom:1.2rem; color:#ddd;">Downloads by Category</h3>
                    <div style="height:450px; position:relative;">
                        <canvas id="chart-downloads-category"></canvas>
                    </div>
                </div>
            </div>

            <!-- Resources by Category -->
            <div style="margin-top: 2rem; background:#1a1a1a; border-radius:10px; padding:1.5rem; border:1px solid #333;">
                <h3 style="margin-bottom:1.2rem; color:#ddd;">Resources by Category</h3>
                <div style="height:450px; position:relative;">
                    <canvas id="chart-resources-category"></canvas>
                </div>
            </div>

            <!-- Top Resources Table -->

            <div style="margin-top: 2rem; background:#1a1a1a; border-radius:8px; padding: 1.5rem; border:1px solid #333;">
                <h3 style="margin-bottom:1rem; color:#ddd;">Top 5 Most Downloaded Resources</h3>
                <table class="data-table" id="top-resources-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Downloads</th>
                            <th>Likes</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        
        <!-- Feedbacks Tab -->
        <div id="feedbacks-section" class="admin-card fade-in tab-content" style="display:none;">
            <h2>Feedback Center</h2>
            <div style="display:flex; gap:10px; margin:1rem 0 1.5rem; flex-wrap:wrap;">
                <button class="btn btn-primary feedback-tab-btn" data-target="feedback-suggestions-panel" type="button">Suggestions</button>
                <button class="btn btn-secondary feedback-tab-btn" data-target="feedback-comments-panel" type="button">Comments / Error Reports</button>
            </div>

            <div id="feedback-suggestions-panel">
                <h3>User Feedbacks & Suggestions</h3>
                <div style="overflow-x:auto;">
                    <table class="data-table" id="feedback-table">
                        <thead>
                            <tr>
                                <th>User Name</th>
                                <th>School/Office</th>
                                <th>Date Submitted</th>
                                <th>Suggestion</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Dynamic rows -->
                        </tbody>
                    </table>
                </div>
                <div id="feedback-pagination" style="display:flex; justify-content:flex-end; gap:8px; margin-top:1rem; align-items:center;"></div>
            </div>

            <div id="feedback-comments-panel" style="display:none;">
                <h3 style="margin-top:40px;">LR Comments / Error Reports</h3>
                <div style="overflow-x:auto; margin-top: 1rem;">
                    <table class="data-table" id="lr-comments-table">
                        <thead>
                            <tr>
                                <th>User Name</th>
                                <th>School/Office</th>
                                <th>Resource Title</th>
                                <th>Date Submitted</th>
                                <th>Comment / Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Dynamic rows -->
                        </tbody>
                    </table>
                </div>
                <div id="comments-pagination" style="display:flex; justify-content:flex-end; gap:8px; margin-top:1rem; align-items:center;"></div>
            </div>
        </div>

    </div>

    <!-- Report Modal -->
    <div id="report-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:500px; padding:2rem;">
            <button class="modal-close" onclick="closeReportModal()">&times;</button>
            <h2 style="margin-bottom:1.5rem;"><i class="fas fa-file-pdf"></i> Generate System Report</h2>
            
            <div class="input-group">
                <label>Target Year</label>
                <select id="report-year" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    <option value="">All Years</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
            </div>
            
            <div class="input-group" style="margin-top:15px;">
                <label>Target Month</label>
                <select id="report-month" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                </select>
            </div>

            <div class="input-group" style="margin-top:15px;">
                <label>Report Format</label>
                <div style="display:flex; gap:15px; margin-top:5px;">
                    <label style="display:flex; align-items:center; gap:8px;"><input type="radio" name="report-type" value="pdf" checked> <i class="fas fa-file-pdf" style="color:#e50914;"></i> PDF</label>
                    <label style="display:flex; align-items:center; gap:8px;"><input type="radio" name="report-type" value="xlsx"> <i class="fas fa-file-excel" style="color:#2ecc71;"></i> Excel</label>
                </div>
            </div>

            <div style="margin-top:2rem; display:flex; gap:15px;">
                <button class="btn btn-secondary" onclick="closeReportModal()" style="flex:1;">Cancel</button>
                <button class="btn btn-primary" onclick="generateReport()" style="flex:1;"><i class="fas fa-download"></i> Generate</button>
            </div>
        </div>
    </div>
    
    <!-- Report Library Imports -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <!-- Clear Form Confirmation Modal -->
    <div id="clear-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:400px; text-align:center; padding: 2.5rem; overflow:hidden;">
            <h2 style="margin-bottom:1rem;"><i class="fas fa-exclamation-triangle" style="color:#f1c40f;"></i> Clear Form?</h2>
            <p style="color:#aaa; margin-bottom:2rem;">Are you sure you want to clear all fields? All unsaved data will be lost.</p>
            <div style="display:flex; gap:15px;">
                <button class="btn btn-secondary" onclick="document.getElementById('clear-modal').classList.add('hidden'); document.getElementById('clear-modal').classList.remove('active');" style="flex:1;">Keep Data</button>
                <button class="btn btn-primary" id="confirm-clear-btn" style="flex:1;">Yes, Clear All</button>
            </div>
        </div>
    </div>

    <!-- Competency Form Modal -->
    <div id="comp-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:600px; padding:2rem;">
            <button class="modal-close" onclick="closeCompModal()">&times;</button>
            <h2 id="comp-modal-title" style="margin-bottom:1.5rem;">Add New Competency</h2>
            <form id="comp-form" style="display:flex; flex-direction:column; gap:15px;">
                <input type="hidden" id="comp-id" value="">
                
                <div style="display:flex; gap:15px;">
                    <div class="input-group" style="flex:1;">
                        <label>Curriculum</label>
                        <input type="text" id="comp-curriculum" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                    <div class="input-group" style="flex:1;">
                        <label>Grade Level</label>
                        <input type="text" id="comp-grade" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                </div>

                <div style="display:flex; gap:15px;">
                    <div class="input-group" style="flex:1;">
                        <label>Subject</label>
                        <input type="text" id="comp-subject" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                    <div class="input-group" style="flex:1;">
                        <label>Quarter/Term</label>
                        <input type="text" id="comp-quarter" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                </div>

                <div style="display:flex; gap:15px;">
                    <div class="input-group" style="flex:1;">
                        <label>Week</label>
                        <input type="text" id="comp-week" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                    <div class="input-group" style="flex:1;">
                        <label>Code</label>
                        <input type="text" id="comp-code" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;">
                    </div>
                </div>

                <div class="input-group">
                    <label>MELC (Most Essential Learning Competency)</label>
                    <textarea id="comp-melc" rows="2" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;"></textarea>
                </div>

                <div class="input-group">
                    <label>Content Standards</label>
                    <textarea id="comp-content-std" rows="2" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;"></textarea>
                </div>
                
                <div class="input-group">
                    <label>Performance Standards</label>
                    <textarea id="comp-perf-std" rows="2" style="width:100%; padding:0.8rem; border-radius:6px; background:#333; color:white; border:1px solid #444;"></textarea>
                </div>

                <div style="margin-top:1rem; display:flex; gap:15px;">
                    <button type="button" class="btn btn-secondary" onclick="closeCompModal()" style="flex:1;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex:1;"><i class="fas fa-save"></i> Save Competency</button>
                </div>
            </form>
        </div>
    </div>

    <!-- User Info Modal -->
    <div id="user-info-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width:500px; padding:2rem;">
            <button class="modal-close" onclick="document.getElementById('user-info-modal').classList.add('hidden'); document.getElementById('user-info-modal').classList.remove('active');">&times;</button>
            <h2 style="margin-bottom:1.5rem;"><i class="fas fa-user-circle"></i> User Information</h2>
            <div id="user-info-body" style="display:flex; flex-direction:column; gap:10px; color:#ddd; font-size:0.95rem;">
                <!-- Populated dynamically -->
            </div>
            <button class="btn btn-primary" style="margin-top:20px; width:100%;" onclick="document.getElementById('user-info-modal').classList.add('hidden'); document.getElementById('user-info-modal').classList.remove('active');">Close</button>
        </div>
    </div>

    <script src="js/admin.js"></script>
</body>
</html>
