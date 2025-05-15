USE gymdb;

CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(50),
    gender ENUM('Male', 'Female', 'Other'),
    date_of_birth DATE,
    join_date DATE,
    membership_type VARCHAR(50)
);

CREATE TABLE trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    specialty VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10,2)
);

CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_date DATETIME NOT NULL,
    duration_min INT,
    location VARCHAR(100),
    trainer_id INT,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id)
);

CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    session_id INT,
    booking_date DATE,
    status ENUM('Booked', 'Cancelled', 'Completed'),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
