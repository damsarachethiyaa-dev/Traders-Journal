# Traders Journal — editable SaaS motion film
1280×720, 60 fps, 24 seconds. Created by Chethiya Rathnasekara.

Open project/ using a matching native Higgsedit installation. project.json contains editable text, geometry, imported media, and property keyframes. All titles, logo paths, feature labels, screen frames and choreography are native editable layers. Captured app screens are image assets; their internal interface is not separate text/vector layers. The local app's HTML/CSS/JS remains the source of that interface. This is not an After Effects .aep project.

Rebuild the supplied source:
TJ_SAAS_ROOT="$PWD" higgsedit build saas-edit.js
Render:
higgsedit render project --out renders/saas-native.mp4 --bitrate 10M

Inputs contain only synthetic demonstration captures of the app and the project's existing original soundtrack. No external reference pixels were used.
Scenes: identity; dashboard and calendar; logging; daily journal; performance; edge; behavior; progress; MT5 connection; privacy; KING/logo reveal.
Final export uses H.264, BT.709, stereo AAC 48 kHz, an ending audio fade, and normalized audio.
