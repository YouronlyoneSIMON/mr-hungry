USE mr_hungry;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  role ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE menu_items (
  menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_type ENUM('dine-in','take-out') NOT NULL DEFAULT 'dine-in',
  status ENUM('received','preparing','ready','completed','cancelled')
    NOT NULL DEFAULT 'received',
  payment_method ENUM('counter','cashless') NOT NULL,
  payment_status ENUM('pending','verified') NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(100),
  payment_proof_url VARCHAR(255),
  total_amount DECIMAL(10,2) NOT NULL,
  estimated_wait_minutes INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) AUTO_INCREMENT = 1001;

CREATE TABLE order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id)
);

CREATE TABLE activity_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE restaurant_info (
  info_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  map_url VARCHAR(255),
  image_url VARCHAR(255)
);