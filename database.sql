CREATE DATABASE IF NOT EXISTS bffvvmvztl_lrflixdb;
USE bffvvmvztl_lrflixdb;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    position VARCHAR(100),
    school VARCHAR(150),
    major VARCHAR(100),
    years_in_service VARCHAR(50),
    age_range VARCHAR(50),
    subjects_taught TEXT,
    grade_level TEXT,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    authors TEXT,
    language VARCHAR(50),
    grade_level VARCHAR(50),
    quarter INT,
    week INT,
    content_standards TEXT,
    performance_standards TEXT,
    competencies TEXT,
    description TEXT,
    learning_area VARCHAR(100),
    resource_type VARCHAR(100),
    year_published VARCHAR(50),
    file_path VARCHAR(255) NOT NULL,
    likes_count INT DEFAULT 0,
    downloads_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    UNIQUE(user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    suggestion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin (password is 'admin123')
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', '$2y$10$B9e/tH/6.eRz33rJqY.8c.1Yn1zW.tCpHpYZpW91x/w0E0ZkRj/1O', 'admin');

CREATE TABLE IF NOT EXISTS lr_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);
