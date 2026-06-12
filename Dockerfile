FROM nginx:alpine

COPY index.html style.css app.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY lib/ /usr/share/nginx/html/lib/

EXPOSE 80
