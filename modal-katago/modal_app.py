"""Scale-to-zero KataGo Analysis Engine for the Go Coach admin workspace."""

from __future__ import annotations

import hmac
import json
import os
import subprocess
import threading
from typing import Any

import modal

KATAGO_VERSION = "1.18.1"
KATAGO_ARCHIVE = f"katago-v{KATAGO_VERSION}-cuda12.1-cudnn8.9.7-linux-x64.zip"
KATAGO_URL = f"https://github.com/lightvector/KataGo/releases/download/v{KATAGO_VERSION}/{KATAGO_ARCHIVE}"
KATAGO_SHA256 = "79700b8e7086edcbb94b1eaca428e6beee16c38e89c056a9a5681b015f9e020e"
MODEL_NAME = "kata1-b18c384nbt-s9996604416-d4316597426.bin.gz"
MODEL_URL = f"https://media.katagotraining.org/uploaded/networks/models/kata1/{MODEL_NAME}"

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04",
        add_python="3.12",
    )
    .apt_install("ca-certificates", "curl", "unzip", "libtcmalloc-minimal4")
    .uv_pip_install("fastapi==0.116.1")
    .run_commands(
        "mkdir -p /opt/katago /tmp/katago-release",
        f"curl --fail --location --retry 3 '{KATAGO_URL}' --output /tmp/katago.zip",
        f"echo '{KATAGO_SHA256}  /tmp/katago.zip' | sha256sum --check -",
        "unzip -q /tmp/katago.zip -d /tmp/katago-release",
        "find /tmp/katago-release -type f -name katago -exec cp {} /opt/katago/katago \\;",
        "find /tmp/katago-release -type f -name analysis_example.cfg -exec cp {} /opt/katago/analysis.cfg \\;",
        "chmod 755 /opt/katago/katago",
        f"curl --fail --location --retry 3 '{MODEL_URL}' --output '/opt/katago/{MODEL_NAME}'",
        "test -s /opt/katago/katago && test -s /opt/katago/analysis.cfg",
        "rm -rf /tmp/katago.zip /tmp/katago-release",
    )
)

app = modal.App("go-coach-katago")


@app.cls(
    image=image,
    gpu="T4",
    min_containers=0,
    max_containers=1,
    scaledown_window=60,
    timeout=140,
    secrets=[modal.Secret.from_name("go-coach-katago")],
)
class KataGoService:
    @modal.enter()
    def start_engine(self) -> None:
        self.lock = threading.Lock()
        self.process = subprocess.Popen(
            [
                "/opt/katago/katago",
                "analysis",
                "-model",
                f"/opt/katago/{MODEL_NAME}",
                "-config",
                "/opt/katago/analysis.cfg",
                "-override-config",
                "numAnalysisThreads=1,numSearchThreadsPerAnalysisThread=2,nnMaxBatchSize=8,nnCacheSizePowerOfTwo=18",
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        threading.Thread(target=self._forward_stderr, daemon=True).start()
        version = self._query({"id": "__startup__", "action": "query_version"})
        self.version = version.get("version", KATAGO_VERSION)

    def _forward_stderr(self) -> None:
        assert self.process.stderr is not None
        for line in self.process.stderr:
            print(f"[katago] {line.rstrip()}")

    def _query(self, query: dict[str, Any]) -> dict[str, Any]:
        assert self.process.stdin is not None and self.process.stdout is not None
        if self.process.poll() is not None:
            raise RuntimeError(f"KataGo exited with code {self.process.returncode}")
        with self.lock:
            self.process.stdin.write(json.dumps(query, separators=(",", ":")) + "\n")
            self.process.stdin.flush()
            for line in self.process.stdout:
                result = json.loads(line)
                if result.get("id") != query["id"] or result.get("isDuringSearch"):
                    continue
                if result.get("error"):
                    raise RuntimeError(str(result["error"]))
                return result
        raise RuntimeError("KataGo closed its output stream")

    def _authorized(self, authorization: str | None) -> bool:
        expected = os.environ["KATAGO_API_TOKEN"]
        return bool(authorization) and hmac.compare_digest(authorization, f"Bearer {expected}")

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI, Header, HTTPException

        web_app = FastAPI(title="Go Coach KataGo", docs_url=None, redoc_url=None)

        @web_app.get("/health")
        def health(authorization: str | None = Header(default=None)):
            if not self._authorized(authorization):
                raise HTTPException(status_code=401, detail="unauthorized")
            return {"healthy": True, "provider": "Modal", "gpu": "T4", "version": self.version}

        @web_app.post("/analyze")
        def analyze(query: dict[str, Any], authorization: str | None = Header(default=None)):
            if not self._authorized(authorization):
                raise HTTPException(status_code=401, detail="unauthorized")
            if not isinstance(query.get("id"), str) or not query["id"]:
                raise HTTPException(status_code=400, detail="id_required")
            if query.get("boardXSize") not in (9, 13, 19) or query.get("boardYSize") != query.get("boardXSize"):
                raise HTTPException(status_code=400, detail="unsupported_board_size")
            query["maxVisits"] = min(1200, max(50, int(query.get("maxVisits", 400))))
            try:
                return self._query(query)
            except (RuntimeError, ValueError, json.JSONDecodeError) as error:
                raise HTTPException(status_code=502, detail=str(error)[:300]) from error

        return web_app
