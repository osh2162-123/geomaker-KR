# KOSIS 통계값을 받아 data\kstat.js(GMDATA.kstat)로 굳힌다. 앱은 KOSIS에 요청하지 않는다(받기는 교사 PC에서만).
#   표 찾기:   powershell -ExecutionPolicy Bypass -File scripts\kosis\fetch.ps1 -Search "노령화지수"
#   전체 받기: powershell -ExecutionPolicy Bypass -File scripts\kosis\fetch.ps1
#   일부만:    powershell -ExecutionPolicy Bypass -File scripts\kosis\fetch.ps1 -Only aging_index,tfr
#   시험 출력: powershell -ExecutionPolicy Bypass -File scripts\kosis\fetch.ps1 -Only tfr -Out $env:TEMP\kstat-test.js
# 키: 사용자 환경 변수 KOSIS_API_KEY(scripts\kosis\set-key.ps1로 저장)에서만 읽는다. 화면·로그·파일에 찍지 않고, 오류 주소는 apiKey=*** 로 가린다.
# 지표 목록: scripts\kosis\indicators.json (표 ID는 추측하지 않고 getMeta·시험 조회로 확인한 것만 적는다)
# 코드 맞추기 순서: codemap.json(통계청→행안부 코드) → 시도+시군구 이름 → 못 맞춘 행은 지표마다 보고(조용히 버리지 않는다)
# 결과 꼴: GMDATA.kstat={built,ver:"a",a2b:{…},ind:{지표id:{ko,unit,level,year,src,tbl,vals:{kmdata ver a 행안부 코드:값}}}} (시군구 5자리, 시도 2자리)
# PowerShell 5.1 기본 기능만 쓴다(따로 설치할 것 없음).
param(
  [string[]]$Only,
  [string]$Search,
  [string]$Out,
  [int]$Count = 20
)
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })   # -File 로 실행하면 쉼표가 문자열 하나로 들어온다
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Inv = [Globalization.CultureInfo]::InvariantCulture

# ── 키 ──
$key = $env:KOSIS_API_KEY
if (-not $key) { $key = [Environment]::GetEnvironmentVariable('KOSIS_API_KEY', 'User') }
if (-not $key) { Write-Host 'KOSIS 키가 없습니다. 먼저 scripts\kosis\set-key.ps1 을 실행하세요.'; exit 1 }
function Mask([string]$s) {
  if ($null -eq $s) { return '' }
  $s = [regex]::Replace($s, '(?i)apiKey=[^&\s"'']*', 'apiKey=***')
  if ($key) { $s = $s.Replace($key, '***') }
  return $s
}
function Get-Kosis([string]$url) {
  Start-Sleep -Milliseconds 300
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90
    $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()).TrimStart([char]0xFEFF)
  } catch { throw (Mask $_.Exception.Message) }
  try { $j = $txt | ConvertFrom-Json } catch { throw ('응답을 읽지 못했습니다: ' + (Mask ($txt.Substring(0, [Math]::Min(120, $txt.Length))))) }
  $arr = @($j)
  if ($arr.Count -eq 1 -and $arr[0].err) { throw ("KOSIS 오류 {0}: {1}" -f $arr[0].err, $arr[0].errMsg) }
  return $arr
}
function Enc([string]$s) { return [Uri]::EscapeDataString($s) }

# ── 표 찾기 ──
if ($Search) {
  $u = 'https://kosis.kr/openapi/statisticsSearch.do?method=getList&apiKey=' + (Enc $key) +
       '&searchNm=' + (Enc $Search) + '&sort=RANK&startCount=1&resultCount=' + $Count + '&format=json&jsonVD=Y'
  try { $rows = Get-Kosis $u } catch { Write-Host ('검색 실패: ' + (Mask $_)); exit 1 }
  foreach ($r in $rows) {
    $nm = ($r.TBL_NM -replace '<[^>]+>', '')
    Write-Host ("{0} {1}  {2}  [{3}] {4}~{5}" -f $r.ORG_ID, $r.TBL_ID, $nm, $r.ORG_NM, $r.STRT_PRD_DE, $r.END_PRD_DE)
  }
  exit 0
}

