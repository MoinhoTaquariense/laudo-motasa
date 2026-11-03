FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY Backend/requirements.txt ./
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
COPY Backend/package*.json ./
RUN npm ci --omit=dev
COPY Backend/src ./src
COPY Backend/server.js Backend/migrate.js Backend/migration.sql ./
ENV NODE_ENV=production PYTHON_PATH=/opt/venv/bin/python
USER node
CMD ["sh", "-c", "node migrate.js && node server.js"]
