FROM nginx:alpine

COPY index.html impressum.html datenschutz.html style.css app.js manifest.webmanifest service-worker.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY lib/ /usr/share/nginx/html/lib/

EXPOSE 80