# ── 읽을 자료: 지표 목록, 코드 대응표, 앱 지도 단위(kmdata) ──
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue; $ser.RecursionLimit = 300
function Read-Utf8([string]$p) { return [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF) }
$IndFile = Join-Path $PSScriptRoot 'indicators.json'
$CmFile = Join-Path $PSScriptRoot 'codemap.json'
$Inds = $ser.DeserializeObject((Read-Utf8 $IndFile))['indicators']
$CM = if (Test-Path $CmFile) { $ser.DeserializeObject((Read-Utf8 $CmFile)) } else { @{ sido = @{}; sgg = @{}; a2b = @{} } }
foreach ($k in 'sido', 'sgg', 'a2b') { if (-not $CM.ContainsKey($k)) { $CM[$k] = @{} } }
$kt = Read-Utf8 (Join-Path $Root 'data\kmdata.js')
$s0 = $kt.IndexOf('={') + 1; $e0 = $kt.LastIndexOf('};')
$KM = $ser.DeserializeObject($kt.Substring($s0, $e0 + 1 - $s0))
$UN = @{}      # 행안부 코드 → 단위(kmdata 경계 기준 ver a: 2026년 4월 기준)
$B2A = @{}     # 7월 기준(b) 코드 → 4월 기준(a) 코드(codemap.a2b의 거꾸로)
foreach ($k in $CM['a2b'].Keys) { $B2A[[string]$CM['a2b'][$k]] = [string]$k }
$NameIdx = @{} # 시도코드|이름 → 코드 목록, *|이름 → 코드 목록
function Norm([string]$s) { if ($null -eq $s) { return '' }; return ($s -replace '\s+', '') -replace '^통합(?=청주시$|창원시$)', '' }
function Add-Name([string]$k, [string]$c) { if (-not $NameIdx.ContainsKey($k)) { $NameIdx[$k] = New-Object Collections.ArrayList }; if (-not $NameIdx[$k].Contains($c)) { [void]$NameIdx[$k].Add($c) } }
foreach ($p in $KM['vers']['a']['places']) {
  $c = [string]$p['c']; $UN[$c] = $p
  $names = @($p['n']); if ($p['al']) { $names += @($p['al']) }
  if ($p['k'] -eq 'sido') { foreach ($n in $names) { Add-Name ('S|' + (Norm $n)) $c }; if ($KM['sido'].ContainsKey($c)) { Add-Name ('S|' + (Norm $KM['sido'][$c])) $c } }
  else { Add-Name (([string]$p['s']) + '|' + (Norm $p['n'])) $c; Add-Name ('*|' + (Norm $p['n'])) $c }
}

