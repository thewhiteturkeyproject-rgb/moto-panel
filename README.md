# moto-panel

Panel web para monitorear y controlar un Android rooteado (Motorola One con LineageOS + Magisk), corriendo en Termux.

- Batería, temperatura y RAM en tiempo real
- Frecuencia de cada núcleo de la CPU
- Cambio de governor de CPU con un botón (requiere root)

**Stack:** Node.js + Express · HTML/CSS/JS vanilla · shell script ejecutado con `su`

**Uso:** `npm install` y después `npm start`, y abrir http://localhost:3000
