<?php
// api/asoebi-notify.php

header("Content-Type: application/json");

// Only allow POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["error" => "Method not allowed"]);
  exit;
}

// Read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data) {
  http_response_code(400);
  echo json_encode(["error" => "Bad JSON"]);
  exit;
}

// Only proceed if asoEbi exists (email agency ONLY for aso ebi)
$asoEbi = trim((string)($data["asoEbi"] ?? ""));
if ($asoEbi === "") {
  echo json_encode(["ok" => true, "skipped" => true]);
  exit;
}

// Pull only what we need
$firstName = trim((string)($data["firstName"] ?? ""));
$lastName  = trim((string)($data["lastName"] ?? ""));
$phone     = trim((string)($data["phone"] ?? ""));

// Basic validation
if ($firstName === "" || $lastName === "" || $phone === "") {
  http_response_code(422);
  echo json_encode(["error" => "Missing required fields"]);
  exit;
}

// Pretty label mapping
$prettyMap = [
  "women-gele-asoebi" => "Gele and Aso Ebi (Women)",
  "men-cap-asoebi"    => "Cap and Aso Ebi (Men)",
  "women-gele-ipele"  => "Gele and Ipele (Women)",
  "men-cap-only"      => "Cap only (Men)"
];
$asoEbiPretty = $prettyMap[$asoEbi] ?? $asoEbi;

// --- PHPMailer (SMTP) ---
require __DIR__ . "/vendor/PHPMailer/Exception.php";
require __DIR__ . "/vendor/PHPMailer/PHPMailer.php";
require __DIR__ . "/vendor/PHPMailer/SMTP.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ==== CONFIG (YOU WILL EDIT THESE 6 LINES) ====
$SMTP_HOST = "smtp.yourdomain.com";
$SMTP_PORT = 587; // usually 587 (TLS) or 465 (SSL)
$SMTP_USER = "no-reply@yourdomain.com";
$SMTP_PASS = "YOUR_EMAIL_PASSWORD";
$MAIL_TO   = "couple@email.com";
$MAIL_FROM = "no-reply@yourdomain.com";
// ============================================

try {
  $mail = new PHPMailer(true);

  // SMTP settings
  $mail->isSMTP();
  $mail->Host       = $SMTP_HOST;
  $mail->SMTPAuth   = true;
  $mail->Username   = $SMTP_USER;
  $mail->Password   = $SMTP_PASS;
  $mail->Port       = $SMTP_PORT;

  // Encryption based on port
  if ($SMTP_PORT === 465) {
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
  } else {
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  }

  $mail->setFrom($MAIL_FROM, "Wedding RSVP");
  $mail->addAddress($MAIL_TO);

  $mail->Subject = "New Aso Ebi Request Alert";
  $mail->Body =
    "New Aso Ebi Request Alert\n\n" .
    "Name: {$firstName} {$lastName}\n" .
    "Phone: {$phone}\n" .
    "Choice: {$asoEbiPretty}\n";

  $mail->send();

  echo json_encode(["ok" => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["error" => "Email send failed", "details" => $e->getMessage()]);
}