# ── 지역 코드 맞추기 ──
# 반환: @{ c = 앱 코드; via = 방법 } / @{ skip = $true }(전국 합계) / @{ parent = 상위 코드 }(일반구) / $null(못 맞춤)
# 옛 통계청 분류를 쓰는 표(광주 24, 전남 36)는 codemap에 없어 여기서 보충한다(kmdata ver a 코드: 광주 29, 전남 46)
$OldSido = @{ '24' = '29'; '36' = '46' }
function Sido-Of([string]$raw, [string]$kind) {   # 코드 앞부분으로 시도(행안부 2자리)를 알아낸다
  if ($kind -eq 'mois') { if ($raw.Length -ge 2) { return $raw.Substring(0, 2) } }
  foreach ($n in 4, 2) { if ($raw.Length -ge $n) { $pf = $raw.Substring(0, $n); if ($CM['sido'].ContainsKey($pf)) { return $CM['sido'][$pf] } } }
  if ($kind -in 'stat', 'name' -and $raw.Length -ge 2 -and $OldSido.ContainsKey($raw.Substring(0, 2))) { return $OldSido[$raw.Substring(0, 2)] }
  return $null
}
function Match-Region([string]$raw, [string]$name, [string]$kind, [string]$level) {
  $nm = Norm $name
  # 전국·합계, 그리고 동부·읍부·면부·시부·군외 같은 구분 합계 행은 지역이 아니므로 건너뛴다(보고에 개수를 적는다)
  if ($raw -in '0', '00', '000' -or $nm -in '전국', '합계', '계' -or $nm -match '(동부|읍부|면부|시부|군부|군외|구외)$') { return @{ skip = $true } }
  $cand = $null
  if ($kind -eq 'mois') { $cand = $raw }
  elseif ($kind -eq 'stat') {
    if ($raw.Length -in 2, 4 -and $CM['sido'].ContainsKey($raw)) { $cand = $CM['sido'][$raw] }
    elseif ($raw.Length -in 5, 7 -and $CM['sgg'].ContainsKey($raw)) { $cand = $CM['sgg'][$raw] }
  }
  if ($cand) {
    if ($UN.ContainsKey($cand)) { return @{ c = $cand; via = 'code' } }
    if ($B2A.ContainsKey($cand) -and $UN.ContainsKey($B2A[$cand])) { return @{ c = $B2A[$cand]; via = 'b2a' } }
    if ($cand.Length -eq 5 -and $cand[4] -ne '0') { $par = $cand.Substring(0, 4) + '0'; if ($UN.ContainsKey($par)) { return @{ parent = $par } } }
  }
  # 일반구(통계청 코드 끝자리가 0이 아닌 5자리): 같은 시의 통계청 코드(앞 4자리+0)로 상위 시를 찾는다
  if ($kind -in 'stat', 'name' -and $raw.Length -eq 5 -and $raw[4] -ne '0') {
    $ps = $raw.Substring(0, 4) + '0'
    if ($CM['sgg'].ContainsKey($ps) -and $UN.ContainsKey($CM['sgg'][$ps])) { return @{ parent = $CM['sgg'][$ps] } }
  }
  # 이름으로 맞추기: 시도+이름 → 이름만
  $s = if ($kind -in 'mois', 'stat', 'name') { Sido-Of $raw $kind } else { $null }
  $keys = @()
  if ($level -eq 'sido') { $keys += ('S|' + $nm) }
  else { if ($s) { $keys += ($s + '|' + $nm) }; $keys += ('*|' + $nm); $keys += ('S|' + $nm) }
  foreach ($k in $keys) { if ($NameIdx.ContainsKey($k) -and $NameIdx[$k].Count -eq 1) { return @{ c = [string]$NameIdx[$k][0]; via = 'name' } } }
  return $null
}

# ── 계산식(파생 지표): a(자기 표 값)와 다른 지표 id, 숫자, + - * / ( ) ──
function Eval-Calc([string]$expr, [hashtable]$vars) {
  $tk = New-Object Collections.ArrayList
  foreach ($m in [regex]::Matches($expr, '[A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|[()+\-*/]')) { [void]$tk.Add($m.Value) }
  $script:ti = 0
  function Peek { if ($script:ti -lt $tk.Count) { return $tk[$script:ti] } else { return $null } }
  function Prim {
    $t = Peek; $script:ti++
    if ($t -eq '(') { $v = AddSub; $script:ti++; return $v }
    if ($t -match '^\d') { return [double]::Parse($t, $Inv) }
    if ($vars.ContainsKey($t)) { return $vars[$t] }
    return $null
  }
  function MulDiv {
    $v = Prim
    while ((Peek) -in '*', '/') {
      $op = Peek; $script:ti++; $r = Prim
      if ($null -eq $v -or $null -eq $r) { $v = $null }
      elseif ($op -eq '*') { $v = $v * $r }
      elseif ($r -eq 0) { $v = $null } else { $v = $v / $r }
    }
    return $v
  }
  function AddSub {
    $v = MulDiv
    while ((Peek) -in '+', '-') {
      $op = Peek; $script:ti++; $r = MulDiv
      if ($null -eq $v -or $null -eq $r) { $v = $null } elseif ($op -eq '+') { $v = $v + $r } else { $v = $v - $r }
    }
    return $v
  }
  return AddSub
}

