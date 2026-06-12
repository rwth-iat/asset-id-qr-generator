FROM nginx:alpine

COPY index.html style.css app.js logo.png rwth_iat_bild_weiss_hellblau.png /usr/share/nginx/html/
COPY lib/ /usr/share/nginx/html/lib/

EXPOSE 80
