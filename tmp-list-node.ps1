Get-CimInstance Win32_Process -Filter 'Name="node.exe"' |
  Select-Object ProcessId,
    @{Name='RAM_MB';Expression={[math]::Round($_.WorkingSetSize/1MB,1)}},
    @{Name='Started';Expression={$_.CreationDate}},
    ParentProcessId,
    CommandLine |
  Sort-Object RAM_MB -Descending |
  Format-List