# ── 한 지표 받기 ──
$Summable = { param($u) $u -notin '%', '', '세', '명/㎢', '천명당' }
function Fetch-Indicator($ind) {
  $u = 'https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=' + (Enc $key) +
       '&orgId=' + $ind['orgId'] + '&tblId=' + $ind['tblId'] + '&itmId=' + (Enc ([string]$ind['itmId'])) +
       '&format=json&jsonVD=Y&prdSe=' + $ind['prdSe'] + '&newEstPrdCnt=1'
  $n = 1; foreach ($o in $ind['objL']) { $u += '&objL' + $n + '=' + (Enc ([string]$o)); $n++ }
  $rows = Get-Kosis $u
  $kind = [string]$ind['code']; $level = [string]$ind['level']
  $objs = @($ind['objL']); $nobj = $objs.Count
  $regionIdx = if ($ind.ContainsKey('regionObj')) { [int]$ind['regionObj'] } else { 1 + [Array]::IndexOf($objs, 'ALL') }
  $flow = $ind.ContainsKey('flow') -and $ind['flow']
  $parts = $ind.ContainsKey('parts') -and $ind['parts']
  $partIdx = 0; if ($parts) { for ($i = 1; $i -le $nobj; $i++) { if ($i -ne $regionIdx -and $objs[$i - 1] -eq 'ALL') { $partIdx = $i; break } } }
  $direct = @{}; $child = @{}; $unm = New-Object Collections.ArrayList; $partNames = New-Object Collections.ArrayList
  $year = ''; $skipped = 0; $noval = 0; $via = @{}
  foreach ($r in $rows) {
    $year = [string]$r.PRD_DE
    $dt = [string]$r.DT
    $d = 0.0
    if (-not [double]::TryParse(($dt -replace ',', ''), [Globalization.NumberStyles]::Float, $Inv, [ref]$d)) { $noval++; continue }
    $d = [Math]::Round($d, 6)   # 합계 때 생기는 부동소수점 잡음을 없앤다
    if ($flow) {
      $a = Match-Region ([string]$r.('C' + $regionIdx)) ([string]$r.('C' + $regionIdx + '_NM')) $kind $level
      $b = $null; for ($i = 1; $i -le $nobj; $i++) { if ($i -ne $regionIdx -and $objs[$i - 1] -eq 'ALL') { $b = Match-Region ([string]$r.('C' + $i)) ([string]$r.('C' + $i + '_NM')) $kind $level; break } }
      if ($a.skip -or $b.skip) { $skipped++; continue }
      if (-not $a.c -or -not $b.c) { [void]$unm.Add(([string]$r.('C' + $regionIdx + '_NM') + '→?')); continue }
      $direct[$a.c + '>' + $b.c] = $d; continue
    }
    $m = Match-Region ([string]$r.('C' + $regionIdx)) ([string]$r.('C' + $regionIdx + '_NM')) $kind $level
    if ($m -and $m.skip) { $skipped++; continue }
    if ($m -and $m.c) {
      $via[$m.via] = 1 + [int]$via[$m.via]
      if ($parts) {
        $pn = [string]$r.('C' + $partIdx + '_NM'); if (-not $partNames.Contains($pn)) { [void]$partNames.Add($pn) }
        if (-not $direct.ContainsKey($m.c)) { $direct[$m.c] = @{} }; $direct[$m.c][$pn] = $d
      } else { $direct[$m.c] = $d }
    } elseif ($m -and $m.parent) {
      if (-not $child.ContainsKey($m.parent)) { $child[$m.parent] = 0.0 }; $child[$m.parent] += $d
    } else { [void]$unm.Add(([string]$r.('C' + $regionIdx) + ' ' + [string]$r.('C' + $regionIdx + '_NM'))) }
  }
  # 일반구는 시 단위로 합친다(합계 지표만). 비율 지표는 분자·분모를 따로 받아 다시 계산해야 하므로 합치지 않고 보고한다.
  $merged = 0
  foreach ($p in $child.Keys) {
    if ($direct.ContainsKey($p)) { continue }
    if (& $Summable ([string]$ind['unit'])) { $direct[$p] = [Math]::Round($child[$p], 6); $merged++ }
    else { [void]$unm.Add(($p + ' ' + $UN[$p]['n'] + ' (일반구 비율 지표: 분자·분모를 따로 받아 다시 계산해야 해요)')) }
  }
  $vals = New-Object Collections.Specialized.OrderedDictionary
  foreach ($c in ($direct.Keys | Sort-Object)) { $vals[$c] = $direct[$c] }
  return @{ ind = $ind; vals = $vals; year = $year; unm = $unm; skipped = $skipped; noval = $noval; merged = $merged; via = $via; parts = $partNames; rows = $rows.Count }
}

