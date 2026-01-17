SCALPERIUM MT5 AGENT INSTALLER ASSETS
======================================

Required Files:
--------------

1. scalperium.ico
   - Size: 256x256 pixels (will be scaled automatically)
   - Format: Windows ICO file
   - Used for: Installer icon, uninstall icon, Start menu shortcuts

How to Create Icon:
-------------------

Option 1: Online Converter
   - Go to https://convertio.co/png-ico/ or similar
   - Upload your 256x256 PNG logo
   - Download the .ico file
   - Place it in this folder as "scalperium.ico"

Option 2: Using ImageMagick (if installed)
   convert scalperium.png -define icon:auto-resize=256,128,64,48,32,16 scalperium.ico

Option 3: Use GIMP
   - Open your logo PNG in GIMP
   - Export as .ico format
   - Save as "scalperium.ico"

Temporary Workaround:
--------------------
If you don't have an icon yet, you can comment out these lines in MT5AgentSetup.iss:
   ; SetupIconFile=assets\scalperium.ico
   ; UninstallDisplayIcon={app}\scalperium.ico

And remove this line from [Files]:
   ; Source: "assets\scalperium.ico"; DestDir: "{app}"; Flags: ignoreversion
