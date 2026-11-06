FROM postgres:16-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/opt/venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends age python3 python3-pip python3-venv tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home backup

WORKDIR /app
COPY infra/backup-worker/requirements.txt ./requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
COPY infra/backup-worker/worker.py ./worker.py

USER 10001:10001
CMD ["python", "/app/worker.py"]