# ── 실행 ──
$want = @(); foreach ($i in $Inds) { if (-not $Only -or $Only -contains $i['id']) { $want += $i['id'] } }
if (-not $want.Count) { Write-Host '받을 지표가 없습니다. -Only 이름을 indicators.json의 id와 맞춰 주세요.'; exit 1 }
$byId = @{}; foreach ($i in $Inds) { $byId[$i['id']] = $i }
$need = New-Object Collections.ArrayList     # 계산식이 쓰는 다른 지표도 받는다
foreach ($id in $want) { if (-not $need.Contains($id)) { [void]$need.Add($id) } }
foreach ($id in @($need)) { $ex = [string]$byId[$id]['calc']; if ($ex) { foreach ($m in [regex]::Matches($ex, '[A-Za-z_][A-Za-z0-9_]*')) { if ($m.Value -ne 'a' -and $byId.ContainsKey($m.Value) -and -not $need.Contains($m.Value)) { [void]$need.Add($m.Value) } } } }
$got = @{}; $fail = @()
foreach ($id in $need) {
  $ind = $byId[$id]
  try { $got[$id] = Fetch-Indicator $ind; Write-Host ("받음  {0,-20} {1}행  {2}" -f $id, $got[$id].rows, $got[$id].year) }
  catch { $fail += $id; Write-Host ("실패  {0,-20} {1}" -f $id, (Mask ([string]$_))) }
}
# 파생 지표
foreach ($id in $want) {
  $g = $got[$id]; if (-not $g) { continue }; $ex = [string]$g.ind['calc']; if (-not $ex) { continue }
  $nv = New-Object Collections.Specialized.OrderedDictionary; $drop = 0
  foreach ($c in $g.vals.Keys) {
    $vars = @{ a = [double]$g.vals[$c] }; $ok = $true
    foreach ($m in [regex]::Matches($ex, '[A-Za-z_][A-Za-z0-9_]*')) { $v = $m.Value; if ($v -eq 'a') { continue }; if ($got[$v] -and $got[$v].vals.Contains($c)) { $vars[$v] = [double]$got[$v].vals[$c] } else { $ok = $false } }
    $r = if ($ok) { Eval-Calc $ex $vars } else { $null }
    if ($null -eq $r) { $drop++; [void]$g.unm.Add(($c + ' ' + $UN[$c]['n'] + ' (계산에 쓸 값이 없어요)')) } else { $nv[$c] = [Math]::Round([double]$r, 4) }
  }
  $g.vals = $nv
}

