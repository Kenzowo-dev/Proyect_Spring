$ErrorActionPreference = 'Stop'

# Selecciona el proyecto aunque la terminal esté en otra carpeta.
$projectPom = Join-Path $PSScriptRoot 'pom.xml'
& mvn -f $projectPom spring-boot:run @args
exit $LASTEXITCODE
