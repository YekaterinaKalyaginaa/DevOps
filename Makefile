
.PHONY: build provision deploy run clean destroy ci

IMAGE_NAME := quotes-scraper

build:
	docker build --progress=plain -t $(IMAGE_NAME) .

provision:
	docker compose up -d floci
	terraform -chdir=infra init
	terraform -chdir=infra apply -auto-approve

deploy:
	docker compose build scraper

run:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run.ps1

clean:
	docker compose down --remove-orphans
	docker image rm $(IMAGE_NAME) 2>/dev/null || true
	node -e "require('fs').rmSync('out', { recursive: true, force: true })"

destroy:
	terraform -chdir=infra destroy -auto-approve
	docker compose down --remove-orphans

ci:
	terraform -chdir=infra fmt -check -recursive
	terraform -chdir=infra init -backend=false
	terraform -chdir=infra validate
	terraform -chdir=infra plan -refresh=false -input=false
	docker compose build scraper
