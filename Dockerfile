FROM node:alpine
RUN mkdir /app
RUN chown -R node:node /app
WORKDIR /app
USER node
COPY --chown=node . /app
RUN npm install
CMD ["npm", "start"]
