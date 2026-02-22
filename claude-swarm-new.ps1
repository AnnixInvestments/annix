$projectDir = $PSScriptRoot
wt --window swarm new-tab --title "Claude Swarm" -d $projectDir powershell -ExecutionPolicy Bypass -NoExit -Command "& '$projectDir\claude-swarm.ps1'"
