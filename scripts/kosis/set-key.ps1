# KOSIS 공유서비스 API 키를 이 PC의 사용자 환경 변수(KOSIS_API_KEY)에 저장한다.
# 키는 저장소·파일·로그에 남기지 않는다. 화면에도 찍지 않는다.
#   저장:  powershell -ExecutionPolicy Bypass -File scripts\kosis\set-key.ps1
#   삭제:  powershell -ExecutionPolicy Bypass -File scripts\kosis\set-key.ps1 -Remove
#   시험만: powershell -ExecutionPolicy Bypass -File scripts\kosis\set-key.ps1 -TestOnly
param([switch]$Remove, [switch]$TestOnly)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Name = 'KOSIS_API_KEY'

if ($Remove) {
  [Environment]::SetEnvironmentVariable($Name, $null, 'User')
  Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
  Write-Host 'KOSIS 키를 지웠습니다.'
  exit 0
}

if (-not $TestOnly) {
  $sec = Read-Host -AsSecureString 'KOSIS API 키를 붙여 넣고 Enter (화면에 안 보임)'
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim() }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if (-not $key) { Write-Host '입력이 비었습니다. 저장하지 않았습니다.'; exit 1 }
  [Environment]::SetEnvironmentVariable($Name, $key, 'User')   # 새 창에서도 유지
  Set-Item "Env:$Name" $key                                    # 지금 창에서도 바로 사용
  Write-Host ("저장했습니다(끝 4자리 …{0})." -f $key.Substring([Math]::Max(0, $key.Length - 4)))
} else {
  $key = [Environment]::GetEnvironmentVariable($Name, 'User')
  if (-not $key) { Write-Host '저장된 키가 없습니다. -TestOnly 없이 먼저 실행하세요.'; exit 1 }
}

# 연결 시험: 주민등록인구(행정구역별) 전국 최신 1개 시점. 실패해도 키는 저장된 상태로 둔다.
$url = 'https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList' +
       '&apiKey=' + [Uri]::EscapeDataString($key) +
       '&orgId=101&tblId=DT_1B040A3&itmId=T20&objL1=00&format=json&jsonVD=Y&prdSe=M&newEstPrdCnt=1'
try {
  $r = Invoke-RestMethod -Uri $url -TimeoutSec 20
  if ($r -is [array] -and $r.Count -gt 0 -and $r[0].DT) {
    Write-Host ("연결 성공: {0} {1} = {2} ({3})" -f $r[0].C1_NM, $r[0].ITM_NM, $r[0].DT, $r[0].PRD_DE)
  } else {
    $msg = if ($r.errMsg) { "$($r.err) $($r.errMsg)" } else { ($r | ConvertTo-Json -Depth 3 -Compress) }
    Write-Host "키는 저장했지만 시험 요청이 값을 주지 않았습니다: $msg"
    Write-Host '(키 승인 대기 중이거나 시험용 표 ID가 바뀌었을 수 있습니다. Claude에게 이 메시지만 알려 주세요. 키는 알려 주지 마세요.)'
  }
} catch {
  Write-Host ('시험 요청 실패: ' + ($_.Exception.Message -replace [Regex]::Escape($key), '***'))
}
