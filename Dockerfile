FROM nginx:alpine

COPY index.html style.css app.js /usr/share/nginx/html/
COPY lib/ /usr/share/nginx/html/lib/

EXPOSE 80
