Option Explicit
Dim files, folder, arquivo
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
Set arquivo = files.CreateTextFile(folder & "\.laudos-encerrar", True)
arquivo.WriteLine "encerrar"
arquivo.Close
MsgBox "Solicitacao de encerramento enviada.", vbInformation, "Laudos"
