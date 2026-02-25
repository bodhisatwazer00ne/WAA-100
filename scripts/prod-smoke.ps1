param(
  [string]$BaseUrl = "https://waa100-backend.onrender.com"
)

function Login($base, $email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    return Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" -Body $body
  } catch {
    return $null
  }
}

function GetStatus($url, $token) {
  try {
    $resp = Invoke-WebRequest -Method Get -Uri $url -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
    return [int]$resp.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    return -1
  }
}

Write-Host "Checking health endpoint..."
try {
  $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/health"
  Write-Host "Health: OK ($($health.name))"
} catch {
  Write-Host "Health: FAILED"
  exit 1
}

# Update these if your production credentials are different.
$hodCred = @{ email = "rahul.gaikwad@university.edu"; password = "rahulgaikwad123" }
$teacherCred = @{ email = "prakash.mali@university.edu"; password = "prakash123" }
$studentCred = @{ email = "aarav.patil@student.edu"; password = "aarav123" }

$hod = Login $BaseUrl $hodCred.email $hodCred.password
$teacher = Login $BaseUrl $teacherCred.email $teacherCred.password
$student = Login $BaseUrl $studentCred.email $studentCred.password

if (-not $hod) { Write-Host "HOD login: FAILED"; exit 1 } else { Write-Host "HOD login: OK" }
if (-not $teacher) { Write-Host "Teacher login: FAILED"; exit 1 } else { Write-Host "Teacher login: OK" }
if (-not $student) { Write-Host "Student login: FAILED"; exit 1 } else { Write-Host "Student login: OK" }

$studentId = $student.user.profile.id

$checks = @(
  @{ name = "HOD faculty mapping"; status = GetStatus "$BaseUrl/api/reports/faculty-mapping" $hod.token; expect = 200 },
  @{ name = "Teacher faculty mapping forbidden"; status = GetStatus "$BaseUrl/api/reports/faculty-mapping" $teacher.token; expect = 403 },
  @{ name = "Teacher my-class"; status = GetStatus "$BaseUrl/api/reports/my-class" $teacher.token; expect = 200 },
  @{ name = "Student notifications"; status = GetStatus "$BaseUrl/api/notifications/me" $student.token; expect = 200 },
  @{ name = "Student department summary forbidden"; status = GetStatus "$BaseUrl/api/analytics/department/summary" $student.token; expect = 403 },
  @{ name = "Student own analytics"; status = GetStatus "$BaseUrl/api/analytics/student/$studentId" $student.token; expect = 200 }
)

$failed = $false
foreach ($check in $checks) {
  $ok = $check.status -eq $check.expect
  if (-not $ok) { $failed = $true }
  Write-Host ("{0}: {1} (expected {2})" -f $check.name, $check.status, $check.expect)
}

if ($failed) {
  Write-Host "Smoke test FAILED"
  exit 1
}

Write-Host "Smoke test PASSED"
