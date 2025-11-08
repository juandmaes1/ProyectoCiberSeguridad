# =============================
# Etapa 1: Builder
# =============================
ARG FIREBASE_EXPORT_SOURCE=firebase-export-17624458050477OG2Na
FROM node:20-bookworm AS builder
ARG FIREBASE_EXPORT_SOURCE
WORKDIR /app

# Instalar dependencias del sistema (Java 17 para emuladores, git, curl, bash)
RUN apt-get update && apt-get install -y openjdk-17-jre-headless git curl bash && \
    rm -rf /var/lib/apt/lists/*

# Copiar dependencias y herramientas globales
COPY package*.json ./
RUN npm ci && npm install -g firebase-tools expo-cli @expo/ngrok

# Copiar el codigo del proyecto
COPY . .

# Normalizar backups: conservar solo el export indicado y renombrarlo
RUN set -eux; \
    TARGET_DIR="${FIREBASE_EXPORT_SOURCE}"; \
    if [ ! -d "$TARGET_DIR" ]; then \
        echo "No se encontro el backup '${FIREBASE_EXPORT_SOURCE}'. Ajusta FIREBASE_EXPORT_SOURCE."; \
        exit 1; \
    fi; \
    find . -maxdepth 1 -type d -name 'firebase-export-*' ! -name "$TARGET_DIR" -exec rm -rf {} +; \
    rm -rf firebase-export; \
    mv "$TARGET_DIR" firebase-export

# =============================
# Etapa 2: Runtime
# =============================
FROM node:20-bookworm
WORKDIR /app

# Instalar dependencias del sistema necesarias (Java, git, bash, curl)
RUN apt-get update && apt-get install -y openjdk-17-jre-headless git curl bash && \
    rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno para Java, Expo y backups
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV FIREBASE_EXPORT_DIR=/app/firebase-export
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV EXPO_USE_DEV_SERVER=true
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_INTERACTIVE=1

# Copiar el proyecto desde la etapa anterior
COPY --from=builder /app /app

# Instalar Firebase y Expo CLI globalmente + crear alias
RUN npm install -g firebase-tools expo-cli @expo/ngrok && \
    npm config set prefix /usr/local && \
    ln -sf /usr/local/lib/node_modules/firebase-tools/lib/bin/firebase.js /usr/local/bin/firebase && \
    chmod +x /usr/local/bin/firebase && \
    echo "âœ… Firebase CLI instalada correctamente:" && firebase --version && java -version

# Permisos para script de arranque
RUN chmod +x ./start-all.sh

# Exponer puertos de emuladores y Expo
EXPOSE 8080 8081 8085 9099 9199 19000 19001 19002

# Comando de inicio: emuladores + Expo
CMD ["sh", "./start-all.sh"]