# ── 보고 ──
Write-Host ''
Write-Host '── 코드 맞추기 보고 ──'
$totUnm = 0
foreach ($id in $want) {
  $g = $got[$id]; if (-not $g) { continue }
  $vs = ($g.via.GetEnumerator() | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', '
  Write-Host ("{0}: 값 {1}개 · 맞춘 방법[{2}] · 일반구 합침 {3} · 합계·구분 행 건너뜀 {4} · 값 없음 {5} · 못 맞춘 {6}" -f $id, $g.vals.Count, $vs, $g.merged, $g.skipped, $g.noval, $g.unm.Count)
  $totUnm += $g.unm.Count
  foreach ($x in ($g.unm | Select-Object -First 12)) { Write-Host ('    못 맞춤: ' + $x) }
  if ($g.unm.Count -gt 12) { Write-Host ("    … 외 {0}개" -f ($g.unm.Count - 12)) }
}

# ── data\kstat.js 쓰기(-Only이면 기존 지표는 그대로 두고 받은 것만 바꾼다) ──
$OutFile = if ($Out) { $Out } else { Join-Path $Root 'data\kstat.js' }
$ks = New-Object Collections.Specialized.OrderedDictionary
if (-not $Out -and (Test-Path $OutFile)) {
  $old = Read-Utf8 $OutFile; $a0 = $old.IndexOf('={') + 1; $b0 = $old.LastIndexOf('};')
  if ($a0 -gt 0 -and $b0 -gt $a0) { $o = $ser.DeserializeObject($old.Substring($a0, $b0 + 1 - $a0)); if ($o.ContainsKey('ind')) { foreach ($k in ($o['ind'].Keys | Sort-Object)) { $ks[$k] = $o['ind'][$k] } } }
}
$today = (Get-Date).ToString('yyyy-MM-dd')
foreach ($id in $want) {
  $g = $got[$id]; if (-not $g -or -not $g.vals.Count) { continue }
  $i = $g.ind
  $e = New-Object Collections.Specialized.OrderedDictionary
  $e['ko'] = $i['ko']; $e['unit'] = $i['unit']; $e['level'] = $i['level']; $e['year'] = $g.year
  if ($i.ContainsKey('alias')) { $e['alias'] = @($i['alias']) }
  $e['src'] = [string]$i['src'] + ' KOSIS'; $e['tbl'] = [string]$i['tblId']; $e['itm'] = [string]$i['itmId']; $e['got'] = $today
  if ($i.ContainsKey('note')) { $e['note'] = $i['note'] }
  if ($g.parts.Count) { $e['parts'] = @($g.parts); $pv = New-Object Collections.Specialized.OrderedDictionary
    foreach ($c in $g.vals.Keys) { $pv[$c] = @($g.parts | ForEach-Object { if ($g.vals[$c].ContainsKey($_)) { $g.vals[$c][$_] } else { $null } }) }
    $e['vals'] = $pv } else { $e['vals'] = $g.vals }
  if ($i.ContainsKey('flow') -and $i['flow']) { $e['flow'] = $true }
  $ks[$id] = $e
}
$top = New-Object Collections.Specialized.OrderedDictionary
$top['built'] = $today; $top['ver'] = 'a'; $top['a2b'] = $CM['a2b']; $top['ind'] = $ks
$json = $top | ConvertTo-Json -Depth 10 -Compress
$line1 = '(window.GMDATA=window.GMDATA||{})["kstat"]=' + $json + ';'
$line2 = '(window.GMVER=window.GMVER||{})["kstat"]="0000000000";'
[IO.File]::WriteAllText($OutFile, $line1 + "`n" + $line2 + "`n", (New-Object Text.UTF8Encoding($false)))
Write-Host ''
Write-Host ("쓴 파일: {0} (지표 {1}개, 못 맞춘 행 합계 {2}, 실패 {3})" -f $OutFile, $ks.Count, $totUnm, $fail.Count)
if (-not $Out) { Write-Host '다음: node scripts\stamp.mjs 로 버전 도장을 찍고, node scripts\stamp.mjs --check 가 0인지 확인하세요.' }
if ($fail.Count) { exit 1 }
