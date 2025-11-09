<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не разрешен']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    if (empty($data) && !empty($_POST)) {
        $data = $_POST;
    }
    
    if (empty($data)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Данные не получены'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $missingFields = [];
    if (empty($data['name'])) $missingFields[] = 'name';
    if (empty($data['email'])) $missingFields[] = 'email';
    if (empty($data['phone'])) $missingFields[] = 'phone';
    if (empty($data['password'])) $missingFields[] = 'password';
    
    if (!empty($missingFields)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Все поля обязательны для заполнения',
            'missing_fields' => $missingFields,
            'received_data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $emailPattern = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
    if (!preg_match($emailPattern, $data['email'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Некорректный email адрес. Используйте формат: example@domain.com',
            'email' => $data['email']
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email' => $data['email']]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Пользователь с таким email уже зарегистрирован']);
        exit;
    }
    
    $sql = "INSERT INTO users (name, email, phone, password, role) 
            VALUES (:name, :email, :phone, :password, 'user')";
    
    $stmt = $pdo->prepare($sql);
    
    try {
        $result = $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':phone' => $data['phone'],
            ':password' => $data['password']
        ]);
        
        if (!$result) {
            $errorInfo = $stmt->errorInfo();
            throw new PDOException('Не удалось сохранить пользователя: ' . ($errorInfo[2] ?? 'Неизвестная ошибка'));
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Ошибка сохранения в БД: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $userId = $pdo->lastInsertId();
    
    if (!$userId) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Не удалось получить ID созданного пользователя'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT id, name, email, phone, role, registered_at FROM users WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Пользователь создан, но не найден в БД'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'user_id' => $userId,
        'user' => $user,
        'message' => 'Пользователь успешно зарегистрирован'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка регистрации: ' . $e->getMessage(),
        'details' => $e->getFile() . ':' . $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
