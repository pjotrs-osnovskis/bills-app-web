Roboto font for PDF (Latvian garumzīmes)

1. Open: https://raw.githack.com/parallax/jsPDF/master/fontconverter/fontconverter.html
2. Download a Roboto TTF from Google Fonts (e.g. Roboto-Light.ttf, Roboto-Regular.ttf or Roboto-Thin.ttf).
3. In the converter, upload the TTF and click "Convert".
4. In the generated script, find the base64 string (the value of the "font" variable, or the long string passed to addFileToVFS).
5. Save only that base64 string into this folder, e.g. Roboto-Light-base64.txt or Roboto-Thin-base64.txt.

Default: the app loads /fonts/Roboto-Light-base64.txt and uses font family "Roboto-Light" (JSPDF_FONT_FILENAME = 'Roboto-Light-normal.ttf'). You can copy the base64 from a converter output file like Roboto-Light-normal.js (the content of the font variable).

Thin/Light/other: to use another weight, save its base64 as e.g. Roboto-Thin-base64.txt. Then either:
  A) In index.html add a script before pdf-font.js: set JSPDF_FONT_URL, JSPDF_FONT_FAMILY and JSPDF_FONT_FILENAME to match your file.
  B) Or in pdf-font.js change the defaults to use your base64 file and font filename.
