Option Explicit
Dim shell, files, folder, code, log, env
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
Set env = shell.Environment("PROCESS")
env("LAUDOS_OCULTO") = "1"
code = shell.Run(Chr(34) & folder & "\Iniciar Laudos.bat" & Chr(34), 0, True)
If code <> 0 Then
  log = shell.ExpandEnvironmentStrings("%TEMP%") & "\motasa-laudos.log"
  MsgBox "Nao foi possivel iniciar o sistema. Confira os detalhes em:" & vbCrLf & log, vbExclamation, "Laudos"
End If
