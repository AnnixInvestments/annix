$projectDir = $PSScriptRoot
wt --window 0 new-tab --title "Claude Swarm" -d $projectDir powershell -ExecutionPolicy Bypass -NoExit -Command "& '$projectDir\claude-swarm.ps1'"
